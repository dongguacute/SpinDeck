import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";

/* ============================================================
   专辑数据
   ============================================================ */
const albumList = [
  "#FF4757", "#FF6348", "#FFA502", "#2ED573", "#3742FA",
  "#1E90FF", "#7158E2", "#FF6B81", "#FFC312", "#12CBC4",
];

/* ============================================================
   常量 — 书脊朝前（正面看侧边竖着）
   ============================================================ */
const SPINE_THICK = 0.18;           // 书脊（朝 Z+ 面向镜头）
const ALBUM_TALL = 4.2;             // 封面高度（Y）
const ALBUM_DEEP = 4.2;             // 封面进深（Z-）
const GAP = 1.5;                    // 间距
const TOTAL_WIDTH = albumList.length * (SPINE_THICK + GAP) - GAP;

/* ============================================================
   ClientOnly
   ============================================================ */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/* ============================================================
   页面
   ============================================================ */
export default function Home() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none touch-none">
      <ClientOnly>
        <AlbumShelf />
      </ClientOnly>

      <ClientOnly>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/20 text-xs tracking-[0.2em] font-light">
          拖拽或滑动浏览 →&nbsp;&nbsp;←
        </div>
      </ClientOnly>
    </div>
  );
}

/* ============================================================
   3D 场景 — 书脊朝前
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
    isDragging: false, startX: 0, groupStartX: 0, velocity: 0, lastX: 0,
  });
  const animIdRef = useRef(0);
  const hoveredRef = useRef<THREE.Group | null>(null);

  /* ---------- 初始化场景 ---------- */
  const initScene = useCallback((container: HTMLDivElement) => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();

    // 相机 — 正前方
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0.2, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ---- 灯光 ----
    scene.add(new THREE.AmbientLight("#aabbcc", 0.5));

    const key = new THREE.DirectionalLight("#ffffff", 4);
    key.position.set(6, 8, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -15;
    key.shadow.bias = -0.00008;
    scene.add(key);

    const fill = new THREE.DirectionalLight("#8899cc", 2.5);
    fill.position.set(-5, 2, -3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight("#ffddbb", 1.5);
    rim.position.set(1, -3, -4);
    scene.add(rim);

    // ---- 主容器 ----
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ---- 专辑 — 薄书脊朝 Z+，封面朝 Z- 延伸 ----
    const albumGroups: THREE.Group[] = [];
    const albumMeshes: THREE.Mesh[] = [];

    albumList.forEach((color, i) => {
      const group = new THREE.Group();
      const x = -TOTAL_WIDTH / 2 + i * (SPINE_THICK + GAP) + SPINE_THICK / 2;
      group.position.set(x, 0, 0);

      group.userData = { index: i, color };

      // === 平整正方形立体块 ===
      const bodyGeo = new THREE.BoxGeometry(SPINE_THICK, ALBUM_TALL, ALBUM_DEEP);
      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.03,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      albumMeshes.push(body);

      mainGroup.add(group);
      albumGroups.push(group);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      scene, camera, renderer, mainGroup,
      albumMeshes, albumGroups, raycaster, mouse,
    };
  }, []);

  /* ---------- 拖拽 / 悬停 ---------- */
  const onPointerDown = useCallback((e: PointerEvent) => {
    const s = sceneRef.current; if (!s) return;
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
    const s = sceneRef.current; if (!s) return;
    const d = dragRef.current;

    if (d.isDragging) {
      const delta = (e.clientX - d.startX) * 0.012;
      let newX = d.groupStartX + delta;
      const m = Math.max(0, TOTAL_WIDTH / 2 + 2);
      newX = THREE.MathUtils.clamp(newX, -m, m);
      d.velocity = newX - d.lastX;
      d.lastX = newX;
      s.mainGroup.position.x = newX;
    }

    const rect = s.renderer.domElement.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    s.raycaster.setFromCamera(s.mouse, s.camera);
    const hits = s.raycaster.intersectObjects(s.albumMeshes, false);

    if (hoveredRef.current && (!hits.length || hits[0].object.parent !== hoveredRef.current)) {
      const prev = hoveredRef.current;
      gsap.to(prev.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: "power2.out" });
      gsap.to(prev.position, { y: 0, z: 0, duration: 0.3, ease: "power2.out" });
      gsap.to(prev.rotation, { y: 0, duration: 0.35, ease: "power2.out" });
      hoveredRef.current = null;
    }

    if (hits.length && !d.isDragging) {
      const g = hits[0].object.parent as THREE.Group;
      if (g && g !== hoveredRef.current && s.albumGroups.includes(g)) {
        hoveredRef.current = g;
        gsap.to(g.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.35, ease: "power2.out" });
        gsap.to(g.position, { y: 0.2, z: 0.5, duration: 0.3, ease: "power2.out" });
        gsap.to(g.rotation, { y: -0.18, duration: 0.35, ease: "power2.out" });
      }
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const s = sceneRef.current; if (!s) return;
    const d = dragRef.current;
    if (!d.isDragging) return;
    d.isDragging = false;
    s.renderer.domElement.style.cursor = "grab";
    const m = Math.max(0, TOTAL_WIDTH / 2 + 2);
    gsap.to(s.mainGroup.position, {
      x: THREE.MathUtils.clamp(s.mainGroup.position.x + d.velocity * 15, -m, m),
      duration: 1.0, ease: "power3.out",
    });
  }, []);

  /* ---------- mount ---------- */
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

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      if (!dragRef.current.isDragging && !gsap.isTweening(mainGroup.position)) {
        mainGroup.position.y = Math.sin(performance.now() * 0.00025) * 0.03;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth, hh = container.clientHeight;
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      renderer.setSize(w, hh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose(); scene.clear();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, [initScene, onPointerDown, onPointerMove, onPointerUp]);

  return <div ref={containerRef} className="absolute inset-0 z-[1]" />;
}
