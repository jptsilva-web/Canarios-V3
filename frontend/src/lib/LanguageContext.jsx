import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from './translations';

const LanguageContext = createContext();

// Using flagcdn.com for round flag images
export const languages = [
  { code: 'pt', name: 'Português', flag: 'https://flagcdn.com/w40/pt.png', countryCode: 'pt' },
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/gb.png', countryCode: 'gb' },
  { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w40/es.png', countryCode: 'es' },
];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Try to get saved language from localStorage
    const saved = localStorage.getItem('canary-control-lang');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('canary-control-lang', language);
  }, [language]);

  const t = (key) => getTranslation(language, key);

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguage(langCode);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
