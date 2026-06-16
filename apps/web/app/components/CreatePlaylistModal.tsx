import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { X, Music, ChevronDown, Plus, Link, LoaderCircle, Check } from "lucide-react";
import type { PlatformType, SongInfo } from "../lib/types";
import { PLATFORM_CONFIG } from "../lib/types";

interface CreateData {
  name: string;
  platform: PlatformType;
  coverUrl: string;
  songCount: number;
  importUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateData) => void;
}

const PLATFORMS: PlatformType[] = [
  "QQMusic", "NetEaseMusic", "KugouMusic", "AppleMusic", "Spotify", "YTMusic",
];

type Mode = "manual" | "import";

export default function CreatePlaylistModal({ open, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [animState, setAnimState] = useState<"in" | "out" | "hidden">("hidden");
  const importFetcher = useFetcher<{
    name?: string; cover?: string; songCount?: number;
    songs?: SongInfo[]; error?: string;
  }>();

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<PlatformType>("QQMusic");
  const [coverUrl, setCoverUrl] = useState("");
  const [songCount, setSongCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [importUrl, setImportUrl] = useState("");
  const [importPlatform, setImportPlatform] = useState<PlatformType>("QQMusic");
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const importDropdownRef = useRef<HTMLDivElement>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (open) { setAnimState("in");
      const t = setTimeout(() => { if (mode === "manual") nameRef.current?.focus(); }, 100);
      return () => clearTimeout(t);
    } else { setAnimState("out");
      const t = setTimeout(() => setAnimState("hidden"), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [dropdownOpen]);
  useEffect(() => {
    if (!importDropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) setImportDropdownOpen(false);
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [importDropdownOpen]);

  useEffect(() => {
    if (importFetcher.data && importFetcher.state === "idle" && !importFetcher.data.error) setImported(true);
  }, [importFetcher.data, importFetcher.state]);

  if (animState === "hidden") return null;

  const resetAll = () => {
    setName(""); setPlatform("QQMusic"); setCoverUrl(""); setSongCount(0);
    setImportUrl(""); setImportPlatform("QQMusic"); setImported(false);
    importFetcher.data = undefined; setMode("manual");
  };

  const handleManualCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), platform, coverUrl: coverUrl.trim(), songCount, importUrl: "" });
    resetAll(); onClose();
  };

  const handleImport = () => {
    if (!importUrl.trim()) return;
    importFetcher.submit(
      { url: importUrl.trim(), platform: importPlatform },
      { method: "POST", action: "/api/import" },
    );
  };

  const handleImportCreate = () => {
    const data = importFetcher.data;
    if (!data) return;
    onCreate({
      name: data.name || `来自 ${PLATFORM_CONFIG[importPlatform].label} 的歌单`,
      platform: importPlatform,
      coverUrl: data.cover || "",
      songCount: data.songCount || 0,
      importUrl: importUrl.trim(),
    });
    resetAll(); onClose();
  };

  const selectedCfg = PLATFORM_CONFIG[platform];
  const importSelectedCfg = PLATFORM_CONFIG[importPlatform];
  const importing = importFetcher.state !== "idle";
  const fetchedData = importFetcher.data && !importFetcher.data.error ? importFetcher.data : null;
  const importError = importFetcher.data?.error || "";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animState === "in" ? "opacity-100" : "opacity-0"}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md bg-[#141414] border border-white/[0.08] rounded-3xl p-6 shadow-2xl transition-all duration-300 ${animState === "in" ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white/90 text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5" />创建歌单</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex bg-white/[0.04] rounded-xl p-1 mb-6">
          <button onClick={() => setMode("manual")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${mode === "manual" ? "bg-white/[0.1] text-white/80" : "text-white/30 hover:text-white/50"}`}>手动创建</button>
          <button onClick={() => setMode("import")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${mode === "import" ? "bg-white/[0.1] text-white/80" : "text-white/30 hover:text-white/50"}`}>链接导入</button>
        </div>

        {mode === "manual" && (
          <div className="space-y-5">
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">歌单名称</label>
              <div className="relative"><Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入歌单名称…" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors" />
              </div></div>
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">音乐平台</label>
              <div className="relative" ref={dropdownRef}>
                <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 px-4 text-sm outline-none hover:border-white/20 transition-colors cursor-pointer">
                  <span className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCfg.color }} /><span className="text-white/70">{selectedCfg.label}</span></span>
                  <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-1 shadow-xl z-10 overflow-hidden">
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setPlatform(p); setDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${platform === p ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} /><span className="text-white/70">{cfg.label}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">封面图片链接 <span className="text-white/15">（可选）</span></label>
              <div className="relative"><Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors" />
              </div></div>
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">歌曲数量</label>
              <input type="number" min={0} value={songCount} onChange={(e) => setSongCount(Math.max(0, Number(e.target.value)))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 px-4 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors" /></div>
            <button onClick={handleManualCreate} disabled={!name.trim()} className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              style={{ backgroundColor: name.trim() ? selectedCfg.color : "rgba(255,255,255,0.06)", color: name.trim() ? "#000" : "rgba(255,255,255,0.2)" }}>创建歌单</button>
          </div>
        )}

        {mode === "import" && (
          <div className="space-y-5">
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">音乐平台</label>
              <div className="relative" ref={importDropdownRef}>
                <button type="button" onClick={() => setImportDropdownOpen(!importDropdownOpen)} className="w-full flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 px-4 text-sm outline-none hover:border-white/20 transition-colors cursor-pointer">
                  <span className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: importSelectedCfg.color }} /><span className="text-white/70">{importSelectedCfg.label}</span></span>
                  <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${importDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {importDropdownOpen && <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl py-1 shadow-xl z-10 overflow-hidden">
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setImportPlatform(p); setImportDropdownOpen(false); setImported(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${importPlatform === p ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} /><span className="text-white/70">{cfg.label}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-white/40 text-xs font-medium mb-1.5">歌单链接</label>
              <div className="relative"><Link className="absolute left-3.5 top-3.5 w-4 h-4 text-white/25" />
                <textarea value={importUrl} onChange={(e) => { setImportUrl(e.target.value); setImported(false); }} placeholder="粘贴歌单分享链接…" rows={2} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors resize-none" />
              </div></div>
            <button onClick={handleImport} disabled={!importUrl.trim() || importing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              style={{ backgroundColor: importUrl.trim() ? importSelectedCfg.color : "rgba(255,255,255,0.06)", color: importUrl.trim() ? "#000" : "rgba(255,255,255,0.2)", opacity: importing ? 0.7 : 1 }}>
              {importing ? <><LoaderCircle className="w-4 h-4 animate-spin" />正在获取歌单…</> : "获取歌单信息"}
            </button>
            {importError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">{importError}</div>}
            {imported && fetchedData && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium"><Check className="w-3.5 h-3.5" />获取成功</div>
                <div className="flex gap-4">
                  {fetchedData.cover ? <img src={fetchedData.cover} alt="cover" className="w-20 h-20 rounded-xl object-cover border border-white/[0.08]" />
                    : <div className="w-20 h-20 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"><Music className="w-8 h-8 text-white/10" /></div>}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-white/70 text-sm font-medium truncate">{fetchedData.name || "未命名歌单"}</p>
                    <p className="text-white/30 text-xs">{(fetchedData.songCount ?? 0) > 0 ? `${fetchedData.songCount} 首歌曲` : ""}</p>
                    <p className="text-xs inline-block px-2 py-0.5 rounded-md" style={{ color: importSelectedCfg.color, backgroundColor: importSelectedCfg.bg }}>{importSelectedCfg.label}</p>
                  </div>
                </div>
                <button onClick={handleImportCreate} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer" style={{ backgroundColor: importSelectedCfg.color, color: "#000" }}>添加到歌单</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
