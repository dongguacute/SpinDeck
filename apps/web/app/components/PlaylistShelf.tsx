import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import type { SongInfo } from "../lib/types";
import type { RGBAColor } from "@spindeck/picker";

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
   ClientOnly
   ============================================================ */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok ? <>{children}</> : null;
}

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
interface Props { songs: SongInfo[] }

export default function PlaylistShelf({ songs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    for (let i = 0; i < count; i++) {
      const song = songs[i];
      const color = COLORS[i % COLORS.length];
      const group = new THREE.Group();
      group.position.set(-totalW / 2 + i * (SPINE_THICK + GAP) + SPINE_THICK / 2, 0, 0);
      group.userData = { index: i, color, song };

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
      groups.push(group);
      mainGroup.add(group);
    }

    // --- 拖拽 ---
    let dragging = false, startX = 0, groupStart = 0, vel = 0, lastX = 0;

    renderer.domElement.style.cursor = "grab";
    const onDown = (e: PointerEvent) => {
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
      if (!dragging) return;
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

      // 弧形排列 + 动态旋转：每本书根据位置计算Y轴旋转
      const curveStrength = 0.12; // 弧形弯曲强度
      for (const group of groups) {
        // 相对于屏幕中心的归一化位置 (-1 ~ 1)
        const nx = (group.position.x + mainGroup.position.x) / (totalW / 2);
        // 基础弧形旋转
        const baseRotY = nx * curveStrength;
        // 拖动时额外的动态旋转（速度越快越明显）
        const dynamicRotY = vel * 3 * Math.sign(nx) * 0.01;
        // 平滑插值到目标旋转
        const targetRotY = baseRotY + dynamicRotY;
        group.rotation.y += (targetRotY - group.rotation.y) * 0.15;

        // 轻微的Z轴位移，增加纵深感
        const targetZ = Math.abs(nx) * 0.5;
        group.position.z += (targetZ - group.position.z) * 0.1;
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
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [songs]);

  return <div ref={containerRef} className="absolute inset-0 z-[1]" />;
}
