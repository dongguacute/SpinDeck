import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
  roundedGeo: THREE.BufferGeometry;
  sharpGeo: THREE.BufferGeometry;
}

/* ============================================================
   常量
   ============================================================ */
const SPINE_THICK = 0.18;
const ALBUM_TALL = 5.0;
const ALBUM_DEEP = 5.0; // 和 ALBUM_TALL 一致，±X 面天生正方形
const GAP = 0.8;
const LEAN_ANGLE = 15 * (Math.PI / 180);
const SELECTED_WORLD_X = -2.0;

const _pivotEuler = new THREE.Euler();
const _pivotQuat = new THREE.Quaternion();
/** +X 封面左下角（Ry -90° 前，z = +AD/2 对应屏幕左下） */
const COVER_FACE_BL = new THREE.Vector3(SPINE_THICK / 2, -ALBUM_TALL / 2, ALBUM_DEEP / 2);

function getCoverPivotLocal(): THREE.Vector3 {
  return COVER_FACE_BL.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
}

function groupPosForPivot(
  pivotWorld: THREE.Vector3,
  rz: number,
  mainGroupPos: THREE.Vector3,
): THREE.Vector3 {
  _pivotEuler.set(0, -Math.PI / 2, rz, "ZYX");
  _pivotQuat.setFromEuler(_pivotEuler);
  const rotated = getCoverPivotLocal().applyQuaternion(_pivotQuat);
  return pivotWorld.clone().sub(mainGroupPos).sub(rotated);
}

function pivotWorldFromGroup(
  groupPos: THREE.Vector3,
  rz: number,
  mainGroupPos: THREE.Vector3,
): THREE.Vector3 {
  _pivotEuler.set(0, -Math.PI / 2, rz, "ZYX");
  _pivotQuat.setFromEuler(_pivotEuler);
  const rotated = getCoverPivotLocal().applyQuaternion(_pivotQuat);
  return mainGroupPos.clone().add(groupPos).add(rotated);
}

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
  onSelectionAnimationComplete?: (index: number) => void;
  onCoverToggle?: () => void;
  selectedIndex: number | null;
  coverOverlay?: boolean;
  /** 播放中：禁止点击空白或再次点击当前书来退出 */
  lockDeselect?: boolean;
}

export default function PlaylistShelf({
  songs,
  onSongSelect,
  onSelectionAnimationComplete,
  onCoverToggle,
  selectedIndex,
  coverOverlay = false,
  lockDeselect = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const lockDeselectRef = useRef(lockDeselect);
  const coverOverlayRef = useRef(coverOverlay);
  const onCoverToggleRef = useRef(onCoverToggle);
  const animatingRef = useRef(false);
  const prevCoverOverlayRef = useRef(coverOverlay);
  const coverPivotWorldRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    lockDeselectRef.current = lockDeselect;
  }, [lockDeselect]);

  useEffect(() => {
    coverOverlayRef.current = coverOverlay;
  }, [coverOverlay]);

  useEffect(() => {
    onCoverToggleRef.current = onCoverToggle;
  }, [onCoverToggle]);

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
    const sharpGeo = new THREE.BoxGeometry(SPINE_THICK, ALBUM_TALL, ALBUM_DEEP);
    const roundedGeo = new RoundedBoxGeometry(SPINE_THICK, ALBUM_TALL, ALBUM_DEEP, 2, 0.5);

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
      const mesh = new THREE.Mesh(sharpGeo, mats);
      group.add(mesh);
      meshes.push(mesh);
      groups.push(group);
      mainGroup.add(group);
    }

    // 存储场景引用
    sceneRef.current = { groups, meshes, mainGroup, originalPositions, totalW, camera, roundedGeo, sharpGeo };

    // 如果场景重建时仍有选中状态，立即应用（无动画）
    const curSel = selectedIndex;
    if (curSel !== null && curSel !== undefined && curSel < groups.length) {
      const selGroup = groups[curSel];
      selGroup.rotation.y = -Math.PI / 2;
      selGroup.rotation.order = "ZYX";
      meshes[curSel].geometry = roundedGeo; // 翻开时切换为圆角几何体
      const overlay = coverOverlayRef.current;
      const mainPos = mainGroup.position.clone();
      const leanPos = new THREE.Vector3(
        SELECTED_WORLD_X - mainPos.x,
        -mainPos.y,
        -mainPos.z,
      );
      const pivotWorld = pivotWorldFromGroup(leanPos, LEAN_ANGLE, mainPos);
      coverPivotWorldRef.current = pivotWorld;
      const pose = groupPosForPivot(pivotWorld, overlay ? 0 : LEAN_ANGLE, mainPos);
      selGroup.position.copy(pose);
      selGroup.rotation.z = overlay ? 0 : LEAN_ANGLE;
      // 左右书滑出画面
      const sd = Math.max(totalW + 8, 14);
      for (let i = curSel - 1; i >= 0; i--) {
        groups[i].position.x = originalPositions[i].x - sd;
      }
      for (let j = curSel + 1; j < groups.length; j++) {
        groups[j].position.x = originalPositions[j].x + sd;
      }
      selectedIndexRef.current = curSel;
      prevCoverOverlayRef.current = overlay;
      onSelectionAnimationComplete?.(curSel);
    }

    // --- 射线点击检测 ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 防止拖拽后误触发 click
    let wasDragged = false;

    const handleClick = (e: MouseEvent) => {
      if (animatingRef.current) return;
      if (wasDragged) { wasDragged = false; return; }
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      const cur = selectedIndexRef.current;
      const locked = lockDeselectRef.current;
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const idx = meshes.indexOf(hitMesh);
        if (idx >= 0) {
          if (cur === idx) {
            if (locked) {
              onCoverToggleRef.current?.();
            } else {
              onSongSelect?.(null, null);
            }
          } else {
            onSongSelect?.(songs[idx], idx);
          }
        }
      } else if (cur !== null && cur !== undefined && !locked) {
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
      const cur = selectedIndexRef.current;
      if (cur !== null && cur !== undefined) {
        const hitSelected =
          intersects.length > 0 && meshes.indexOf(intersects[0].object as THREE.Mesh) === cur;
        renderer.domElement.style.cursor = hitSelected ? "pointer" : "default";
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
      if (Math.abs(nx - groupStart) > 0.3) wasDragged = true;
      mainGroup.position.x = nx;
    };
    window.addEventListener("pointermove", onMove);

    // --- 渲染循环（含立体弧形效果） ---
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // 非选中态才应用弧形弯曲（极微弱，保持平直感）
      if (selectedIndexRef.current === null || selectedIndexRef.current === undefined) {
        const curveStrength = 0.02;
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

    prevCoverOverlayRef.current = false;
    coverPivotWorldRef.current = null;

    const { groups, originalPositions, totalW } = state;
    // 确保书的边缘完全超出屏幕（书深 6.9，屏幕可见宽度约 14）
    const slideDist = Math.max(totalW + 8, 14);

    if (next !== null && next !== undefined) {
      animatingRef.current = true;

      // 停止所有正在进行的动画（拖拽惯性、弯曲效果等）
      gsap.killTweensOf(state.mainGroup.position);
      for (let i = 0; i < groups.length; i++) {
        gsap.killTweensOf(groups[i].position);
        gsap.killTweensOf(groups[i].rotation);
      }

      // 重置所有书本到干净状态（消除拖拽导致的 rotation.y 弯曲和 position.z 偏移）
      for (let i = 0; i < groups.length; i++) {
        groups[i].rotation.set(0, 0, 0);
        groups[i].position.set(
          originalPositions[i].x,
          originalPositions[i].y,
          originalPositions[i].z,
        );
      }

      const flipDuration = 0.5;
      const flipStart = 0.08;

      const group = groups[next];
      let swapped = false;

      // 切换为 ZYX 旋转顺序：rotation.z 绕世界 Z 轴（屏幕平面内旋转）
      group.rotation.order = "ZYX";

      // 记录翻转前的位置，用于以书脊边缘为轴翻转（现在保证是干净值）
      const initPx = group.position.x;
      const initPz = group.position.z;
      const pivotEdge = SPINE_THICK / 2; // 书脊右边缘（+X 面所在边缘）作为翻转轴

      // 以书脊边缘为轴翻转（平面翻页效果，非立体中心旋转）
      gsap.to(group.rotation, {
        y: -Math.PI / 2,
        duration: flipDuration,
        delay: flipStart,
        ease: "power2.inOut",
        onUpdate: () => {
          // 翻转到侧面时（约 -45°），趁看不到封面偷偷换成圆角
          if (!swapped && group.rotation.y < -Math.PI / 4) {
            state.meshes[next].geometry = state.roundedGeo;
            swapped = true;
          }
          // 同步移动位置：让书脊边缘保持固定，形成以边缘为轴的翻页效果
          const theta = group.rotation.y;
          group.position.x = initPx + pivotEdge * (1 - Math.cos(theta));
          group.position.z = initPz + pivotEdge * Math.sin(theta);
        },
        onComplete: () => {
          // 翻转完成后：从当前位置滑动到页面中线偏左 + 左倾 15°
          const worldCenterX = SELECTED_WORLD_X;
          const localCenterX = worldCenterX - state.mainGroup.position.x;
          const localCenterY = 0 - state.mainGroup.position.y;
          const localCenterZ = 0 - state.mainGroup.position.z;

          // 用普通JS对象做动画代理，确保起始值精确可控
          const proxy = {
            px: group.position.x,
            py: group.position.y,
            pz: group.position.z,
            rz: 0,
          };

          gsap.to(proxy, {
            px: localCenterX,
            py: localCenterY,
            pz: localCenterZ,
            rz: LEAN_ANGLE,
            duration: 0.7,
            ease: "power2.out",
            onUpdate: () => {
              group.position.set(proxy.px, proxy.py, proxy.pz);
              group.rotation.z = proxy.rz;
            },
            onComplete: () => {
              animatingRef.current = false;
              prevCoverOverlayRef.current = false;
              coverPivotWorldRef.current = pivotWorldFromGroup(
                group.position.clone(),
                LEAN_ANGLE,
                state.mainGroup.position.clone(),
              );
              if (selectedIndexRef.current === next) {
                onSelectionAnimationComplete?.(next);
              }
            },
          });
        },
      });

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

      // 停止所有正在进行的动画
      gsap.killTweensOf(state.mainGroup.position);
      for (let i = 0; i < groups.length; i++) {
        gsap.killTweensOf(groups[i].position);
        gsap.killTweensOf(groups[i].rotation);
        groups[i].rotation.order = "XYZ"; // 恢复默认旋转顺序
      }

      let swappedBack = false;

      // 所有书恢复原位
      for (let i = 0; i < groups.length; i++) {
        const delay = Math.abs(prev - i) * 0.08;
        gsap.to(groups[i].rotation, {
          y: 0,
          z: 0,
          duration: 0.5,
          delay,
          ease: "power2.inOut",
          onUpdate: () => {
            // 翻回侧面时，切回直角几何体
            if (!swappedBack && groups[i].rotation.y > -Math.PI / 4) {
              for (const m of state.meshes) {
                m.geometry = state.sharpGeo;
              }
              swappedBack = true;
            }
          },
        });
        gsap.to(groups[i].position, {
          x: originalPositions[i].x,
          y: originalPositions[i].y,
          z: 0,
          duration: 1.0,
          delay,
          ease: "power2.inOut",
          onComplete: () => {
            if (i === groups.length - 1) {
              animatingRef.current = false;
            }
          },
        });
      }
    }

    prevIndexRef.current = next;
  }, [selectedIndex]);

  // 播放中点击封面：以左下角为原点，倾斜 ↔ 放平
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || selectedIndex === null || selectedIndex === undefined) {
      prevCoverOverlayRef.current = coverOverlay;
      return;
    }
    if (prevCoverOverlayRef.current === coverOverlay) return;

    const group = state.groups[selectedIndex];
    if (Math.abs(group.rotation.y + Math.PI / 2) > 0.05) {
      prevCoverOverlayRef.current = coverOverlay;
      return;
    }

    const overlay = coverOverlay;
    prevCoverOverlayRef.current = overlay;

    const mainPos = state.mainGroup.position.clone();
    let pivotWorld = coverPivotWorldRef.current;
    if (!pivotWorld) {
      pivotWorld = pivotWorldFromGroup(group.position.clone(), group.rotation.z, mainPos);
      coverPivotWorldRef.current = pivotWorld;
    }

    const targetRz = overlay ? 0 : LEAN_ANGLE;

    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.rotation);

    animatingRef.current = true;
    const proxy = { rz: group.rotation.z };

    gsap.to(proxy, {
      rz: targetRz,
      duration: 0.55,
      ease: "power2.inOut",
      onUpdate: () => {
        group.position.copy(groupPosForPivot(pivotWorld!, proxy.rz, mainPos));
        group.rotation.z = proxy.rz;
      },
      onComplete: () => {
        animatingRef.current = false;
      },
    });
  }, [coverOverlay, selectedIndex]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${coverOverlay ? "z-[3]" : "z-[1]"}`}
    />
  );
}
