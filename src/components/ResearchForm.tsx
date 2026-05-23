import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import type { SelfReportedMeta } from '../types/chromacoustic';

interface ResearchFormProps {
  onSubmit: (meta: SelfReportedMeta) => void;
  onSkip: () => void;
}

export const ResearchForm: React.FC<ResearchFormProps> = ({ onSubmit, onSkip }) => {
  const { t } = useTranslation();
  
  const [ageBand, setAgeBand] = useState<SelfReportedMeta['ageBand'] | ''>('');
  const [languageFamily, setLanguageFamily] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [region, setRegion] = useState('');
  const [isMultilingual, setIsMultilingual] = useState<boolean | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const meta: SelfReportedMeta = {};
    if (ageBand) meta.ageBand = ageBand;
    if (languageFamily) meta.languageFamily = languageFamily;
    if (nativeLanguage) meta.nativeLanguage = nativeLanguage;
    if (region) meta.region = region;
    if (isMultilingual !== null) meta.isMultilingual = isMultilingual;

    onSubmit(meta);
  };

  return (
    <div className="research-form-overlay" role="dialog" aria-labelledby="research-form-title">
      <div className="research-form-card">
        <h2 id="research-form-title" className="form-title">
          {t('metadataTitle')}
        </h2>
        <p className="form-intro">
          {t('metadataIntro')}
        </p>

        <form onSubmit={handleSubmit} className="form-container">
          {/* Age Band Selection */}
          <div className="form-group">
            <label htmlFor="age-band" className="form-label">
              {t('labelAgeBand')}
            </label>
            <select
              id="age-band"
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value as SelfReportedMeta['ageBand'])}
              className="form-select"
              required
            >
              <option value="">{t('placeholderSelect')}</option>
              <option value="under18">{t('ageUnder18')}</option>
              <option value="18-24">{t('age18_24')}</option>
              <option value="25-34">{t('age25_34')}</option>
              <option value="35-49">{t('age35_49')}</option>
              <option value="50-64">{t('age50_64')}</option>
              <option value="65plus">{t('age65plus')}</option>
            </select>
          </div>

          {/* Language Family */}
          <div className="form-group">
            <label htmlFor="lang-family" className="form-label">
              {t('labelLanguageFamily')}
            </label>
            <select
              id="lang-family"
              value={languageFamily}
              onChange={(e) => setLanguageFamily(e.target.value)}
              className="form-select"
            >
              <option value="">{t('placeholderSelect')}</option>
              <option value="Romance">Romance (Spanish, French, Italian, Portuguese...)</option>
              <option value="Germanic">Germanic (English, German, Dutch, Swedish...)</option>
              <option value="Sino-Tibetan">Sino-Tibetan (Mandarin, Cantonese, Burmese...)</option>
              <option value="Indo-Aryan">Indo-Aryan (Hindi, Urdu, Bengali, Punjabi...)</option>
              <option value="Semitic">Semitic (Arabic, Hebrew, Amharic...)</option>
              <option value="Bantu">Bantu (Swahili, Zulu, Xhosa...)</option>
              <option value="Other">Other / Other Family</option>
            </select>
          </div>

          {/* Native Language (Coarse) */}
          <div className="form-group">
            <label htmlFor="native-lang" className="form-label">
              {t('labelNativeLanguage')}
            </label>
            <input
              type="text"
              id="native-lang"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="form-input"
              placeholder="e.g. English, Español, Deutsch"
              maxLength={50}
            />
          </div>

          {/* Broad Region */}
          <div className="form-group">
            <label htmlFor="region" className="form-label">
              {t('labelRegion')}
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="form-select"
            >
              <option value="">{t('placeholderSelect')}</option>
              <option value="NorthAmerica">North America</option>
              <option value="CentralSouthAmerica">Central / South America</option>
              <option value="Europe">Europe</option>
              <option value="Africa">Africa</option>
              <option value="Asia">Asia</option>
              <option value="Oceania">Oceania</option>
            </select>
          </div>

          {/* Multilingual Toggle */}
          <div className="form-group">
            <span className="form-label">{t('labelMultilingual')}</span>
            <div className="radio-group">
              <button
                type="button"
                className={`radio-btn ${isMultilingual === true ? 'selected' : ''}`}
                onClick={() => setIsMultilingual(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`radio-btn ${isMultilingual === false ? 'selected' : ''}`}
                onClick={() => setIsMultilingual(false)}
              >
                No
              </button>
            </div>
          </div>

          {/* Submission / Skip buttons */}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {t('btnSubmitResearch')}
            </button>
            <button type="button" onClick={onSkip} className="btn-secondary">
              {t('btnSkipResearch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
