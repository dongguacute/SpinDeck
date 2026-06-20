/**
 * 黑胶落针 UI：唱臂交互 + 光碟视觉反馈。
 * 播放控制全部走 @spindeck/player（落针/抬臂/会话），Mac 端经 /api/* 桥接到本地客户端。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import type { SongInfo, PlatformType } from "../lib/types";
import {
  applyVinylLayoutVars,
  computeVinylLayout,
} from "../lib/vinyl-layout";
import {
  canResumeSong,
  getPlaybackStatus,
  isSameSongInSession,
  markSongPausedByArm,
  markSongStarted,
  pauseSong,
  playSong,
  resumeSong,
} from "@spindeck/player";

interface Props {
  song: SongInfo;
  platform: PlatformType;
  visible: boolean;
  pageSessionId: string;
  /** 唱臂 portal 容器（固定叠层，避免随封面切换跳动） */
  tonearmPortalRef?: React.RefObject<HTMLDivElement | null>;
  tonearmPortalReady?: boolean;
}

const FALLBACK_COLOR = "#6eb5d4";
const ENTER_ANIM_MS = 800;
const DRAG_RANGE_PX = 120;
const SNAP_ON_THRESHOLD = 0.5;
const ARM_REST_DEG = -26;
const ARM_PLAY_DEG = 11;
const SLIDE_PX = 32;
/** 轮询系统播放状态，同步唱臂 / 光碟视觉（如 QQ 音乐内暂停） */
const STATUS_POLL_MS = 800;

function px(url: string) {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(hex: string, target: "#000" | "#fff", amount: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const tr = target === "#000" ? 0 : 255;
  const tg = target === "#000" ? 0 : 255;
  const tb = target === "#000" ? 0 : 255;
  const mix = (c: number, t: number) => Math.round(c + (t - c) * amount);
  return toHex(mix(r, tr), mix(g, tg), mix(b, tb));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function SongVinylOverlay({
  song,
  platform,
  visible,
  pageSessionId,
  tonearmPortalRef,
  tonearmPortalReady = false,
}: Props) {
  const [vinylColor, setVinylColor] = useState(FALLBACK_COLOR);
  const [labelColor, setLabelColor] = useState(mixHex(FALLBACK_COLOR, "#000", 0.25));
  const [interactive, setInteractive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [spinActive, setSpinActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startProgress: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const playRequestRef = useRef(0);
  const playingRef = useRef(false);
  const pendingRef = useRef(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    // pageSessionId 或换歌时重置光碟角度（同页暂停不重置，见 spinActive）
    setSpinActive(false);
  }, [pageSessionId, song]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    pendingRef.current = pendingPlay;
  }, [pendingPlay]);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    const syncLayout = () => {
      const layout = computeVinylLayout(window.innerWidth, window.innerHeight);
      if (stageRef.current) applyVinylLayoutVars(stageRef.current, layout);
      if (tonearmPortalRef?.current) applyVinylLayoutVars(tonearmPortalRef.current, layout);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, [tonearmPortalRef, tonearmPortalReady, visible]);

  const stopPlayback = useCallback(() => {
    playRequestRef.current += 1;
    setPendingPlay(false);
    setPlaying(false);
    markSongPausedByArm(song); // 标记会话，供同页再次落针 resumeSong
    void pauseSong(platform);
  }, [platform, song]);

  useEffect(() => {
    if (!song.cover) return;
    let cancelled = false;

    (async () => {
      try {
        const { pickEdgeColors } = await import("@spindeck/picker");
        const edge = await pickEdgeColors({ content: px(song.cover) });
        const main = toHex(edge.top.r, edge.top.g, edge.top.b);
        if (!cancelled) {
          setVinylColor(main);
          setLabelColor(mixHex(main, "#000", 0.22));
        }
      } catch {
        if (!cancelled) {
          setVinylColor(FALLBACK_COLOR);
          setLabelColor(mixHex(FALLBACK_COLOR, "#000", 0.22));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [song.cover]);

  useEffect(() => {
    if (!visible) {
      setInteractive(false);
      setProgress(0);
      progressRef.current = 0;
      setPlaying(false);
      setPendingPlay(false);
      setDragging(false);
      dragRef.current.active = false;
      if (playingRef.current || pendingRef.current) {
        stopPlayback();
      }
      return;
    }

    // 换歌 / 重进页面（pageSessionId 变）时重置唱臂，播放逻辑由 @spindeck/player 会话区分
    setProgress(0);
    progressRef.current = 0;
    setPlaying(false);
    setPendingPlay(false);
    setInteractive(false);
    const timer = window.setTimeout(() => setInteractive(true), ENTER_ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [visible, song, stopPlayback, pageSessionId]);

  const setArmProgress = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 1);
      const wasOnDisc = progressRef.current >= SNAP_ON_THRESHOLD;
      progressRef.current = next;
      setProgress(next);
      if (
        wasOnDisc &&
        next < SNAP_ON_THRESHOLD &&
        (playingRef.current || pendingRef.current)
      ) {
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  /** 落针：落针即转碟；播放指令走 @spindeck/player，失败再回滚视觉状态 */
  const startPlayback = useCallback(async () => {
    setArmProgress(1);
    const requestId = ++playRequestRef.current;
    setPendingPlay(true);
    setSpinActive(true);
    setPlaying(true);

    try {
      if (canResumeSong(song)) {
        const result = await resumeSong(platform);
        if (playRequestRef.current !== requestId) return;
        setPendingPlay(false);
        if (result.ok && result.playing) {
          markSongStarted(song);
          return;
        }
        setPlaying(false);
        return;
      }

      const result = await playSong(platform, song);
      if (playRequestRef.current !== requestId) return;
      setPendingPlay(false);
      if (result.ok && result.playing) {
        markSongStarted(song);
        return;
      }
      setPlaying(false);
    } catch (err) {
      console.warn("[Vinyl] startPlayback failed", err);
      if (playRequestRef.current !== requestId) return;
      setPendingPlay(false);
      setPlaying(false);
    }
  }, [platform, song, setArmProgress]);

  /** 松手吸附：落针 → startPlayback，抬起 → pauseSong（保留会话） */
  const snapArm = useCallback(
    (value: number) => {
      if (value >= SNAP_ON_THRESHOLD) {
        void startPlayback();
      } else {
        if (playingRef.current || pendingRef.current) {
          stopPlayback();
        }
        setArmProgress(0);
      }
    },
    [setArmProgress, startPlayback, stopPlayback],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startProgress: progressRef.current,
    };
    setDragging(true);
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const deltaX = dragRef.current.startX - e.clientX;
      const deltaY = dragRef.current.startY - e.clientY;
      // 取位移更大的轴（带符号），左/上落针，右/下抬起
      const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
      setArmProgress(dragRef.current.startProgress + delta / DRAG_RANGE_PX);
    },
    [setArmProgress],
  );

  const onPointerUpGlobal = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    snapArm(progressRef.current);
  }, [snapArm]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUpGlobal);
    window.addEventListener("pointercancel", onPointerUpGlobal);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUpGlobal);
      window.removeEventListener("pointercancel", onPointerUpGlobal);
    };
  }, [dragging, onPointerMove, onPointerUpGlobal]);

  /** 实时监测系统播放状态，调整唱臂落针 / 抬起与光碟旋转 */
  const syncTonearmFromSystem = useCallback(async () => {
    if (draggingRef.current || pendingRef.current) return;

    try {
      const status = await getPlaybackStatus(platform, song);
      if (draggingRef.current || pendingRef.current) return;

      if (status.playing) {
        const inSession = isSameSongInSession(song) || canResumeSong(song);
        if (!inSession && progressRef.current < SNAP_ON_THRESHOLD) return;

        if (progressRef.current < SNAP_ON_THRESHOLD) {
          progressRef.current = 1;
          setProgress(1);
        }
        if (!playingRef.current) {
          setPlaying(true);
          setSpinActive(true);
        }
        if (canResumeSong(song)) {
          markSongStarted(song);
        }
      } else {
        const armDown = progressRef.current >= SNAP_ON_THRESHOLD;
        if (!armDown && !playingRef.current) return;

        progressRef.current = 0;
        setProgress(0);
        setPlaying(false);
        if (isSameSongInSession(song) || canResumeSong(song)) {
          markSongPausedByArm(song);
        }
      }
    } catch {
      // 轮询失败时保持当前 UI，不打断用户操作
    }
  }, [platform, song]);

  useEffect(() => {
    if (!visible || !interactive) return;

    void syncTonearmFromSystem();
    const id = window.setInterval(() => void syncTonearmFromSystem(), STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [visible, interactive, syncTonearmFromSystem]);

  const armDeg = ARM_REST_DEG + progress * (ARM_PLAY_DEG - ARM_REST_DEG);
  const slideX = -progress * SLIDE_PX;
  const pickStroke = mixHex(vinylColor, "#000", 0.38);
  const pickHighlight = mixHex(vinylColor, "#fff", 0.32);

  const stageClass = [
    "song-vinyl-stage",
    visible ? "song-vinyl-stage--visible" : "song-vinyl-stage--hidden",
    interactive && "song-vinyl-stage--interactive",
    pendingPlay && "song-vinyl-stage--pending",
    playing && "song-vinyl-stage--playing",
  ]
    .filter(Boolean)
    .join(" ");

  const tonearmPortalClass = [
    "song-tonearm-portal-stage",
    visible ? "song-vinyl-stage--visible" : "song-vinyl-stage--hidden",
    interactive && "song-vinyl-stage--interactive",
  ]
    .filter(Boolean)
    .join(" ");

  const tonearmEl = (
    <div
      className={`song-tonearm-wrap${dragging ? " song-tonearm-wrap--dragging" : ""}`}
      style={
        interactive
          ? { transform: `translateY(-42%) translateX(${slideX}px)` }
          : undefined
      }
      onPointerDown={onPointerDown}
      title="拖动唱臂到唱片上，松手播放"
    >
      <svg
        className="song-tonearm"
        viewBox="0 0 64 196"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="16" y="0" width="32" height="5" rx="2.5" fill="var(--tonearm-mount)" />
        <circle cx="32" cy="9" r="3.5" stroke="var(--tonearm-pivot-stroke)" strokeWidth="1.25" />
        <circle cx="32" cy="9" r="1.25" fill="var(--tonearm-pivot-fill)" />
        <g
          className="song-tonearm-arm-group"
          style={interactive ? { transform: `rotate(${armDeg}deg)` } : undefined}
        >
          <path
            d="M32 13 C30 52 22 98 16 138"
            stroke="var(--tonearm-arm)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g transform="translate(6, 128) rotate(18 13 30)">
            <rect
              x="3"
              y="0"
              width="20"
              height="48"
              rx="10"
              fill={vinylColor}
              opacity="0.35"
            />
            <rect
              x="5"
              y="2"
              width="16"
              height="44"
              rx="8"
              fill={vinylColor}
              stroke={pickStroke}
              strokeWidth="1.2"
            />
            <rect
              x="8"
              y="10"
              width="10"
              height="3"
              rx="1.5"
              fill={pickHighlight}
              opacity="0.9"
            />
            <line
              x1="13"
              y1="46"
              x2="11"
              y2="68"
              stroke="var(--tonearm-needle)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="11" cy="70" r="2.75" fill={vinylColor} stroke={pickStroke} strokeWidth="1" />
            <circle cx="11" cy="70" r="1.1" fill={pickHighlight} />
          </g>
        </g>
      </svg>
    </div>
  );

  const useTonearmPortal = visible && tonearmPortalReady && !!tonearmPortalRef?.current;
  const portaledTonearm =
    useTonearmPortal &&
    createPortal(
      <div className={tonearmPortalClass} aria-hidden={!visible}>
        <div className="song-vinyl-group song-vinyl-group--arm-only">{tonearmEl}</div>
      </div>,
      tonearmPortalRef.current!,
    );

  return (
    <>
      <div ref={stageRef} className={stageClass} aria-hidden={!visible}>
        <div className="song-vinyl-group">
          <div
            className={`song-cd-disc${spinActive ? " song-cd-disc--spin" : ""}`}
            style={{
              ["--vinyl-color" as string]: vinylColor,
              ["--vinyl-label-color" as string]: labelColor,
            }}
          >
            <div className="song-cd-grooves" aria-hidden />
            <div className="song-cd-grooves song-cd-grooves--fine" aria-hidden />
            <div className="song-cd-sheen" aria-hidden />

            <div className="song-cd-play-icon" aria-hidden>
              <Play strokeWidth={1.5} fill="currentColor" />
            </div>

            <div className="song-cd-center">
              <p className="song-cd-title">{song.name}</p>
              <p className="song-cd-artist">{song.artist}</p>
            </div>

            <div className="song-cd-hole" />
          </div>

          {!useTonearmPortal && tonearmEl}
        </div>
      </div>
      {portaledTonearm}
    </>
  );
}
