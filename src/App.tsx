import { useState, useRef, useEffect } from 'react';
import { useTranslation, LanguageProvider } from './context/LanguageContext';
import { ConsentGate } from './components/ConsentGate';
import { ResearchForm } from './components/ResearchForm';
import { CanvasVisualizer } from './components/CanvasVisualizer';
import { AudioPipeline } from './services/audioPipeline';
import { mapFrameToVisualToken, getSynestheticProfile } from './services/crossModalMapper';
import type { VisualToken, ResearchRecord, SelfReportedMeta } from './types/chromacoustic';
import { ResearchApi } from './services/ResearchApi';

type AppState = 'onboarding' | 'onboarding_questions' | 'idle' | 'listening' | 'reflecting';

function AppContent() {
  const { t } = useTranslation();

  // App state machines
  const [appState, setAppState] = useState<AppState>(() => {
    const hasConsented = localStorage.getItem('chromacoustic_consented');
    // If consented once, skip onboarding completely
    return hasConsented ? 'idle' : 'onboarding';
  });

  const [shareDataConsent, setShareDataConsent] = useState<boolean>(() => {
    return localStorage.getItem('chromacoustic_share_data') === 'true';
  });

  const [userMeta, setUserMeta] = useState<SelfReportedMeta>(() => {
    const saved = localStorage.getItem('chromacoustic_user_meta');
    return saved ? JSON.parse(saved) : {};
  });

  const [isCalmMode, setIsCalmMode] = useState<boolean>(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reducedMotionQuery;
  });

  // Real-time voice data states
  const [activeVisualToken, setActiveVisualToken] = useState<VisualToken | null>(null);
  const [sessionSummary, setSessionSummary] = useState<ResearchRecord['summary'] | null>(null);

  // Audio Pipeline Reference
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbCount, setDbCount] = useState<number>(0);

  // Initialize DB record counter asynchronously
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      const count = await ResearchApi.getRecordCount();
      if (active) setDbCount(count);
    };
    fetchCount();
    return () => {
      active = false;
    };
  }, [appState]);

  // Lazy instantiate AudioPipeline
  const getAudioPipeline = () => {
    if (!audioPipelineRef.current) {
      audioPipelineRef.current = new AudioPipeline();
    }
    return audioPipelineRef.current;
  };

  // 1. Onboarding Consent Handlers
  const handleConsentAccept = (shareData: boolean) => {
    localStorage.setItem('chromacoustic_consented', 'true');
    localStorage.setItem('chromacoustic_share_data', String(shareData));
    setShareDataConsent(shareData);
    if (shareData) {
      // Direct consented users to answer demographic questions immediately at the beginning
      setAppState('onboarding_questions');
    } else {
      setAppState('idle');
    }
  };

  const handleConsentDecline = () => {
    localStorage.setItem('chromacoustic_consented', 'true');
    localStorage.setItem('chromacoustic_share_data', 'false');
    setShareDataConsent(false);
    setAppState('idle');
  };

  // 2. Demographic Form Handlers (Onboarding questions at the beginning)
  const handleResearchFormSubmit = (meta: SelfReportedMeta) => {
    localStorage.setItem('chromacoustic_user_meta', JSON.stringify(meta));
    setUserMeta(meta);
    setAppState('idle');
  };

  const handleResearchFormSkip = () => {
    setAppState('idle');
  };

  // 3. Microphone Capture controls
  const handleMicTap = async () => {
    if (appState === 'idle') {
      setErrorMsg(null);
      setAppState('listening');
      setActiveVisualToken(null);

      const pipeline = getAudioPipeline();
      await pipeline.start(
        (frame) => {
          setActiveVisualToken(mapFrameToVisualToken(frame));
        },
        (err) => {
          console.error('Audio capture error:', err);
          setErrorMsg(err.message || 'Microphone access was denied or is unavailable.');
          setAppState('idle');
        }
      );
    } else if (appState === 'listening') {
      const pipeline = getAudioPipeline();
      const result = pipeline.stop();

      if (result) {
        setSessionSummary(result.summary);

        // Construct average frame from session summary to freeze the synesthetic colors of their entire utterance
        const summary = result.summary;
        const averageFrame = {
          t: 0,
          f0Hz: (summary.f0 && summary.f0.mean > 0) ? summary.f0.mean : null,
          f0Confidence: 1.0,
          rms: summary.loudness ? summary.loudness.mean : 0.0,
          zcr: 0,
          spectralCentroid: (summary.timbre && summary.timbre.centroidMean) ? summary.timbre.centroidMean : 0.0,
          spectralRolloff: 0,
          spectralFlatness: (summary.timbre && summary.timbre.flatnessMean) ? summary.timbre.flatnessMean : 0.0,
          mfcc: [],
          jitter: (summary.voiceQuality && summary.voiceQuality.jitterMean) ? summary.voiceQuality.jitterMean : 0.0,
          shimmer: (summary.voiceQuality && summary.voiceQuality.shimmerMean) ? summary.voiceQuality.shimmerMean : 0.0,
        };
        setActiveVisualToken(mapFrameToVisualToken(averageFrame));
        
        // Auto-submit research summary in background if they are opted-in!
        if (shareDataConsent) {
          const pseudoId = 'user-' + Math.random().toString(36).substring(2, 10);
          const sessionId = 'session-' + Math.random().toString(36).substring(2, 10);

          const record: ResearchRecord = {
            pseudoId,
            sessionId,
            consent: {
              consentVersion: '2026-05-23-v1',
              grantedAt: new Date().toISOString(),
              shareData: true,
            },
            meta: userMeta,
            summary: result.summary,
            appVersion: '1.0.0-phase2',
            deviceClass: 'mid',
          };

          ResearchApi.submitRecord(record).then(async (res) => {
            if (res.success) {
              const count = await ResearchApi.getRecordCount();
              setDbCount(count);
            }
          }).catch((err) => {
            console.error('Failed to submit background research summary:', err);
          });
        }

        // Proceed immediately to reflection card state
        setAppState('reflecting');
      } else {
        setAppState('idle');
      }
    }
  };

  // 4. Download card snapshot
  const handleDownloadCard = () => {
    if (!sessionSummary) return;

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `chromacoustic-voice-signature-${sessionSummary.visualSignatureHash}.png`;
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.error('Failed to capture signature image:', e);
      }
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setSessionSummary(null);
    setActiveVisualToken(null);
  };

  const handleResearcherExport = () => {
    ResearchApi.triggerDatasetDownload();
  };

  return (
    <div className="app-container">
      {/* 1. Onboarding: First-time Consent Gate */}
      {appState === 'onboarding' && (
        <ConsentGate onAccept={handleConsentAccept} onDecline={handleConsentDecline} />
      )}

      {/* 2. Onboarding: Demographic Questions at the beginning */}
      {appState === 'onboarding_questions' && (
        <ResearchForm onSubmit={handleResearchFormSubmit} onSkip={handleResearchFormSkip} />
      )}

      {/* Header Logo */}
      <header className="app-header">
        <h1 className="logo-text">{t('appTitle')}</h1>
        <p className="logo-sub">{t('appSubtitle')}</p>
      </header>

      {/* 3. Real-Time Shader Visualizer Window */}
      <main className="visualizer-wrapper">
        <CanvasVisualizer
          token={activeVisualToken}
          isActive={appState === 'listening' || appState === 'reflecting'}
          isCalmMode={isCalmMode}
        />
      </main>

      {/* Error Message banner */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '0.75rem',
          fontSize: '0.85rem',
          textAlign: 'center',
          color: '#fca5a5',
          marginBottom: '1rem'
        }}>
          {errorMsg}
        </div>
      )}

      {/* 4. Settings Panel */}
      {appState === 'idle' && (
        <div className="settings-panel">
          <span>{t('settingsCalmMode')}</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isCalmMode}
              onChange={(e) => setIsCalmMode(e.target.checked)}
              aria-label="Toggle Calm Mode"
            />
            <span className="slider"></span>
          </label>
        </div>
      )}

      {/* 5. Main Controls card for idle & recording states */}
      {(appState === 'idle' || appState === 'listening') && (
        <section className="controls-card">
          <div className="mic-btn-container">
            <button
              onClick={handleMicTap}
              className={`mic-hero-btn ${appState === 'listening' ? 'recording' : ''}`}
              aria-label={appState === 'listening' ? t('micBtnStop') : t('micBtnTapToSpeak')}
            >
              {appState === 'listening' ? '🛑' : '🎙️'}
            </button>
          </div>
          <div className="mic-status-text">
            {appState === 'listening' ? t('micBtnListening') : t('micBtnTapToSpeak')}
          </div>
        </section>
      )}

      {/* 6. Dynamic Vocal Signature / Reflection State */}
      {appState === 'reflecting' && sessionSummary && (
        <section className="result-card" aria-labelledby="frozen-sig-title">
          <h2 id="frozen-sig-title" className="frozen-sig-title">
            {t('resultTitle')}
          </h2>

          <div style={{
            fontFamily: 'monospace',
            color: 'var(--color-accent)',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            margin: '0.5rem 0'
          }}>
            #{sessionSummary.visualSignatureHash}
          </div>

          <div className="vocal-stats-grid">
            <div className="stat-box">
              <div className="stat-label">Pitch (Mean F0)</div>
              <div className="stat-val">{sessionSummary.f0.mean.toFixed(0)} Hz</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Timbre Centroid</div>
              <div className="stat-val">{(sessionSummary.timbre.centroidMean * 100).toFixed(0)}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Cadence Speed</div>
              <div className="stat-val">{sessionSummary.cadence.syllableRateEstimate.toFixed(1)} /s</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Pause Ratio</div>
              <div className="stat-val">{(sessionSummary.cadence.pauseRatio * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Synesthetic Texture & Taste Translation Panel */}
          {(() => {
            const profile = getSynestheticProfile(sessionSummary);
            return (
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '1.2rem',
                margin: '1.2rem 0',
                textAlign: 'left',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '0.4rem',
                }}>
                  ✨ Synesthetic Translation
                </h3>
                
                <div style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.15rem' }}>
                    Tactile Texture & Surface
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {profile.texture}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.15rem' }}>
                    Lexical-Gustatory Taste & Mouthfeel
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fcd34d' }}>
                    {profile.taste}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.2rem' }}>
                    Feels {profile.mouthfeel.toLowerCase()}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="consent-actions">
            <button onClick={handleDownloadCard} className="btn-primary">
              {t('btnDownloadImage')}
            </button>
            <button onClick={handleReset} className="btn-secondary">
              {t('btnReset')}
            </button>
          </div>
        </section>
      )}

      {/* 7. Researcher Database / Export Floating Drawer */}
      <footer className="researcher-bar">
        <span>Scientific DB: {dbCount} records</span>
        {dbCount > 0 && (
          <button onClick={handleResearcherExport} className="btn-export-text">
            Export Dataset (CSV)
          </button>
        )}
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
