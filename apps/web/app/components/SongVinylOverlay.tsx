import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { SongInfo } from "../lib/types";

interface Props {
  song: SongInfo;
  visible: boolean;
}

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

const FALLBACK_COLOR = "#6eb5d4";

export default function SongVinylOverlay({ song, visible }: Props) {
  const [vinylColor, setVinylColor] = useState(FALLBACK_COLOR);
  const [labelColor, setLabelColor] = useState(mixHex(FALLBACK_COLOR, "#000", 0.25));

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

  return (
    <div
      className={`song-vinyl-stage ${visible ? "song-vinyl-stage--visible" : "song-vinyl-stage--hidden"}`}
      aria-hidden={!visible}
    >
      <div className="song-vinyl-group">
        <div
          className="song-cd-disc"
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

        <svg
          className="song-tonearm"
          viewBox="0 0 72 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="tonearmMetal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7a7a7a" />
              <stop offset="45%" stopColor="#e8e8e8" />
              <stop offset="100%" stopColor="#9a9a9a" />
            </linearGradient>
          </defs>
          {/* 底座 */}
          <rect x="14" y="0" width="46" height="17" rx="3" fill="#141414" />
          <rect x="14" y="0" width="46" height="4" rx="2" fill="#2a2a2a" />
          {/* 转轴 */}
          <circle cx="37" cy="17" r="5.5" fill="#555" stroke="#2a2a2a" strokeWidth="1.5" />
          {/* 唱臂 */}
          <path
            d="M37 22 L24 148"
            stroke="url(#tonearmMetal)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* 唱头壳 */}
          <g transform="translate(13, 136) rotate(28 12 18)">
            <rect x="0" y="0" width="24" height="36" rx="3" fill="#101010" />
            <rect x="3" y="3" width="18" height="8" rx="1.5" fill="#222" />
            {/* 唱针 */}
            <line x1="12" y1="36" x2="8" y2="48" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}
