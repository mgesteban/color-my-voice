import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface ConsentGateProps {
  onAccept: (shareData: boolean) => void;
  onDecline: () => void;
}

export const ConsentGate: React.FC<ConsentGateProps> = ({ onAccept, onDecline }) => {
  const { t, language, setLanguage } = useTranslation();
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Accessible Keyboard Focus Trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Focus the modal container for screen readers on mount
    modal.focus();

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      tabIndex={-1}
      ref={modalRef}
    >
      <div className="consent-card">
        {/* Language Switcher */}
        <div className="lang-switcher-container">
          <button
            onClick={() => setLanguage('en')}
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            aria-label="Set language to English"
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            className={`lang-btn ${language === 'es' ? 'active' : ''}`}
            aria-label="Establecer idioma en Español"
          >
            ES
          </button>
        </div>

        {/* Sync Synesthesia Shield Icon */}
        <div className="shield-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2Z"
              fill="url(#shieldGrad)"
              stroke="#6366f1"
              strokeWidth="1.5"
            />
            <path
              d="M9 12L11 14L15 10"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.85" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 id="consent-title" className="consent-title">
          {t('consentTitle')}
        </h1>
        
        <p className="consent-intro">
          {t('consentIntro')}
        </p>

        {/* Privacy Guarantees */}
        <div className="consent-bullets" role="list">
          <div className="consent-bullet" role="listitem">
            <span className="bullet-icon" aria-hidden="true">🔒</span>
            <span className="bullet-text">{t('consentBulletPrivacy')}</span>
          </div>
          <div className="consent-bullet" role="listitem">
            <span className="bullet-icon" aria-hidden="true">📊</span>
            <span className="bullet-text">{t('consentBulletAnonymity')}</span>
          </div>
          <div className="consent-bullet" role="listitem">
            <span className="bullet-icon" aria-hidden="true">⚖️</span>
            <span className="bullet-text">{t('consentBulletControl')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="consent-actions">
          <button
            onClick={() => onAccept(true)}
            className="btn-primary"
            id="btn-consent-accept"
            aria-describedby="consent-title"
          >
            {t('consentGrant')}
          </button>
          <button
            onClick={onDecline}
            className="btn-secondary"
            id="btn-consent-decline"
          >
            {t('consentDecline')}
          </button>
        </div>
      </div>
    </div>
  );
};
