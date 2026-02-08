import type { FlickDirection, FlickKey, Config, InputMode } from '../types';

/**
 * フリック入力検出
 */
export interface FlickResult {
  direction: FlickDirection;
  character: string | null;
}

/**
 * フリックキーボードクラス
 * タッチ操作を処理してフリック入力を検出
 */
export class FlickKeyboard {
  private config: Config;
  private inputMode: InputMode;
  private startX: number = 0;
  private startY: number = 0;
  private activeKey: FlickKey | null = null;
  private activeKeyIndex: number = -1;
  private charToKey: Map<string, FlickKey> = new Map();
  private charToKeyIndex: Map<string, number> = new Map();
  private isDragging: boolean = false;
  
  // コールバック
  private onInput: ((char: string, direction: FlickDirection) => void) | null = null;
  
  constructor(config: Config, inputMode: InputMode) {
    this.config = config;
    this.inputMode = inputMode;
    this.buildCharToKeyMap();
  }

  /**
   * 文字→キーマッピングを構築
   */
  private buildCharToKeyMap(): void {
    const layout = this.inputMode === 'hiragana' 
      ? this.config.flickLayout.hiragana 
      : this.config.flickLayout.alphabet;
    
    for (let i = 0; i < layout.length; i++) {
      const key = layout[i];
      this.charToKey.set(key.center, key);
      this.charToKeyIndex.set(key.center, i);
      if (key.up) {
        this.charToKey.set(key.up, key);
        this.charToKeyIndex.set(key.up, i);
      }
      if (key.down) {
        this.charToKey.set(key.down, key);
        this.charToKeyIndex.set(key.down, i);
      }
      if (key.left) {
        this.charToKey.set(key.left, key);
        this.charToKeyIndex.set(key.left, i);
      }
      if (key.right) {
        this.charToKey.set(key.right, key);
        this.charToKeyIndex.set(key.right, i);
      }
    }
    
    // 濁点・半濁点付き文字のマッピングも追加（ひらがなモードの場合）
    if (this.inputMode === 'hiragana') {
      this.addDakutenMappings();
    }
  }

  /**
   * 濁点・半濁点付き文字のキーマッピングを追加
   */
  private addDakutenMappings(): void {
    // 濁点付き文字は元の文字のキーにマッピング
    for (const [base, dakuten] of Object.entries(this.config.dakutenMap)) {
      if (!this.charToKey.has(dakuten)) {
        const key = this.charToKey.get(base);
        const keyIndex = this.charToKeyIndex.get(base);
        if (key && keyIndex !== undefined) {
          this.charToKey.set(dakuten, key);
          this.charToKeyIndex.set(dakuten, keyIndex);
        }
      }
    }
    
    // 半濁点付き文字
    for (const [base, handakuten] of Object.entries(this.config.handakutenMap)) {
      if (!this.charToKey.has(handakuten)) {
        const key = this.charToKey.get(base);
        const keyIndex = this.charToKeyIndex.get(base);
        if (key && keyIndex !== undefined) {
          this.charToKey.set(handakuten, key);
          this.charToKeyIndex.set(handakuten, keyIndex);
        }
      }
    }
  }

  /**
   * 入力モードを変更
   */
  setInputMode(mode: InputMode): void {
    this.inputMode = mode;
    this.charToKey.clear();
    this.charToKeyIndex.clear();
    this.buildCharToKeyMap();
  }

  /**
   * 期待される文字に対応するキーインデックスを取得
   */
  getKeyIndexForChar(char: string): number {
    return this.charToKeyIndex.get(char) ?? -1;
  }

  /**
   * 濁点付き文字の元の文字を取得
   */
  getBaseChar(char: string): string | null {
    // 濁点マップを逆引き（値→キー）
    for (const [base, dakuten] of Object.entries(this.config.dakutenMap)) {
      if (dakuten === char) {
        // baseが清音かどうかチェック
        if (!Object.values(this.config.dakutenMap).includes(base)) {
          return base;
        }
      }
    }
    
    // 半濁点マップを逆引き
    for (const [base, handakuten] of Object.entries(this.config.handakutenMap)) {
      if (handakuten === char) {
        if (!Object.values(this.config.handakutenMap).includes(base)) {
          return base;
        }
      }
    }
    
    return null;
  }

  /**
   * 濁点/半濁点が必要かどうかを判定
   */
  needsDakuten(char: string): 'dakuten' | 'handakuten' | null {
    // 濁点付き文字かどうか
    const dakutenValues = Object.values(this.config.dakutenMap);
    if (dakutenValues.includes(char)) {
      for (const [base, dakuten] of Object.entries(this.config.dakutenMap)) {
        if (dakuten === char && !dakutenValues.includes(base)) {
          return 'dakuten';
        }
      }
    }
    
    // 半濁点付き文字かどうか
    const handakutenValues = Object.values(this.config.handakutenMap);
    if (handakutenValues.includes(char)) {
      for (const [base, handakuten] of Object.entries(this.config.handakutenMap)) {
        if (handakuten === char && !handakutenValues.includes(base)) {
          return 'handakuten';
        }
      }
    }
    
    return null;
  }

  /**
   * 入力コールバックを設定
   */
  setOnInput(callback: (char: string, direction: FlickDirection) => void): void {
    this.onInput = callback;
  }

  /**
   * 期待される文字に対応するキーを取得
   */
  getKeyForChar(char: string): FlickKey | null {
    return this.charToKey.get(char) || null;
  }

  /**
   * 文字に対応するフリック方向を取得
   */
  getDirectionForChar(char: string): FlickDirection | null {
    const key = this.charToKey.get(char);
    if (!key) return null;
    
    if (key.center === char) return 'center';
    if (key.up === char) return 'up';
    if (key.down === char) return 'down';
    if (key.left === char) return 'left';
    if (key.right === char) return 'right';
    
    return null;
  }

  /**
   * キーレイアウトを取得
   */
  getLayout(): FlickKey[] {
    return this.inputMode === 'hiragana' 
      ? this.config.flickLayout.hiragana 
      : this.config.flickLayout.alphabet;
  }

  /**
   * タッチ開始処理
   */
  handleTouchStart(e: TouchEvent, keyElement: HTMLElement): void {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    
    const keyIndex = parseInt(keyElement.dataset.keyIndex || '0', 10);
    const layout = this.getLayout();
    this.activeKey = layout[keyIndex] || null;
    this.activeKeyIndex = keyIndex;
    
    // ハイライト表示
    keyElement.classList.add('active');
  }

  /**
   * タッチ移動処理（プレビュー用）
   */
  handleTouchMove(e: TouchEvent, keyElement: HTMLElement): FlickResult | null {
    if (!this.activeKey) return null;
    
    const touch = e.touches[0];
    const direction = this.calculateDirection(touch.clientX, touch.clientY);
    
    // 方向インジケータを更新
    this.updateDirectionIndicator(keyElement, direction);
    
    const character = this.getCharacterForDirection(direction);
    return { direction, character };
  }

  /**
   * タッチ終了処理
   */
  handleTouchEnd(e: TouchEvent, keyElement: HTMLElement): FlickResult | null {
    if (!this.activeKey) return null;
    
    const touch = e.changedTouches[0];
    const direction = this.calculateDirection(touch.clientX, touch.clientY);
    const character = this.getCharacterForDirection(direction);
    
    // ハイライト解除
    keyElement.classList.remove('active');
    this.clearDirectionIndicator(keyElement);
    
    // コールバック呼び出し
    if (character && this.onInput) {
      this.onInput(character, direction);
    }
    
    const result = { direction, character };
    this.activeKey = null;
    this.activeKeyIndex = -1;
    
    return result;
  }

  /**
   * マウス押下処理
   */
  handleMouseDown(e: MouseEvent, keyElement: HTMLElement): void {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    const keyIndex = parseInt(keyElement.dataset.keyIndex || '0', 10);
    const layout = this.getLayout();
    this.activeKey = layout[keyIndex] || null;
    this.activeKeyIndex = keyIndex;
    
    // ハイライト表示
    keyElement.classList.add('active');
  }

  /**
   * マウス移動処理
   */
  handleMouseMove(e: MouseEvent, keyElement: HTMLElement): FlickResult | null {
    if (!this.isDragging || !this.activeKey) return null;
    
    const direction = this.calculateDirection(e.clientX, e.clientY);
    
    // 方向インジケータを更新
    this.updateDirectionIndicator(keyElement, direction);
    
    const character = this.getCharacterForDirection(direction);
    return { direction, character };
  }

  /**
   * マウスボタンリリース処理
   */
  handleMouseUp(e: MouseEvent, keyElement: HTMLElement): FlickResult | null {
    if (!this.isDragging || !this.activeKey) return null;
    
    this.isDragging = false;
    const direction = this.calculateDirection(e.clientX, e.clientY);
    const character = this.getCharacterForDirection(direction);
    
    // ハイライト解除
    keyElement.classList.remove('active');
    this.clearDirectionIndicator(keyElement);
    
    // コールバック呼び出し
    if (character && this.onInput) {
      this.onInput(character, direction);
    }
    
    const result = { direction, character };
    this.activeKey = null;
    this.activeKeyIndex = -1;
    
    return result;
  }

  /**
   * ドラッグ状態を取得
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * アクティブキーのインデックスを取得
   */
  getActiveKeyIndex(): number {
    return this.activeKeyIndex;
  }

  /**
   * フリック方向を計算
   */
  private calculateDirection(endX: number, endY: number): FlickDirection {
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 閾値未満はタップ（中央）
    if (distance < this.config.ui.flickThreshold) {
      return 'center';
    }
    
    // 角度から方向を判定
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    if (angle >= -45 && angle < 45) {
      return 'right';
    } else if (angle >= 45 && angle < 135) {
      return 'down';
    } else if (angle >= -135 && angle < -45) {
      return 'up';
    } else {
      return 'left';
    }
  }

  /**
   * 方向に対応する文字を取得
   */
  private getCharacterForDirection(direction: FlickDirection): string | null {
    if (!this.activeKey) return null;
    
    switch (direction) {
      case 'center': return this.activeKey.center;
      case 'up': return this.activeKey.up || null;
      case 'down': return this.activeKey.down || null;
      case 'left': return this.activeKey.left || null;
      case 'right': return this.activeKey.right || null;
    }
  }

  /**
   * 方向インジケータを更新
   */
  private updateDirectionIndicator(keyElement: HTMLElement, direction: FlickDirection): void {
    keyElement.dataset.flickDirection = direction;
  }

  /**
   * 方向インジケータをクリア
   */
  private clearDirectionIndicator(keyElement: HTMLElement): void {
    delete keyElement.dataset.flickDirection;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.onInput = null;
    this.activeKey = null;
    this.activeKeyIndex = -1;
    this.isDragging = false;
  }
}

/**
 * フリックキーボードを作成
 */
export function createFlickKeyboard(config: Config, inputMode: InputMode): FlickKeyboard {
  return new FlickKeyboard(config, inputMode);
}
