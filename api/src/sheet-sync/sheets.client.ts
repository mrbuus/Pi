import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GoogleAuth } from 'google-auth-library';
import type { RawTab } from './sheet-book';

// Шийтийг зөвхөн УНШИХ эрхтэй service account (`pimath-sheet-reader@piweb-508013`).
// Түлхүүр: GOOGLE_SHEETS_KEY_JSON (сервер дээр env) эсвэл GOOGLE_SHEETS_KEY_FILE,
// аль нь ч байхгүй бол `api/.secrets/google-sheets.json` (gitignore-д).
// Бүтэн `googleapis` сан (~100MB) биш, жижиг auth сан + шууд HTTP.
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TIMEOUT_MS = 30_000;

export interface SheetsConfig {
  spreadsheetId: string;
  keyFile?: string;
  keyJson?: string;
}

export function sheetsConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SheetsConfig | null {
  const spreadsheetId = env.PAYMENT_SHEET_ID?.trim();
  if (!spreadsheetId) return null;
  if (env.GOOGLE_SHEETS_KEY_JSON?.trim()) return { spreadsheetId, keyJson: env.GOOGLE_SHEETS_KEY_JSON };
  const keyFile = env.GOOGLE_SHEETS_KEY_FILE?.trim() || join(process.cwd(), '.secrets', 'google-sheets.json');
  return existsSync(keyFile) ? { spreadsheetId, keyFile } : null;
}

export class SheetsClient {
  private readonly auth: GoogleAuth;
  constructor(private readonly config: SheetsConfig) {
    this.auth = config.keyJson
      ? new GoogleAuth({ credentials: JSON.parse(config.keyJson), scopes: [SCOPE] })
      : new GoogleAuth({ keyFile: config.keyFile, scopes: [SCOPE] });
  }

  /** Бүх хуудсыг 2 хүсэлтээр (тоон утга + дэлгэцэнд харагдах утга) уншина. */
  async readAll(): Promise<{ title: string; tabs: RawTab[] }> {
    const client = await this.auth.getClient();
    const base = `${API}/${encodeURIComponent(this.config.spreadsheetId)}`;
    const meta = await client.request<{ properties: { title: string }; sheets: { properties: { title: string } }[] }>({
      url: `${base}?fields=properties.title,sheets.properties.title`,
      timeout: TIMEOUT_MS,
    });
    const titles = meta.data.sheets.map((s) => s.properties.title);
    const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'!A1:BZ`)}`).join('&');
    type Batch = { valueRanges: { values?: unknown[][] }[] };
    const [unformatted, formatted] = await Promise.all([
      client.request<Batch>({ url: `${base}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`, timeout: TIMEOUT_MS }),
      client.request<Batch>({ url: `${base}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE`, timeout: TIMEOUT_MS }),
    ]);
    return {
      title: meta.data.properties.title,
      tabs: titles.map((title, i) => ({
        title,
        unformatted: unformatted.data.valueRanges[i]?.values ?? [],
        formatted: formatted.data.valueRanges[i]?.values ?? [],
      })),
    };
  }
}
