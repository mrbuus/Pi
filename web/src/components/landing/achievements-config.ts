/** Only publish verified results with consent. Empty lists contain no sample students. */
export interface AchievementEntry {
  name: string;
  subject: string;
  result: string;
  source: string;
  consentConfirmed: true;
  /** Approved asset under web/public. Remote URLs and traversal are never rendered. */
  photoSrc?: string;
  photoAlt?: string;
  /** Verified score; 800 is distinguished gently, never inferred from result text. */
  score?: number;
}
export interface AchievementYear {
  year: number;
  entries: AchievementEntry[];
  consentRequired?: true;
}
export const ACHIEVEMENT_YEARS: AchievementYear[] = Array.from(
  { length: 9 },
  (_, index) => ({ year: 2026 - index, entries: [], consentRequired: true }),
);
