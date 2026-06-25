import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { X, Music, ChevronDown, Plus, Link, LoaderCircle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('common');
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
  }, [open, mode]);

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
      name: data.name || t('create_modal.import_from_platform', { platform: PLATFORM_CONFIG[importPlatform].label }),
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

  // 通用样式
  const inputStyle = {
    backgroundColor: "var(--surface-color)",
    borderColor: "var(--border-color)",
    color: "var(--text-primary)",
    opacity: 0.8,
  };
  const labelStyle = { color: "var(--text-muted)" };
  const selectBtnStyle = {
    backgroundColor: "var(--surface-color)",
    borderColor: "var(--border-color)",
  };
  const optionHoverStyle = { background: "var(--surface-hover)" };
  const optionActiveStyle = { background: "var(--surface-color)", color: "var(--text-secondary)", opacity: 0.7 };
  const dropdownBgStyle = { background: "var(--bg-tertiary)", borderColor: "var(--border-color)" };
  const modalBgStyle = { background: "var(--bg-tertiary)", borderColor: "var(--border-color)" };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animState === "in" ? "opacity-100" : "opacity-0"}`} onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div className={`relative w-full max-w-md border rounded-3xl p-6 shadow-2xl transition-all duration-300 ${animState === "in" ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`} 
        style={{
          ...modalBgStyle,
          boxShadow: "var(--shadow-card)",
        }} 
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)", opacity: 0.9 }}><Plus className="w-5 h-5" />{t('create_modal.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-color)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; }}
          ><X className="w-5 h-5" /></button>
        </div>

        <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: "var(--surface-color)" }}>
          <button onClick={() => setMode("manual")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            mode === "manual" ? "" : ""
          }`}
            style={
              mode === "manual"
                ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)", opacity: 0.8 }
                : { color: "var(--text-muted)", opacity: 0.3 }
            }
            onMouseEnter={(e) => { if (mode !== "manual") e.currentTarget.style.opacity = "0.5"; }}
            onMouseLeave={(e) => { if (mode !== "manual") e.currentTarget.style.opacity = "0.3"; }}
          >{t('create_modal.manual_mode')}</button>
          <button onClick={() => setMode("import")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            mode === "import" ? "" : ""
          }`}
            style={
              mode === "import"
                ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)", opacity: 0.8 }
                : { color: "var(--text-muted)", opacity: 0.3 }
            }
            onMouseEnter={(e) => { if (mode !== "import") e.currentTarget.style.opacity = "0.5"; }}
            onMouseLeave={(e) => { if (mode !== "import") e.currentTarget.style.opacity = "0.3"; }}
          >{t('create_modal.import_mode')}</button>
        </div>

        {mode === "manual" && (
          <div className="space-y-5">
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.playlist_name')}</label>
              <div className="relative"><Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('create_modal.playlist_name_placeholder')} className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.music_platform')}</label>
              <div className="relative" ref={dropdownRef}>
                <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCfg.color }} /><span style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{selectedCfg.label}</span></span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                </button>
                {dropdownOpen && <div className="absolute top-full left-0 right-0 mt-1.5 border rounded-xl py-1 shadow-xl z-10 overflow-hidden" style={dropdownBgStyle}>
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setPlatform(p); setDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      platform === p ? "" : ""
                    }`}
                      style={
                        platform === p
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", opacity: 0.7 }
                          : undefined
                      }
                      onMouseEnter={(e) => { if (platform !== p) Object.assign(e.currentTarget.style, optionHoverStyle); }}
                      onMouseLeave={(e) => { if (platform !== p) Object.assign(e.currentTarget.style, optionActiveStyle); }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} /><span style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{cfg.label}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.cover_url')} <span style={{ opacity: 0.35 }}>{t('create_modal.optional')}</span></label>
              <div className="relative"><Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder={t('create_modal.cover_url_placeholder')} className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.songs_count')}</label>
              <input type="number" min={0} value={songCount} onChange={(e) => setSongCount(Math.max(0, Number(e.target.value)))} className="w-full border rounded-xl py-3 px-4 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
              /></div>
            <button onClick={handleManualCreate} disabled={!name.trim()} className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              style={{
                backgroundColor: name.trim() ? selectedCfg.color : "var(--surface-color)",
                color: name.trim() ? "#000" : "var(--text-muted)",
                opacity: name.trim() ? 1 : 0.2,
              }}
            >{t('create_modal.create_btn')}</button>
          </div>
        )}

        {mode === "import" && (
          <div className="space-y-5">
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.music_platform')}</label>
              <div className="relative" ref={importDropdownRef}>
                <button type="button" onClick={() => setImportDropdownOpen(!importDropdownOpen)} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: importSelectedCfg.color }} /><span style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{importSelectedCfg.label}</span></span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${importDropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                </button>
                {importDropdownOpen && <div className="absolute top-full left-0 right-0 mt-1.5 border rounded-xl py-1 shadow-xl z-10 overflow-hidden" style={dropdownBgStyle}>
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setImportPlatform(p); setImportDropdownOpen(false); setImported(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      importPlatform === p ? "" : ""
                    }`}
                      style={
                        importPlatform === p
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", opacity: 0.7 }
                          : undefined
                      }
                      onMouseEnter={(e) => { if (importPlatform !== p) Object.assign(e.currentTarget.style, optionHoverStyle); }}
                      onMouseLeave={(e) => { if (importPlatform !== p) Object.assign(e.currentTarget.style, optionActiveStyle); }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} /><span style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{cfg.label}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.playlist_link')}</label>
              <div className="relative"><Link className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <textarea value={importUrl} onChange={(e) => { setImportUrl(e.target.value); setImported(false); }} placeholder={t('create_modal.playlist_link_placeholder')} rows={2} className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-colors resize-none"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div></div>
            <button onClick={handleImport} disabled={!importUrl.trim() || importing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              style={{
                backgroundColor: importUrl.trim() ? importSelectedCfg.color : "var(--surface-color)",
                color: importUrl.trim() ? "#000" : "var(--text-muted)",
                opacity: importing ? 0.7 : (importUrl.trim() ? 1 : 0.2),
              }}
            >
              {importing ? <><LoaderCircle className="w-4 h-4 animate-spin" />{t('create_modal.getting_info')}</> : t('create_modal.get_info_btn')}
            </button>
            {importError && <div className="rounded-xl p-3 text-xs border" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)", color: "#f87171" }}>{importError}</div>}
            {imported && fetchedData && (
              <div className="border rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium"><Check className="w-3.5 h-3.5" />{t('create_modal.import_success')}</div>
                <div className="flex gap-4">
                  {fetchedData.cover ? <img src={fetchedData.cover} alt="cover" className="w-20 h-20 rounded-xl object-cover border" style={{ borderColor: "var(--border-color)" }} />
                    : <div className="w-20 h-20 rounded-xl border flex items-center justify-center" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)" }}><Music className="w-8 h-8" style={{ color: "var(--text-muted)" }} /></div>}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{fetchedData.name || t('create_modal.unnamed_playlist')}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.3 }}>{(fetchedData.songCount ?? 0) > 0 ? t('shelf.songs_count_with_text', { count: fetchedData.songCount }) : ""}</p>
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                      style={{
                        color: importSelectedCfg.color,
                        backgroundColor: importSelectedCfg.bg || "var(--surface-color)",
                      }}
                    >{importSelectedCfg.label}</p>
                  </div>
                </div>
                <button onClick={handleImportCreate} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer" style={{ backgroundColor: importSelectedCfg.color, color: "#000" }}>{t('create_modal.add_to_shelf')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
