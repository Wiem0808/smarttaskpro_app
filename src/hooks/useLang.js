// ══════════════════════════════════════════
// SmartTask Pro — useLang hook
// ══════════════════════════════════════════
import { useState, useEffect } from 'react';
import { t, getLang, setLang, LANGUAGES } from '../i18n';

export function useLang() {
  const [lang, setLangState] = useState(getLang());

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener('lang-change', handler);
    return () => window.removeEventListener('lang-change', handler);
  }, []);

  const changeLang = (code) => {
    setLang(code);
    setLangState(code);
  };

  return { lang, changeLang, t, LANGUAGES };
}
