import { useState } from "react";
import { Plus, Disc3 } from "lucide-react";
import PlaylistCard from "../components/PlaylistCard";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import { usePlaylistStore } from "../lib/playlist-store";

export default function Playlists() {
  const { playlists, addPlaylist, removePlaylist } = usePlaylistStore();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-white/70" />
            </div>
            <h1 className="text-white/80 font-semibold text-base tracking-wide">
              SpinDeck
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.8)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
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
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6">
              <Disc3 className="w-10 h-10 text-white/10" />
            </div>
            <h2 className="text-white/40 text-lg font-medium mb-2">
              还没有歌单
            </h2>
            <p className="text-white/15 text-sm mb-8 max-w-xs leading-relaxed">
              创建你的第一个歌单，开始整理你喜欢的音乐
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white/70 text-sm font-medium transition-all cursor-pointer border border-white/[0.06] hover:border-white/[0.12]"
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
