import type { Screen, ScreenContext } from './index';
import type { InputMode } from '../types';
import { dateToSeed, randomSeed } from '../engine/seededRandom';
import { getDailyHighScore, getPracticeHighScore, getTodayDailyRecord, getSettings, saveSettings } from '../storage/localStorage';

/**
 * トップ画面
 * モード選択、ハイスコア表示、履歴への導線
 */
export class TopScreen implements Screen {
  private context: ScreenContext;
  private currentInputMode: InputMode = 'hiragana';

  constructor(context: ScreenContext) {
    this.context = context;
  }

  render(container: HTMLElement): void {
    const dailyHighScore = getDailyHighScore(this.currentInputMode);
    const practiceHighScore = getPracticeHighScore(this.currentInputMode);
    const todayRecord = getTodayDailyRecord(this.currentInputMode);
    const settings = getSettings();

    container.innerHTML = `
      <div class="top-screen">
        <header class="top-header">
          <h1 class="logo">Flick<span class="logo-accent">Practice</span></h1>
          <p class="tagline">60秒間のフリック入力特訓</p>
        </header>

        <main class="top-main">
          <div class="input-mode-selector">
            <button class="input-mode-btn ${this.currentInputMode === 'hiragana' ? 'active' : ''}" data-input-mode="hiragana">
              <span class="mode-label">ひらがな</span>
            </button>
            <button class="input-mode-btn ${this.currentInputMode === 'alphabet' ? 'active' : ''}" data-input-mode="alphabet">
              <span class="mode-label">ABC</span>
            </button>
          </div>

          <div class="mode-buttons">
            <button class="mode-btn daily-btn" data-mode="daily">
              <span class="mode-icon">📅</span>
              <span class="mode-name">デイリー</span>
              <span class="mode-desc">今日のチャレンジ</span>
              ${todayRecord ? `<span class="today-score">今日: ${Math.round(todayRecord.cpm)} CPM</span>` : ''}
            </button>
            
            <button class="mode-btn practice-btn" data-mode="practice">
              <span class="mode-icon">🔄</span>
              <span class="mode-name">プラクティス</span>
              <span class="mode-desc">ランダム練習</span>
            </button>
          </div>

          <div class="high-scores">
            <h2>ハイスコア</h2>
            <div class="score-cards">
              <div class="score-card">
                <span class="score-label">デイリー最高</span>
                <span class="score-value">${dailyHighScore ? Math.round(dailyHighScore.cpm) : '---'}</span>
                <span class="score-unit">CPM</span>
              </div>
              <div class="score-card">
                <span class="score-label">練習最高</span>
                <span class="score-value">${practiceHighScore ? Math.round(practiceHighScore.cpm) : '---'}</span>
                <span class="score-unit">CPM</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h2>設定</h2>
            <div class="settings-list">
              <label class="setting-item">
                <span class="setting-label">キーハイライト</span>
                <input type="checkbox" class="setting-checkbox" data-setting="showKeyHighlight" ${settings.showKeyHighlight ? 'checked' : ''}>
                <span class="toggle-switch"></span>
              </label>
              <label class="setting-item">
                <span class="setting-label">フリック方向表示</span>
                <input type="checkbox" class="setting-checkbox" data-setting="showDirectionHints" ${settings.showDirectionHints ? 'checked' : ''}>
                <span class="toggle-switch"></span>
              </label>
            </div>
          </div>
        </main>

        <footer class="top-footer">
          <button class="nav-btn history-btn">📊 履歴</button>
        </footer>
      </div>
    `;

    this.attachEventListeners(container);
  }

  private attachEventListeners(container: HTMLElement): void {
    // 入力モード切替
    const inputModeBtns = container.querySelectorAll('.input-mode-btn');
    inputModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-input-mode') as InputMode;
        this.currentInputMode = mode;
        this.render(container);
      });
    });

    // Dailyボタン
    const dailyBtn = container.querySelector('[data-mode="daily"]');
    dailyBtn?.addEventListener('click', () => {
      this.startDaily();
    });

    // Practiceボタン
    const practiceBtn = container.querySelector('[data-mode="practice"]');
    practiceBtn?.addEventListener('click', () => {
      this.startPractice();
    });

    // 履歴ボタン
    const historyBtn = container.querySelector('.history-btn');
    historyBtn?.addEventListener('click', () => {
      this.context.navigateTo('history');
    });

    // 設定チェックボックス
    const settingCheckboxes = container.querySelectorAll('.setting-checkbox');
    settingCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const settingName = target.getAttribute('data-setting') as 'showKeyHighlight' | 'showDirectionHints';
        saveSettings({ [settingName]: target.checked });
      });
    });
  }

  private startDaily(): void {
    const seed = dateToSeed();
    this.context.navigateTo('game', { 
      gameMode: 'daily', 
      inputMode: this.currentInputMode, 
      seed 
    });
  }

  private startPractice(): void {
    const seed = randomSeed();
    this.context.navigateTo('game', { 
      gameMode: 'practice', 
      inputMode: this.currentInputMode, 
      seed 
    });
  }

  cleanup(): void {
    // イベントリスナーはDOMと共に削除される
  }
}
