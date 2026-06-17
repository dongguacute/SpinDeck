import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import type { SongInfo } from "../lib/types";
import type { RGBAColor } from "@spindeck/picker";

/* ============================================================
   场景状态引用
   ============================================================ */
interface SceneState {
  groups: THREE.Group[];
  meshes: THREE.Mesh[];
  mainGroup: THREE.Group;
  originalPositions: { x: number; y: number; z: number }[];
  totalW: number;
  camera: THREE.PerspectiveCamera;
}

/* ============================================================
   常量
   ============================================================ */
const SPINE_THICK = 0.13;
const ALBUM_TALL = 5.0;
const ALBUM_DEEP = 6.9;
const GAP = 0.8;

const COLORS = [
  "#FF4757", "#FF6348", "#FFA502", "#2ED573", "#3742FA",
  "#1E90FF", "#7158E2", "#FF6B81", "#FFC312", "#12CBC4",
];

/* ============================================================
   图片代理
   ============================================================ */
function px(url: string) {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#000" : "#fff";
}

/* ============================================================
   书脊 Canvas — 永远有文字
   ============================================================ */
function spineCanvas(
  name: string,
  artist: string,
  accent: string,
  gradient: RGBAColor[] | null,
): THREE.CanvasTexture {
  const w = 40, h = 1024;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;

  if (gradient && gradient.length) {
    for (let y = 0; y < h; y++) {
      const cl = gradient[Math.floor((y / h) * gradient.length)];
      ctx.fillStyle = `rgb(${cl.r},${cl.g},${cl.b})`;
      ctx.fillRect(0, y, w, 1);
    }
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, h);
  }

  // 装饰线
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, h - 3, w, 3);

  // 根据背景亮度选择文字颜色
  const txt = textColorForBg(accent);

  // 每个字旋转90度：歌名在下、歌手在上，整体居中，自适应完整显示
  const nameChars = [...name.slice(0, 15)];
  const artistChars = [...artist.slice(0, 20)];
  const totalChars = nameChars.length + artistChars.length;
  // 根据可用高度自适应行高（留出少量边距）
  const padding = 8;
  const gap = 4;
  const lineH = Math.min(22, (h - padding * 2 - gap) / totalChars);
  const totalH = totalChars * lineH + gap;
  let y = h / 2 + totalH / 2 - lineH / 2;

  // 歌名字符（先画，靠下方）
  for (const ch of nameChars) {
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = txt;
    ctx.font = `bold ${lineH}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    y -= lineH;
  }

  y -= gap;

  // 歌手名字符（后画，靠上方）
  for (const ch of artistChars) {
    ctx.save();
    ctx.translate(w / 2, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = txt === "#000" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
    ctx.font = `bold ${lineH * 0.95}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    y -= lineH;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ============================================================
   主页
   ============================================================ */
interface Props {
  songs: SongInfo[];
  onSongSelect?: (song: SongInfo | null, index: number | null) => void;
  selectedIndex: number | null;
}

export default function PlaylistShelf({ songs, onSongSelect, selectedIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !songs.length) return;

    console.log(`[Shelf] 开始构建 ${songs.length} 本书`);

    const w = container.clientWidth;
    const h = container.clientHeight;
    const count = songs.length;
    const totalW = count * (SPINE_THICK + GAP) - GAP;

    // --- 场景 ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    mainGroup.position.set(0, 0.0, 0);
    mainGroup.scale.set(1.0, 1.0, 1.0);
    scene.add(mainGroup);

    // --- 创建书本 ---
    const meshes: THREE.Mesh[] = [];
    const groups: THREE.Group[] = [];
    const originalPositions: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < count; i++) {
      const song = songs[i];
      const color = COLORS[i % COLORS.length];
      const group = new THREE.Group();
      const posX = -totalW / 2 + i * (SPINE_THICK + GAP) + SPINE_THICK / 2;
      group.position.set(posX, 0, 0);
      group.userData = { index: i, color, song };
      originalPositions.push({ x: posX, y: 0, z: 0 });

      const geo = new THREE.BoxGeometry(SPINE_THICK, ALBUM_TALL, ALBUM_DEEP);
      const spine = spineCanvas(song.name, song.artist, color, null);

      // 6 面材质：[+X, -X, +Y, -Y, +Z书脊, -Z]
      const mats: THREE.MeshBasicMaterial[] = [
        new THREE.MeshBasicMaterial({ color }),
        new THREE.MeshBasicMaterial({ color }),
        new THREE.MeshBasicMaterial({ color }),
        new THREE.MeshBasicMaterial({ color }),
        new THREE.MeshBasicMaterial({ map: spine }),
        new THREE.MeshBasicMaterial({ color: "#1a1a1a" }),
      ];
      const mesh = new THREE.Mesh(geo, mats);
      group.add(mesh);
      meshes.push(mesh);

      // 正方形封面 plane（初始隐藏，选中翻面后显示）
      const coverPlaneGeo = new THREE.PlaneGeometry(ALBUM_TALL, ALBUM_TALL);
      const coverPlaneMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const coverPlane = new THREE.Mesh(coverPlaneGeo, coverPlaneMat);
      coverPlane.rotation.y = Math.PI / 2; // local 中面向 +X
      coverPlane.position.set(SPINE_THICK / 2 + 0.03, 0, 0);
      coverPlane.visible = false;
      group.add(coverPlane);
      group.userData.coverPlane = coverPlane;

      groups.push(group);
      mainGroup.add(group);
    }

    // 存储场景引用
    sceneRef.current = { groups, meshes, mainGroup, originalPositions, totalW, camera };

    // 如果场景重建时仍有选中状态，立即应用（无动画）
    const curSel = selectedIndex;
    if (curSel !== null && curSel !== undefined && curSel < groups.length) {
      const selGroup = groups[curSel];
      selGroup.rotation.y = -Math.PI / 2;
      // 隐藏书的 box，显示正方形封面
      meshes[curSel].visible = false;
      const cp = selGroup.userData?.coverPlane as THREE.Mesh | undefined;
      if (cp) {
        cp.visible = true;
        (cp.material as THREE.MeshBasicMaterial).opacity = 1;
      }
      // 左右书滑出画面
      const sd = Math.max(totalW + 8, 14);
      for (let i = curSel - 1; i >= 0; i--) {
        groups[i].position.x = originalPositions[i].x - sd;
      }
      for (let j = curSel + 1; j < groups.length; j++) {
        groups[j].position.x = originalPositions[j].x + sd;
      }
      selectedIndexRef.current = curSel;
    }

    // --- 射线点击检测 ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (animatingRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      const cur = selectedIndexRef.current;
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const idx = meshes.indexOf(hitMesh);
        if (idx >= 0) {
          if (cur === idx) {
            onSongSelect?.(null, null);
          } else {
            onSongSelect?.(songs[idx], idx);
          }
        }
      } else if (cur !== null && cur !== undefined) {
        onSongSelect?.(null, null);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    // 鼠标悬停光标
    const handleMouseMove = (e: MouseEvent) => {
      if (animatingRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      if (selectedIndexRef.current !== null && selectedIndexRef.current !== undefined) {
        renderer.domElement.style.cursor = "default";
      } else {
        renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "grab";
      }
    };
    renderer.domElement.addEventListener("mousemove", handleMouseMove);

    // --- 拖拽 ---
    let dragging = false, startX = 0, groupStart = 0, vel = 0, lastX = 0;

    renderer.domElement.style.cursor = "grab";
    const onDown = (e: PointerEvent) => {
      if (selectedIndexRef.current !== null) return;
      dragging = true; startX = e.clientX;
      groupStart = mainGroup.position.x;
      vel = 0; lastX = mainGroup.position.x;
      gsap.killTweensOf(mainGroup.position);
      renderer.domElement.style.cursor = "grabbing";
    };
    renderer.domElement.addEventListener("pointerdown", onDown);

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      const m = Math.max(0, totalW / 2 + 2);
      gsap.to(mainGroup.position, {
        x: THREE.MathUtils.clamp(mainGroup.position.x + vel * 15, -m, m),
        duration: 1.0, ease: "power3.out",
      });
    };
    window.addEventListener("pointerup", onUp);

    const onMove = (e: PointerEvent) => {
      if (!dragging || selectedIndexRef.current !== null) return;
      let nx = groupStart + (e.clientX - startX) * 0.012;
      const m = Math.max(0, totalW / 2 + 2);
      nx = THREE.MathUtils.clamp(nx, -m, m);
      vel = nx - lastX; lastX = nx;
      mainGroup.position.x = nx;
    };
    window.addEventListener("pointermove", onMove);

    // --- 渲染循环（含立体弧形效果） ---
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // 非选中态才应用弧形弯曲
      if (selectedIndexRef.current === null || selectedIndexRef.current === undefined) {
        const curveStrength = 0.12;
        for (const group of groups) {
          const nx = (group.position.x + mainGroup.position.x) / (totalW / 2);
          const baseRotY = nx * curveStrength;
          const dynamicRotY = vel * 3 * Math.sign(nx) * 0.01;
          const targetRotY = baseRotY + dynamicRotY;
          group.rotation.y += (targetRotY - group.rotation.y) * 0.15;
          const targetZ = Math.abs(nx) * 0.5;
          group.position.z += (targetZ - group.position.z) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const cw = container.clientWidth, ch = container.clientHeight;
      camera.aspect = cw / ch; camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener("resize", onResize);

    // --- 异步加载封面 + picker ---
    async function loadOne(i: number) {
      const song = songs[i];
      const mesh = meshes[i];
      const fb = COLORS[i % COLORS.length];
      console.log(`[Shelf] #${i} 加载 "${song.name}" cover=${!!song.cover}`);

      if (!song.cover) return;

      const proxied = px(song.cover);
      let coverTex: THREE.Texture | null = null;
      let mainColor = fb;

      // 并行加载封面 + 取主色
      const [texR, colR] = await Promise.allSettled([
        new Promise<THREE.Texture>((res, rej) => {
          new THREE.TextureLoader().load(proxied,
            (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); },
            undefined, () => rej(new Error("fail")),
          );
        }),
        (async () => {
          const toHex = (cl: RGBAColor) =>
            `#${[cl.r, cl.g, cl.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
          const [{ pickEdgeColors }] = await Promise.all([
            import("@spindeck/picker"),
          ]);
          const e = await pickEdgeColors({ content: proxied });
          return toHex(e.top);
        })(),
      ]);

      if (texR.status === "fulfilled") coverTex = texR.value;
      if (colR.status === "fulfilled") mainColor = colR.value;

      // 重建书脊（用主色）
      const newSpine = spineCanvas(song.name, song.artist, mainColor, null);
      const coverMat = coverTex
        ? new THREE.MeshBasicMaterial({ map: coverTex })
        : new THREE.MeshBasicMaterial({ color: mainColor });

      mesh.material = [
        coverMat,
        coverMat,
        new THREE.MeshBasicMaterial({ color: mainColor }),
        new THREE.MeshBasicMaterial({ color: mainColor }),
        new THREE.MeshBasicMaterial({ map: newSpine }),
        coverMat,
      ];

      // 更新封面 plane 纹理
      const cp = groups[i]?.userData?.coverPlane as THREE.Mesh | undefined;
      if (cp && coverTex) {
        cp.material = new THREE.MeshBasicMaterial({
          map: coverTex,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
      }

      console.log(`[Shelf] #${i} 完成 cover=${!!coverTex} mainColor=${mainColor}`);
    }

    const CONC = 2;
    let idx = 0;
    let done = 0;
    const worker = async () => {
      while (idx < songs.length) {
        const i = idx++;
        await loadOne(i);
        done++;
        console.log(`[Shelf] 进度 ${done}/${songs.length}`);
      }
    };
    for (let n = 0; n < Math.min(CONC, songs.length); n++) worker();

    // --- 清理 ---
    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      prevIndexRef.current = null;
    };
  }, [songs]);

  // --- 响应选中状态变化，执行 3D 动画 ---
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;

    const prev = prevIndexRef.current;
    const next = selectedIndex;
    selectedIndexRef.current = next;

    if (prev === next) return;

    const { groups, meshes, originalPositions, totalW } = state;
    // 确保书的边缘完全超出屏幕（书深 6.9，屏幕可见宽度约 14）
    const slideDist = Math.max(totalW + 8, 14);

    if (next !== null && next !== undefined) {
      animatingRef.current = true;

      // 翻转几乎和滑出同时开始，趁书移动掩护快速完成
      const flipDuration = 0.5;
      const flipStart = 0.08;

      const group = groups[next];
      const mesh = meshes[next];
      const cp = group.userData?.coverPlane as THREE.Mesh | undefined;

      // 1. 翻转前：封面 plane 就位但完全透明
      if (cp) {
        cp.visible = true;
        (cp.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      // 2. 翻转动画（box 全程可见，能看到 3D 旋转过程）
      gsap.to(group.rotation, {
        y: -Math.PI / 2,
        duration: flipDuration,
        delay: flipStart,
        ease: "power2.inOut",
        onComplete: () => {
          // 翻转完成后隐藏 box，留封面 plane
          mesh.visible = false;
          animatingRef.current = false;
        },
      });

      // 3. 翻转过半时封面渐显（约在旋转到 40% 时开始叠入）
      if (cp) {
        gsap.to(cp.material, {
          opacity: 1,
          duration: flipDuration * 0.55,
          delay: flipStart + flipDuration * 0.4,
          ease: "power2.in",
        });
      }

      // 左侧书向左滑出画面（立即开始，慢速）
      for (let i = next - 1; i >= 0; i--) {
        gsap.to(groups[i].position, {
          x: originalPositions[i].x - slideDist,
          duration: 1.0,
          delay: (next - i) * 0.08,
          ease: "power3.out",
        });
      }

      // 右侧书向右滑出画面（立即开始，慢速）
      for (let j = next + 1; j < groups.length; j++) {
        gsap.to(groups[j].position, {
          x: originalPositions[j].x + slideDist,
          duration: 1.0,
          delay: (j - next) * 0.08,
          ease: "power3.out",
        });
      }
    } else if (prev !== null && prev !== undefined) {
      animatingRef.current = true;

      // 恢复书的 box，隐藏封面 plane
      meshes[prev].visible = true;
      const prevGroup = groups[prev];
      const prevCp = prevGroup.userData?.coverPlane as THREE.Mesh | undefined;
      if (prevCp) {
        const mat = prevCp.material as THREE.MeshBasicMaterial;
        gsap.to(mat, { opacity: 0, duration: 0.25 });
        setTimeout(() => { prevCp.visible = false; }, 270);
      }

      // 所有书恢复原位
      for (let i = 0; i < groups.length; i++) {
        const delay = Math.abs(prev - i) * 0.08;
        gsap.to(groups[i].rotation, {
          y: 0,
          duration: 0.5,
          delay,
          ease: "power2.inOut",
        });
        gsap.to(groups[i].position, {
          x: originalPositions[i].x,
          z: 0,
          duration: 1.0,
          delay,
          ease: "power2.inOut",
          onComplete: () => {
            if (i === groups.length - 1) animatingRef.current = false;
          },
        });
      }
    }

    prevIndexRef.current = next;
  }, [selectedIndex]);

  return <div ref={containerRef} className="absolute inset-0 z-[1]" />;
}
