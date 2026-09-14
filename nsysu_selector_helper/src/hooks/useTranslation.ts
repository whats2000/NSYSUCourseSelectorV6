import { useTranslation as useI18nTranslation } from 'react-i18next';

import { TranslationKey } from '@/types';

/**
 * 類型安全的翻譯 hook
 *
 * 提供編譯時的類型檢查，確保使用的翻譯鍵存在於定義的類型中
 * 例如: t('homepage.title') 將通過類型檢查
 * 而 t('不存在的鍵') 將產生 TypeScript 錯誤
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  // 返回一個類型安全的 t 函數
  //
  // options 這裡必須是 any，不能收斂成 i18next 的 TOptions：
  // TranslationKey 由 Paths<> 推導，含 'course'、'sort' 這類「父層」鍵，
  // 而 i18next 具型別的 t() 只在 returnObjects: true 時才接受父層鍵。
  // 收斂型別會同時讓參數不相容，並把回傳值窄化成 string，
  // 導致 CoursesList/Header、SelectedExport/Header、HelpModal
  // 三處 returnObjects: true 的呼叫端編譯失敗。
  // 待 typeSafeT 改為多載（依 returnObjects 決定回傳型別）後即可移除。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeSafeT = (key: TranslationKey, options?: any) => {
    return t(key, options);
  };

  return {
    t: typeSafeT,
    i18n,
  };
};
