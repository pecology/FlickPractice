import type { GameRecord, InputMode } from '../types';

const STORAGE_KEY = 'flickpractice_scores';

/**
 * 全てのゲーム記録を取得
 */
export function getAllRecords(): GameRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as GameRecord[];
  } catch {
    console.error('Failed to load records from localStorage');
    return [];
  }
}

/**
 * ゲーム記録を保存
 */
export function saveRecord(record: GameRecord): void {
  try {
    const records = getAllRecords();
    records.push(record);
    // 最新100件のみ保持
    const trimmed = records.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    console.error('Failed to save record to localStorage');
  }
}

/**
 * Dailyモードのハイスコアを取得（入力モード別）
 */
export function getDailyHighScore(inputMode: InputMode): GameRecord | null {
  const records = getAllRecords().filter(r => 
    r.gameMode === 'daily' && r.inputMode === inputMode
  );
  if (records.length === 0) return null;
  return records.reduce((best, current) => 
    current.cpm > best.cpm ? current : best
  );
}

/**
 * Practiceモードのハイスコアを取得（入力モード別）
 */
export function getPracticeHighScore(inputMode: InputMode): GameRecord | null {
  const records = getAllRecords().filter(r => 
    r.gameMode === 'practice' && r.inputMode === inputMode
  );
  if (records.length === 0) return null;
  return records.reduce((best, current) => 
    current.cpm > best.cpm ? current : best
  );
}

/**
 * 今日のDailyスコアを取得（入力モード別）
 */
export function getTodayDailyRecord(inputMode: InputMode): GameRecord | null {
  const today = new Date().toISOString().split('T')[0];
  const records = getAllRecords().filter(r => 
    r.gameMode === 'daily' && r.inputMode === inputMode && r.date.startsWith(today)
  );
  if (records.length === 0) return null;
  return records.reduce((best, current) => 
    current.cpm > best.cpm ? current : best
  );
}

/**
 * 苦手キーの分析（入力モード別）
 */
export function getWeakChars(inputMode: InputMode, limit: number = 5): Array<{ char: string; accuracy: number; count: number }> {
  const records = getAllRecords().filter(r => r.inputMode === inputMode);
  const charStats: Record<string, { correct: number; total: number }> = {};

  for (const record of records) {
    for (const [char, stats] of Object.entries(record.charStats)) {
      if (!charStats[char]) {
        charStats[char] = { correct: 0, total: 0 };
      }
      charStats[char].correct += stats.correct;
      charStats[char].total += stats.correct + stats.miss;
    }
  }

  return Object.entries(charStats)
    .filter(([, stats]) => stats.total >= 10) // 十分なサンプルがあるもののみ
    .map(([char, stats]) => ({
      char,
      accuracy: stats.correct / stats.total,
      count: stats.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

/**
 * 最近のスコア推移を取得（入力モード別）
 */
export function getRecentScores(inputMode: InputMode, count: number = 10): GameRecord[] {
  return getAllRecords()
    .filter(r => r.inputMode === inputMode)
    .slice(-count);
}

/**
 * ユニークIDを生成
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
