import { Disc3, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export default function NotFound() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen desktop-page-chrome flex items-center justify-center transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
      <main className="max-w-md w-full px-6 py-12 text-center">
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center animate-spin-slow transition-colors duration-200"
            style={{ 
              background: "var(--surface-color)", 
              borderColor: "var(--border-color)",
              animationDuration: '8s'
            }}
          >
            <Disc3 className="w-16 h-16" style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg"
            style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-highlight)", color: "var(--text-primary)" }}
          >
            <span className="font-bold text-lg">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 tracking-tight" style={{ color: "var(--text-primary)" }}>
          {t('not_found.title')}
        </h1>
        
        <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
          {t('not_found.description')}
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 cursor-pointer shadow-raised border"
          style={{ 
            backgroundColor: "var(--bg-tertiary)", 
            color: "var(--text-primary)",
            borderColor: "var(--border-highlight)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = "var(--surface-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
          }}
        >
          <Home className="w-5 h-5" />
          {t('not_found.back_home')}
        </Link>
      </main>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}} />
    </div>
  );
}
