import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入本地翻译文件
// 在实际生产环境中，可以使用 i18next-http-backend 异步加载
import commonZh from './locales/zh-Hans/common.json';

const resources = {
  'zh-Hans': {
    common: commonZh,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-Hans', // 默认语言
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

export default i18n;
