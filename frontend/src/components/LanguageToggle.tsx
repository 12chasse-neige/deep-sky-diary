import { useLanguage } from '../lib/language';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      className="language-toggle"
      onClick={toggleLanguage}
      aria-label={language === 'zh' ? 'Switch to English' : '切换为中文'}
      title={language === 'zh' ? 'Switch to English' : '切换为中文'}
    >
      <span lang="zh-CN" className={language === 'zh' ? 'active' : ''}>
        中
      </span>
      <i aria-hidden="true">/</i>
      <span lang="en" className={language === 'en' ? 'active' : ''}>
        EN
      </span>
    </button>
  );
}
