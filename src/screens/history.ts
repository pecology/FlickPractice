import type { Screen, ScreenContext } from './index';
import type { InputMode } from '../types';
import { getAllRecords, getWeakChars } from '../storage/localStorage';

/**
 * 履歴画面
 * 過去データの可視化、成長グラフ、苦手文字分析
 */
export class HistoryScreen implements Screen {
  private context: ScreenContext;
  private currentInputMode: InputMode = 'hiragana';

  constructor(context: ScreenContext) {
    this.context = context;
  }

  render(container: HTMLElement): void {
    const allRecords = getAllRecords();
    const records = allRecords.filter(r => r.inputMode === this.currentInputMode);
    const weakChars = getWeakChars(this.currentInputMode, 5);
    
    // 最近10件
    const recentRecords = records.slice(-10).reverse();
    
    // 統計計算
    const dailyRecords = records.filter(r => r.gameMode === 'daily');
    const practiceRecords = records.filter(r => r.gameMode === 'practice');
    
    const avgCpm = records.length > 0 
      ? records.reduce((sum, r) => sum + r.cpm, 0) / records.length 
      : 0;
    
    const avgAcc = records.length > 0 
      ? records.reduce((sum, r) => sum + r.accuracy, 0) / records.length 
      : 0;

    // CPM推移データ（最新20件）
    const chartData = records.slice(-20);

    container.innerHTML = `
      <div class="history-screen">
        <header class="history-header">
          <button class="back-btn">← 戻る</button>
          <h1>履歴と分析</h1>
        </header>

        <div class="input-mode-selector history-mode-selector">
          <button class="input-mode-btn ${this.currentInputMode === 'hiragana' ? 'active' : ''}" data-input-mode="hiragana">
            <span class="mode-label">ひらがな</span>
          </button>
          <button class="input-mode-btn ${this.currentInputMode === 'alphabet' ? 'active' : ''}" data-input-mode="alphabet">
            <span class="mode-label">ABC</span>
          </button>
        </div>

        <main class="history-main">
          <section class="stats-overview">
            <h2>統計</h2>
            <div class="overview-cards">
              <div class="overview-card">
                <span class="card-value">${records.length}</span>
                <span class="card-label">総プレイ</span>
              </div>
              <div class="overview-card">
                <span class="card-value">${dailyRecords.length}</span>
                <span class="card-label">デイリー</span>
              </div>
              <div class="overview-card">
                <span class="card-value">${practiceRecords.length}</span>
                <span class="card-label">練習</span>
              </div>
              <div class="overview-card">
                <span class="card-value">${Math.round(avgCpm)}</span>
                <span class="card-label">平均CPM</span>
              </div>
              <div class="overview-card">
                <span class="card-value">${avgAcc.toFixed(1)}%</span>
                <span class="card-label">平均正確性</span>
              </div>
            </div>
          </section>

          ${chartData.length > 0 ? `
          <section class="cpm-chart">
            <h2>CPM推移</h2>
            <div class="chart-container">
              <div class="chart-bars">
                ${chartData.map((r) => {
                  const maxCpm = Math.max(...chartData.map(r => r.cpm), 100);
                  const height = (r.cpm / maxCpm) * 100;
                  const modeClass = r.gameMode === 'daily' ? 'daily' : 'practice';
                  return `
                    <div class="chart-bar ${modeClass}" 
                         style="height: ${height}%"
                         title="${r.gameMode}: ${Math.round(r.cpm)} CPM">
                      <span class="bar-label">${Math.round(r.cpm)}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </section>
          ` : ''}

          ${weakChars.length > 0 ? `
          <section class="weak-chars-analysis">
            <h2>苦手文字分析</h2>
            <div class="weak-chars-list-detail">
              ${weakChars.map(c => `
                <div class="weak-char-item">
                  <span class="char-text">${c.char}</span>
                  <div class="char-bar-container">
                    <div class="char-bar" style="width: ${c.accuracy * 100}%"></div>
                  </div>
                  <span class="char-acc">${(c.accuracy * 100).toFixed(1)}%</span>
                  <span class="char-count">(${c.count}回)</span>
                </div>
              `).join('')}
            </div>
          </section>
          ` : ''}

          <section class="recent-games">
            <h2>最近のゲーム</h2>
            ${recentRecords.length > 0 ? `
            <div class="games-list">
              ${recentRecords.map(r => {
                const date = new Date(r.date);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                return `
                  <div class="game-item ${r.gameMode}">
                    <span class="game-mode">${r.gameMode === 'daily' ? '📅' : '🔄'}</span>
                    <span class="game-date">${dateStr}</span>
                    <span class="game-cpm">${Math.round(r.cpm)} CPM</span>
                    <span class="game-acc">${r.accuracy.toFixed(1)}%</span>
                  </div>
                `;
              }).join('')}
            </div>
            ` : `
            <p class="no-data">まだ記録がありません</p>
            `}
          </section>
        </main>

        <footer class="history-footer">
          <button class="nav-btn home-btn">🏠 ホーム</button>
        </footer>
      </div>
    `;

    this.attachEventListeners(container);
  }

  private attachEventListeners(container: HTMLElement): void {
    // 戻るボタン
    const backBtn = container.querySelector('.back-btn');
    backBtn?.addEventListener('click', () => {
      this.context.navigateTo('top');
    });

    // トップへボタン
    const homeBtn = container.querySelector('.home-btn');
    homeBtn?.addEventListener('click', () => {
      this.context.navigateTo('top');
    });

    // 入力モード切替
    const inputModeBtns = container.querySelectorAll('.input-mode-btn');
    inputModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-input-mode') as InputMode;
        this.currentInputMode = mode;
        this.render(container);
      });
    });
  }

  cleanup(): void {
    // イベントリスナーはDOMと共に削除される
  }
}
