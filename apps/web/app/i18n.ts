import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入本地翻译文件
// 在实际生产环境中，可以使用 i18next-http-backend 异步加载
import commonZh from './locales/zh-Hans/common.json';
import commonEn from './locales/en/common.json';

const resources = {
  'zh-Hans': {
    common: commonZh,
  },
  'en': {
    common: commonEn,
  },
};

const LANGUAGE_KEY = 'spindeck_language';

const getInitialLanguage = () => {
  // SSR 期间和客户端首次渲染必须保持一致，以避免 Hydration Mismatch
  // 统一返回英语作为默认值
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

// 监听语言变化并保存到 localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lng);
  }
});

export default i18n;
