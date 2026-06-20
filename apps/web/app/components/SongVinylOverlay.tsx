/**
 * 黑胶落针 UI：唱臂交互 + 光碟视觉反馈。
 * 播放控制全部走 @spindeck/player（落针/抬臂/会话），Mac 端经 /api/* 桥接到本地客户端。
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { SongInfo, PlatformType } from "../lib/types";
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
}

const FALLBACK_COLOR = "#6eb5d4";
const ENTER_ANIM_MS = 800;
const DRAG_RANGE_PX = 120;
const SNAP_ON_THRESHOLD = 0.5;
const ARM_REST_DEG = -26;
const ARM_PLAY_DEG = 11;
const SLIDE_PX = 32;

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

export default function SongVinylOverlay({ song, platform, visible, pageSessionId }: Props) {
  const gradientId = useId().replace(/:/g, "");
  const [vinylColor, setVinylColor] = useState(FALLBACK_COLOR);
  const [labelColor, setLabelColor] = useState(mixHex(FALLBACK_COLOR, "#000", 0.25));
  const [interactive, setInteractive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [spinActive, setSpinActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startProgress: 0 });
  const progressRef = useRef(0);
  const playRequestRef = useRef(0);
  const playingRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    // pageSessionId 或换歌时重置光碟角度（同页暂停不重置，见 spinActive）
    setSpinActive(false);
  }, [pageSessionId, song]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    // 首次开始播放后挂上旋转动画，暂停时仅 animation-play-state: paused
    if (playing) setSpinActive(true);
  }, [playing]);

  useEffect(() => {
    pendingRef.current = pendingPlay;
  }, [pendingPlay]);

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

  /** 落针：@spindeck/player 决策 — 已在播 / 同页继续(resume) / 从头(play) */
  const startPlayback = useCallback(async () => {
    setArmProgress(1);
    setPlaying(false);
    const requestId = ++playRequestRef.current;
    setPendingPlay(true);

    try {
      const status = await getPlaybackStatus(platform, song);
      if (playRequestRef.current !== requestId) return;

      if (status.playing && isSameSongInSession(song)) {
        setPendingPlay(false);
        setPlaying(true);
        return;
      }

      if (canResumeSong(song)) {
        const result = await resumeSong(platform);
        if (playRequestRef.current !== requestId) return;
        setPendingPlay(false);
        if (result.ok && result.playing) {
          markSongStarted(song);
          setPlaying(true);
        }
        return;
      }

      const result = await playSong(platform, song);
      if (playRequestRef.current !== requestId) return;
      setPendingPlay(false);
      if (result.ok && result.playing) {
        markSongStarted(song);
        setPlaying(true);
      }
    } catch (err) {
      console.warn("[Vinyl] startPlayback failed", err);
      if (playRequestRef.current === requestId) setPendingPlay(false);
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

  const armDeg = ARM_REST_DEG + progress * (ARM_PLAY_DEG - ARM_REST_DEG);
  const slideX = -progress * SLIDE_PX;

  const stageClass = [
    "song-vinyl-stage",
    visible ? "song-vinyl-stage--visible" : "song-vinyl-stage--hidden",
    interactive && "song-vinyl-stage--interactive",
    pendingPlay && "song-vinyl-stage--pending",
    playing && "song-vinyl-stage--playing",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stageClass} aria-hidden={!visible}>
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
            <Play className="w-16 h-16" strokeWidth={1.5} fill="currentColor" />
          </div>

          <div className="song-cd-center">
            <p className="song-cd-title">{song.name}</p>
            <p className="song-cd-artist">{song.artist}</p>
          </div>

          <div className="song-cd-hole" />
        </div>

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
            viewBox="0 0 72 190"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7a7a7a" />
                <stop offset="45%" stopColor="#e8e8e8" />
                <stop offset="100%" stopColor="#9a9a9a" />
              </linearGradient>
            </defs>
            <rect x="14" y="0" width="46" height="17" rx="3" fill="#141414" />
            <rect x="14" y="0" width="46" height="4" rx="2" fill="#2a2a2a" />
            <circle cx="37" cy="17" r="5.5" fill="#555" stroke="#2a2a2a" strokeWidth="1.5" />
            <g
              className="song-tonearm-arm-group"
              style={interactive ? { transform: `rotate(${armDeg}deg)` } : undefined}
            >
              <path
                d="M37 22 L24 148"
                stroke={`url(#${gradientId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <g transform="translate(13, 136) rotate(28 12 18)">
                <rect x="0" y="0" width="24" height="36" rx="3" fill="#101010" />
                <rect x="3" y="3" width="18" height="8" rx="1.5" fill="#222" />
                <line x1="12" y1="36" x2="8" y2="48" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
