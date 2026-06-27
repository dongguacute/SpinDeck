import type { DeviceOS, SongInfo } from "../../types";
import { buildQQMusicMacPlayUrls } from "./macos/urls";
import { buildQQMusicDesktopPlayUrls, buildQQMusicDesktopResumeUrls } from "./desktop/urls";
import { buildQQMusicMobilePlayUrls, buildQQMusicMobileResumeUrls } from "./mobile/urls";

/** 按系统构建 QQ 音乐单曲 deep link */
export function buildQQMusicPlayUrls(song: SongInfo, os: DeviceOS): string[] {
  switch (os) {
    case "macos":
      return buildQQMusicMacPlayUrls(song);
    case "ios":
    case "android":
      return buildQQMusicMobilePlayUrls(song, os);
    case "windows":
    case "linux":
      return buildQQMusicDesktopPlayUrls(song);
  }
}

export { buildQQMusicMacPlayUrls } from "./macos/urls";
export { buildQQMusicClientPauseUrls, pickQQMusicMobilePauseUrl } from "./client/urls";
export { buildQQMusicDesktopPlayUrls, buildQQMusicDesktopResumeUrls } from "./desktop/urls";
export {
  buildQQMusicMobilePlayUrls,
  buildQQMusicMobileResumeUrls,
} from "./mobile/urls";
export {
  buildQQMusicAndroidPauseUrls,
  buildQQMusicAndroidResumeUrls,
} from "./mobile/control";

/** 非 Mac 客户端（iOS / Android / Windows / Linux）继续播放 URL */
export function buildQQMusicClientResumeUrls(os: DeviceOS): string[] {
  if (os === "macos") return [];
  if (os === "ios" || os === "android") return buildQQMusicMobileResumeUrls();
  return buildQQMusicDesktopResumeUrls();
}
