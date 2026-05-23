import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize database on boot
let db = null;
async function init() {
  db = await getDb();
}
init().catch((err) => {
  console.error('Failed to boot SQLite database:', err);
});

// Middleware to strip standard PII/tracking headers
app.use((req, res, next) => {
  // Explicitly delete any headers that typically leak private identifiers
  delete req.headers['x-forwarded-for'];
  delete req.headers['x-real-ip'];
  next();
});

/**
 * Endpoint to verify current DB connection health
 */
app.get('/api/research/health', (req, res) => {
  res.json({ status: 'ok', database: db ? 'connected' : 'disconnected' });
});

/**
 * Endpoint to return aggregate records count
 */
app.get('/api/research/count', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });

  try {
    const row = await db.get('SELECT COUNT(*) as count FROM research_records');
    res.json({ count: row?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve database counts' });
  }
});

/**
 * POST /api/research/submit
 * Validates, anonymizes, and saves the ResearchRecord in SQLite.
 */
app.post('/api/research/submit', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });

  const record = req.body;

  // 1. Structural checks
  if (!record || !record.consent || !record.summary || !record.meta) {
    return res.status(400).json({ error: 'Invalid payload: Missing required record structure.' });
  }

  // 2. Strict Consent Validation
  if (!record.consent.shareData) {
    return res.status(400).json({ error: 'Consent rejected: shareData must be true to record data.' });
  }

  // 3. Strict Minor Safeguards Validation (Section 8 Protection)
  if (record.meta.ageBand === 'under18') {
    console.warn(`[Blocked] Rejected under-18 research submission from session ${record.sessionId || 'unknown'}`);
    return res.status(403).json({
      error: 'Submission blocked: Youth participation requires parental-controlled institutional flows.',
    });
  }

  try {
    const summaryStr = JSON.stringify(record.summary);

    // Insert structured columns
    await db.run(
      `INSERT INTO research_records (
        pseudo_id, session_id, consent_version, granted_at, share_data,
        age_band, language_family, native_language, region, is_multilingual,
        summary, app_version, device_class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.pseudoId,
        record.sessionId,
        record.consent.consentVersion,
        record.consent.grantedAt,
        record.consent.shareData ? 1 : 0,
        record.meta.ageBand || null,
        record.meta.languageFamily || null,
        record.meta.nativeLanguage || null,
        record.meta.region || null,
        record.meta.isMultilingual !== undefined ? (record.meta.isMultilingual ? 1 : 0) : null,
        summaryStr,
        record.appVersion,
        record.deviceClass,
      ]
    );

    console.log(`[Database] Inserted new research record for session: ${record.sessionId}`);
    res.status(201).json({ success: true, message: 'Record stored successfully.' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Conflict: Record with this session ID already exists.' });
    }
    console.error('Database write error:', err);
    res.status(500).json({ error: 'Failed to write record to SQLite.' });
  }
});

/**
 * GET /api/research/export
 * Compiles database entries and streams standard CSV or JSON downloads.
 */
app.get('/api/research/export', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });

  try {
    const rows = await db.all('SELECT * FROM research_records ORDER BY created_at DESC');

    const format = req.query.format || 'csv';

    if (format === 'json') {
      const records = rows.map((r) => ({
        pseudoId: r.pseudo_id,
        sessionId: r.session_id,
        consent: {
          consentVersion: r.consent_version,
          grantedAt: r.granted_at,
          shareData: r.share_data === 1,
        },
        meta: {
          ageBand: r.age_band,
          languageFamily: r.language_family,
          nativeLanguage: r.native_language,
          region: r.region,
          isMultilingual: r.is_multilingual === 1,
        },
        summary: JSON.parse(r.summary),
        appVersion: r.app_version,
        deviceClass: r.device_class,
        createdAt: r.created_at,
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=chromacoustic-dataset.json');
      return res.json(records);
    }

    // Default CSV formatting
    const csvHeaders = [
      'pseudoId',
      'sessionId',
      'grantedAt',
      'ageBand',
      'languageFamily',
      'nativeLanguage',
      'region',
      'isMultilingual',
      'meanF0',
      'minF0',
      'maxF0',
      'rangeF0',
      'meanLoudness',
      'varianceLoudness',
      'syllableRateEstimate',
      'pauseRatio',
      'centroidMean',
      'flatnessMean',
      'jitterMean',
      'shimmerMean',
      'visualSignatureHash',
    ];

    const csvRows = rows.map((r) => {
      let sum = { f0: {}, loudness: {}, cadence: {}, timbre: {}, voiceQuality: {}, visualSignatureHash: '' };
      try {
        sum = JSON.parse(r.summary);
      } catch (e) {}

      return [
        r.pseudo_id,
        r.session_id,
        r.granted_at,
        r.age_band || '',
        r.language_family || '',
        r.native_language || '',
        r.region || '',
        r.is_multilingual === 1 ? 'true' : (r.is_multilingual === 0 ? 'false' : ''),
        (sum.f0?.mean || 0).toFixed(2),
        (sum.f0?.min || 0).toFixed(2),
        (sum.f0?.max || 0).toFixed(2),
        (sum.f0?.range || 0).toFixed(2),
        (sum.loudness?.mean || 0).toFixed(4),
        (sum.loudness?.variance || 0).toFixed(4),
        (sum.cadence?.syllableRateEstimate || 0).toFixed(2),
        (sum.cadence?.pauseRatio || 0).toFixed(4),
        (sum.timbre?.centroidMean || 0).toFixed(4),
        (sum.timbre?.flatnessMean || 0).toFixed(4),
        (sum.voiceQuality?.jitterMean || 0).toFixed(5),
        (sum.voiceQuality?.shimmerMean || 0).toFixed(5),
        sum.visualSignatureHash || '',
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=chromacoustic-dataset.csv');
    res.send(csvContent);
  } catch (err) {
    console.error('CSV Export Error:', err);
    res.status(500).json({ error: 'Failed to compile scientific export.' });
  }
});

// Boot listening server
app.listen(port, () => {
  console.log(`Chromacoustic local research server is active at: http://localhost:${port}`);
});
