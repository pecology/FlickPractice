import type { ScreenName, GameResult, GameMode, InputMode, Config } from '../types';

export interface ScreenContext {
  config: Config;
  navigateTo: (screen: ScreenName, data?: ScreenData) => void;
}

export type ScreenData = 
  | { gameMode: GameMode; inputMode: InputMode; seed: number }  // game画面用
  | GameResult;                                                  // result画面用

export interface Screen {
  render(container: HTMLElement, data?: ScreenData): void;
  cleanup(): void;
}

/**
 * 画面管理クラス
 */
export class ScreenManager {
  private currentScreen: Screen | null = null;
  private container: HTMLElement;
  private config: Config;
  private screens: Map<ScreenName, Screen> = new Map();

  constructor(container: HTMLElement, config: Config) {
    this.container = container;
    this.config = config;
  }

  /**
   * 画面を登録
   */
  registerScreen(name: ScreenName, screen: Screen): void {
    this.screens.set(name, screen);
  }

  /**
   * 画面遷移
   */
  navigateTo(name: ScreenName, data?: ScreenData): void {
    // 現在の画面をクリーンアップ
    if (this.currentScreen) {
      this.currentScreen.cleanup();
    }

    // コンテナをクリア
    this.container.innerHTML = '';
    
    // フェードアニメーション用のクラスを追加
    this.container.classList.add('screen-transition');
    
    // 新しい画面を取得
    const screen = this.screens.get(name);
    if (!screen) {
      console.error(`Screen "${name}" not found`);
      return;
    }

    // 画面を描画
    this.currentScreen = screen;
    screen.render(this.container, data);
    
    // アニメーション後にクラスを削除
    requestAnimationFrame(() => {
      this.container.classList.remove('screen-transition');
    });
  }

  /**
   * コンテキストを取得（各画面で使用）
   */
  getContext(): ScreenContext {
    return {
      config: this.config,
      navigateTo: this.navigateTo.bind(this),
    };
  }
}
