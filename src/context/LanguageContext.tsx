import React, { createContext, useState, useContext, type ReactNode } from 'react';

type Language = 'en' | 'es';

type Translations = typeof translations.en;

const translations = {
  en: {
    appTitle: 'Color My Voice',
    appSubtitle: 'voice synesthesia visualizer',
    consentTitle: 'Scientific Synesthesia Project',
    consentIntro: 'Color My Voice transforms your voice into beautiful, living colors while helping neuroscientists study the connections between vocal prosody, accents, and cross-modal perception.',
    consentBulletPrivacy: 'Audio stays strictly on your device. We do not record or upload raw audio.',
    consentBulletAnonymity: 'Only anonymous, numerical summaries of voice features (pitch range, cadence, timbre) are shared if you opt in.',
    consentBulletControl: 'You can withdraw consent or opt out of sharing at any time. Participation is voluntary.',
    consentGrant: 'I Consent & Open Microphone',
    consentDecline: 'No thanks, just let me visualize',
    metadataTitle: 'Contribute to Research',
    metadataIntro: 'Make your anonymous vocal signature scientific by self-reporting coarse, non-identifying details.',
    labelAgeBand: 'Age Band',
    labelLanguageFamily: 'Language Family',
    labelNativeLanguage: 'Native Language',
    labelRegion: 'Broad Region',
    labelMultilingual: 'Do you speak multiple languages?',
    btnSubmitResearch: 'Donate Anonymized Signature',
    btnSkipResearch: 'Skip & Save Signature',
    micBtnTapToSpeak: 'Tap to sing or speak',
    micBtnListening: 'Listening...',
    micBtnStop: 'Tap to Finish',
    resultTitle: 'Your Voice Signature',
    resultSaved: 'Saved to gallery!',
    btnDownloadImage: 'Download Signature Image',
    btnReset: 'Speak Again',
    btnKioskReset: 'New Participant',
    settingsTitle: 'Settings',
    settingsCalmMode: 'Calm Mode (Reduced Motion)',
    settingsDefaultMap: 'Default Mapping Configuration',
    placeholderSelect: 'Select...',
    ageUnder18: 'Under 18 (Backend data upload disabled)',
    age18_24: '18-24 years',
    age25_34: '25-34 years',
    age35_49: '35-49 years',
    age50_64: '50-64 years',
    age65plus: '65 years or older',
  },
  es: {
    appTitle: 'Color My Voice',
    appSubtitle: 'visualizador de sinestesia vocal',
    consentTitle: 'Proyecto Científico de Sinestesia',
    consentIntro: 'Color My Voice transforma tu voz en hermosos colores vivos mientras ayuda a los neurocientíficos a estudiar las conexiones entre la prosodia vocal, los acentos y la percepción cross-modal.',
    consentBulletPrivacy: 'El audio permanece estrictamente en tu dispositivo. No grabamos ni subimos audio sin procesar.',
    consentBulletAnonymity: 'Solo se comparten resúmenes numéricos y anónimos de las características de la voz (rango de tono, cadencia, timbre) si decides participar.',
    consentBulletControl: 'Puedes retirar tu consentimiento o dejar de compartir en cualquier momento. La participación es voluntaria.',
    consentGrant: 'Doy mi Consentimiento y Abrir Micrófono',
    consentDecline: 'No, gracias, solo quiero visualizar',
    metadataTitle: 'Contribuir a la Investigación',
    metadataIntro: 'Haz que tu firma vocal anónima sea científicamente útil informando detalles generales que no te identifican.',
    labelAgeBand: 'Rango de Edad',
    labelLanguageFamily: 'Familia Lingüística',
    labelNativeLanguage: 'Lengua Materna',
    labelRegion: 'Región General',
    labelMultilingual: '¿Hablas varios idiomas?',
    btnSubmitResearch: 'Donar Firma Anónima',
    btnSkipResearch: 'Omitir y Guardar Firma',
    micBtnTapToSpeak: 'Toca para cantar o hablar',
    micBtnListening: 'Escuchando...',
    micBtnStop: 'Toca para Finalizar',
    resultTitle: 'Tu Firma Vocal',
    resultSaved: '¡Guardado en la galería!',
    btnDownloadImage: 'Descargar Imagen de Firma',
    btnReset: 'Hablar de Nuevo',
    btnKioskReset: 'Nuevo Participante',
    settingsTitle: 'Ajustes',
    settingsCalmMode: 'Modo Calmo (Movimiento Reducido)',
    settingsDefaultMap: 'Configuración de Mapeo Predeterminada',
    placeholderSelect: 'Seleccionar...',
    ageUnder18: 'Menor de 18 (Envío de datos desactivado)',
    age18_24: '18-24 años',
    age25_34: '25-34 años',
    age35_49: '35-49 años',
    age50_64: '50-64 años',
    age65plus: '65 años o más',
  },
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Proactive language detection
    const systemLang = navigator.language || (navigator as any).userLanguage;
    return systemLang.startsWith('es') ? 'es' : 'en';
  });

  const t = (key: keyof Translations): string => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
