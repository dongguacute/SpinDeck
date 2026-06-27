import { Link } from "react-router";
import { Trash2, Disc3, Settings2, X, Clock, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Playlist } from "../lib/types";
import QQMusicIcon from "../assets/icons/QQMusicIcon.svg?react";
import NetEaseMusicIcon from "../assets/icons/NetEaseMusicIcon.svg?react";
import KugouMusicIcon from "../assets/icons/KugouMusicIcon.svg?react";

interface Props {
  playlist: Playlist;
  onDelete: (id: string) => void;
  onUpdateRefresh?: (id: string, interval: number) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const REFRESH_OPTIONS = (t: TFunction) => [
  { label: t('playlist_card.refresh_off'), value: 0 },
  { label: t('playlist_card.refresh_minutes', { count: 5 }), value: 5 * 60 * 1000 },
  { label: t('playlist_card.refresh_minutes', { count: 15 }), value: 15 * 60 * 1000 },
  { label: t('playlist_card.refresh_minutes', { count: 30 }), value: 30 * 60 * 1000 },
  { label: t('playlist_card.refresh_hour'), value: 60 * 60 * 1000 },
];

export default function PlaylistCard({ 
  playlist, 
  onDelete, 
  onUpdateRefresh,
  isSelectionMode = false,
  isSelected = false,
  onSelect
}: Props) {
  const { t } = useTranslation('common');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [dragY, setDragY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const hasRefresh = (playlist.refreshInterval ?? 0) > 0;
  // 检查当前是否使用了自定义时长（不在预设选项中）
  const currentInterval = playlist.refreshInterval ?? 0;
  const refreshOptions = REFRESH_OPTIONS(t);
  const isCustomInterval = !refreshOptions.some((opt) => opt.value === currentInterval) && currentInterval > 0;

  const openModal = () => {
    setShowSettingsModal(true);
    setIsClosing(false);
    setIsOpening(true); // 先渲染为隐藏状态
    // 下一帧再切换到可见，触发 CSS 过渡动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpening(false);
      });
    });
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsOpening(false);
      setShowSettingsModal(false);
    }, 320);
  };

  const handleCustomApply = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0 && onUpdateRefresh) {
      onUpdateRefresh(playlist.id, minutes * 60 * 1000);
      setShowCustomInput(false);
      closeModal();
      setCustomMinutes("");
    }
  };

  return (
    <>
      <div
        onClick={() => {
          if (isSelectionMode && onSelect) {
            onSelect(playlist.id, !isSelected);
          }
        }}
        className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 block cursor-pointer select-none touch-manipulation ${
          isSelectionMode ? "" : "active:scale-[0.96] hover:-translate-y-1"
        }`}
        style={{
          background: "var(--surface-color)",
          borderColor: isSelected ? "var(--border-highlight)" : "var(--border-color)",
          boxShadow: isSelected ? "var(--shadow-raised)" : "var(--shadow-card)",
          transform: isSelected ? "scale(0.98)" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isSelectionMode) {
            e.currentTarget.style.borderColor = "var(--border-highlight)";
            e.currentTarget.style.boxShadow = "var(--shadow-raised)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelectionMode) {
            e.currentTarget.style.borderColor = isSelected ? "var(--border-highlight)" : "var(--border-color)";
            e.currentTarget.style.boxShadow = isSelected ? "var(--shadow-raised)" : "var(--shadow-card)";
          }
        }}
      >
        {!isSelectionMode && (
          <Link
            to={`/shelf/${playlist.id}`}
            className="absolute inset-0 z-0"
          />
        )}

        {/* 封面区域 */}
        <div className="aspect-square relative overflow-hidden pointer-events-none">
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, var(--surface-hover), var(--surface-color))" }}>
              <Disc3 className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
            </div>
          )}

          {/* 多选框 */}
          {isSelectionMode && (
            <div className="absolute top-2.5 left-2.5 z-20">
              <div 
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "bg-emerald-500 border-emerald-500" : "bg-black/20 border-white/40 backdrop-blur-md"
                }`}
              >
                {isSelected && <Check className="w-4 h-4 text-black font-bold" />}
              </div>
            </div>
          )}

        {/* 设置按钮 */}
          {!isSelectionMode && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openModal();
              }}
              className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 active:shadow-inner group/btn pointer-events-auto ${
                hasRefresh ? 'text-emerald-500' : ''
              }`}
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: hasRefresh ? undefined : "var(--text-secondary)",
                boxShadow: "var(--shadow-raised)",
                border: "1px solid var(--border-highlight)",
              }}
              title={t('playlist_card.settings_title')}
            >
              <Settings2 
                className={`w-3.5 h-3.5 transition-transform duration-500 ${!hasRefresh ? 'group-hover/btn:rotate-90' : ''}`} 
                style={hasRefresh ? { animation: 'spin 3s linear infinite' } : undefined} 
              />
            </button>
          )}
          {/* 平台图标 - 仅特定平台显示在右下角 */}
          {playlist.platform === "QQMusic" && (
            <QQMusicIcon className="absolute bottom-2.5 right-2.5 w-10 h-10 drop-shadow-lg pointer-events-none" />
          )}
          {playlist.platform === "NetEaseMusic" && (
            <NetEaseMusicIcon className="absolute bottom-2.5 right-2.5 w-10 h-10 drop-shadow-lg pointer-events-none" />
          )}
          {playlist.platform === "KugouMusic" && (
            <KugouMusicIcon className="absolute bottom-2.5 right-2.5 w-10 h-10 drop-shadow-lg pointer-events-none" />
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3.5 sm:p-4 pointer-events-none">
          <h3 className="font-medium text-sm truncate leading-snug" style={{ color: "var(--text-primary)" }}>
            {playlist.name}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {playlist.songCount > 0
                ? t('shelf.songs_count_with_text', { count: playlist.songCount })
                : t('shelf.empty')}
            </p>
            {hasRefresh && (
              <span className="text-emerald-400/50 text-[10px] flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400/60 animate-pulse" />
                {t('shelf.refreshing')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 设置弹窗 - 手机端底部滑出，PC端居中弹窗 */}
      {(showSettingsModal || isClosing) && (
        <div
          className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isClosing && closeModal()}
        >
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${showSettingsModal ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: "color-mix(in srgb, var(--bg-primary), transparent 40%)" }}
          />

          {/* 弹窗内容 - PC 居中，手机底部全宽，支持下滑关闭 */}
          <div
            className={`relative w-full sm:max-w-sm border rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out ${
              isClosing
                ? 'translate-y-full opacity-0'
                : isOpening
                  ? 'translate-y-full sm:scale-95 sm:opacity-0'
                  : (dragY === 0 ? 'translate-y-0 sm:scale-100 opacity-100' : '')
            }`}
            style={{ 
              background: "var(--bg-tertiary)", 
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
              transform: dragY > 0 && !isClosing ? `translateY(${dragY}px)` : undefined,
              transition: dragY > 0 && !isClosing ? "none" : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              if (isClosing) return;
              const touch = e.touches[0];
              (e.currentTarget as HTMLElement).dataset.startY = String(touch.clientY);
              (e.currentTarget as HTMLElement).dataset.startTime = String(Date.now());
            }}
            onTouchMove={(e) => {
              if (isClosing) return;
              const el = e.currentTarget as HTMLElement;
              const startY = Number(el.dataset.startY);
              if (!startY) return;
              const deltaY = e.touches[0].clientY - startY;
              if (deltaY > 0) {
                el.style.overflowY = 'hidden';
                setDragY(deltaY * 0.5);
              }
            }}
            onTouchEnd={(e) => {
              if (isClosing) return;
              const el = e.currentTarget as HTMLElement;
              el.style.overflowY = '';
              const startY = Number(el.dataset.startY);
              const startTime = Number(el.dataset.startTime);
              if (!startY || !startTime) { setDragY(0); return; }

              const deltaTime = Date.now() - startTime;
              const velocity = dragY / deltaTime;

              // 超过阈值或快速滑动则触发关闭动画
              if (dragY > 80 || velocity > 0.5) {
                closeModal();
              }
              setDragY(0);
            }}
          >
            {/* 手机端拖拽指示器 */}
            <div className="flex sm:hidden justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-secondary)", opacity: 0.2 }} />
            </div>

            {/* 标题栏 - 增大触控区域 */}
            <div className="flex items-center justify-between p-5 pb-4 sm:p-6 sm:pb-5">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Settings2 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />{t('playlist_card.settings_title')}
              </h3>
              <button
                onClick={() => closeModal()}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-color)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mx-5 mb-5 pb-4 border-b sm:mx-6 sm:mb-6 sm:pb-5" style={{ borderColor: "var(--border-color)" }}>
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{playlist.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {playlist.platform === "QQMusic" && <QQMusicIcon className="w-3.5 h-3.5" />}
                {playlist.platform === "NetEaseMusic" && <NetEaseMusicIcon className="w-3.5 h-3.5" />}
                {playlist.platform === "KugouMusic" && <KugouMusicIcon className="w-3.5 h-3.5" />}
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t(`platforms.${playlist.platform}`)} · {playlist.songCount > 0 ? t('shelf.songs_count', { count: playlist.songCount }) : t('shelf.empty')}</p>
              </div>
            </div>

            {/* 自动刷新设置 */}
            {playlist.importUrl && onUpdateRefresh ? (
              <div className="px-5 pb-4 sm:px-6 sm:pb-5">
                <label className="block text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>{t('playlist_card.refresh_interval_label')}</label>
                <div className="space-y-2">
                  {refreshOptions.map((opt) => {
                    const isActive = (playlist.refreshInterval ?? 0) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          onUpdateRefresh(playlist.id, opt.value);
                          setShowCustomInput(false);
                          closeModal();
                        }}
                        className="active:scale-[0.98] w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[48px] border border-transparent"
                        style={
                          isActive
                            ? { backgroundColor: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(16,185,129,0.2)" }
                            : { backgroundColor: "var(--surface-color)", color: "var(--text-secondary)" }
                        }
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--surface-hover)"; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--surface-color)"; } }}
                      >
                        <span>{opt.label}</span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                      </button>
                    );
                  })}

                  {/* 自定义时长 */}
                  <div>
                    {!showCustomInput ? (
                      <button
                        onClick={() => {
                          setShowCustomInput(true);
                          if (isCustomInterval) {
                            setCustomMinutes(String(Math.round(currentInterval / 60000)));
                          } else {
                            setCustomMinutes("");
                          }
                        }}
                        className={`active:scale-[0.98] w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[48px] border border-transparent`}
                        style={
                          isCustomInterval || showCustomInput
                            ? { backgroundColor: "rgba(59,130,246,0.1)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.2)" }
                            : { backgroundColor: "var(--surface-color)", color: "var(--text-secondary)" }
                        }
                        onMouseEnter={(e) => { if (!(isCustomInterval || showCustomInput)) { e.currentTarget.style.background = "var(--surface-hover)"; } }}
                        onMouseLeave={(e) => { if (!(isCustomInterval || showCustomInput)) { e.currentTarget.style.background = "var(--surface-color)"; } }}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('playlist_card.custom')}</span>
                        </div>
                        {isCustomInterval && !showCustomInput && (
                          <span className="text-[11px]" style={{ opacity: 0.7 }}>{t('playlist_card.refresh_minutes', { count: Math.round(currentInterval / 60000) })}</span>
                        )}
                      </button>
                    ) : (
                      <div className="px-4 py-4 rounded-xl border space-y-3" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)" }}>
                        <label className="text-xs" style={{ color: "var(--text-muted)" }}>{t('playlist_card.input_refresh_interval')}</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            max={1440}
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
                            placeholder="例：10"
                            autoFocus
                            className="flex-1 border rounded-lg px-4 py-3 text-base sm:text-sm outline-none focus:border-white/20 transition-colors min-h-[44px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            style={{
                              backgroundColor: "var(--surface-hover)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <button
                            onClick={handleCustomApply}
                            disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
                            className="px-5 py-3 rounded-lg bg-blue-500/90 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
                          >
                            {t('common.confirm')}
                          </button>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t('playlist_card.refresh_range')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t('playlist_card.no_refresh_options')}</p>
              </div>
            )}

            {/* 底部操作区 - 增大按钮高度 */}
            <div className="mt-2 mx-5 pt-5 border-t sm:mx-6 sm:mt-6 sm:pt-5 pb-7 sm:pb-6" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={() => {
                  onDelete(playlist.id);
                  closeModal();
                }}
                className="active:scale-[0.98] w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[52px]"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  color: "#f87171",
                  opacity: 0.7,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.opacity = "0.7"; }}
              >
                <Trash2 className="w-4 h-4" />
                {t('playlist_card.delete_playlist')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
