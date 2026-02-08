// ゲームモード（入力タイプ）
export type InputMode = 'hiragana' | 'alphabet';

// ゲームモード（デイリー/プラクティス）
export type GameMode = 'daily' | 'practice';

// 画面状態
export type ScreenName = 'top' | 'game' | 'result' | 'history';

// フリック方向
export type FlickDirection = 'center' | 'up' | 'down' | 'left' | 'right';

// 入力記録
export interface FlickStroke {
  input: string;           // 入力された文字
  expected: string;        // 期待された文字
  correct: boolean;        // 正誤
  timestamp: number;       // タイムスタンプ (ms)
  flickDirection: FlickDirection; // フリック方向
}

// ゲーム記録
export interface GameRecord {
  id: string;
  gameMode: GameMode;
  inputMode: InputMode;
  seed: number;
  date: string;            // ISO形式
  cpm: number;             // Characters Per Minute
  accuracy: number;
  correctCount: number;
  missCount: number;
  charStats: Record<string, { correct: number; miss: number }>;
  strokes: FlickStroke[];
}

// ゲーム結果（Result画面用）
export interface GameResult {
  gameMode: GameMode;
  inputMode: InputMode;
  seed: number;
  cpm: number;
  accuracy: number;
  correctCount: number;
  missCount: number;
  charStats: Record<string, { correct: number; miss: number }>;
  strokes: FlickStroke[];
}

// フリックキーの定義
export interface FlickKey {
  center: string;
  up?: string;
  down?: string;
  left?: string;
  right?: string;
}

// 設定ファイルの型
export interface Config {
  game: {
    duration: number;
    countdownSeconds: number;
  };
  generator: {
    hiraganaWeights: Record<string, number>;
    alphabetWeights: Record<string, number>;
  };
  flickLayout: {
    hiragana: FlickKey[];
    alphabet: FlickKey[];
  };
  ui: {
    shakeIntensity: number;
    shakeDuration: number;
    slideTransitionMs: number;
    visibleCharsBefore: number;
    visibleCharsAfter: number;
    flickThreshold: number;  // フリック判定の閾値（ピクセル）
  };
  ranking: {
    S: number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

// ランク
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';

// 画面遷移イベント
export interface ScreenTransition {
  to: ScreenName;
  data?: GameResult | { gameMode: GameMode; inputMode: InputMode; seed: number };
}
