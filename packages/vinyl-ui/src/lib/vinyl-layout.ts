/** 与 PlaylistShelf 相机 / 封面尺寸保持一致 */
export const SHELF_CAM_Z = 12;
/** 光碟布局参考相机距离 */
export const SHELF_CAM_Z_PLAYBACK = 9.4;
/** 播放态 3D 封面相对再缩小一点（不影响光碟基准） */
export const PLAYBACK_COVER_SCALE = 1.0; // 调大，让封面更大
export const SHELF_FOV_DEG = 38;
export const SHELF_ALBUM_TALL = 5;
/** 播放态封面基准世界坐标 X */
export const COVER_BASE_WORLD_X = -0.88;
/** 封面额外左移：约三指宽（像素） */
export const COVER_LEFT_SHIFT_PX = 40; // 稍微减小偏移，让整体更集中
/** 光碟额外左移（像素） */
export const VINYL_LEFT_SHIFT_PX = 24; // 稍微减小偏移
/** 光碟相对基准略放大 */
export const VINYL_SIZE_SCALE = 1.18; // 显著调大，让光碟更霸气
/** 唱臂高度比例（相对光碟直径） */
export const TONEARM_HEIGHT_RATIO = 0.96; // 调大唱臂
/** 封面 + 光碟整组左移（像素） */
export const PLAYBACK_GROUP_SHIFT_PX = 12; // 进一步减小整体偏移，让内容更靠中
export const SHELF_LOOK_Y_PLAYBACK = -0.38;

/** 顶部 UI + 上下安全边距 */
const getPlaybackChromePx = (viewportH: number) => (viewportH < 500 ? 8 : 64);
/** 左右安全边距 */
const getPlaybackEdgePx = (viewportW: number) => (viewportW < 800 ? 4 : 40);

/** 唱臂向右探出（相对光碟直径） */
const TONEARM_RIGHT_OVERHANG = 0.18;
const TONEARM_WIDTH_RATIO = TONEARM_RIGHT_OVERHANG + TONEARM_HEIGHT_RATIO * (40 / 140);
/** 垂直占用：光碟 + 唱臂（相对直径） */
const VINYL_VERTICAL_RATIO = 1.05; // 进一步压缩垂直预留，让光碟更大
/** 封面 + 间距 + 光碟 + 唱臂（相对光碟直径） */
const GROUP_WIDTH_RATIO = 2 + 0.035 + TONEARM_WIDTH_RATIO;

export interface VinylLayout {
  size: number;
  offsetX: number;
}

function shelfVisibleHeight(camZ: number) {
  const fovRad = (SHELF_FOV_DEG * Math.PI) / 180;
  return 2 * camZ * Math.tan(fovRad / 2);
}

function coverPixelHeight(viewportH: number, camZ: number) {
  return (SHELF_ALBUM_TALL / shelfVisibleHeight(camZ)) * viewportH;
}

function shelfWorldPerPixel(viewportW: number, viewportH: number, camZ = SHELF_CAM_Z_PLAYBACK) {
  const visibleH = shelfVisibleHeight(camZ);
  return (visibleH * (viewportW / viewportH)) / viewportW;
}

/** 根据视口自适应播放态相机距离，避免封面/光碟溢出 */
export function fitPlaybackCameraZ(viewportW: number, viewportH: number): number {
  let z = SHELF_CAM_Z_PLAYBACK / PLAYBACK_COVER_SCALE;
  const chromePx = getPlaybackChromePx(viewportH);
  const edgePx = getPlaybackEdgePx(viewportW);
  
  const usableH = Math.max(240, viewportH - chromePx);
  const usableW = Math.max(320, viewportW - edgePx * 2);

  const coverH = coverPixelHeight(viewportH, z);
  const heightBudget = usableH / VINYL_VERTICAL_RATIO;
  if (coverH > heightBudget) {
    z *= coverH / heightBudget;
  }

  const coverH2 = coverPixelHeight(viewportH, z);
  const groupW = coverH2 * GROUP_WIDTH_RATIO;
  if (groupW > usableW) {
    z *= groupW / usableW;
  }

  return z;
}

/** 播放态 3D 封面相机距离 */
export function shelfCoverPlaybackCamZ(viewportW?: number, viewportH?: number): number {
  if (viewportW == null || viewportH == null) {
    return SHELF_CAM_Z_PLAYBACK / PLAYBACK_COVER_SCALE;
  }
  return fitPlaybackCameraZ(viewportW, viewportH);
}

/** 播放态封面 X */
export function computeCoverSelectedWorldX(viewportW: number, viewportH: number) {
  const shiftPx = COVER_LEFT_SHIFT_PX + PLAYBACK_GROUP_SHIFT_PX;
  return COVER_BASE_WORLD_X - shiftPx * shelfWorldPerPixel(viewportW, viewportH);
}

function clampOffsetX(
  offsetX: number,
  size: number,
  gap: number,
  viewportW: number,
  edgePx: number,
): number {
  const centerX = viewportW / 2 + offsetX;
  const tonearmRight = size * TONEARM_WIDTH_RATIO;
  const rightEdge = centerX + size / 2 + tonearmRight;
  if (rightEdge > viewportW - edgePx) {
    offsetX -= Math.round(rightEdge - (viewportW - edgePx));
  }

  const leftEdge = centerX - size / 2 - size - gap;
  if (leftEdge < edgePx) {
    offsetX += Math.round(edgePx - leftEdge);
  }

  return offsetX;
}

/** 播放页光碟尺寸与位置（约束在视口内完整显示） */
export function computeVinylLayout(viewportW: number, viewportH: number): VinylLayout {
  const chromePx = getPlaybackChromePx(viewportH);
  const edgePx = getPlaybackEdgePx(viewportW);
  
  const usableH = Math.max(240, viewportH - chromePx);
  const usableW = Math.max(320, viewportW - edgePx * 2);

  const adaptiveCamZ = fitPlaybackCameraZ(viewportW, viewportH);
  const coverPxRef = coverPixelHeight(viewportH, SHELF_CAM_Z_PLAYBACK);
  const coverPxScaled = coverPixelHeight(viewportH, adaptiveCamZ);

  const maxBaseFromHeight = usableH / VINYL_VERTICAL_RATIO / VINYL_SIZE_SCALE;
  const shiftTotal = VINYL_LEFT_SHIFT_PX + PLAYBACK_GROUP_SHIFT_PX;
  const maxBaseFromWidth =
    (usableW - shiftTotal) / GROUP_WIDTH_RATIO / VINYL_SIZE_SCALE;

  let baseSize = Math.min(
    coverPxRef,
    coverPxScaled,
    maxBaseFromHeight,
    maxBaseFromWidth,
    800, // 调大上限
  );
  baseSize = Math.max(160, baseSize);

  let size = Math.round(baseSize * VINYL_SIZE_SCALE);
  let gap = Math.max(8, size * 0.035);

  const groupW = size * 2 + gap + size * TONEARM_WIDTH_RATIO;
  const groupH = size * VINYL_VERTICAL_RATIO;
  const fit = Math.min(1, usableW / groupW, usableH / groupH);
  if (fit < 1) {
    size = Math.max(160, Math.round(size * fit));
    gap = Math.max(8, size * 0.035);
  }

  const blockW = size * 2 + gap;
  const blockLeft = (viewportW - blockW) * 0.5 + size * 0.04;
  const vinylCenterX = blockLeft + size + gap + size * 0.5;
  let offsetX = Math.round(vinylCenterX - viewportW * 0.5) - shiftTotal;
  offsetX = clampOffsetX(offsetX, size, gap, viewportW, edgePx);

  return { size, offsetX };
}

export function applyVinylLayoutVars(el: HTMLElement, layout: VinylLayout) {
  el.style.setProperty("--vinyl-size", `${layout.size}px`);
  el.style.setProperty("--vinyl-offset-x", `${layout.offsetX}px`);
}
