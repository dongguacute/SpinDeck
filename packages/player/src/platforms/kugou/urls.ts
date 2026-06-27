import type { DeviceOS, SongInfo } from "../../types";

export function buildKugouMacCmdUrl(_cmd: number, _jsonStr: Record<string, unknown>): string {
  return "";
}

export function buildKugouMacListenPayload(_options: unknown): Record<string, unknown> {
  return {};
}

export function buildKugouMacPlayUrls(
  _song: SongInfo,
  _meta?: unknown,
): string[] {
  return [];
}

export const KUGOU_MAC_TOGGLE_PLAY_URL = "";

export function buildKugouPlayUrls(_song: SongInfo, _os: DeviceOS): string[] {
  return [];
}
