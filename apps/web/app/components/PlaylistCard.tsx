import { Link } from "react-router";
import { Music, Trash2, Disc3 } from "lucide-react";
import type { Playlist } from "../lib/types";
import { PLATFORM_CONFIG } from "../lib/types";

interface Props {
  playlist: Playlist;
  onDelete: (id: string) => void;
}

export default function PlaylistCard({ playlist, onDelete }: Props) {
  const cfg = PLATFORM_CONFIG[playlist.platform];

  return (
    <Link
      to={`/shelf/${playlist.id}`}
      className="group relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 block cursor-pointer"
    >
      {/* 封面区域 */}
      <div className="aspect-square relative overflow-hidden">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
            <Disc3 className="w-12 h-12 text-white/10" />
          </div>
        )}

        {/* 悬浮遮罩 + 删除按钮 */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(playlist.id);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors backdrop-blur-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>

        {/* 平台标签 */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md"
          style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
          {cfg.label}
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-4">
        <h3 className="text-white/90 font-medium text-sm truncate leading-snug">
          {playlist.name}
        </h3>
        <p className="text-white/30 text-xs mt-1.5">
          {playlist.songCount > 0
            ? `${playlist.songCount} 首歌曲`
            : "空歌单"}
        </p>
      </div>
    </Link>
  );
}
