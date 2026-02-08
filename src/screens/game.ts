import type { Screen, ScreenContext, ScreenData } from './index';
import type { FlickStroke, GameMode, InputMode, GameResult, Config, FlickDirection } from '../types';
import { CharacterGenerator } from '../engine/generator';
import { FlickKeyboard } from '../engine/flickKeyboard';
import { getSettings, type UserSettings } from '../storage/localStorage';

interface GameData {
  gameMode: GameMode;
  inputMode: InputMode;
  seed: number;
}

/**
 * ゲーム画面
 * 60秒間のフリック入力セッション
 */
export class GameScreen implements Screen {
  private context: ScreenContext;
  private config: Config;
  
  // ゲーム状態
  private generator: CharacterGenerator | null = null;
  private flickKeyboard: FlickKeyboard | null = null;
  private characters: string = '';
  private currentIndex: number = 0;
  private strokes: FlickStroke[] = [];
  private startTime: number = 0;
  private timeRemaining: number = 0;
  private isRunning: boolean = false;
  private isCountdown: boolean = false;
  private countdownValue: number = 0;
  
  // 濁点入力状態
  private pendingBaseChar: string | null = null;  // 濁点待ちの清音
  private pendingDakutenType: 'dakuten' | 'handakuten' | null = null;  // 必要な濁点種別
  private pendingDakutenCount: number = 0;  // 濁点キーの入力回数（半濁点用）
  
  // DOM要素
  private container: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private cpmEl: HTMLElement | null = null;
  private accEl: HTMLElement | null = null;
  private trackEl: HTMLElement | null = null;
  private keyboardEl: HTMLElement | null = null;
  
  // タイマー
  private gameTimer: number | null = null;
  private countdownTimer: number | null = null;
  
  // ゲームデータ
  private gameData: GameData | null = null;
  
  // マウス操作用
  private activeKeyElement: HTMLElement | null = null;
  
  // ユーザー設定
  private userSettings: UserSettings;

  constructor(context: ScreenContext) {
    this.context = context;
    this.config = context.config;
    this.userSettings = getSettings();
  }

  render(container: HTMLElement, data?: ScreenData): void {
    this.container = container;
    this.gameData = data as GameData;
    
    if (!this.gameData) {
      this.context.navigateTo('top');
      return;
    }

    const inputModeLabel = this.gameData.inputMode === 'hiragana' ? 'ひらがな' : 'ABC';

    container.innerHTML = `
      <div class="game-screen">
        <header class="game-header">
          <div class="game-info">
            <span class="game-mode-label">${inputModeLabel}</span>
          </div>
          <div class="game-stats">
            <div class="stat">
              <span class="stat-label">TIME</span>
              <span class="stat-value" id="timer">${this.config.game.duration}</span>
            </div>
            <div class="stat">
              <span class="stat-label">CPM</span>
              <span class="stat-value" id="cpm">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">ACC</span>
              <span class="stat-value" id="acc">100%</span>
            </div>
          </div>
        </header>

        <main class="game-main">
          <div class="typing-area">
            <div class="track-container">
              <div class="track" id="track"></div>
              <div class="caret"></div>
            </div>
          </div>
          
          <div class="flick-keyboard" id="keyboard"></div>
          
          <div class="countdown-overlay" id="countdown">
            <span class="countdown-number">${this.config.game.countdownSeconds}</span>
          </div>
        </main>

        <footer class="game-footer">
          <button class="quit-btn">✕ やめる</button>
        </footer>
      </div>
    `;

    // DOM要素を取得
    this.timerEl = container.querySelector('#timer');
    this.cpmEl = container.querySelector('#cpm');
    this.accEl = container.querySelector('#acc');
    this.trackEl = container.querySelector('#track');
    this.keyboardEl = container.querySelector('#keyboard');

    // ジェネレーターを初期化
    this.generator = new CharacterGenerator(
      this.gameData.seed, 
      this.config, 
      this.gameData.inputMode
    );
    
    // フリックキーボードを初期化
    this.flickKeyboard = new FlickKeyboard(this.config, this.gameData.inputMode);
    this.flickKeyboard.setOnInput(this.handleFlickInput.bind(this));
    
    // 初期文字列を生成
    this.characters = this.generator.generate(100);
    this.currentIndex = 0;
    this.strokes = [];
    
    // トラックとキーボードを描画
    this.renderTrack();
    this.renderKeyboard();
    
    // イベントリスナーを設定
    this.attachEventListeners();
    
    // カウントダウン開始
    this.startCountdown();
  }

  private renderKeyboard(): void {
    if (!this.keyboardEl || !this.flickKeyboard) return;
    
    const layout = this.flickKeyboard.getLayout();
    const alwaysShowHints = this.userSettings.showDirectionHints;
    
    let html = `<div class="keyboard-grid${alwaysShowHints ? ' show-hints-always' : ''}">`;
    
    layout.forEach((key, index) => {
      html += `
        <div class="flick-key" data-key-index="${index}">
          <span class="key-center">${key.center}</span>
          ${key.up ? `<span class="key-up">${key.up}</span>` : ''}
          ${key.down ? `<span class="key-down">${key.down}</span>` : ''}
          ${key.left ? `<span class="key-left">${key.left}</span>` : ''}
          ${key.right ? `<span class="key-right">${key.right}</span>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    this.keyboardEl.innerHTML = html;
    
    // タッチイベントを各キーに設定
    const keyElements = this.keyboardEl.querySelectorAll('.flick-key');
    keyElements.forEach((keyEl) => {
      const element = keyEl as HTMLElement;
      
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        element.classList.add('touching');
        this.flickKeyboard?.handleTouchStart(e as TouchEvent, element);
      }, { passive: false });
      
      element.addEventListener('touchmove', (e) => {
        e.preventDefault();
        this.flickKeyboard?.handleTouchMove(e as TouchEvent, element);
      }, { passive: false });
      
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        element.classList.remove('touching');
        this.flickKeyboard?.handleTouchEnd(e as TouchEvent, element);
      }, { passive: false });
      
      element.addEventListener('touchcancel', () => {
        element.classList.remove('touching');
      });
      
      // マウスイベント（PC対応）
      element.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.activeKeyElement = element;
        element.classList.add('touching');
        this.flickKeyboard?.handleMouseDown(e as MouseEvent, element);
      });
      
      element.addEventListener('mousemove', (e) => {
        if (this.activeKeyElement === element) {
          this.flickKeyboard?.handleMouseMove(e as MouseEvent, element);
        }
      });
      
      element.addEventListener('mouseup', (e) => {
        if (this.activeKeyElement === element) {
          element.classList.remove('touching');
          this.flickKeyboard?.handleMouseUp(e as MouseEvent, element);
          this.activeKeyElement = null;
        }
      });
      
      element.addEventListener('mouseleave', () => {
        // ドラッグ中にキーから離れた場合も継続
      });
    });
    
    // ドキュメントレベルのマウスアップハンドラ（キー外でリリースした場合）
    document.addEventListener('mouseup', this.handleDocumentMouseUp);
  }
  
  private handleDocumentMouseUp = (e: MouseEvent): void => {
    if (this.activeKeyElement && this.flickKeyboard) {
      this.activeKeyElement.classList.remove('touching');
      this.flickKeyboard.handleMouseUp(e, this.activeKeyElement);
      this.activeKeyElement = null;
    }
  };

  private handleFlickInput(char: string, direction: FlickDirection): void {
    // カウントダウン中は入力を無視
    if (this.isCountdown || !this.isRunning) return;
    
    const expected = this.characters[this.currentIndex];
    
    // 濁点・半濁点の処理
    if (char === '゛' || char === '゜') {
      // 濁点/半濁点キーが押された
      if (this.pendingBaseChar) {
        // 半濁点が必要な場合、濁点キー2回で確定
        if (this.pendingDakutenType === 'handakuten' && char === '゛') {
          this.pendingDakutenCount++;
          if (this.pendingDakutenCount < 2) {
            // まだ待機中、ハイライト更新
            this.highlightNextKey();
            return;
          }
          // 2回目なので半濁点として確定
          char = '゜';
        }
        
        // 清音が入力済みなら、濁点変換を確認
        const map = char === '゛' ? this.config.dakutenMap : this.config.handakutenMap;
        const converted = map[this.pendingBaseChar];
        
        if (converted && converted === expected) {
          // 正解！
          this.strokes.push({
            input: converted,
            expected,
            correct: true,
            timestamp: Date.now() - this.startTime,
            flickDirection: direction,
          });
          this.pendingBaseChar = null;
          this.pendingDakutenType = null;
          this.pendingDakutenCount = 0;
          this.currentIndex++;
          this.renderTrack();
          this.updateStats();
          this.highlightNextKey();
          return;
        } else {
          // 不正解（間違った濁点）
          this.strokes.push({
            input: converted || char,
            expected,
            correct: false,
            timestamp: Date.now() - this.startTime,
            flickDirection: direction,
          });
          this.shakeTypingArea();
          this.pendingBaseChar = null;
          this.pendingDakutenType = null;
          this.pendingDakutenCount = 0;
          this.currentIndex++;
          this.renderTrack();
          this.updateStats();
          this.highlightNextKey();
          return;
        }
      }
      // 清音が入力されていないのに濁点キーを押した場合は無視
      return;
    }
    
    // 清音の入力
    const needsDakuten = this.flickKeyboard?.needsDakuten(expected);
    
    if (needsDakuten) {
      // 期待される文字が濁点付きの場合
      const baseChar = this.flickKeyboard?.getBaseChar(expected);
      
      if (char === baseChar) {
        // 清音が正しく入力された -> 濁点待ち状態へ
        this.pendingBaseChar = char;
        this.pendingDakutenType = needsDakuten;
        this.pendingDakutenCount = 0;
        this.highlightNextKey();
        return;
      } else {
        // 間違った清音が入力された
        this.strokes.push({
          input: char,
          expected,
          correct: false,
          timestamp: Date.now() - this.startTime,
          flickDirection: direction,
        });
        this.shakeTypingArea();
        this.pendingBaseChar = null;
        this.pendingDakutenType = null;
        this.pendingDakutenCount = 0;
        this.currentIndex++;
        this.renderTrack();
        this.updateStats();
        this.highlightNextKey();
        return;
      }
    }
    
    // 通常の文字入力（濁点なし）
    const correct = char === expected;
    
    // 打鍵記録
    this.strokes.push({
      input: char,
      expected,
      correct,
      timestamp: Date.now() - this.startTime,
      flickDirection: direction,
    });
    
    // ミス時のシェイク
    if (!correct) {
      this.shakeTypingArea();
    }
    
    // 濁点待ち状態をクリア
    this.pendingBaseChar = null;
    this.pendingDakutenType = null;
    
    // 次の文字へ
    this.currentIndex++;
    
    // 表示更新
    this.renderTrack();
    this.updateStats();
    
    // 次に入力すべきキーをハイライト
    this.highlightNextKey();
  }

  private highlightNextKey(): void {
    if (!this.keyboardEl || !this.flickKeyboard) return;
    
    // 既存のハイライトを削除
    const allKeys = this.keyboardEl.querySelectorAll('.flick-key');
    allKeys.forEach(key => {
      key.classList.remove('next-key', 'dakuten-pending');
      key.removeAttribute('data-next-direction');
    });
    
    // ハイライトがOFFの場合はここで終了
    if (!this.userSettings.showKeyHighlight) return;
    
    // 濁点待ち状態の場合
    if (this.pendingBaseChar && this.pendingDakutenType) {
      // 濁点キーをハイライト
      const dakutenKeyIndex = this.flickKeyboard.getKeyIndexForChar('゛');
      if (dakutenKeyIndex >= 0) {
        const keyEl = this.keyboardEl.querySelector(`[data-key-index="${dakutenKeyIndex}"]`);
        if (keyEl) {
          keyEl.classList.add('next-key', 'dakuten-pending');
          // 濁点も半濁点もcenter（゛キー）を押せばOK
          keyEl.setAttribute('data-next-direction', 'center');
        }
      }
      return;
    }
    
    // 次の文字のキーを取得
    const nextChar = this.characters[this.currentIndex];
    const nextKey = this.flickKeyboard.getKeyForChar(nextChar);
    let nextDirection = this.flickKeyboard.getDirectionForChar(nextChar);
    
    // 濁点付き文字の場合、元の清音の方向を取得
    const needsDakuten = this.flickKeyboard.needsDakuten(nextChar);
    if (needsDakuten) {
      const baseChar = this.flickKeyboard.getBaseChar(nextChar);
      if (baseChar) {
        nextDirection = this.flickKeyboard.getDirectionForChar(baseChar);
      }
    }
    
    if (nextKey && nextDirection) {
      // 対応するキー要素を探す
      const keyIndex = this.flickKeyboard.getKeyIndexForChar(nextChar);
      if (keyIndex >= 0) {
        const keyEl = this.keyboardEl.querySelector(`[data-key-index="${keyIndex}"]`);
        if (keyEl) {
          keyEl.classList.add('next-key');
          keyEl.setAttribute('data-next-direction', nextDirection);
        }
      }
    }
  }

  private startCountdown(): void {
    this.isCountdown = true;
    this.countdownValue = this.config.game.countdownSeconds;
    
    const countdownEl = this.container?.querySelector('#countdown');
    const numberEl = countdownEl?.querySelector('.countdown-number');
    
    if (!countdownEl || !numberEl) return;
    
    countdownEl.classList.add('active');
    
    this.countdownTimer = window.setInterval(() => {
      this.countdownValue--;
      
      if (this.countdownValue > 0) {
        numberEl.textContent = String(this.countdownValue);
        numberEl.classList.add('pulse');
        setTimeout(() => numberEl.classList.remove('pulse'), 200);
      } else {
        // カウントダウン終了
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        countdownEl.classList.remove('active');
        countdownEl.classList.add('hidden');
        this.isCountdown = false;
        this.startGame();
      }
    }, 1000);
  }

  private startGame(): void {
    this.isRunning = true;
    this.startTime = Date.now();
    this.timeRemaining = this.config.game.duration;
    
    // 最初のキーをハイライト
    this.highlightNextKey();
    
    // ゲームタイマー開始
    this.gameTimer = window.setInterval(() => {
      this.timeRemaining--;
      this.updateTimer();
      
      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  private updateTimer(): void {
    if (this.timerEl) {
      this.timerEl.textContent = String(this.timeRemaining);
      
      // 残り10秒以下で警告表示
      if (this.timeRemaining <= 10) {
        this.timerEl.classList.add('warning');
      }
    }
  }

  private updateStats(): void {
    const elapsed = (Date.now() - this.startTime) / 1000 / 60; // 分
    const correctCount = this.strokes.filter(s => s.correct).length;
    const totalCount = this.strokes.length;
    
    // CPM計算 (Characters Per Minute)
    const cpm = elapsed > 0 ? correctCount / elapsed : 0;
    
    // 正確性計算
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 100;
    
    if (this.cpmEl) {
      this.cpmEl.textContent = String(Math.round(cpm));
    }
    if (this.accEl) {
      this.accEl.textContent = `${accuracy.toFixed(0)}%`;
    }
  }

  private renderTrack(): void {
    if (!this.trackEl) return;
    
    const before = this.config.ui.visibleCharsBefore;
    const after = this.config.ui.visibleCharsAfter;
    
    // 表示範囲を計算
    const startIndex = Math.max(0, this.currentIndex - before);
    const endIndex = this.currentIndex + after;
    
    // 文字が足りなければ追加生成
    while (this.characters.length < endIndex + 50) {
      this.characters += this.generator!.generate(50);
    }
    
    // HTML生成
    let html = '';
    for (let i = startIndex; i < endIndex; i++) {
      const char = this.characters[i] || '';
      let className = 'char';
      
      if (i < this.currentIndex) {
        // 入力済み
        const strokeIndex = i - (this.currentIndex - this.strokes.length);
        const stroke = this.strokes[strokeIndex];
        if (stroke) {
          className += stroke.correct ? ' correct' : ' incorrect';
        }
      } else if (i === this.currentIndex) {
        // 現在位置
        className += ' current';
      } else {
        // 未入力
        className += ' pending';
      }
      
      html += `<span class="${className}" data-index="${i}">${char}</span>`;
    }
    
    this.trackEl.innerHTML = html;
    
    // スライド位置を調整
    const currentCharEl = this.trackEl.querySelector('.current');
    if (currentCharEl) {
      const offset = (currentCharEl as HTMLElement).offsetLeft;
      const containerWidth = this.trackEl.parentElement?.clientWidth || 0;
      const translateX = containerWidth / 2 - offset;
      this.trackEl.style.transform = `translateX(${translateX}px)`;
    }
  }

  private shakeTypingArea(): void {
    const typingArea = this.container?.querySelector('.typing-area');
    if (typingArea) {
      typingArea.classList.add('shake');
      setTimeout(() => {
        typingArea.classList.remove('shake');
      }, this.config.ui.shakeDuration);
    }
  }

  private attachEventListeners(): void {
    // やめるボタン
    const quitBtn = this.container?.querySelector('.quit-btn');
    quitBtn?.addEventListener('click', () => {
      this.cleanup();
      this.context.navigateTo('top');
    });
  }

  private endGame(): void {
    this.isRunning = false;
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    
    // 結果を計算
    const correctCount = this.strokes.filter(s => s.correct).length;
    const missCount = this.strokes.filter(s => !s.correct).length;
    const totalCount = this.strokes.length;
    const elapsed = this.config.game.duration / 60; // 分
    const cpm = correctCount / elapsed;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    
    // 文字別統計
    const charStats: Record<string, { correct: number; miss: number }> = {};
    for (const stroke of this.strokes) {
      if (!charStats[stroke.expected]) {
        charStats[stroke.expected] = { correct: 0, miss: 0 };
      }
      if (stroke.correct) {
        charStats[stroke.expected].correct++;
      } else {
        charStats[stroke.expected].miss++;
      }
    }
    
    const result: GameResult = {
      gameMode: this.gameData!.gameMode,
      inputMode: this.gameData!.inputMode,
      seed: this.gameData!.seed,
      cpm,
      accuracy,
      correctCount,
      missCount,
      charStats,
      strokes: this.strokes,
    };
    
    this.cleanup();
    this.context.navigateTo('result', result);
  }

  cleanup(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    if (this.flickKeyboard) {
      this.flickKeyboard.cleanup();
      this.flickKeyboard = null;
    }
    
    // ドキュメントレベルのマウスイベントを解除
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
    
    this.isRunning = false;
    this.isCountdown = false;
  }
}
