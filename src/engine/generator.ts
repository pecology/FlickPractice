import { SeededRandom } from './seededRandom';
import type { Config, InputMode } from '../types';

/**
 * 文字生成エンジン
 * フリック入力用の文字列を生成
 */
export class CharacterGenerator {
  private random: SeededRandom;
  private characters: string[];
  private weights: number[];

  constructor(seed: number, config: Config, inputMode: InputMode) {
    this.random = new SeededRandom(seed);
    
    // 入力モードに応じた文字と重みを準備
    const weightConfig = inputMode === 'hiragana' 
      ? config.generator.hiraganaWeights 
      : config.generator.alphabetWeights;
    
    this.characters = Object.keys(weightConfig);
    this.weights = this.characters.map(c => weightConfig[c]);
  }

  /**
   * 指定した長さの文字列を生成
   */
  generate(length: number): string {
    let result = '';
    
    while (result.length < length) {
      const char = this.generateSingleChar();
      result += char;
    }

    return result;
  }

  /**
   * 単一の文字を生成
   */
  private generateSingleChar(): string {
    return this.random.weightedPick(this.characters, this.weights);
  }

  /**
   * 無限に文字を生成するジェネレーター
   */
  *stream(): Generator<string, never, unknown> {
    while (true) {
      yield this.generateSingleChar();
    }
  }
}

/**
 * 指定シードでジェネレーターを作成
 */
export function createGenerator(seed: number, config: Config, inputMode: InputMode): CharacterGenerator {
  return new CharacterGenerator(seed, config, inputMode);
}
