import { Disc3, X, ExternalLink, Music, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Playlist } from "../../lib/playlist-store";
import type { SongInfo } from "@spindeck/player";
import { PLATFORM_CONFIG } from "../../lib/types";
import QQMusicIcon from "../../assets/icons/QQMusicIcon.svg?react";
import NetEaseMusicIcon from "../../assets/icons/NetEaseMusicIcon.svg?react";

interface DetailModalProps {
  showDetail: boolean;
  setShowDetail: (show: boolean) => void;
  playlist: Playlist | undefined;
  songs: SongInfo[];
  coverUrl: string | undefined;
}

export function DetailModal({
  showDetail,
  setShowDetail,
  playlist,
  songs,
  coverUrl,
}: DetailModalProps) {
  const { t, i18n } = useTranslation('common');
  if (!showDetail || !playlist) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div className="relative w-full max-w-sm border rounded-3xl p-6 shadow-2xl" 
        style={{ 
          background: "var(--bg-tertiary)", 
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }} 
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Disc3 className="w-5 h-5" style={{ color: "var(--text-muted)" }} />{t('shelf.playlist_info')}
          </h3>
          <button
            onClick={() => setShowDetail(false)}
            className="p-2 rounded-xl transition-all cursor-pointer"
            style={{ 
              color: "var(--text-muted)",
              boxShadow: "var(--shadow-raised)",
              border: "1px solid var(--border-highlight)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            onMouseDown={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-pressed)"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {coverUrl && (
          <div className="mb-6 flex justify-center">
            <div className="p-2 rounded-2xl border" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
              <img
                src={coverUrl}
                alt={playlist.name}
                className="w-40 h-40 rounded-xl object-cover"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>{t('shelf.playlist_name')}</label>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{playlist.name}</p>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>{t('shelf.music_platform')}</label>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md"
              style={{
                color: PLATFORM_CONFIG[playlist.platform]?.color || '#fff',
                backgroundColor: PLATFORM_CONFIG[playlist.platform]?.bg || 'var(--surface-color)',
              }}
            >
              {playlist.platform === "QQMusic" && <QQMusicIcon className="w-3.5 h-3.5" />}
              {playlist.platform === "NetEaseMusic" && <NetEaseMusicIcon className="w-3.5 h-3.5" />}
              {playlist.platform !== "QQMusic" && playlist.platform !== "NetEaseMusic" && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLATFORM_CONFIG[playlist.platform]?.color || '#fff' }}
                />
              )}
              {t(`platforms.${playlist.platform}`)}
            </span>
          </div>

          {playlist.importUrl && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>{t('shelf.original_link')}</label>
              <a
                href={playlist.importUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs transition-colors break-all group cursor-pointer"
                style={{ color: "#60a5fa", opacity: 0.7 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#93c5fd", (e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#60a5fa", (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")}
              >
                <span className="truncate flex-1 min-w-0">{playlist.importUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
              </a>
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>{t('shelf.songs_amount')}</label>
            <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
              <Music className="w-3.5 h-3.5" />
              {songs.length > 0 ? t('shelf.songs_count', { count: songs.length }) : playlist.songCount > 0 ? t('shelf.songs_count', { count: playlist.songCount }) : t('shelf.empty')}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)", opacity: 0.25 }}>{t('shelf.create_time')}</label>
            <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
              <Clock className="w-3.5 h-3.5" />
              {new Date(playlist.createdAt).toLocaleString(i18n.language === 'zh-Hans' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
