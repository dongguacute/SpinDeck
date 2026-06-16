import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";

/* ============================================================
   专辑数据 — 10 张不同色彩的黑胶唱片封面
   ============================================================ */
interface AlbumData {
  color: string;
  innerColor: string;
  label: string;
}

const albumList: AlbumData[] = [
  { color: "#FF5E5B", innerColor: "#C0392B", label: "Red" },
  { color: "#FF9F1C", innerColor: "#D35400", label: "Orange" },
  { color: "#FECA57", innerColor: "#F39C12", label: "Gold" },
  { color: "#2ECC71", innerColor: "#27AE60", label: "Green" },
  { color: "#00D2D3", innerColor: "#01A3A4", label: "Teal" },
  { color: "#54A0FF", innerColor: "#2E86DE", label: "Blue" },
  { color: "#5F27CD", innerColor: "#341F97", label: "Purple" },
  { color: "#FF6B6B", innerColor: "#EE5A24", label: "Coral" },
  { color: "#48DBFB", innerColor: "#0ABDE3", label: "Sky" },
  { color: "#FF9FF3", innerColor: "#F368E0", label: "Pink" },
];

/* ============================================================
   常量
   ============================================================ */
const ALBUM_W = 2.4; // 专辑宽度
const ALBUM_H = 2.4; // 专辑高度
const ALBUM_D = 0.12; // 专辑厚度（扁）
const GAP = 1.0; // 专辑间距
const TOTAL_WIDTH =
  albumList.length * (ALBUM_W + GAP) - GAP;

/* ============================================================
   ClientOnly — 确保 Three.js 只在客户端渲染
   ============================================================ */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/* ============================================================
   主组件
   ============================================================ */
export default function Home() {
  return (
    <div className="relative w-screen h-screen bg-[#0a0a0c] overflow-hidden select-none touch-none">
      {/* 背景氛围光 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/6 rounded-full blur-[150px]" />
      </div>

      {/* Three.js 画布容器 */}
      <ClientOnly>
        <AlbumShelf />
      </ClientOnly>

      {/* 底部提示 */}
      <ClientOnly>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/25 text-xs tracking-[0.2em] font-light">
          拖拽或滑动浏览 &nbsp;←&nbsp;&nbsp;→
        </div>
      </ClientOnly>
    </div>
  );
}

/* ============================================================
   3D 场景
   ============================================================ */
function AlbumShelf() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mainGroup: THREE.Group;
    albumMeshes: THREE.Mesh[];
    albumGroups: THREE.Group[];
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    groupStartX: 0,
    velocity: 0,
    lastX: 0,
  });
  const animIdRef = useRef(0);
  const hoveredRef = useRef<THREE.Group | null>(null);

  /* ---------- 初始化场景 ---------- */
  const initScene = useCallback((container: HTMLDivElement) => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 0.4, 9);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ---- 灯光 ----
    // 环境光
    scene.add(new THREE.AmbientLight("#8899cc", 0.6));

    // 主方向光（模拟顶光）
    const key = new THREE.DirectionalLight("#ffffff", 4);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    // 侧补光
    const fill = new THREE.DirectionalLight("#8877cc", 2.5);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    // 底部补光（避免暗面过黑）
    const rim = new THREE.DirectionalLight("#ff9988", 2);
    rim.position.set(0, -1.5, -4);
    scene.add(rim);

    // ---- 主容器组（可滑动） ----
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ---- 书架底板 ----
    const shelfGeo = new THREE.BoxGeometry(TOTAL_WIDTH + 1.5, 0.06, ALBUM_D + 0.3);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: "#1e1e24",
      roughness: 0.25,
      metalness: 0.15,
    });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.y = -ALBUM_H / 2 - 0.25;
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    mainGroup.add(shelf);

    // 书架背板
    const backGeo = new THREE.BoxGeometry(TOTAL_WIDTH + 1.5, ALBUM_H + 0.5, 0.04);
    const backMat = new THREE.MeshStandardMaterial({
      color: "#14141a",
      roughness: 0.4,
      metalness: 0.1,
    });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.z = -ALBUM_D / 2 - 0.05;
    back.receiveShadow = true;
    mainGroup.add(back);

    // ---- 专辑立体块 ----
    const albumGroups: THREE.Group[] = [];
    const albumMeshes: THREE.Mesh[] = [];

    albumList.forEach((album, i) => {
      const group = new THREE.Group();
      const x = -TOTAL_WIDTH / 2 + i * (ALBUM_W + GAP) + ALBUM_W / 2;
      group.position.set(x, 0, 0);
      group.userData = { index: i, color: album.color };

      // 封面主色块
      const coverGeo = new THREE.BoxGeometry(ALBUM_W, ALBUM_H, ALBUM_D);
      const coverMat = new THREE.MeshStandardMaterial({
        color: album.color,
        roughness: 0.35,
        metalness: 0.02,
      });
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.castShadow = true;
      cover.receiveShadow = true;
      group.add(cover);
      albumMeshes.push(cover);

      // 内层黑胶效果
      const vinylGeo = new THREE.BoxGeometry(1.2, 1.2, ALBUM_D + 0.015);
      const vinylMat = new THREE.MeshStandardMaterial({
        color: "#111118",
        roughness: 0.65,
        metalness: 0.25,
      });
      const vinyl = new THREE.Mesh(vinylGeo, vinylMat);
      vinyl.position.z = ALBUM_D / 2 + 0.004;
      group.add(vinyl);

      // 唱片中心标签
      const labelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.015, 48);
      const labelMat = new THREE.MeshStandardMaterial({
        color: album.innerColor,
        roughness: 0.3,
        metalness: 0.2,
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.z = ALBUM_D / 2 + 0.012;
      labelMesh.rotation.x = Math.PI / 2;
      group.add(labelMesh);

      // 顶部边缘高光线
      const edgeGeo = new THREE.BoxGeometry(ALBUM_W, 0.04, ALBUM_D);
      const edgeMat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.2,
        metalness: 0.1,
        emissive: album.color,
        emissiveIntensity: 0.15,
      });
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.y = ALBUM_H / 2;
      group.add(edge);

      mainGroup.add(group);
      albumGroups.push(group);
    });

    // ---- 地面 ----
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#0c0c10",
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -ALBUM_H / 2 - 0.45;
    ground.position.z = -1.5;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- Raycaster（悬停检测） ----
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      mainGroup,
      albumMeshes,
      albumGroups,
      raycaster,
      mouse,
    };
  }, []);

  /* ---------- 指针事件 ---------- */
  const onPointerDown = useCallback((e: PointerEvent) => {
    const s = sceneRef.current;
    if (!s) return;
    const d = dragRef.current;
    d.isDragging = true;
    d.startX = e.clientX;
    d.groupStartX = s.mainGroup.position.x;
    d.velocity = 0;
    d.lastX = s.mainGroup.position.x;
    gsap.killTweensOf(s.mainGroup.position);
    s.renderer.domElement.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = sceneRef.current;
    if (!s) return;
    const d = dragRef.current;

    // 拖拽移动
    if (d.isDragging) {
      const delta = (e.clientX - d.startX) * 0.008;
      let newX = d.groupStartX + delta;
      // 限制滑动范围
      const maxOffset = Math.max(0, TOTAL_WIDTH / 2 - 3);
      newX = THREE.MathUtils.clamp(newX, -maxOffset, maxOffset);
      d.velocity = newX - d.lastX;
      d.lastX = newX;
      s.mainGroup.position.x = newX;
    }

    // 悬停检测
    const rect = s.renderer.domElement.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    s.raycaster.setFromCamera(s.mouse, s.camera);
    const intersects = s.raycaster.intersectObjects(s.albumMeshes, false);

    // 还原上次悬停的专辑
    if (hoveredRef.current && (!intersects.length || intersects[0].object.parent !== hoveredRef.current)) {
      gsap.to(hoveredRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.35,
        ease: "power2.out",
      });
      gsap.to(hoveredRef.current.position, {
        z: 0,
        duration: 0.35,
        ease: "power2.out",
      });
      hoveredRef.current = null;
    }

    // 悬停新专辑
    if (intersects.length && !d.isDragging) {
      const group = intersects[0].object.parent as THREE.Group;
      if (group && group !== hoveredRef.current && s.albumGroups.includes(group)) {
        hoveredRef.current = group;
        gsap.to(group.scale, {
          x: 1.08,
          y: 1.08,
          z: 1.08,
          duration: 0.35,
          ease: "power2.out",
        });
        gsap.to(group.position, {
          z: 0.35,
          duration: 0.35,
          ease: "power2.out",
        });
      }
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const d = dragRef.current;
    if (!d.isDragging) return;
    d.isDragging = false;
    s.renderer.domElement.style.cursor = "grab";

    // GSAP 惯性动画
    const maxOffset = Math.max(0, TOTAL_WIDTH / 2 - 3);
    const inertiaTarget = THREE.MathUtils.clamp(
      s.mainGroup.position.x + d.velocity * 12,
      -maxOffset,
      maxOffset,
    );

    gsap.to(s.mainGroup.position, {
      x: inertiaTarget,
      duration: 1.0,
      ease: "power3.out",
    });
  }, []);

  /* ---------- useEffect ---------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    initScene(container);

    const s = sceneRef.current!;
    const { scene, camera, renderer, mainGroup } = s;
    const canvas = renderer.domElement;

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // 动画循环
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      // 微妙的悬浮动画（仅在不拖拽时）
      if (!dragRef.current.isDragging && !gsap.isTweening(mainGroup.position)) {
        const t = performance.now() * 0.0003;
        mainGroup.position.y = Math.sin(t) * 0.06;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小变化
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.clear();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [initScene, onPointerDown, onPointerMove, onPointerUp]);

  return <div ref={containerRef} className="absolute inset-0 z-[1]" />;
}
