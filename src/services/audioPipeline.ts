import { PitchDetector } from 'pitchy';
import Meyda from 'meyda';
import type { ChromacousticFrame, ResearchRecord } from '../types/chromacoustic';

export class AudioPipeline {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private pitchDetector: PitchDetector<Float32Array> | null = null;
  private pitchBuffer: Float32Array | null = null;
  private isRecording = false;

  // Session accumulators for summary statistics
  private frames: ChromacousticFrame[] = [];
  private sessionStartTime = 0;

  constructor() {}

  /**
   * Starts capturing audio and triggers callbacks with real-time ChromacousticFrames
   */
  public async start(
    onFrame: (frame: ChromacousticFrame) => void,
    onError: (err: any) => void
  ): Promise<void> {
    if (this.isRecording) return;

    try {
      // 1. Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      
      // Handle browser autoplay policies
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048; // Optimal size for Pitchy and Meyda spectral detail
      this.source.connect(this.analyser);

      // 3. Setup Pitchy detector
      const sampleRate = this.audioCtx.sampleRate;
      this.pitchDetector = PitchDetector.forFloat32Array(this.analyser.fftSize);
      this.pitchBuffer = new Float32Array(this.analyser.fftSize);

      // 4. Setup Meyda Analyzer
      // We run Meyda on the AnalyserNode output manually in our loop to synchronize F0 and spectral data perfectly.
      Meyda.audioContext = this.audioCtx;
      Meyda.bufferSize = this.analyser.fftSize;
      Meyda.sampleRate = this.audioCtx.sampleRate;

      this.isRecording = true;
      this.frames = [];
      this.sessionStartTime = performance.now();

      const loop = () => {
        if (!this.isRecording || !this.analyser || !this.audioCtx) return;

        // Retrieve time domain buffer for Pitchy
        this.analyser.getFloatTimeDomainData(this.pitchBuffer as any);
        
        // 5. Pitch extraction
        const [f0Hz, f0Confidence] = this.pitchDetector!.findPitch(
          this.pitchBuffer as any,
          sampleRate
        );

        // 6. Spectral and energy extraction using Meyda
        // Meyda can calculate directly from AnalyserNode or the signal buffer
        const timeData = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(timeData);

        // Extract features using Meyda.extract
        const features = Meyda.extract(
          ['rms', 'zcr', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'mfcc'],
          timeData
        ) as {
          rms: number;
          zcr: number;
          spectralCentroid: number;
          spectralRolloff: number;
          spectralFlatness: number;
          mfcc: number[];
        } | null;

        if (features) {
          const rawCentroid = isNaN(features.spectralCentroid) || !isFinite(features.spectralCentroid) ? 0.0 : features.spectralCentroid;
          const rawFlatness = isNaN(features.spectralFlatness) || !isFinite(features.spectralFlatness) ? 0.0 : features.spectralFlatness;
          const rawRolloff = isNaN(features.spectralRolloff) || !isFinite(features.spectralRolloff) ? 0.0 : features.spectralRolloff;
          const rawRms = isNaN(features.rms) || !isFinite(features.rms) ? 0.0 : features.rms;
          const rawZcr = isNaN(features.zcr) || !isFinite(features.zcr) ? 0.0 : features.zcr;

          // Normalize centroid (handle both bin index and Hz dynamically)
          const centroidHz = rawCentroid < 512 
            ? rawCentroid * (sampleRate / this.analyser.fftSize) 
            : rawCentroid;
          // Map 300Hz..3000Hz to 0.0..1.0
          const normalizedCentroid = Math.max(0.0, Math.min(1.0, (centroidHz - 300) / (3000 - 300)));

          // Normalize rolloff
          const normalizedRolloff = Math.min(1.0, rawRolloff / (sampleRate / 2));

          // Voice Quality Proxies (Jitter & Shimmer)
          const jitterProxy = Math.abs(rawZcr - (this.frames[this.frames.length - 1]?.zcr || 0)) * 0.002;
          const shimmerProxy = Math.abs(rawRms - (this.frames[this.frames.length - 1]?.rms || 0)) * 0.05;

          const frame: ChromacousticFrame = {
            t: performance.now() - this.sessionStartTime,
            f0Hz: f0Confidence > 0.35 && f0Hz > 40 && f0Hz < 1500 ? f0Hz : null,
            f0Confidence: f0Confidence,
            rms: Math.min(1.0, rawRms * 3.5), // Scale to 0..1 for visual dynamics
            zcr: rawZcr / 100, // Normalized proxy
            spectralCentroid: isNaN(normalizedCentroid) ? 0.0 : normalizedCentroid,
            spectralRolloff: isNaN(normalizedRolloff) ? 0.0 : normalizedRolloff,
            spectralFlatness: rawFlatness,
            mfcc: features.mfcc || new Array(13).fill(0),
            jitter: isNaN(jitterProxy) ? 0.0 : Math.min(1.0, jitterProxy),
            shimmer: isNaN(shimmerProxy) ? 0.0 : Math.min(1.0, shimmerProxy),
          };

          this.frames.push(frame);
          onFrame(frame);
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    } catch (err) {
      this.stop();
      onError(err);
    }
  }

  /**
   * Stops recording and returns the aggregated ResearchRecord session summary
   */
  public stop(): { summary: ResearchRecord['summary']; rawFrames: ChromacousticFrame[] } | null {
    this.isRecording = false;

    // Disconnect stream & nodes
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.frames.length === 0) return null;

    // Compile summary statistics
    const voicedFrames = this.frames.filter((f) => f.f0Hz !== null) as (ChromacousticFrame & { f0Hz: number })[];
    const pitches = voicedFrames.map((f) => f.f0Hz);
    const loudnessList = this.frames.map((f) => f.rms);
    const centroids = this.frames.map((f) => f.spectralCentroid);
    const flatnessList = this.frames.map((f) => f.spectralFlatness);
    const jitters = this.frames.map((f) => f.jitter);
    const shimmers = this.frames.map((f) => f.shimmer);

    // Pitch (F0) summaries
    const meanF0 = pitches.length > 0 ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 0;
    const minF0 = pitches.length > 0 ? Math.min(...pitches) : 0;
    const maxF0 = pitches.length > 0 ? Math.max(...pitches) : 0;
    const rangeF0 = maxF0 - minF0;

    // Loudness summaries
    const meanLoudness = loudnessList.reduce((a, b) => a + b, 0) / loudnessList.length;
    const varianceLoudness =
      loudnessList.reduce((acc, val) => acc + Math.pow(val - meanLoudness, 2), 0) / loudnessList.length;

    // Timbre summaries
    const meanCentroid = centroids.reduce((a, b) => a + b, 0) / centroids.length;
    const meanFlatness = flatnessList.reduce((a, b) => a + b, 0) / flatnessList.length;

    // Voice Quality summaries
    const meanJitter = jitters.reduce((a, b) => a + b, 0) / jitters.length;
    const meanShimmer = shimmers.reduce((a, b) => a + b, 0) / shimmers.length;

    // Rhythm/Cadence: estimate syllable rate (RMS peaks) and pause ratios
    let syllablePeaks = 0;
    let insideSyllable = false;
    let pauseFrames = 0;
    const pauseThreshold = 0.015; // Noise gate threshold

    for (let i = 0; i < loudnessList.length; i++) {
      const rms = loudnessList[i];
      if (rms < pauseThreshold) {
        pauseFrames++;
        insideSyllable = false;
      } else {
        if (!insideSyllable && rms > 0.05) {
          syllablePeaks++;
          insideSyllable = true;
        }
      }
    }

    const durationSeconds = (performance.now() - this.sessionStartTime) / 1000;
    const syllableRateEstimate = durationSeconds > 0 ? syllablePeaks / durationSeconds : 0;
    const pauseRatio = loudnessList.length > 0 ? pauseFrames / loudnessList.length : 0;

    // Generate unique signature hash representing "color of the voice"
    // Based on mean pitch, timbre, and voice quality
    const signatureKey = `${meanF0.toFixed(0)}-${meanCentroid.toFixed(2)}-${meanJitter.toFixed(3)}`;
    const visualSignatureHash = btoa(signatureKey).replace(/=/g, '').substring(0, 12);

    const summary: ResearchRecord['summary'] = {
      f0: { mean: meanF0, min: minF0, max: maxF0, range: rangeF0 },
      loudness: { mean: meanLoudness, variance: varianceLoudness },
      cadence: { syllableRateEstimate, pauseRatio },
      timbre: { centroidMean: meanCentroid, flatnessMean: meanFlatness },
      voiceQuality: { jitterMean: meanJitter, shimmerMean: meanShimmer },
      visualSignatureHash,
    };

    return {
      summary,
      rawFrames: [...this.frames],
    };
  }
}
