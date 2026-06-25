import { useRef } from "react";
import { Disc3, X, Image as ImageIcon, Sliders, Check, RotateCcw, Settings2 } from "lucide-react";
import { VinylStylePreview } from "@spindeck/vinyl-ui";
import type { ChromeStyle } from "../../lib/theme-color";
import type { VisualSettings } from "../../lib/theme-store";

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  chrome: ChromeStyle;
  settings: VisualSettings;
  updateSettings: (settings: Partial<VisualSettings>) => void;
  resetSettings: () => void;
  bookThemeColor: string | null;
}

export function SettingsModal({
  showSettings,
  setShowSettings,
  chrome,
  settings,
  updateSettings,
  resetSettings,
  bookThemeColor,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showSettings) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ customBackground: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center p-4" onClick={() => setShowSettings(false)}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      <div 
        className="relative w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 backdrop-blur-2xl"
        style={{ 
          backgroundColor: chrome.surface,
          borderColor: chrome.border,
          borderWidth: "1px",
          color: chrome.text
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 opacity-60" /> 视觉调节
          </h3>
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 rounded-2xl transition-all hover:scale-110 active:scale-90 cursor-pointer"
            style={{ backgroundColor: chrome.surfaceHover, color: chrome.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Disc3 className="w-4 h-4 opacity-40" />
              <label className="text-xs font-bold uppercase tracking-widest opacity-40">光碟样式</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {["classic", "modern"].map((styleId) => (
                <button 
                  key={styleId}
                  onClick={() => updateSettings({ vinylStyle: styleId })}
                  className="relative group transition-all"
                >
                  <div className={`p-4 rounded-3xl border-2 transition-all ${settings.vinylStyle === styleId ? 'scale-100' : 'scale-[0.98] opacity-60 hover:opacity-100 hover:scale-100'}`}
                    style={{ 
                      backgroundColor: chrome.surfaceHover,
                      borderColor: settings.vinylStyle === styleId ? bookThemeColor || chrome.borderHover : 'transparent'
                    }}
                  >
                    <VinylStylePreview
                      styleName={styleId}
                      active={settings.vinylStyle === styleId}
                      onClick={() => {}}
                      color={bookThemeColor || undefined}
                    />
                  </div>
                  {settings.vinylStyle === styleId && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: bookThemeColor || chrome.text, color: '#fff' }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 opacity-40" />
              <label className="text-xs font-bold uppercase tracking-widest opacity-40">自定义背景</label>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl border-2 border-dashed transition-all hover:border-solid cursor-pointer active:scale-[0.98]"
                style={{ 
                  borderColor: chrome.border,
                  backgroundColor: chrome.surfaceHover,
                  color: chrome.textSecondary
                }}
              >
                <div className="p-2 rounded-xl" style={{ backgroundColor: chrome.surface }}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">上传背景图</span>
              </button>
              {settings.customBackground && (
                <button
                  onClick={() => updateSettings({ customBackground: null })}
                  className="p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  title="清除自定义背景"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 opacity-40" />
                <label className="text-xs font-bold uppercase tracking-widest opacity-40">背景模糊度</label>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: chrome.surfaceHover }}>
                {settings.backgroundBlur}<span className="opacity-40 ml-0.5">PX</span>
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backgroundBlur}
                onChange={(e) => updateSettings({ backgroundBlur: parseInt(e.target.value) })}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-current"
                style={{ 
                  background: chrome.border,
                  color: bookThemeColor || chrome.text
                }}
              />
            </div>
          </section>

          <div className="pt-6 border-t" style={{ borderColor: chrome.border }}>
            <button
              onClick={() => {
                if (confirm("确定要重置所有视觉配置吗？")) {
                  resetSettings();
                }
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
              style={{ 
                backgroundColor: chrome.surfaceHover,
                color: chrome.textMuted
              }}
            >
              <RotateCcw className="w-4 h-4" />
              重置所有视觉配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
