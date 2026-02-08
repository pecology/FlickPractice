import type { Screen, ScreenContext, ScreenData } from './index';
import type { GameResult, Rank, Config } from '../types';
import { shareToTwitter, copyResultToClipboard } from '../utils/share';
import { saveRecord, generateId } from '../storage/localStorage';
import { dateToSeed, randomSeed } from '../engine/seededRandom';

/**
 * CPMからランクを計算
 */
function calculateRank(cpm: number, config: Config): Rank {
  const { ranking } = config;
  if (cpm >= ranking.S) return 'S';
  if (cpm >= ranking.A) return 'A';
  if (cpm >= ranking.B) return 'B';
  if (cpm >= ranking.C) return 'C';
  return 'D';
}

/**
 * ランクに応じた色を取得
 */
function getRankColor(rank: Rank): string {
  const colors: Record<Rank, string> = {
    S: '#ffd700', // Gold
    A: '#c0c0c0', // Silver  
    B: '#cd7f32', // Bronze
    C: '#6366f1', // Purple
    D: '#6b7280', // Gray
  };
  return colors[rank];
}

/**
 * 結果画面
 * スコア表示、SNS共有、リトライ
 */
export class ResultScreen implements Screen {
  private context: ScreenContext;
  private result: GameResult | null = null;

  constructor(context: ScreenContext) {
    this.context = context;
  }

  render(container: HTMLElement, data?: ScreenData): void {
    this.result = data as GameResult;
    
    if (!this.result) {
      this.context.navigateTo('top');
      return;
    }

    // 記録を保存
    saveRecord({
      id: generateId(),
      gameMode: this.result.gameMode,
      inputMode: this.result.inputMode,
      seed: this.result.seed,
      date: new Date().toISOString(),
      cpm: this.result.cpm,
      accuracy: this.result.accuracy,
      correctCount: this.result.correctCount,
      missCount: this.result.missCount,
      charStats: this.result.charStats,
      strokes: this.result.strokes,
    });

    const gameModeLabel = this.result.gameMode === 'daily' ? 'デイリー' : 'プラクティス';
    const inputModeLabel = this.result.inputMode === 'hiragana' ? 'ひらがな' : 'ABC';
    const totalChars = this.result.correctCount + this.result.missCount;
    
    // ランク計算
    const rank = calculateRank(this.result.cpm, this.context.config);
    const rankColor = getRankColor(rank);

    // 苦手文字トップ3
    const weakChars = Object.entries(this.result.charStats)
      .filter(([, stats]) => stats.miss > 0)
      .map(([char, stats]) => ({
        char,
        accuracy: stats.correct / (stats.correct + stats.miss),
        misses: stats.miss,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    container.innerHTML = `
      <div class="result-screen">
        <header class="result-header">
          <span class="result-mode">${gameModeLabel} - ${inputModeLabel}</span>
          <h1 class="result-title">結果</h1>
        </header>

        <main class="result-main">
          <div class="rank-display">
            <span class="rank-label">RANK</span>
            <span class="rank-letter" style="color: ${rankColor}; text-shadow: 0 0 30px ${rankColor};">${rank}</span>
          </div>

          <div class="score-display">
            <div class="main-score">
              <span class="score-number">${Math.round(this.result.cpm)}</span>
              <span class="score-label">CPM</span>
            </div>
            <div class="sub-scores">
              <div class="sub-score">
                <span class="sub-value">${this.result.accuracy.toFixed(1)}%</span>
                <span class="sub-label">正確性</span>
              </div>
              <div class="sub-score">
                <span class="sub-value">${this.result.correctCount}</span>
                <span class="sub-label">正解</span>
              </div>
              <div class="sub-score">
                <span class="sub-value">${this.result.missCount}</span>
                <span class="sub-label">ミス</span>
              </div>
              <div class="sub-score">
                <span class="sub-value">${totalChars}</span>
                <span class="sub-label">合計</span>
              </div>
            </div>
          </div>

          ${weakChars.length > 0 ? `
          <div class="weak-chars">
            <h3>苦手な文字</h3>
            <div class="weak-chars-list">
              ${weakChars.map(c => `
                <div class="weak-char">
                  <span class="weak-char-text">${c.char}</span>
                  <span class="weak-char-stat">${(c.accuracy * 100).toFixed(0)}%</span>
                  <span class="weak-char-miss">${c.misses}回ミス</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="result-actions">
            <button class="action-btn primary retry-btn">
              🔄 もう一度
            </button>
            <button class="action-btn share-btn">
              🐦 シェア
            </button>
            <button class="action-btn copy-btn">
              📋 コピー
            </button>
          </div>
        </main>

        <footer class="result-footer">
          <button class="nav-btn home-btn">🏠 ホーム</button>
          <button class="nav-btn history-btn">📊 履歴</button>
        </footer>
      </div>
    `;

    this.attachEventListeners(container);
  }

  private attachEventListeners(container: HTMLElement): void {
    // リトライボタン
    const retryBtn = container.querySelector('.retry-btn');
    retryBtn?.addEventListener('click', () => {
      this.retry();
    });

    // 共有ボタン
    const shareBtn = container.querySelector('.share-btn');
    shareBtn?.addEventListener('click', () => {
      if (this.result) shareToTwitter(this.result);
    });

    // コピーボタン
    const copyBtn = container.querySelector('.copy-btn');
    copyBtn?.addEventListener('click', () => {
      this.copyResult(container);
    });

    // ホームボタン
    const homeBtn = container.querySelector('.home-btn');
    homeBtn?.addEventListener('click', () => {
      this.context.navigateTo('top');
    });

    // 履歴ボタン
    const historyBtn = container.querySelector('.history-btn');
    historyBtn?.addEventListener('click', () => {
      this.context.navigateTo('history');
    });
  }

  private retry(): void {
    if (!this.result) return;
    
    const seed = this.result.gameMode === 'daily' ? dateToSeed() : randomSeed();
    this.context.navigateTo('game', { 
      gameMode: this.result.gameMode, 
      inputMode: this.result.inputMode,
      seed 
    });
  }

  private async copyResult(container: HTMLElement): Promise<void> {
    if (!this.result) return;
    
    const success = await copyResultToClipboard(this.result);
    const copyBtn = container.querySelector('.copy-btn');
    
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = success ? '✓ コピー完了!' : '✗ 失敗';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  }

  cleanup(): void {
    // イベントリスナーはDOMと共に削除される
  }
}
