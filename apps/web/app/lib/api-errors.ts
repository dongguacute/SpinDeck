import type { TFunction } from "i18next";

/** Map API error codes (and legacy free-text) to i18n messages. */
export function translateApiError(t: TFunction, error?: string, code?: string): string {
  const key = code || error;
  if (!key) return t("api_errors.unknown");

  const known = [
    "MISSING_PARAMS",
    "INVALID_URL",
    "IMPORT_FAILED",
    "BATCH_IMPORT_FAILED",
    "UNSUPPORTED_PLATFORM",
    "PLAYLIST_FETCH_FAILED",
    "METHOD_NOT_ALLOWED",
    "INVALID_JSON",
    "MISSING_SONG",
    "MISSING_SONG_ID",
    "PLAY_FAILED",
    "PAUSE_FAILED",
    "RESUME_FAILED",
    "SET_PLAY_MODE_FAILED",
    "MACOS_ONLY",
    "NEEDS_ACCESSIBILITY",
    "KUGOU_STUB",
    "REDIRECT_FAILED",
    "PARSE_ID_FAILED",
    "RATE_LIMITED",
    "UPSTREAM_ERROR",
  ] as const;

  if ((known as readonly string[]).includes(key)) {
    return t(`api_errors.${key}`);
  }

  // Legacy free-text from older servers — show as-is
  if (error && error !== key) return error;
  return error || t("api_errors.unknown");
}
