import { useState, useEffect } from "react";
import { Plus, Disc3, Settings, Trash2, CheckSquare, Square, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PlaylistCard from "../components/PlaylistCard";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import { BrandLogo } from "../components/BrandLogo";
import { usePlaylistStore } from "../lib/playlist-store";
import { Link } from "react-router";

export default function Playlists() {
  const { t } = useTranslation('common');
  const { playlists, isLoaded, addPlaylist, removePlaylist, removePlaylists, updatePlaylist } = usePlaylistStore();

  const handleUpdateRefresh = (id: string, interval: number) => {
    updatePlaylist(id, { refreshInterval: interval });
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 动画控制状态
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingMsg, setShowLoadingMsg] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      // 这里的 800ms 是为了确保入场动画完成后，用户能看清提示文字再消失
      // 如果未来改为网络请求，这里会自动等待请求完成
      const timer = setTimeout(() => {
        setIsLoading(false);
        // 延迟关闭文字提示，让它有个“降下去”的过程
        setTimeout(() => setShowLoadingMsg(false), 1200);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // 入场动画延迟开启
      const showTimer = setTimeout(() => setShowLoadingMsg(true), 100);
      return () => clearTimeout(showTimer);
    }
  }, [isLoaded]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === playlists.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(playlists.map(p => p.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(t('playlists.delete_selected_confirm', { count: selectedIds.length }))) {
      removePlaylists(selectedIds);
      setSelectedIds([]);
      setIsSelectionMode(false);
    }
  };

  return (
    <div
      className="min-h-screen desktop-page-chrome transition-colors duration-300"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {isLoading ? (
          /* 中间转圈圈 */
          <div className="flex flex-col items-center justify-center py-48">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : playlists.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mb-6 transition-colors duration-200"
              style={{ background: "var(--surface-color)", borderColor: "var(--border-color)" }}
            >
              <Disc3 className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
            </div>
            <h2 className="text-lg font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              {t('playlists.empty_title')}
            </h2>
            <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t('playlists.empty_description')}
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer border duration-200"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-secondary)",
                borderColor: "var(--border-color)",
              }}
            >
              <Plus className="w-4 h-4" />
              {t('playlists.create_first')}
            </button>
          </div>
        ) : (
          /* 歌单网格 */
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {isSelectionMode 
                  ? t('playlists.selected_count', { count: selectedIds.length }) 
                  : t('playlists.all_playlists', { count: playlists.length })}
              </h2>
              <div className="flex items-center gap-2">
                {isSelectionMode ? (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                      style={{
                        background: "var(--surface-color)",
                        color: "var(--text-secondary)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      {selectedIds.length === playlists.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {selectedIds.length === playlists.length ? t('playlists.deselect_all') : t('playlists.select_all')}
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        borderColor: "rgba(239,68,68,0.2)",
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('playlists.delete_selected')}
                    </button>
                    <button
                      onClick={toggleSelectionMode}
                      className="flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer border"
                      style={{
                        background: "var(--surface-color)",
                        color: "var(--text-secondary)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={toggleSelectionMode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                    style={{
                      background: "var(--surface-color)",
                      color: "var(--text-secondary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {t('playlists.batch_manage')}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onDelete={removePlaylist}
                  onUpdateRefresh={handleUpdateRefresh}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.includes(playlist.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* 加载提示文字 */}
      <div 
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ease-in-out ${
          showLoadingMsg ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] font-medium"
          style={{ 
            color: "var(--text-muted)",
            textShadow: "0 0 20px rgba(0,0,0,0.1)"
          }}
        >
          {isLoading ? t('playlists.fetching') : t('playlists.sync_completed')}
        </div>
      </div>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg px-4 py-3 rounded-2xl border backdrop-blur-lg transition-all duration-300"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <h1 className="font-semibold text-base tracking-wide" style={{ color: "var(--text-primary)" }}>
              SpinDeck
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: "var(--surface-color)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-color)")}
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: "var(--bg-tertiary)", 
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-raised)",
                border: "1px solid var(--border-highlight)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.backgroundColor = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-pressed)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus className="w-4 h-4" />
              {t('playlists.create_playlist')}
            </button>
          </div>
        </div>
      </nav>

      {/* 创建歌单弹窗 */}
      <CreatePlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addPlaylist}
      />
    </div>
  );
}
