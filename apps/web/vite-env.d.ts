/// <reference types="vite-plugin-svgr/client" />

interface NavigatorUAData {
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<{
    platform?: string;
    platformVersion?: string;
    architecture?: string;
  }>;
}

interface Navigator {
  userAgentData?: NavigatorUAData;
}
