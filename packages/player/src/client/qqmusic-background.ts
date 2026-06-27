import { getDeviceOS } from "../device";

export function isMobileQQMusicTarget(): boolean {
  const os = getDeviceOS();
  return os === "ios" || os === "android";
}
