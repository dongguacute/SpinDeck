import type { ExecFileAsync } from "../../../types";

export interface KugouLocalAuth {
  userId?: string;
  token?: string;
  dfid?: string;
  mid?: string;
}

export async function getKugouLocalAuthOnMac(exec: ExecFileAsync): Promise<KugouLocalAuth> {
  const homeDir = process.env.HOME || "";
  const containerPath = `${homeDir}/Library/Containers/com.kugou.mac.Music/Data/Library/Preferences`;
  
  const auth: KugouLocalAuth = {};

  try {
    // 1. Read userId and token
    const userInfoPath = `${containerPath}/userMessageInfo.plist`;
    const { stdout: userIdOut } = await exec("defaults", ["read", userInfoPath, "userId"]);
    const { stdout: tokenOut } = await exec("defaults", ["read", userInfoPath, "userTokenValue"]);
    
    auth.userId = userIdOut.toString().trim();
    auth.token = tokenOut.toString().trim();
  } catch (e) {
    console.warn("[KugouAuth] Failed to read userId/token:", e);
  }

  try {
    // 2. Read dfid
    const configPath = `${containerPath}/KugouConfigPlist.plist`;
    const { stdout: dfidOut } = await exec("defaults", ["read", configPath, "DeviceFingerprintID"]);
    auth.dfid = dfidOut.toString().trim();
  } catch (e) {
    console.warn("[KugouAuth] Failed to read dfid:", e);
  }

  try {
    // 3. Read mid (OpenUDID)
    const mainPlistPath = `${containerPath}/com.kugou.mac.Music.plist`;
    // OpenUDID is a dictionary, we need to extract the "OpenUDID" key from it
    const { stdout: midOut } = await exec("defaults", ["read", mainPlistPath, "OpenUDID"]);
    // The output will be something like "{ OpenUDID = ...; ... }"
    const match = midOut.toString().match(/OpenUDID\s*=\s*"?([a-zA-Z0-9]+)"?/);
    if (match) {
      auth.mid = match[1];
    } else {
      // Fallback to backUdid in config plist
      const configPath = `${containerPath}/KugouConfigPlist.plist`;
      const { stdout: backUdidOut } = await exec("defaults", ["read", configPath, "backUdid"]);
      auth.mid = backUdidOut.toString().trim();
    }
  } catch (e) {
    console.warn("[KugouAuth] Failed to read mid:", e);
  }

  return auth;
}

export function buildKugouCookie(auth: KugouLocalAuth): string {
  const parts: string[] = [];
  if (auth.userId) parts.push(`kg_userid=${auth.userId}`);
  if (auth.token) parts.push(`kg_token=${auth.token}`);
  if (auth.dfid) parts.push(`kg_dfid=${auth.dfid}`);
  if (auth.mid) parts.push(`kg_mid=${auth.mid}`);
  return parts.join("; ");
}
