/**
 * 黑胶落针 UI：唱臂交互 + 光碟视觉反馈。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Tonearm from "./Tonearm";
import type { SongInfo, PlatformType } from "@spindeck/player";
import {
  applyVinylLayoutVars,
  computeVinylLayout,
} from "../lib/vinyl-layout";
import { deriveVinylGlowColor, deriveVinylLabelColor, getContrastColor, hexToRgba } from "../lib/colors";
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
  theme?: "dark" | "light";
  styleName?: string;
  tonearmPortalRef?: React.RefObject<HTMLDivElement | null>;
  tonearmPortalReady?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  autoPlay?: boolean;
  autoPlayToken?: number;
  vinylColor?: string;
  labelColor?: string;
  tonearmTitle?: string;
  playLabel?: string;
  pauseLabel?: string;
}

const FALLBACK_COLOR = "#6eb5d4";
const ENTER_ANIM_MS = 1000;
const DRAG_RANGE_PX = 120;
const SNAP_ON_THRESHOLD = 0.5;
const ARM_REST_DEG = -28;
const ARM_PLAY_DEG = 18;
const PLAY_SYNC_GRACE_MS = 2800;
const STATUS_POLL_MS = 800;

function px(url: string) {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function SongVinylOverlay({
  song,
  platform,
  visible,
  pageSessionId,
  theme = "dark",
  styleName = "classic",
  tonearmPortalRef,
  tonearmPortalReady = false,
  onPlayingChange,
  autoPlay = false,
  autoPlayToken = 0,
  vinylColor: propVinylColor,
  labelColor: propLabelColor,
  tonearmTitle = "拖动唱臂到唱片上，松手播放",
  playLabel = "播放",
  pauseLabel = "暂停",
}: Props) {
  const [internalVinylColor, setInternalVinylColor] = useState(FALLBACK_COLOR);

  const vinylColor = propVinylColor || internalVinylColor;
  const labelColor = useMemo(() => {
    if (propLabelColor) return propLabelColor;
    return deriveVinylLabelColor(vinylColor);
  }, [propLabelColor, vinylColor]);

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

  const stopPlayback = useCallback(() => {
    lastLocalActionAtRef.current = Date.now();
    playRequestRef.current += 1;
    setPendingPlay(false);
    setPlaying(false);
    markSongPausedByArm(song);
    void pauseSong(platform);
    progressRef.current = 0;
    setProgress(0);
  }, [platform, song]);

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

  useEffect(() => {
    setSpinActive(false);
  }, [pageSessionId, song]);

  useEffect(() => {
    playingRef.current = playing;
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

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

  useEffect(() => {
    if (!song.cover) return;
    let cancelled = false;

    (async () => {
      try {
        const { pickEdgeColors } = await import("@spindeck/picker");
        const edge = await pickEdgeColors({ content: px(song.cover) });
        const main = rgbToHex(edge.top.r, edge.top.g, edge.top.b);
        if (!cancelled) {
          setInternalVinylColor(main);
        }
      } catch {
        if (!cancelled) {
          setInternalVinylColor(FALLBACK_COLOR);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [song.cover]);

  function rgbToHex(r: number, g: number, b: number) {
    const toByte = (v: number) => Math.round(v).toString(16).padStart(2, "0");
    return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
  }

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

    setProgress(0);
    progressRef.current = 0;
    setPlaying(false);
    setPendingPlay(false);
    setInteractive(false);
    const timer = window.setTimeout(() => {
      setInteractive(true);
      if (autoPlay) {
        void startPlayback();
      }
    }, ENTER_ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [visible, song, stopPlayback, pageSessionId, autoPlay, autoPlayToken, startPlayback]);

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

  /** 同步唱臂 / 光碟视觉 */
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

      if (localPlaying && inSession && !canResume && withinGrace) return;
      if (!localPlaying && !armDown) return;

      if (localPlaying || armDown) {
        progressRef.current = 0;
        setProgress(0);
        setPlaying(false);
        if (inSession && localPlaying && canResume) return;
        if (inSession && localPlaying) {
          markSongPausedByArm(song);
        }
      }
    } catch {
      // 轮询失败时保持当前 UI
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
    "sd-vinyl-stage",
    `sd-vinyl-style-${styleName}`,
    visible ? "sd-vinyl-stage--visible" : "sd-vinyl-stage--hidden",
    interactive && "sd-vinyl-stage--interactive",
    pendingPlay && "sd-vinyl-stage--pending",
    playing && "sd-vinyl-stage--playing",
  ]
    .filter(Boolean)
    .join(" ");

  const tonearmPortalClass = [
    "sd-vinyl-portal-stage",
    `sd-vinyl-style-${styleName}`,
    visible ? "sd-vinyl-stage--visible" : "sd-vinyl-stage--hidden",
    interactive && "sd-vinyl-stage--interactive",
    pendingPlay && "sd-vinyl-stage--pending",
    playing && "sd-vinyl-stage--playing",
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

  const centerTextStyle = useMemo(
    () => ({
      ["--vinyl-center-text" as string]: getContrastColor(labelColor),
    }),
    [labelColor],
  );

  const tonearmEl = (
    <div
      className={`sd-vinyl-arm-wrap${dragging ? " sd-vinyl-arm-wrap--dragging" : ""}`}
      onPointerDown={onPointerDown}
      title={tonearmTitle}
    >
      <Tonearm className="sd-vinyl-arm" armDeg={armDeg} />
    </div>
  );

  const useTonearmPortal = visible && tonearmPortalReady && !!tonearmPortalRef?.current;
  const portaledTonearm =
    useTonearmPortal &&
    createPortal(
      <div className={tonearmPortalClass} style={glowThemeStyle} aria-hidden={!visible}>
        <div className="sd-vinyl-group sd-vinyl-group--arm-only">{tonearmEl}</div>
      </div>,
      tonearmPortalRef.current!,
    );

  return (
    <>
      <div ref={stageRef} className={stageClass} style={glowThemeStyle} aria-hidden={!visible}>
        <div className="sd-vinyl-group">
          <div className="sd-vinyl-glow" style={glowDiscStyle} aria-hidden />
          <div
            className={`sd-vinyl-disc${spinActive ? " sd-vinyl-disc--spin" : ""}`}
            style={{
              ["--vinyl-color" as string]: vinylColor,
              ["--vinyl-label-color" as string]: labelColor,
            }}
            onClick={onDiscClick}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={playing || pendingPlay ? pauseLabel : playLabel}
            onKeyDown={(e) => {
              if (!interactive) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDiscClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }}
          >
            <div className="sd-vinyl-grooves" aria-hidden />
            <div className="sd-vinyl-grooves sd-vinyl-grooves--fine" aria-hidden />
            <div className="sd-vinyl-sheen" aria-hidden />

            <div className="sd-vinyl-center" style={centerTextStyle}>
              <p className="sd-vinyl-title">{song.name}</p>
              <p className="sd-vinyl-artist">{song.artist}</p>
            </div>

            <div className="sd-vinyl-hole" />
          </div>

          {!useTonearmPortal && tonearmEl}
        </div>
      </div>
      {portaledTonearm}
    </>
  );
}
