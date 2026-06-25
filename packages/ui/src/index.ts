/**
 * @spindeck/ui
 * 导出主题相关的常量和工具函数
 */

export const THEMES = {
  CAFE: 'cafe',
} as const;

export type ThemeType = typeof THEMES[keyof typeof THEMES];

export type AppearanceMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  name: string;
  className: string;
  preview: {
    light: string;
    dark: string;
  };
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  [THEMES.CAFE]: {
    name: '咖啡馆',
    className: 'sd-theme-cafe',
    preview: {
      light: '#fdfaf2',
      dark: '#1a1614',
    },
  },
};
