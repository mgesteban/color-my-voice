# BUILD BRIEF: "Chromacoustic" — A Voice-to-Visual Web App \+ Research Data Engine

**In linguistics and communication, prosody refers to the "rhythm, stress, and intonation" of speech. It is often described as the music of language.**

**While the *content* of what you say is the words themselves, the *prosody* is the way those words are delivered. It is the layer of meaning that allows us to distinguish a question from a statement, a joke from a serious comment, or an angry tone from a playful one, even if the words used are identical.**

### **The Core Components of Prosody**

**Prosody is composed of several physical and acoustic elements that Gemini 3.5 Flash can analyze during your real-time processing:**

* **Intonation (Pitch): The rise and fall of the voice. A rising intonation at the end of a phrase typically signals a question or uncertainty, while a falling intonation often signals finality or a statement of fact.**  
* **Stress (Emphasis): The relative prominence given to certain syllables or words. By emphasizing one word over another (e.g., "I *didn't* say you were wrong" vs. "I didn't say *you* were wrong"), the speaker changes the entire meaning of the sentence.**  
* **Rhythm (Timing): The temporal patterning of speech. This includes the speed of speech (tempo) and the duration of pauses. Rapid speech might indicate excitement or anxiety, while long, measured pauses can indicate reflection, drama, or hesitation.**  
* **Vocal Quality: The texture of the voice—such as breathiness, harshness, or "vocal fry." This conveys physical states and emotional depth.**

### **Why Prosody Matters for Your Project**

**In your Synesthesia project, prosody is the "missing link" that elevates it from a standard visualizer to a truly intelligent, agentic system.**

**If your system only tracks frequency (pitch), it captures the note, but not the *intent*. By mapping prosody to visual textures, you are effectively "visualizing the human experience" rather than just the sound waves:**

* **Mapping Stress to Texture: A sharp, emphasized word could trigger a high-contrast, sudden visual "flash" or a geometric spike.**  
* **Mapping Intonation to Movement: A gentle, rising pitch could translate into a slow, upward-drifting movement in your visual output.**  
* **Mapping Rhythm to Pattern: The cadence of a conversation can dictate the flow and transition of the colors; a fast-paced debate would look inherently more chaotic and "jagged" than a slow, empathetic monologue.**

**By focusing on prosody, you are building a system that interprets how something is said, which is a major step toward making the Synesthesia project a tool that "understands" human communication in the way a synesthete might perceive it.**

**For the orchestrating AI:** This is your master brief. Do **not** start writing feature code immediately. First read this whole document, then complete **Phase 0 (Foundation)** below — most importantly, finalize the *Shared Data Contract* (Section 6\) — and only **then** spawn parallel agents. Whenever this brief is silent or ambiguous, do not guess: collect the question into the "Open Questions" list (Section 13\) and surface it to the human before making an irreversible choice.

---

## 0\. HOW TO USE THIS BRIEF (meta-instructions for the agentic system)

1. **Foundation before parallelism.** Set up the repo, the stack, the shared types, and the data contract *first*, as a single coherent foundation. Only after the contract compiles and is documented should you spawn the parallel workstream agents in Section 7\.  
2. **Agents work against contracts, not against each other.** Every agent's inputs and outputs are defined by the Shared Data Contract (Section 6). An agent may change the *internals* of its component freely but must **never** change a shared interface without updating the contract and notifying all dependent agents.  
3. **Vertical slices, runnable early.** Aim to produce a *runnable* end-to-end MVP (tap mic → speak → see something move on screen) as fast as possible, even if every piece is crude. A working skeleton beats four perfect-but-disconnected modules.  
4. **Privacy and consent are blocking requirements, not features.** No audio and no derived data may leave the device until the user has given explicit, informed consent (Section 8). Build the consent gate *before* building the upload path.  
5. **Surface decisions, don't bury them.** The backend technology, the exact cross-modal color mapping, and any handling of minors are explicitly left open. Propose options with trade-offs and wait for a human decision rather than silently committing.  
6. **Honesty over impressiveness.** Where a measurement is an approximation (emotion, accent), label it as an estimate in both the UI and the stored data. Do not present uncertain inferences as facts.

---

## 1\. MISSION & VISION

Build a **mobile-first, globally accessible web application** that lets anyone tap a microphone, speak, and immediately see their voice transformed into a beautiful, living visual ("chromacoustic synthesis"). The same act of speaking simultaneously, and only with consent, contributes anonymized acoustic data to an open research dataset studying the relationships between vocal features (pitch, tone/affect, accent) and cross-modal perception.

The product has a **dual nature** that must never be in tension:

- **For the user:** a delightful, instantly rewarding, dead-simple toy/instrument.  
- **For researchers (especially neuroscientists studying cross-modal/synesthesia mappings):** a clean, well-categorized, privacy-preserving data engine operating at global scale.

The guiding research vision is attached separately ("The Chromacoustic Project"). Treat its scientific claims as *aspirations and hypotheses to be tested*, not as established facts to hard-code.

---

## 2\. USERS & THE ACCESSIBILITY NORTH STAR

The app must be usable, with zero instruction, by:

- **Neurodivergent individuals and students** (e.g., on the autism spectrum): low cognitive load, predictable behavior, no overwhelming or unexpected motion, calm defaults, no time pressure.  
- **People for whom English is a second language, or non-readers:** the core experience must work **icon-first and language-independent** — a person should be able to use the whole core loop without reading a single word.  
- **Users on low-end Android devices and slow networks**, anywhere in the world.  
- **Researchers**, who need structured, exportable, trustworthy data.

**Design principles (non-negotiable):**

- One primary action on screen at a time. The microphone is the hero.  
- Icons \+ universal symbols first; text is a secondary aid, fully translatable.  
- Respect `prefers-reduced-motion`; offer a "calm mode" with gentler visuals.  
- High color contrast for all controls; large tap targets (min 48×48 px).  
- Nothing flashes faster than 3 times/second (photosensitive-epilepsy safety).  
- Full keyboard and screen-reader operability (WCAG 2.2 AA target).  
- Forgiving: no penalties, no scores required, no dead ends, easy undo/redo.

---

## 3\. PRODUCT SCOPE — THE USER JOURNEY

The entire core loop, in order:

1. **Land** on a calm screen with one obvious, large, glowing **microphone button** and minimal/no text.  
2. **First-time consent gate** (Section 8): a clear, icon-supported, translatable explanation of what's recorded, that audio stays on the device, and that only anonymized measurements are shared *if* they opt in. Nothing is captured before this.  
3. **Tap the mic and speak.** Permission prompt handled gracefully with a friendly fallback if denied.  
4. **Real-time visualization:** as they speak, the screen renders a fluid, evolving visual driven by their voice (Section 6 mapping). This must feel immediate (low latency) and beautiful.  
5. **Stop / reflect:** a still "chromacoustic signature" image of what they just said, which they can **save/share** as an image (this is the viral/growth loop — make it gorgeous and shareable).  
6. **Optional contribute:** a clear, opt-in prompt to (a) anonymously donate the *measurements* (never raw audio by default) to research, and (b) optionally self-report coarse, non-identifying metadata (e.g., language family, broad region, age band) to make the data scientifically useful.  
7. **Done.** No account required to use the app. No dark patterns to keep them.

**Secondary surfaces (later phases):**

- A "Color of Dialects" gallery of anonymized chromacoustic signatures by language family/region.  
- A speech-therapy / "paint with your voice" target-practice mode.  
- A live-captioning "affect overlay" mode.

---

## 4\. TECHNICAL & SCIENTIFIC HONESTY (this shapes the phasing — read carefully)

Sort all "analysis" into three difficulty tiers and build in this order:

- **Tier A — Reliably measurable in-browser, in real time (build first):** fundamental frequency / pitch (F0) and its confidence, loudness/energy (RMS), rhythm/cadence (onset rate, pause structure), zero-crossing rate, spectral centroid/rolloff/flatness (timbre brightness), and voice-quality proxies (jitter, shimmer). These are math on the audio signal and are trustworthy.  
- **Tier B — Approximate, build later, always labeled as an *estimate*:** **affect/emotion** (e.g., a coarse valence/arousal estimate). Acceptable to compute, but the UI and the stored data must mark it `is_estimate: true` with a confidence value. Never display or store words like "deceptive," "lying," or a hard emotion label as if it were fact.  
- **Tier C — Hardest, research-grade, build last and cautiously:** **accent / dialect classification.** There is no reliable drop-in client-side model. Treat this as an explicit research/ML sub-project. For early phases, capture the *raw acoustic features that accent researchers need* (e.g., formant trajectories F1–F3, vowel-space data) and store them, rather than attempting to label an accent. Let researchers classify offline.

This tiering is the reason MVP ships on Tier A only.

---

## 5\. TECHNICAL ARCHITECTURE

**Overarching principle: privacy-first, client-heavy.** Do as much as possible in the browser, on the user's device. Send tiny, anonymized feature vectors — **never raw audio** — and only after consent. This is both an ethics requirement *and* the key to scaling to massive participation cheaply.

**Recommended frontend stack (justify any deviation):**

- **TypeScript** everywhere — non-negotiable, because the Shared Data Contract is enforced through types and that's what keeps the parallel agents honest.  
- **React \+ Vite**, built as an installable **PWA** (works offline for the core toy; fast first load globally).  
- **Web Audio API \+ an `AudioWorklet`** for low-latency, off-main-thread audio capture and analysis (keeps the visuals smooth while analyzing).  
- **Feature extraction:** use a maintained library such as **Meyda** for spectral/MFCC/energy features and a robust pitch detector (e.g., **Pitchy** / McLeod Pitch Method or a YIN implementation). Don't hand-roll FFT pitch detection in v1.  
- **Visualization:** **WebGL via GLSL shaders** (e.g., through Three.js or a lightweight regl setup) for the fluid "shader" aesthetic, with a **Canvas-2D fallback** for low-end devices. Provide a reduced-motion variant.  
- **Internationalization:** an i18n library (e.g., i18next) wired in from day one, even if only English strings exist initially — so adding languages later is config, not refactor.  
- **On-device ML (Tier B/C, later):** TensorFlow.js or ONNX Runtime Web, only if a vetted model exists; otherwise defer to the backend.

**Backend (DELIBERATELY UNSPECIFIED — surface as a decision):** Do **not** pick or name a specific backend product/provider yet. Instead, define the backend purely by its *responsibilities and interface* (Section 6.4), implement against a thin abstraction so the concrete choice can be swapped, and present the human with 2–3 backend options (with trade-offs on cost, privacy/data-residency, scale, and ease) for them to choose. The backend's only jobs are: verify a consent token, generate/attach an anonymous pseudo-ID, validate and store categorized feature records, and provide a researcher export. It must never receive PII or raw audio by default.

**High-level component map:**

\[ Mic Button / UI \] ──\> \[ Audio Capture (AudioWorklet) \]

                              │  raw samples (on-device only)

                              ▼

                    \[ Feature Extractor \]  ── produces ──\> ChromacousticFrame

                              │                                   │

              ┌───────────────┴───────────────┐                  │

              ▼                               ▼                   ▼

   \[ Visualization Engine \]        \[ Affect/Accent (later) \]  \[ Consent \+ Anonymizer \]

   (frame \-\> color/motion)          (frame \-\> estimates)            │ opt-in only

                                                                    ▼

                                                    \[ Backend: validate, store, export \]

                                                       (technology TBD by human)

---

## 6\. THE SHARED DATA CONTRACT  ★ MOST IMPORTANT SECTION ★

Define these as TypeScript types in a shared package that **all** agents import. Treat changes here as breaking changes requiring sign-off.

### 6.1 `ChromacousticFrame` (produced by the analysis agent, \~20–60 per second)

type ChromacousticFrame \= {

  t: number;                 // ms since session start

  f0Hz: number | null;       // fundamental frequency (pitch); null when unvoiced

  f0Confidence: number;      // 0..1

  rms: number;               // loudness/energy 0..1 (normalized)

  zcr: number;               // zero-crossing rate

  spectralCentroid: number;  // timbre "brightness"

  spectralRolloff: number;

  spectralFlatness: number;  // tonal vs noisy

  mfcc: number\[\];            // length 13

  jitter: number;            // voice-quality (pitch perturbation)

  shimmer: number;           // voice-quality (amplitude perturbation)

  formants?: \[number, number, number\]; // F1,F2,F3 — for accent research (Tier C)

};

### 6.2 `AffectEstimate` (Tier B — optional, later, always flagged)

type AffectEstimate \= {

  valence: number;     // \-1..1 (negative..positive)

  arousal: number;     // 0..1 (calm..excited)

  confidence: number;  // 0..1

  isEstimate: true;    // ALWAYS true; never present as ground truth

};

### 6.3 `VisualToken` (the cross-modal mapping output — consumed by the visualizer)

type VisualToken \= {

  hue: number;          // 0..360

  saturation: number;   // 0..1

  lightness: number;    // 0..1

  turbulence: number;   // 0..1  (driven by voice-quality / noisiness)

  motionSpeed: number;  // driven by rhythm/cadence

  patternId: string;    // geometric vs flowing, driven by formants/timbre

};

**Default mapping (configurable — and itself a research variable, so make it data-driven, not hard-coded):**

| Acoustic feature | Visual dimension | Default direction |
| :---- | :---- | :---- |
| F0 (pitch) | hue | low pitch → warm; high pitch → cool |
| RMS (loudness) | lightness / scale | louder → brighter / larger |
| Spectral centroid (brightness) | saturation | brighter timbre → more saturated |
| Jitter/shimmer (voice quality) | turbulence | rougher → more turbulent/jagged |
| Cadence/rhythm | motionSpeed | faster speech → faster motion |
| Formants / timbre | patternId | selects geometric vs flowing pattern |

Expose this mapping as a config object so researchers can A/B different mappings — the *choice* of mapping is part of what the science studies.

### 6.4 `ResearchRecord` \+ session metadata (what the backend stores)

type ConsentRecord \= {

  consentVersion: string;   // e.g. "2026-05-22-v1"

  grantedAt: string;        // ISO timestamp

  shareData: boolean;       // did they opt in to research donation?

};

type SelfReportedMeta \= {   // ALL optional, ALL coarse, NONE identifying

  languageFamily?: string;  // e.g. "Romance", "Sino-Tibetan"

  nativeLanguage?: string;  // optional, free of region precision

  region?: string;          // COARSE only (e.g. country or larger), opt-in

  ageBand?: "under18" | "18-24" | "25-34" | "35-49" | "50-64" | "65plus";

  isMultilingual?: boolean;

};

type ResearchRecord \= {

  pseudoId: string;         // random, rotating, NOT a stable cross-session identity

  sessionId: string;        // random per session

  consent: ConsentRecord;

  meta: SelfReportedMeta;

  // Aggregated/sampled features for the utterance (NOT continuous raw stream):

  summary: {

    f0: { mean: number; min: number; max: number; range: number };

    loudness: { mean: number; variance: number };

    cadence: { syllableRateEstimate: number; pauseRatio: number };

    timbre: { centroidMean: number; flatnessMean: number };

    voiceQuality: { jitterMean: number; shimmerMean: number };

    formantsMean?: \[number, number, number\];

    affect?: AffectEstimate;          // Tier B, optional

    visualSignatureHash: string;      // reproducible "color of this voice" token

  };

  appVersion: string;

  deviceClass: "low" | "mid" | "high";

  // EXPLICITLY ABSENT: name, email, IP (must be stripped server-side), raw audio,

  // precise location, device fingerprint, anything re-identifying.

};

### 6.5 Storage categories for researchers

Records must be queryable/exportable along the dimensions the research needs: by **language family / native language**, by **coarse region**, by **age band**, and across the **acoustic features** themselves — so a neuroscientist can ask, e.g., "show the pitch→hue distribution across all Sino-Tibetan vs Romance speakers." Design the schema and an export (CSV/JSON) around those questions.

---

## 7\. MULTI-AGENT WORK BREAKDOWN

Spawn these as parallel workstreams **after** Phase 0\. Each entry lists Owns / Depends on / Delivers / Interface.

**Agent 1 — Foundation & Contract (LEAD, runs first, then supports).**

- Owns: repo, TypeScript config, build/PWA setup, CI, the shared types package (Section 6), the configurable mapping config, the backend abstraction interface.  
- Delivers: a compiling skeleton app that renders the mic button and imports the contract.  
- Interface: *defines* all interfaces; other agents consume them.

**Agent 2 — Audio Capture & Analysis.**

- Owns: `getUserMedia`, AudioWorklet pipeline, feature extraction (Tier A).  
- Depends on: Agent 1 contract.  
- Delivers: a live stream of `ChromacousticFrame`s \+ an utterance `summary`.  
- Interface: produces `ChromacousticFrame`; produces `ResearchRecord.summary`.

**Agent 3 — Visualization / Cross-Modal Rendering.**

- Owns: WebGL shader visuals \+ Canvas-2D fallback \+ reduced-motion mode \+ the still "signature" image export.  
- Depends on: contract \+ the mapping config.  
- Delivers: beautiful real-time visuals from frames; shareable signature image.  
- Interface: consumes `ChromacousticFrame` → `VisualToken` → pixels.

**Agent 4 — UX, Accessibility, Onboarding & i18n.**

- Owns: the hero mic button, consent gate UI, icon-first/no-text core flow, calm mode, WCAG compliance, screen-reader support, i18n wiring, share/save flow, the opt-in metadata form.  
- Depends on: contract (consent \+ meta types).  
- Delivers: the full front-of-house experience meeting Section 2\.  
- Interface: emits `ConsentRecord` and `SelfReportedMeta`.

**Agent 5 — Backend, Data & Privacy.**

- Owns: the backend abstraction implementation, server-side anonymization (strip IP/headers, mint rotating pseudo-IDs), validation, categorized storage, researcher export, consent-token verification.  
- Depends on: contract (`ResearchRecord`), and a human decision on backend tech.  
- Delivers: an endpoint that accepts only validated, consented, PII-free records; an export.  
- Interface: consumes `ResearchRecord`; **must reject** any payload containing raw audio or identifiers.

**Agent 6 — QA, Performance & Cross-Device.**

- Owns: automated tests, the device/browser matrix (esp. low-end Android \+ iOS Safari, which is strict about audio), performance budgets (Section 10), accessibility audits, photosensitivity check.  
- Depends on: everything; runs continuously.  
- Delivers: passing CI, a tested device matrix, performance reports.

**Dependency order:** Agent 1 → (Agents 2,3,4,5 in parallel) → Agent 6 continuous. Agents 2+3 and 4+5 form the two natural integration pairs; integrate each pair into the runnable slice early.

---

## 8\. PRIVACY, CONSENT, ETHICS & ANONYMIZATION (BLOCKING)

These are requirements, not suggestions. Do not ship without them.

1. **Capture nothing before consent.** No mic access, no recording, no storage until the user explicitly consents via the gate.  
2. **Audio never leaves the device by default.** Only derived, anonymized feature summaries are uploaded, and only on explicit opt-in to research donation. Saving the visual image is local unless the user shares it.  
3. **No PII, ever.** No name, email, login, precise location, or device fingerprint. Generate **rotating, random** pseudo-IDs that do not stably re-identify a person across sessions. Strip IP and identifying headers server-side.  
4. **Data minimization & purpose limitation.** Collect only what the research questions in Section 6.5 actually require. Coarse metadata only.  
5. **User control.** Easy to use without donating data; easy to withdraw; a clear, plain-language privacy explanation supported by icons and available in every supported language.  
6. **Legal/regulatory awareness.** Voice is biometric/sensitive data in many jurisdictions (e.g., GDPR). Build for data-residency flexibility and lawful processing. **Surface to the human** that real research deployment likely requires an ethics/IRB review and a formal consent form vetted by the research institution — the app should not silently become a data-collection instrument without that.  
7. **Minors.** Students may be under 18\. If under-18 participation is in scope, additional safeguards and parental/guardian consent are required, and this must be **flagged to the human as a decision**, not assumed. Default to the most protective behavior until decided.

---

## 9\. PHASING / MILESTONES

- **Phase 0 — Foundation.** Stack, PWA shell, shared contract compiles, mic button renders, mapping config exists, backend abstraction stubbed. *Exit:* skeleton runs.  
- **Phase 1 — MVP (Tier A only, no upload).** Tap mic → speak → live beautiful visualization → save/share image. Fully on-device. Consent gate present but no data leaves device yet. *Exit:* the core toy is delightful on a phone.  
- **Phase 2 — Research data path.** Opt-in donation of anonymized `summary` records \+ coarse metadata; backend stores categorized data; researcher export works. *Exit:* a neuroscientist can pull a clean, categorized dataset.  
- **Phase 3 — Tier B (affect estimate) \+ i18n breadth \+ accessibility hardening.** Affect as labeled estimates; multiple languages live; WCAG AA verified.  
- **Phase 4 — Tier C (accent/dialect research), gallery ("Color of Dialects"), therapy/captioning modes, global scale tuning.**

Ship Phase 1 before touching Phase 2\.

---

## 10\. QUALITY BAR / ACCEPTANCE CRITERIA

- **Latency:** mic-to-first-visual under \~150 ms perceived; visuals at ≥30 fps on a mid-range phone, gracefully degrading on low-end.  
- **Cold load:** core toy interactive in a few seconds on a slow 3G-class connection (PWA caching).  
- **Cross-device:** verified on iOS Safari (strict audio rules — test the user-gesture requirement for audio start), Android Chrome, and at least one low-end Android device.  
- **Accessibility:** automated \+ manual WCAG 2.2 AA pass; full keyboard \+ screen-reader operation; reduced-motion honored; no \>3 Hz flashing.  
- **No-text test:** a person who reads no language in the app can complete the core loop.  
- **Privacy test:** prove via network inspection that no raw audio and no PII are transmitted, and that nothing transmits before consent.  
- **Data integrity:** every stored record validates against `ResearchRecord`; affect fields always carry `isEstimate: true`.  
- **Tests \+ CI green** on every workstream before integration.

---

## 11\. EXPLICIT NON-GOALS / CONSTRAINTS

- Do **not** require accounts or logins for the core experience.  
- Do **not** transmit or persist raw audio by default.  
- Do **not** hard-code a single backend vendor; keep it swappable and let the human choose.  
- Do **not** present affect or accent inferences as factual; they are estimates.  
- Do **not** add gamified scores, streaks, or dark patterns to the core loop.  
- Do **not** over-build: ship Tier A MVP before anything ML-heavy.

---

## 12\. WHAT TO DELIVER & HOW TO REPORT BACK

1. A short written **plan** (workstreams, the finalized contract, the phase you'll ship first) for human approval *before* large-scale code generation.  
2. The **backend options memo** (2–3 choices, trade-offs) for a human decision.  
3. A running **Phase 1 MVP** with setup instructions.  
4. A list of every **assumption you made** and every item in **Open Questions** you could not resolve.  
5. Clear notes on **how a non-engineer can run, test, and iterate** on the result (the human is a vibecoder who wants to learn — explain your choices).

---

## 13\. OPEN QUESTIONS TO SURFACE (do not silently decide these)

- Which backend technology/provider, given cost, privacy, data-residency, and scale needs?  
- The exact default cross-modal color/motion mapping (this is scientifically meaningful — confirm with the research lead).  
- Are minors (under-18 students) in scope? If so, what consent/safeguarding applies?  
- Which languages/regions to localize first for the target research populations?  
- Is there an institution/IRB whose consent language and ethics approval must be incorporated before live data collection?  
- Should the "research donation" be opt-in (recommended) or a separate researcher-mode build?

---

*End of brief. Begin with Section 0 → Phase 0\. Confirm the plan and the backend options with the human before generating the full application.*  
