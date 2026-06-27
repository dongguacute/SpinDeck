import * as qqMusicMac from "../platforms/qqmusic/macos/server";
import * as neteaseMac from "../platforms/netease/macos/server";
import * as kugouMac from "../platforms/kugou/macos/server";
import type {
  ExecFileAsync,
  PlatformType,
  PlayMode,
  PlayResult,
  SongInfo,
  SystemPlaybackStatus,
} from "../types";
import { buildSongPlayUrls } from "../urls";
import { createNodeExec, nodePlatform } from "./node";

async function getExec(exec?: ExecFileAsync): Promise<ExecFileAsync> {
  return exec ?? createNodeExec();
}

/** 服务端：设置播放模式（循环/随机等） */
export async function serverSetPlayMode(
  platform: PlatformType,
  mode: PlayMode,
  exec?: ExecFileAsync,
): Promise<PlayResult> {
  if (nodePlatform() !== "darwin") {
    return { ok: false, playing: false, error: "仅 macOS 支持服务端控制" };
  }

  if (platform === "QQMusic") {
    return qqMusicMac.setPlayModeOnMac(mode, await getExec(exec));
  }

  if (platform === "NetEaseMusic") {
    return neteaseMac.setPlayModeOnMac(mode, await getExec(exec));
  }

  if (platform === "KugouMusic") {
    return kugouMac.setPlayModeOnMac(mode, await getExec(exec));
  }

  return { ok: true, playing: false, method: "noop" };
}

/** 服务端：从头播放 */
export async function serverPlaySong(
  platform: PlatformType,
  song: SongInfo,
  exec?: ExecFileAsync,
): Promise<PlayResult> {
  if (nodePlatform() !== "darwin") {
    return { ok: false, playing: false, error: "仅 macOS 支持服务端唤起" };
  }

  if (platform === "QQMusic") {
    return qqMusicMac.playSongOnMac(song, await getExec(exec));
  }

  if (platform === "NetEaseMusic") {
    return neteaseMac.playSongOnMac(song, await getExec(exec));
  }

  if (platform === "KugouMusic") {
    return kugouMac.playSongOnMac(song, await getExec(exec));
  }

  const urls = buildSongPlayUrls(platform, song, "macos");
  if (!urls.length) {
    return { ok: false, playing: false, error: "无法构建播放链接" };
  }

  const run = await getExec(exec);
  await run("open", ["-g", urls[0]]);
  return { ok: true, playing: true, url: urls[0] };
}

/** 服务端：暂停 */
export async function serverPauseSong(
  platform: PlatformType,
  exec?: ExecFileAsync,
): Promise<PlayResult> {
  if (nodePlatform() !== "darwin") {
    return { ok: false, playing: false, error: "仅 macOS 支持服务端控制" };
  }

  if (platform === "QQMusic") {
    return qqMusicMac.pauseOnMac(await getExec(exec));
  }

  if (platform === "NetEaseMusic") {
    return neteaseMac.pauseOnMac(await getExec(exec));
  }

  if (platform === "KugouMusic") {
    return kugouMac.pauseOnMac(await getExec(exec));
  }

  return { ok: true, playing: false, stopped: false };
}

/** 服务端：继续播放 */
export async function serverResumeSong(
  platform: PlatformType,
  exec?: ExecFileAsync,
): Promise<PlayResult> {
  if (nodePlatform() !== "darwin") {
    return { ok: false, playing: false, error: "仅 macOS 支持" };
  }

  if (platform === "QQMusic") {
    return qqMusicMac.resumeOnMac(await getExec(exec));
  }

  if (platform === "NetEaseMusic") {
    return neteaseMac.resumeOnMac(await getExec(exec));
  }

  if (platform === "KugouMusic") {
    return kugouMac.resumeOnMac(await getExec(exec));
  }

  return { ok: true, playing: false, method: "noop" };
}

/** 服务端：查询系统播放状态 */
export async function serverGetPlaybackStatus(
  platform: PlatformType,
  exec?: ExecFileAsync,
): Promise<SystemPlaybackStatus> {
  if (nodePlatform() !== "darwin") {
    return { playing: false, paused: false, idle: true };
  }

  if (platform === "QQMusic") {
    return qqMusicMac.getStatusOnMac(await getExec(exec));
  }

  if (platform === "NetEaseMusic") {
    return neteaseMac.getStatusOnMac(await getExec(exec));
  }

  if (platform === "KugouMusic") {
    return kugouMac.getStatusOnMac(await getExec(exec));
  }

  return { playing: false, paused: false, idle: true };
}

export { createNodeExec, nodePlatform } from "./node";
export * as qqMusicMac from "../platforms/qqmusic/macos/server";
export * as neteaseMac from "../platforms/netease/macos/server";
export * as kugouMac from "../platforms/kugou/macos/server";
