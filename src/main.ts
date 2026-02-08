import './styles/main.css';
import type { Config } from './types';
import { ScreenManager } from './screens';
import { TopScreen } from './screens/top';
import { GameScreen } from './screens/game';
import { ResultScreen } from './screens/result';
import { HistoryScreen } from './screens/history';

/**
 * Flick Practice - フリック入力練習ツール
 * 60秒間の集中トレーニング
 */
async function main() {
  // 設定ファイルを読み込み
  const config = await loadConfig();
  
  // アプリケーションコンテナを取得
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }
  
  // 画面マネージャーを初期化
  const screenManager = new ScreenManager(appContainer, config);
  const context = screenManager.getContext();
  
  // 各画面を登録
  screenManager.registerScreen('top', new TopScreen(context));
  screenManager.registerScreen('game', new GameScreen(context));
  screenManager.registerScreen('result', new ResultScreen(context));
  screenManager.registerScreen('history', new HistoryScreen(context));
  
  // 初期画面を表示
  screenManager.navigateTo('top');
  
  // スマートフォン用: デフォルトのタッチ動作を防止
  document.addEventListener('touchmove', (e) => {
    // スクロールを許可するエリア以外でのスクロールを防止
    if (!(e.target as HTMLElement).closest('.history-main, .result-main')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  console.log('Flick Practice initialized');
}

/**
 * 設定ファイルを読み込み
 */
async function loadConfig(): Promise<Config> {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) {
      throw new Error('Failed to load config.json');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return getDefaultConfig();
  }
}

/**
 * デフォルト設定
 */
function getDefaultConfig(): Config {
  return {
    game: {
      duration: 60,
      countdownSeconds: 3,
    },
    generator: {
      hiraganaWeights: {
        'あ': 5.0, 'い': 7.0, 'う': 6.0, 'え': 4.0, 'お': 5.0,
        'か': 4.5, 'き': 4.5, 'く': 4.5, 'け': 3.0, 'こ': 4.0,
        'さ': 3.5, 'し': 5.0, 'す': 4.5, 'せ': 2.5, 'そ': 2.5,
        'た': 4.5, 'ち': 3.0, 'つ': 4.0, 'て': 5.0, 'と': 5.0,
        'な': 4.0, 'に': 4.5, 'ぬ': 1.0, 'ね': 2.0, 'の': 5.5,
        'は': 4.0, 'ひ': 2.5, 'ふ': 2.5, 'へ': 1.5, 'ほ': 2.5,
        'ま': 3.5, 'み': 2.5, 'む': 2.0, 'め': 2.0, 'も': 3.5,
        'や': 3.0, 'ゆ': 2.0, 'よ': 3.5,
        'ら': 3.0, 'り': 3.5, 'る': 4.0, 'れ': 3.0, 'ろ': 2.5,
        'わ': 3.0, 'を': 2.5, 'ん': 5.0,
      },
      alphabetWeights: {
        a: 8.2, b: 1.5, c: 2.8, d: 4.3, e: 12.7, f: 2.2,
        g: 2.0, h: 6.1, i: 7.0, j: 0.15, k: 0.77, l: 4.0,
        m: 2.4, n: 6.7, o: 7.5, p: 1.9, q: 0.095, r: 6.0,
        s: 6.3, t: 9.1, u: 2.8, v: 0.98, w: 2.4, x: 0.15,
        y: 2.0, z: 0.074,
      },
    },
    flickLayout: {
      hiragana: [
        { center: 'あ', left: 'い', up: 'う', right: 'え', down: 'お' },
        { center: 'か', left: 'き', up: 'く', right: 'け', down: 'こ' },
        { center: 'さ', left: 'し', up: 'す', right: 'せ', down: 'そ' },
        { center: 'た', left: 'ち', up: 'つ', right: 'て', down: 'と' },
        { center: 'な', left: 'に', up: 'ぬ', right: 'ね', down: 'の' },
        { center: 'は', left: 'ひ', up: 'ふ', right: 'へ', down: 'ほ' },
        { center: 'ま', left: 'み', up: 'む', right: 'め', down: 'も' },
        { center: 'や', left: '（', up: 'ゆ', right: '）', down: 'よ' },
        { center: 'ら', left: 'り', up: 'る', right: 'れ', down: 'ろ' },
        { center: '゛', left: '゜', up: '小' },
        { center: 'わ', left: 'を', up: 'ん', right: 'ー' },
        { center: '、', left: '。', up: '？', right: '！', down: '…' },
      ],
      alphabet: [
        { center: '@', left: '#', up: '/', right: '&', down: '_' },
        { center: 'a', left: 'b', up: 'c', right: 'A', down: 'B' },
        { center: 'd', left: 'e', up: 'f', right: 'D', down: 'E' },
        { center: 'g', left: 'h', up: 'i', right: 'G', down: 'H' },
        { center: 'j', left: 'k', up: 'l', right: 'J', down: 'K' },
        { center: 'm', left: 'n', up: 'o', right: 'M', down: 'N' },
        { center: 'p', left: 'q', up: 'r', right: 's', down: 'P' },
        { center: 't', left: 'u', up: 'v', right: 'T', down: 'U' },
        { center: 'w', left: 'x', up: 'y', right: 'z', down: 'W' },
        { center: ',', left: '.', up: '?', right: '!', down: "'" },
        { center: '-', left: '+', up: '*', right: '=', down: ':' },
        { center: ' ', left: '0', up: '1', right: '2', down: '3' },
      ],
    },
    dakutenMap: {
      'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
      'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
      'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
      'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
    },
    handakutenMap: {
      'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
    },
    smallKanaMap: {
      'あ': 'ぁ', 'い': 'ぃ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ',
      'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ', 'つ': 'っ',
    },
    ui: {
      shakeIntensity: 5,
      shakeDuration: 100,
      slideTransitionMs: 50,
      visibleCharsBefore: 10,
      visibleCharsAfter: 20,
      flickThreshold: 30,
    },
    ranking: {
      S: 180,
      A: 120,
      B: 80,
      C: 50,
      D: 0,
    },
  };
}

// アプリケーション開始
main();
