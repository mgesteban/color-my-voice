import type { ChromacousticFrame, VisualToken } from '../types/chromacoustic';

export interface MapperConfig {
  pitchMinHz: number;
  pitchMaxHz: number;
  loudnessMinRms: number;
  loudnessMaxRms: number;
}

export const DEFAULT_MAPPER_CONFIG: MapperConfig = {
  pitchMinHz: 80,
  pitchMaxHz: 500,
  loudnessMinRms: 0.005,
  loudnessMaxRms: 0.15,
};

/**
 * Linearly interpolates a value between input range and clamps it.
 */
function interpolate(
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  const t = (val - inMin) / (inMax - inMin);
  const clampedT = Math.max(0, Math.min(1, t));
  return outMin + clampedT * (outMax - outMin);
}

/**
 * Maps a frequency (Hz) to Nikolai Rimsky-Korsakov's synesthetic color associations.
 * Captures exact HSL combinations (Hue, Saturation, Base Lightness).
 */
function getRimskyKorsakovColor(frequency: number): { h: number; s: number; l: number } {
  // 1. Calculate musical MIDI note number
  // A4 = 440Hz is MIDI note 69
  const noteNumber = 12 * Math.log2(frequency / 440) + 69;
  
  // 2. Resolve to pitch class (0 = C, 1 = C#, 2 = D, 3 = D#, 4 = E, 5 = F, 6 = F#, 7 = G, 8 = G#, 9 = A, 10 = A#, 11 = B)
  const pitchClass = (Math.round(noteNumber) % 12 + 12) % 12;

  switch (pitchClass) {
    case 0:  // C: White
      return { h: 0, s: 0.0, l: 0.95 };
    case 1:  // C#: Pale metallic grey
      return { h: 200, s: 0.1, l: 0.72 };
    case 2:  // D: Yellow
      return { h: 54, s: 0.95, l: 0.58 };
    case 3:  // D# / Eb: Dark blue
      return { h: 224, s: 0.75, l: 0.28 };
    case 4:  // E: Deep, dark blue of the sea
      return { h: 212, s: 0.88, l: 0.22 };
    case 5:  // F: Sapphire blue
      return { h: 204, s: 0.95, l: 0.48 };
    case 6:  // F#: Green
      return { h: 135, s: 0.78, l: 0.45 };
    case 7:  // G: Brownish gold
      return { h: 38, s: 0.72, l: 0.42 };
    case 8:  // G# / Ab: Bright copper/gold
      return { h: 28, s: 0.82, l: 0.52 };
    case 9:  // A: Clear pink / deep red
      return { h: 348, s: 0.88, l: 0.56 };
    case 10: // A# / Bb: Soft purple / violet
      return { h: 278, s: 0.68, l: 0.52 };
    case 11: // B: Gloomy dark blue with a steel shine
      return { h: 218, s: 0.38, l: 0.30 };
    default:
      return { h: 200, s: 0.5, l: 0.5 };
  }
}

/**
 * Maps a single ChromacousticFrame to a VisualToken using Rimsky-Korsakov pitch class mapping
 */
export function mapFrameToVisualToken(
  frame: ChromacousticFrame,
  config: MapperConfig = DEFAULT_MAPPER_CONFIG
): VisualToken {
  const { f0Hz, rms, spectralCentroid, jitter, shimmer } = frame;

  // 1. Resolve pitch class to Rimsky-Korsakov color (or calm base if silent/unvoiced)
  let hue = 220;
  let baseSaturation = 0.65;
  let baseLightness = 0.16;

  if (f0Hz !== null && f0Hz > 0) {
    const rk = getRimskyKorsakovColor(f0Hz);
    hue = rk.h;
    baseSaturation = rk.s;
    baseLightness = rk.l;
  }

  // 2. Loudness (RMS) -> Dynamic Lightness modulation
  const safeRms = isNaN(rms) || !isFinite(rms) ? 0.0 : rms;
  const lightnessMod = interpolate(safeRms, config.loudnessMinRms, config.loudnessMaxRms, 0.0, 0.35);
  let lightness = baseLightness + (isNaN(lightnessMod) ? 0.0 : lightnessMod);
  lightness = Math.min(0.98, Math.max(0.08, lightness));

  // 3. Spectral Centroid (Timbre Brightness) -> Saturation modulation
  const safeCentroid = isNaN(spectralCentroid) || !isFinite(spectralCentroid) ? 0.0 : spectralCentroid;
  const saturationMod = interpolate(safeCentroid, 0, 1, -0.15, 0.15);
  let saturation = baseSaturation + (isNaN(saturationMod) ? 0.0 : saturationMod);
  saturation = Math.min(1.0, Math.max(0.0, saturation));

  // 4. Jitter / Shimmer (Voice Quality) -> Turbulence
  const safeJitter = isNaN(jitter) || !isFinite(jitter) ? 0.0 : jitter;
  const safeShimmer = isNaN(shimmer) || !isFinite(shimmer) ? 0.0 : shimmer;
  const combinedPerturbation = (safeJitter + safeShimmer) / 2;
  const turbulenceMod = interpolate(combinedPerturbation, 0, 0.05, 0.0, 1.0);
  const turbulence = isNaN(turbulenceMod) ? 0.0 : turbulenceMod;

  // 5. Rhythm / Cadence -> Motion Speed
  const motionSpeedMod = interpolate(safeRms, 0.01, 0.1, 0.2, 1.0);
  const motionSpeed = isNaN(motionSpeedMod) ? 0.2 : motionSpeedMod;

  // 6. Formants / Timbre -> Texture Pattern Style
  let patternId = 'fluid'; // velvet
  const safeFlatness = isNaN(frame.spectralFlatness) || !isFinite(frame.spectralFlatness) ? 0.0 : frame.spectralFlatness;

  if (safeCentroid > 0.40 && (safeJitter > 0.015 || safeFlatness > 0.35)) {
    patternId = 'spiky';     // sandpaper
  } else if (safeRms < 0.03 && safeFlatness > 0.35) {
    patternId = 'airy';      // airy cloud
  } else if (safeRms > 0.05 && (f0Hz !== null && f0Hz < 150) && safeJitter < 0.02) {
    patternId = 'viscous';   // maple syrup
  } else if (safeCentroid > 0.35 && safeFlatness < 0.25) {
    patternId = 'crisp';     // brittle glass
  }

  return {
    hue: isNaN(hue) ? 220 : hue,
    saturation,
    lightness,
    turbulence,
    motionSpeed,
    patternId,
  };
}

export interface SynestheticProfile {
  texture: string;
  taste: string;
  mouthfeel: string;
}

export function getSynestheticProfile(summary: any): SynestheticProfile {
  const f0 = summary?.f0?.mean || 0;
  const rms = summary?.loudness?.mean || 0;
  const centroid = summary?.timbre?.centroidMean || 0;
  const flatness = summary?.timbre?.flatnessMean || 0;
  const jitter = summary?.voiceQuality?.jitterMean || 0;

  let texture = "Warm liquid velvet";
  let taste = "Warm buttered crusty bread soaked in rich tomato soup";
  let mouthfeel = "Creamy, comforting, and highly viscous";

  if (centroid > 0.40 && (jitter > 0.015 || flatness > 0.35)) {
    texture = "Coarse volcanic sandpaper";
    taste = "Crisp seasoned pizza combined with tangy cheese Doritos";
    mouthfeel = "Crunchy, salty, and sharp";
  } else if (rms < 0.03 && flatness > 0.35) {
    texture = "Light airy morning mist";
    taste = "Sweet peach iced tea combined with fresh eucalyptus mint";
    mouthfeel = "Cooling, sweet, and refreshing";
  } else if (rms > 0.05 && f0 < 150 && jitter < 0.02) {
    texture = "Thick golden maple syrup";
    taste = "Earthy pinto beans with ground cumin and dry desert dust";
    mouthfeel = "Powdery, dry, and highly savory";
  } else if (centroid > 0.35 && flatness < 0.25) {
    texture = "Brittle crystalline glass";
    taste = "Tangy tomato slices on thin salted butter crackers";
    mouthfeel = "Crisp, clean, and mildly tart";
  }

  return { texture, taste, mouthfeel };
}
