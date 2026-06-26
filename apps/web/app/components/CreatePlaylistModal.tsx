import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { X, Music, ChevronDown, Plus, Link, LoaderCircle, Check, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { PlatformType, SongInfo } from "../lib/types";
import { PLATFORM_CONFIG } from "../lib/types";
import QQMusicIcon from "../assets/icons/QQMusicIcon.svg?react";
import NetEaseMusicIcon from "../assets/icons/NetEaseMusicIcon.svg?react";

interface CreateData {
  name: string;
  platform: PlatformType;
  coverUrl: string;
  songCount: number;
  importUrl: string;
  refreshInterval?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateData) => void;
}

const PLATFORMS: PlatformType[] = [
  "QQMusic", "NetEaseMusic", "KugouMusic", "AppleMusic", "Spotify", "YTMusic",
];

const REFRESH_OPTIONS = (t: TFunction) => [
  { label: t('playlist_card.refresh_off'), value: 0 },
  { label: t('playlist_card.refresh_minutes', { count: 5 }), value: 5 * 60 * 1000 },
  { label: t('playlist_card.refresh_minutes', { count: 15 }), value: 15 * 60 * 1000 },
  { label: t('playlist_card.refresh_minutes', { count: 30 }), value: 30 * 60 * 1000 },
  { label: t('playlist_card.refresh_hour'), value: 60 * 60 * 1000 },
];

type Mode = "manual" | "import";

export default function CreatePlaylistModal({ open, onClose, onCreate }: Props) {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<Mode>("manual");
  const [animState, setAnimState] = useState<"in" | "out" | "hidden">("hidden");
  const importFetcher = useFetcher<{
    results?: Array<{
      url: string;
      name?: string;
      cover?: string;
      songCount?: number;
      songs?: SongInfo[];
      error?: string;
    }>;
    error?: string;
  }>();

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<PlatformType>("QQMusic");
  const [coverUrl, setCoverUrl] = useState("");
  const [songCount, setSongCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [importUrl, setImportUrl] = useState("");
  const [importPlatform, setImportPlatform] = useState<PlatformType>("QQMusic");
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [importDropdownDirection, setImportDropdownDirection] = useState<"up" | "down">("down");
  const importDropdownRef = useRef<HTMLDivElement>(null);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [refreshDropdownOpen, setRefreshDropdownOpen] = useState(false);
  const [refreshDropdownDirection, setRefreshDropdownDirection] = useState<"up" | "down">("down");
  const refreshDropdownRef = useRef<HTMLDivElement>(null);
  const [imported, setImported] = useState(false);
  const [previewResults, setPreviewResults] = useState<Array<{
    url: string;
    name?: string;
    cover?: string;
    songCount?: number;
    songs?: SongInfo[];
    error?: string;
    added?: boolean;
  }>>([]);

  const checkDirection = (ref: React.RefObject<HTMLDivElement | null>, setDirection: (dir: "up" | "down") => void) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const neededSpace = 200; // 预估下拉菜单高度
    setDirection(spaceBelow < neededSpace ? "up" : "down");
  };

  const toggleDropdown = () => {
    if (!dropdownOpen) checkDirection(dropdownRef, setDropdownDirection);
    setDropdownOpen(!dropdownOpen);
  };

  const toggleImportDropdown = () => {
    if (!importDropdownOpen) checkDirection(importDropdownRef, setImportDropdownDirection);
    setImportDropdownOpen(!importDropdownOpen);
  };

  const toggleRefreshDropdown = () => {
    if (!refreshDropdownOpen) checkDirection(refreshDropdownRef, setRefreshDropdownDirection);
    setRefreshDropdownOpen(!refreshDropdownOpen);
  };

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
    if (!refreshDropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (refreshDropdownRef.current && !refreshDropdownRef.current.contains(e.target as Node)) setRefreshDropdownOpen(false);
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [refreshDropdownOpen]);

  useEffect(() => {
    if (importFetcher.data && importFetcher.state === "idle" && !importFetcher.data.error) {
      setImported(true);
      if (importFetcher.data.results) {
        setPreviewResults(importFetcher.data.results.map(r => ({ ...r, added: false })));
      }
    }
  }, [importFetcher.data, importFetcher.state]);

  if (animState === "hidden") return null;

  const resetAll = () => {
    setName(""); setPlatform("QQMusic"); setCoverUrl(""); setSongCount(0);
    setImportUrl(""); setImportPlatform("QQMusic"); setImported(false);
    setRefreshInterval(0); setRefreshDropdownOpen(false);
    setPreviewResults([]);
    importFetcher.data = undefined; setMode("manual");
  };

  const handleManualCreate = () => {
    if (!name.trim()) return;
    onCreate({ 
      name: name.trim(), 
      platform, 
      coverUrl: coverUrl.trim(), 
      songCount, 
      importUrl: "",
      refreshInterval 
    });
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
    const validResults = previewResults.filter(r => !r.error && !r.added);
    if (validResults.length === 0) return;
    
    validResults.forEach(res => {
      onCreate({
        name: res.name || t('create_modal.import_from_platform', { platform: t(`platforms.${importPlatform}`) }),
        platform: importPlatform,
        coverUrl: res.cover || "",
        songCount: res.songCount || 0,
        importUrl: res.url,
        refreshInterval,
      });
    });
    
    resetAll(); onClose();
  };

  const handleSingleImport = (index: number) => {
    const res = previewResults[index];
    if (!res || res.error || res.added) return;

    onCreate({
      name: res.name || t('create_modal.import_from_platform', { platform: t(`platforms.${importPlatform}`) }),
      platform: importPlatform,
      coverUrl: res.cover || "",
      songCount: res.songCount || 0,
      importUrl: res.url,
      refreshInterval,
    });

    const next = [...previewResults];
    next[index] = { ...res, added: true };
    setPreviewResults(next);

    // 如果全部都添加了，就关闭弹窗
    if (next.every(r => r.error || r.added)) {
      setTimeout(() => {
        resetAll(); onClose();
      }, 500);
    }
  };

  const selectedCfg = PLATFORM_CONFIG[platform];
  const importSelectedCfg = PLATFORM_CONFIG[importPlatform];
  const importing = importFetcher.state !== "idle";
  const hasValidResults = previewResults.some(r => !r.error && !r.added);
  const importError = importFetcher.data?.error || "";
  const refreshOptions = REFRESH_OPTIONS(t);
  const selectedRefresh = refreshOptions.find(opt => opt.value === refreshInterval) || refreshOptions[0];

  const inputStyle = {
    backgroundColor: "var(--surface-color)",
    borderColor: "var(--border-color)",
    color: "var(--text-primary)",
  };
  const labelStyle = { color: "var(--text-secondary)" };
  const selectBtnStyle = {
    backgroundColor: "var(--surface-color)",
    borderColor: "var(--border-color)",
  };
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
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Plus className="w-5 h-5" />{t('create_modal.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors cursor-pointer hover:bg-[var(--surface-color)] hover:text-[var(--text-secondary)]"
            style={{ color: "var(--text-muted)" }}
          ><X className="w-5 h-5" /></button>
        </div>

        <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: "var(--surface-color)" }}>
          <button onClick={() => setMode("manual")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            mode === "manual" ? "" : "hover:opacity-80"
          }`}
            style={
              mode === "manual"
                ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                : { color: "var(--text-muted)" }
            }
          >{t('create_modal.manual_mode')}</button>
          <button onClick={() => setMode("import")} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            mode === "import" ? "" : "hover:opacity-80"
          }`}
            style={
              mode === "import"
                ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                : { color: "var(--text-muted)" }
            }
          >{t('create_modal.import_mode')}</button>
        </div>

        {mode === "manual" && (
          <div className="space-y-5">
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.playlist_name')}</label>
              <div className="relative"><Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('create_modal.playlist_name_placeholder')} className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.music_platform')}</label>
              <div className="relative" ref={dropdownRef}>
                <button type="button" onClick={toggleDropdown} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5">
                    {platform === "QQMusic" && <QQMusicIcon className="w-4 h-4" />}
                    {platform === "NetEaseMusic" && <NetEaseMusicIcon className="w-4 h-4" />}
                    {platform !== "QQMusic" && platform !== "NetEaseMusic" && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCfg.color }} />
                    )}
                    <span style={{ color: "var(--text-primary)" }}>{t(`platforms.${platform}`)}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                </button>
                {dropdownOpen && <div className={`absolute left-0 right-0 border rounded-xl py-1 shadow-xl z-10 overflow-hidden ${dropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`} style={dropdownBgStyle}>
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setPlatform(p); setDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-[var(--surface-hover)]`}
                      style={
                        platform === p
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                          : { color: "var(--text-primary)" }
                      }
                    >
                      {p === "QQMusic" && <QQMusicIcon className="w-4 h-4" />}
                      {p === "NetEaseMusic" && <NetEaseMusicIcon className="w-4 h-4" />}
                      {p !== "QQMusic" && p !== "NetEaseMusic" && (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      )}
                      <span style={{ color: "var(--text-primary)" }}>{t(`platforms.${p}`)}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.cover_url')} <span style={{ color: "var(--text-muted)" }}>{t('create_modal.optional')}</span></label>
              <div className="relative"><Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
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
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('playlist_card.refresh_interval_label')}</label>
              <div className="relative" ref={refreshDropdownRef}>
                <button type="button" onClick={toggleRefreshDropdown} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5"><Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} /><span style={{ color: "var(--text-primary)" }}>{selectedRefresh.label}</span></span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${refreshDropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                </button>
                {refreshDropdownOpen && <div className={`absolute left-0 right-0 border rounded-xl py-1 shadow-xl z-10 overflow-hidden ${refreshDropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`} style={dropdownBgStyle}>
                  {refreshOptions.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => { setRefreshInterval(opt.value); setRefreshDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-[var(--surface-hover)]`}
                      style={
                        refreshInterval === opt.value
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                          : { color: "var(--text-primary)" }
                      }
                    >
                      <span style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                    </button>
                  ))}
                </div>}
              </div></div>
            <button onClick={handleManualCreate} disabled={!name.trim()} className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
              style={{
                backgroundColor: name.trim() ? selectedCfg.color : "var(--surface-color)",
                color: name.trim() ? "#000" : "var(--text-muted)",
                opacity: name.trim() ? 1 : 0.5,
              }}
            >{t('create_modal.create_btn')}</button>
          </div>
        )}

        {mode === "import" && (
          <div className="space-y-5">
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.music_platform')}</label>
              <div className="relative" ref={importDropdownRef}>
                <button type="button" onClick={toggleImportDropdown} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5">
                    {importPlatform === "QQMusic" && <QQMusicIcon className="w-4 h-4" />}
                    {importPlatform === "NetEaseMusic" && <NetEaseMusicIcon className="w-4 h-4" />}
                    {importPlatform !== "QQMusic" && importPlatform !== "NetEaseMusic" && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: importSelectedCfg.color }} />
                    )}
                    <span style={{ color: "var(--text-primary)" }}>{t(`platforms.${importPlatform}`)}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${importDropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                </button>
                {importDropdownOpen && <div className={`absolute left-0 right-0 border rounded-xl py-1 shadow-xl z-10 overflow-hidden ${importDropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`} style={dropdownBgStyle}>
                  {PLATFORMS.map((p) => { const cfg = PLATFORM_CONFIG[p]; return (
                    <button key={p} type="button" onClick={() => { setImportPlatform(p); setImportDropdownOpen(false); setImported(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-[var(--surface-hover)]`}
                      style={
                        importPlatform === p
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                          : { color: "var(--text-primary)" }
                      }
                    >
                      {p === "QQMusic" && <QQMusicIcon className="w-4 h-4" />}
                      {p === "NetEaseMusic" && <NetEaseMusicIcon className="w-4 h-4" />}
                      {p !== "QQMusic" && p !== "NetEaseMusic" && (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      )}
                      <span style={{ color: "var(--text-primary)" }}>{t(`platforms.${p}`)}</span>
                    </button>
                  );})}
                </div>}
              </div></div>
            <div><label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('create_modal.playlist_link')}</label>
              <div className="relative"><Link className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <textarea value={importUrl} onChange={(e) => { setImportUrl(e.target.value); setImported(false); }} placeholder={t('create_modal.playlist_link_placeholder_multi')} rows={3} className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-colors resize-none"
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
                opacity: importing ? 0.7 : (importUrl.trim() ? 1 : 0.5),
              }}
            >
              {importing ? <><LoaderCircle className="w-4 h-4 animate-spin" />{t('create_modal.getting_info')}</> : t('create_modal.get_info_btn')}
            </button>
            <div className="pt-1">
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>{t('playlist_card.refresh_interval_label')}</label>
              <div className="relative" ref={refreshDropdownRef}>
                <button type="button" onClick={toggleRefreshDropdown} className="w-full flex items-center justify-between border rounded-xl py-3 px-4 text-sm outline-none transition-colors cursor-pointer"
                  style={selectBtnStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <span className="flex items-center gap-2.5"><Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} /><span style={{ color: "var(--text-primary)" }}>{selectedRefresh.label}</span></span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${refreshDropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
                </button>
                {refreshDropdownOpen && <div className={`absolute left-0 right-0 border rounded-xl py-1 shadow-xl z-10 overflow-hidden ${refreshDropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`} style={dropdownBgStyle}>
                  {refreshOptions.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => { setRefreshInterval(opt.value); setRefreshDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-[var(--surface-hover)]`}
                      style={
                        refreshInterval === opt.value
                          ? { backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }
                          : { color: "var(--text-primary)" }
                      }
                    >
                      <span style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                    </button>
                  ))}
                </div>}
              </div>
            </div>
            {importError && <div className="rounded-xl p-3 text-xs border" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)", color: "#f87171" }}>{importError}</div>}
            {imported && previewResults.length > 0 && (
              <div className="border rounded-2xl p-4 space-y-3 max-h-[300px] overflow-y-auto" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" />
                    {t('create_modal.import_success_count', { count: previewResults.filter(r => !r.error).length })}
                  </div>
                  {previewResults.filter(r => !r.error && !r.added).length > 1 && (
                    <button 
                      onClick={handleImportCreate}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                      style={{ backgroundColor: importSelectedCfg.color, color: "#000" }}
                    >
                      {t('create_modal.import_all')}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {previewResults.map((res, idx) => (
                    <div key={idx} className="flex gap-3 items-center p-2 rounded-xl border transition-all" style={{ borderColor: res.error ? "rgba(239,68,68,0.2)" : "var(--border-color)", backgroundColor: res.error ? "rgba(239,68,68,0.05)" : (res.added ? "rgba(16,185,129,0.05)" : "transparent"), opacity: res.added ? 0.6 : 1 }}>
                      {res.cover ? <img src={res.cover} alt="cover" className="w-12 h-12 rounded-lg object-cover border" style={{ borderColor: "var(--border-color)" }} />
                        : <div className="w-12 h-12 rounded-lg border flex items-center justify-center" style={{ backgroundColor: "var(--surface-color)", borderColor: "var(--border-color)" }}><Music className="w-6 h-6" style={{ color: "var(--text-muted)" }} /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: res.error ? "#f87171" : (res.added ? "#34d399" : "var(--text-primary)") }}>{res.error ? res.error : (res.name || t('create_modal.unnamed_playlist'))}</p>
                        {!res.error && <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{(res.songCount ?? 0) > 0 ? t('shelf.songs_count_with_text', { count: res.songCount }) : ""}</p>}
                      </div>
                      {!res.error && !res.added && (
                        <button 
                          onClick={() => handleSingleImport(idx)}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          style={{ color: importSelectedCfg.color }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      {res.added && (
                        <div className="p-1.5 text-emerald-400">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!previewResults.every(r => r.error || r.added) && (
                  <button onClick={handleImportCreate} disabled={!hasValidResults} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: importSelectedCfg.color, color: "#000" }}>{t('create_modal.add_to_shelf')}</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
