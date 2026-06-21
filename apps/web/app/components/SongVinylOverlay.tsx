/**
 * 黑胶落针 UI：唱臂交互 + 光碟视觉反馈。
 * 播放控制全部走 @spindeck/player（落针/抬臂/会话），Mac 端经 /api/* 桥接到本地客户端。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Tonearm from "./Tonearm";
import type { SongInfo, PlatformType } from "../lib/types";
import {
  applyVinylLayoutVars,
  computeVinylLayout,
} from "../lib/vinyl-layout";
import { deriveVinylGlowColor, hexToRgba } from "../lib/theme-color";
import { useThemeStore } from "../lib/theme-store";
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
const ARM_REST_DEG = -28;
const ARM_PLAY_DEG = 18;
/** 本地播放/暂停后，忽略系统状态滞后的宽限期 */
const PLAY_SYNC_GRACE_MS = 2800;
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
  const { theme } = useThemeStore();
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
  const lastLocalActionAtRef = useRef(0);

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
    lastLocalActionAtRef.current = Date.now();
    playRequestRef.current += 1;
    setPendingPlay(false);
    setPlaying(false);
    markSongPausedByArm(song); // 标记会话，供同页再次落针 resumeSong
    void pauseSong(platform);
    progressRef.current = 0;
    setProgress(0);
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
    lastLocalActionAtRef.current = Date.now();
    setArmProgress(1);
    const requestId = ++playRequestRef.current;
    setPendingPlay(true);
    setSpinActive(true);
    setPlaying(true);

    const rollbackVisual = () => {
      progressRef.current = 0;
      setProgress(0);
      setPlaying(false);
      setSpinActive(false);
    };

    try {
      if (canResumeSong(song)) {
        const result = await resumeSong(platform);
        if (playRequestRef.current !== requestId) return;
        setPendingPlay(false);
        if (result.ok && result.playing) {
          markSongStarted(song);
          return;
        }
        rollbackVisual();
        return;
      }

      const result = await playSong(platform, song);
      if (playRequestRef.current !== requestId) return;
      setPendingPlay(false);
      if (result.ok && result.playing) {
        markSongStarted(song);
        return;
      }
      rollbackVisual();
    } catch (err) {
      console.warn("[Vinyl] startPlayback failed", err);
      if (playRequestRef.current !== requestId) return;
      setPendingPlay(false);
      rollbackVisual();
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

  const onDiscClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    if (playingRef.current || pendingRef.current) {
      stopPlayback();
    } else {
      void startPlayback();
    }
  };

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

  /** 实时监测系统播放状态，调整唱臂落针 / 抬起与光碟旋转（仅处理外部变化） */
  const syncTonearmFromSystem = useCallback(async () => {
    if (draggingRef.current || pendingRef.current) return;

    try {
      const status = await getPlaybackStatus(platform, song);
      if (draggingRef.current || pendingRef.current) return;

      const inSession = isSameSongInSession(song);
      const canResume = canResumeSong(song);
      const armDown = progressRef.current >= SNAP_ON_THRESHOLD;
      const localPlaying = playingRef.current;
      const withinGrace = Date.now() - lastLocalActionAtRef.current < PLAY_SYNC_GRACE_MS;

      if (status.playing) {
        // 本地已暂停（canResume），忽略 QQ 音乐延迟上报的 playing
        if (canResume) return;
        if (!inSession && !armDown) return;

        if (!armDown) {
          progressRef.current = 1;
          setProgress(1);
        }
        if (!localPlaying) {
          setPlaying(true);
          setSpinActive(true);
        }
        return;
      }

      // 系统未在播：本地刚触发播放，等待状态跟上
      if (localPlaying && inSession && !canResume && withinGrace) return;

      if (!localPlaying && !armDown) return;

      if (localPlaying || armDown) {
        progressRef.current = 0;
        setProgress(0);
        setPlaying(false);
        if (inSession && localPlaying) {
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
    pendingPlay && "song-vinyl-stage--pending",
    playing && "song-vinyl-stage--playing",
  ]
    .filter(Boolean)
    .join(" ");

  const glowColor = useMemo(
    () => deriveVinylGlowColor(vinylColor, theme),
    [vinylColor, theme],
  );

  const glowThemeStyle = useMemo(
    () => ({ ["--vinyl-glow-color" as string]: glowColor }),
    [glowColor],
  );

  const glowDiscStyle = useMemo(
    () => ({
      ["--vinyl-glow-color" as string]: glowColor,
      background: `radial-gradient(circle, ${hexToRgba(glowColor, 0.48)} 0%, ${hexToRgba(glowColor, 0.28)} 28%, ${hexToRgba(glowColor, 0.12)} 52%, ${hexToRgba(glowColor, 0.04)} 72%, transparent 88%)`,
    }),
    [glowColor],
  );

  const tonearmEl = (
    <div
      className={`song-tonearm-wrap${dragging ? " song-tonearm-wrap--dragging" : ""}`}
      onPointerDown={onPointerDown}
      title="拖动唱臂到唱片上，松手播放"
    >
      <Tonearm className="song-tonearm" armDeg={interactive ? armDeg : ARM_REST_DEG} />
    </div>
  );

  const useTonearmPortal = visible && tonearmPortalReady && !!tonearmPortalRef?.current;
  const portaledTonearm =
    useTonearmPortal &&
    createPortal(
      <div className={tonearmPortalClass} style={glowThemeStyle} aria-hidden={!visible}>
        <div className="song-vinyl-group song-vinyl-group--arm-only">{tonearmEl}</div>
      </div>,
      tonearmPortalRef.current!,
    );

  return (
    <>
      <div ref={stageRef} className={stageClass} style={glowThemeStyle} aria-hidden={!visible}>
        <div className="song-vinyl-group">
          <div className="song-cd-glow" style={glowDiscStyle} aria-hidden />
          <div
            className={`song-cd-disc${spinActive ? " song-cd-disc--spin" : ""}`}
            style={{
              ["--vinyl-color" as string]: vinylColor,
              ["--vinyl-label-color" as string]: labelColor,
            }}
            onClick={onDiscClick}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={playing || pendingPlay ? "暂停" : "播放"}
            onKeyDown={(e) => {
              if (!interactive) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDiscClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }}
          >
            <div className="song-cd-grooves" aria-hidden />
            <div className="song-cd-grooves song-cd-grooves--fine" aria-hidden />
            <div className="song-cd-sheen" aria-hidden />

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
