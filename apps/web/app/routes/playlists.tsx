import { useState } from "react";
import { Plus, Disc3, Settings } from "lucide-react";
import PlaylistCard from "../components/PlaylistCard";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import { usePlaylistStore } from "../lib/playlist-store";
import { Link } from "react-router";

export default function Playlists() {
  const { playlists, addPlaylist, removePlaylist, updatePlaylist } = usePlaylistStore();

  const handleUpdateRefresh = (id: string, interval: number) => {
    updatePlaylist(id, { refreshInterval: interval });
  };
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b transition-colors duration-200" style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
        boxShadow: "var(--shadow-card)",
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors duration-200"
              style={{
                background: "linear-gradient(to bottom right, var(--surface-hover), var(--surface-color))",
                borderColor: "var(--border-color)",
              }}
            >
              <Disc3 className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <h1 className="font-semibold text-base tracking-wide" style={{ color: "var(--text-primary)", opacity: 0.8 }}>
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
              创建歌单
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {playlists.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mb-6 transition-colors duration-200"
              style={{ background: "var(--surface-color)", borderColor: "var(--border-color)" }}
            >
              <Disc3 className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
            </div>
            <h2 className="text-lg font-medium mb-2" style={{ color: "var(--text-secondary)", opacity: 0.45 }}>
              还没有歌单
            </h2>
            <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.45 }}>
              创建你的第一个歌单，开始整理你喜欢的音乐
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
              创建第一个歌单
            </button>
          </div>
        ) : (
          /* 歌单网格 */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onDelete={removePlaylist}
                onUpdateRefresh={handleUpdateRefresh}
              />
            ))}
          </div>
        )}
      </main>

      {/* 创建歌单弹窗 */}
      <CreatePlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addPlaylist}
      />
    </div>
  );
}
