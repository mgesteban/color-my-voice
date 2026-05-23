import { useState, useRef, useEffect } from 'react';
import { useTranslation, LanguageProvider } from './context/LanguageContext';
import { ConsentGate } from './components/ConsentGate';
import { ResearchForm } from './components/ResearchForm';
import { CanvasVisualizer } from './components/CanvasVisualizer';
import { AudioPipeline } from './services/audioPipeline';
import { mapFrameToVisualToken, getSynestheticProfile, ALL_SYNESTHETIC_PROFILES } from './services/crossModalMapper';
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

  // 4. Download card snapshot (generates a high-resolution poster-sized frameable art print)
  const handleDownloadCard = () => {
    if (!sessionSummary) return;

    const liveCanvas = document.querySelector('canvas');
    if (!liveCanvas) return;

    try {
      // 1. Initialize off-screen poster canvas with poster dimensions (1200 x 1800 px, 2:3 portrait)
      const posterCanvas = document.createElement('canvas');
      posterCanvas.width = 1200;
      posterCanvas.height = 1800;
      const ctx = posterCanvas.getContext('2d');
      if (!ctx) return;

      // 2. Render deep black backdrop with soft radial glow
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, 1200, 1800);

      const radial = ctx.createRadialGradient(600, 480, 50, 600, 480, 700);
      radial.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1200, 1800);

      // 3. Render Title & Voice Signature Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('color my voice', 600, 95);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(`YOUR VOICE SIGNATURE #${sessionSummary.visualSignatureHash}`, 600, 142);

      // 4. Crop and Draw the beautiful synesthetic paint visualizer in the center-top
      ctx.save();
      const artX = 150;
      const artY = 200;
      const artW = 900;
      const artH = 640;
      const artRadius = 24;

      // Round rectangle clip path
      ctx.beginPath();
      ctx.moveTo(artX + artRadius, artY);
      ctx.lineTo(artX + artW - artRadius, artY);
      ctx.quadraticCurveTo(artX + artW, artY, artX + artW, artY + artRadius);
      ctx.lineTo(artX + artW, artY + artH - artRadius);
      ctx.quadraticCurveTo(artX + artW, artY + artH, artX + artW - artRadius, artY + artH);
      ctx.lineTo(artX + artRadius, artY + artH);
      ctx.quadraticCurveTo(artX, artY + artH, artX, artY + artH - artRadius);
      ctx.lineTo(artX, artY + artRadius);
      ctx.quadraticCurveTo(artX, artY, artX + artRadius, artY);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(liveCanvas, artX, artY, artW, artH);
      ctx.restore();

      // Soft borders around the cropped visualizer artwork
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(artX, artY, artW, artH);

      // 5. Draw 4 Acoustic Statistics Grid Blocks
      const statY = 880;
      const boxW = 210;
      const boxH = 125;
      const gap = 20;
      const startX = 600 - (boxW * 4 + gap * 3) / 2;

      const stats = [
        { label: 'PITCH (MEAN F0)', val: `${sessionSummary.f0.mean.toFixed(0)} Hz` },
        { label: 'TIMBRE CENTROID', val: `${(sessionSummary.timbre.centroidMean * 100).toFixed(0)}%` },
        { label: 'CADENCE SPEED', val: `${sessionSummary.cadence.syllableRateEstimate.toFixed(1)} /s` },
        { label: 'PAUSE RATIO', val: `${(sessionSummary.cadence.pauseRatio * 100).toFixed(0)}%` }
      ];

      stats.forEach((s, i) => {
        const bx = startX + i * (boxW + gap);
        const br = 12;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(bx + br, statY);
        ctx.lineTo(bx + boxW - br, statY);
        ctx.quadraticCurveTo(bx + boxW, statY, bx + boxW, statY + br);
        ctx.lineTo(bx + boxW, statY + boxH - br);
        ctx.quadraticCurveTo(bx + boxW, statY + boxH, bx + boxW - br, statY + boxH);
        ctx.lineTo(bx + br, statY + boxH);
        ctx.quadraticCurveTo(bx, statY + boxH, bx, statY + boxH - br);
        ctx.lineTo(bx, statY + br);
        ctx.quadraticCurveTo(bx, statY, bx + br, statY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, bx + boxW / 2, statY + 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillText(s.val, bx + boxW / 2, statY + 85);
      });

      // 6. Draw Large Synesthetic Profile Interpretation Panel at the bottom
      const panelY = 1045;
      const panelW = 900;
      const panelH = 620;
      const px = 150;
      const pr = 20;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(px + pr, panelY);
      ctx.lineTo(px + panelW - pr, panelY);
      ctx.quadraticCurveTo(px + panelW, panelY, px + panelW, panelY + pr);
      ctx.lineTo(px + panelW, panelY + panelH - pr);
      ctx.quadraticCurveTo(px + panelW, panelY + panelH, px + panelW - pr, panelY + panelH);
      ctx.lineTo(px + pr, panelY + panelH);
      ctx.quadraticCurveTo(px, panelY + panelH, px, panelY + panelH - pr);
      ctx.lineTo(px, panelY + pr);
      ctx.quadraticCurveTo(px, panelY, px + pr, panelY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🔮 Synesthetic Profile Map', px + 40, panelY + 50);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 40, panelY + 75);
      ctx.lineTo(px + panelW - 40, panelY + 75);
      ctx.stroke();

      const activeProfile = getSynestheticProfile(sessionSummary);

      ALL_SYNESTHETIC_PROFILES.forEach((prof, idx) => {
        const isActive = prof.id === activeProfile.id;
        const itemY = panelY + 105 + idx * 75;

        if (isActive) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;

          const ir = 10;
          const ix = px + 40;
          const iw = panelW - 80;
          const ih = 175; // taller active height

          ctx.beginPath();
          ctx.moveTo(ix + ir, itemY);
          ctx.lineTo(ix + iw - ir, itemY);
          ctx.quadraticCurveTo(ix + iw, itemY, ix + iw, itemY + ir);
          ctx.lineTo(ix + iw, itemY + ih - ir);
          ctx.quadraticCurveTo(ix + iw, itemY + ih, ix + iw - ir, itemY + ih);
          ctx.lineTo(ix + ir, itemY + ih);
          ctx.quadraticCurveTo(ix, itemY + ih, ix, itemY + ih - ir);
          ctx.lineTo(ix, itemY + ir);
          ctx.quadraticCurveTo(ix, itemY, ix + ir, itemY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('✨ ACTIVE SIGNATURE', ix + iw - 20, itemY + 32);

          ctx.textAlign = 'left';
          ctx.font = 'bold 36px Arial, sans-serif';
          ctx.fillText(prof.icon, ix + 25, itemY + 50);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 20px Arial, sans-serif';
          ctx.fillText(prof.texture, ix + 85, itemY + 38);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = 'bold 11px Arial, sans-serif';
          ctx.fillText('TACTILE TEXTURE & SURFACE', ix + 85, itemY + 18);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = 'bold 11px Arial, sans-serif';
          ctx.fillText('LEXICAL-GUSTATORY FLAVOR PROFILE', ix + 25, itemY + 98);

          ctx.fillStyle = '#fcd34d';
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillText(prof.taste, ix + 25, itemY + 120);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = 'italic 14px Arial, sans-serif';
          ctx.fillText(`Feels ${prof.mouthfeel.toLowerCase()}`, ix + 25, itemY + 145);
        } else {
          const ix = px + 40;
          const iw = panelW - 80;
          const ih = 50;

          // Push elements down below the tall active item
          const activeIdx = ALL_SYNESTHETIC_PROFILES.findIndex(p => p.id === activeProfile.id);
          const adjustedY = itemY + (idx > activeIdx ? 100 : 0);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.lineWidth = 1;

          const ir = 8;
          ctx.beginPath();
          ctx.moveTo(ix + ir, adjustedY);
          ctx.lineTo(ix + iw - ir, adjustedY);
          ctx.quadraticCurveTo(ix + iw, adjustedY, ix + iw, adjustedY + ir);
          ctx.lineTo(ix + iw, adjustedY + ih - ir);
          ctx.quadraticCurveTo(ix + iw, adjustedY + ih, ix + iw - ir, adjustedY + ih);
          ctx.lineTo(ix + ir, adjustedY + ih);
          ctx.quadraticCurveTo(ix, adjustedY + ih, ix, adjustedY + ih - ir);
          ctx.lineTo(ix, adjustedY + ir);
          ctx.quadraticCurveTo(ix, adjustedY, ix + ir, adjustedY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = '22px Arial, sans-serif';
          ctx.fillText(prof.icon, ix + 20, adjustedY + 34);

          ctx.font = 'bold 15px Arial, sans-serif';
          ctx.fillText(prof.texture, ix + 60, adjustedY + 31);
        }
      });

      // 7. Render soft exhibition poster footer watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COLOR MY VOICE   |   GOOGLE I/O DEEPMIND HACKATHON 2026', 600, 1725);

      // 8. Stream high-DPI poster image download link
      const dataUrl = posterCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `color-my-voice-poster-${sessionSummary.visualSignatureHash}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to capture high-resolution poster print:', e);
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setSessionSummary(null);
    setActiveVisualToken(null);
  };

  const handleKioskReset = () => {
    // Clear demographic metadata and consent state to prepare for a fresh participant session!
    localStorage.removeItem('chromacoustic_consented');
    localStorage.removeItem('chromacoustic_share_data');
    localStorage.removeItem('chromacoustic_user_meta');
    setUserMeta({});
    setShareDataConsent(false);
    setSessionSummary(null);
    setActiveVisualToken(null);
    setAppState('onboarding');
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
            const activeProfile = getSynestheticProfile(sessionSummary);
            return (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '20px',
                padding: '1.25rem',
                margin: '1.25rem 0',
                textAlign: 'left',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '0.5rem',
                }}>
                  🔮 Synesthetic Profile Map
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ALL_SYNESTHETIC_PROFILES.map((prof) => {
                    const isActive = prof.id === activeProfile.id;

                    if (isActive) {
                      return (
                        <div
                          key={prof.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1.5px solid var(--color-accent)',
                            borderRadius: '14px',
                            padding: '1rem',
                            boxShadow: '0 0 15px rgba(56, 189, 248, 0.15)',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '0.75rem',
                            right: '0.75rem',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: 'var(--color-accent)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '20px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            ✨ Active Signature
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{prof.icon}</span>
                            <div>
                              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.1rem' }}>
                                Tactile Texture & Surface
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {prof.texture}
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '0.65rem' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.15rem' }}>
                              Lexical-Gustatory Taste & Mouthfeel
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fcd34d' }}>
                              {prof.taste}
                            </div>
                            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.65)', marginTop: '0.2rem' }}>
                              Feels {prof.mouthfeel.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={prof.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            borderRadius: '10px',
                            padding: '0.6rem 0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            opacity: 0.35,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>{prof.icon}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#ffffff' }}>
                            {prof.texture}
                          </span>
                        </div>
                      );
                    }
                  })}
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
            <button onClick={handleKioskReset} className="btn-secondary" style={{ border: '1px dashed rgba(255, 255, 255, 0.25)', color: '#a7f3d0' }}>
              👤 {t('btnKioskReset')}
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
