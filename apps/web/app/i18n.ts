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
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'zh-Hans' || savedLanguage === 'en')) {
      return savedLanguage;
    }
    // 也可以根据浏览器语言设置默认语言
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
      return 'zh-Hans';
    }
  }
  return 'en'; // 默认英语，或者根据项目需求设为 zh-Hans
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'zh-Hans',
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
