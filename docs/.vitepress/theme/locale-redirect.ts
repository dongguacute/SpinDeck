/** Resolve locale home path from browser languages; fallback is English. */
export function resolveLocaleHomePath(): string {
  if (typeof navigator === "undefined") return "/en/";

  const cookie = document.cookie.match(/(?:^|; )nf_lang=([^;]*)/);
  const cookieLang = cookie?.[1]?.toLowerCase();
  if (cookieLang?.startsWith("zh")) return "/zh/";
  if (cookieLang?.startsWith("en")) return "/en/";

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  const prefersZh = languages.some(
    (lang) => lang?.toLowerCase().startsWith("zh"),
  );

  return prefersZh ? "/zh/" : "/en/";
}
