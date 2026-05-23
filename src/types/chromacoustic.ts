export type ChromacousticFrame = {
  t: number;                 // ms since session start
  f0Hz: number | null;       // fundamental frequency (pitch); null when unvoiced
  f0Confidence: number;      // 0..1
  rms: number;               // loudness/energy 0..1 (normalized)
  zcr: number;               // zero-crossing rate
  spectralCentroid: number;  // timbre "brightness"
  spectralRolloff: number;
  spectralFlatness: number;  // tonal vs noisy
  mfcc: number[];            // length 13
  jitter: number;            // voice-quality (pitch perturbation)
  shimmer: number;           // voice-quality (amplitude perturbation)
  formants?: [number, number, number]; // F1,F2,F3 — for accent research (Tier C)
};

export type AffectEstimate = {
  valence: number;     // -1..1 (negative..positive)
  arousal: number;     // 0..1 (calm..excited)
  confidence: number;  // 0..1
  isEstimate: true;    // ALWAYS true; never present as ground truth
};

export type VisualToken = {
  hue: number;          // 0..360
  saturation: number;   // 0..1
  lightness: number;    // 0..1
  turbulence: number;   // 0..1  (driven by voice-quality / noisiness)
  motionSpeed: number;  // driven by rhythm/cadence
  patternId: string;    // geometric vs flowing, driven by formants/timbre
};

export type ConsentRecord = {
  consentVersion: string;   // e.g. "2026-05-23-v1"
  grantedAt: string;        // ISO timestamp
  shareData: boolean;       // did they opt in to research donation?
};

export type SelfReportedMeta = {
  languageFamily?: string;  // e.g. "Romance", "Sino-Tibetan"
  nativeLanguage?: string;  // optional, free of region precision
  region?: string;          // COARSE only (e.g. country or larger), opt-in
  ageBand?: "under18" | "18-24" | "25-34" | "35-49" | "50-64" | "65plus";
  isMultilingual?: boolean;
};

export type ResearchRecord = {
  pseudoId: string;         // random, rotating, NOT a stable cross-session identity
  sessionId: string;        // random per session
  consent: ConsentRecord;
  meta: SelfReportedMeta;
  summary: {
    f0: { mean: number; min: number; max: number; range: number };
    loudness: { mean: number; variance: number };
    cadence: { syllableRateEstimate: number; pauseRatio: number };
    timbre: { centroidMean: number; flatnessMean: number };
    voiceQuality: { jitterMean: number; shimmerMean: number };
    formantsMean?: [number, number, number];
    affect?: AffectEstimate;          // Tier B, optional
    visualSignatureHash: string;      // reproducible "color of this voice" token
  };
  appVersion: string;
  deviceClass: "low" | "mid" | "high";
};
