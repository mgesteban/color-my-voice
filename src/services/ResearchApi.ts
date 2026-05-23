import type { ResearchRecord } from '../types/chromacoustic';

const LOCAL_STORAGE_KEY = 'chromacoustic_research_records';

export class ResearchApi {
  /**
   * Submits a completed ResearchRecord to the backend database.
   * If the local server is offline, it automatically falls back to local storage.
   */
  public static async submitRecord(record: ResearchRecord): Promise<{ success: boolean; message: string }> {
    // 1. Strict Consent Check
    if (!record.consent.shareData) {
      return { success: false, message: 'Research submission rejected: Consent not granted.' };
    }

    // 2. Minor Protection Check (Strict client-side block matching server-side guards)
    if (record.meta.ageBand === 'under18') {
      return {
        success: false,
        message: 'Submission blocked: Participants under 18 require active institutional consent. Record deleted.',
      };
    }

    try {
      // Send real HTTP POST request to proxy (/api)
      const res = await fetch('/api/research/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      if (res.status === 201) {
        return { success: true, message: 'Successfully stored signature in database.' };
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }
    } catch (err) {
      console.warn('Backend server is offline or unreachable. Falling back to local storage:', err);

      // Local fallback logic
      try {
        const existing = this.getLocalStorageRecords();
        existing.push(record);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
        return {
          success: true,
          message: 'Saved locally (Offline backup active).',
        };
      } catch (e) {
        return { success: false, message: 'Storage unavailable.' };
      }
    }
  }

  /**
   * Retrieves active database count. Pulls from both server and local backups.
   */
  public static async getRecordCount(): Promise<number> {
    try {
      const res = await fetch('/api/research/count');
      if (res.ok) {
        const data = await res.json();
        const serverCount = data.count || 0;
        const localCount = this.getLocalStorageRecords().length;
        return serverCount + localCount;
      }
    } catch (e) {
      // Offline fallback
    }
    return this.getLocalStorageRecords().length;
  }

  /**
   * Triggers the dataset CSV download. Directs browser to server export if available,
   * otherwise compiles from localStorage offline backup.
   */
  public static triggerDatasetDownload(): void {
    const localCount = this.getLocalStorageRecords().length;

    // If we have local offline backups, compile everything together
    if (localCount > 0) {
      try {
        const localRecords = this.getLocalStorageRecords();
        
        // Let's attempt to fetch server JSON records and merge them
        fetch('/api/research/export?format=json')
          .then((res) => (res.ok ? res.json() : []))
          .then((serverRecords) => {
            const allRecords = [...serverRecords, ...localRecords];
            this.downloadCsvFromRecords(allRecords);
          })
          .catch(() => {
            // Server offline: download only local offline backups
            this.downloadCsvFromRecords(localRecords);
          });
        return;
      } catch (e) {
        // Fallback below
      }
    }

    // Standard direct server CSV stream
    window.open('/api/research/export', '_blank');
  }

  /**
   * Compiles and triggers download of CSV files from memory arrays
   */
  private static downloadCsvFromRecords(records: any[]): void {
    if (records.length === 0) return;

    const headers = [
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

    const rows = records.map((r) => {
      const sum = r.summary || {};
      const meta = r.meta || {};
      const consent = r.consent || {};
      return [
        r.pseudoId,
        r.sessionId,
        consent.grantedAt || '',
        meta.ageBand || '',
        meta.languageFamily || '',
        meta.nativeLanguage || '',
        meta.region || '',
        meta.isMultilingual !== undefined ? meta.isMultilingual : '',
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

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chromacoustic-merged-dataset.csv`;
    link.click();
  }

  /**
   * Helper to retrieve localStorage records safely.
   */
  private static getLocalStorageRecords(): any[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Clears offline local backups
   */
  public static clearLocalStorage(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}
