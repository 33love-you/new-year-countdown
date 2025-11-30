export enum AppStage {
  TREE = 'TREE',
  COUNTDOWN_5 = '5',
  COUNTDOWN_4 = '4',
  COUNTDOWN_3 = '3',
  COUNTDOWN_2 = '2',
  COUNTDOWN_1 = '1',
  HAPPY_NEW_YEAR = 'HAPPY_NEW_YEAR'
}

export enum HandState {
  UNKNOWN = 'UNKNOWN',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface ParticlePoint {
  x: number;
  y: number;
  z: number;
  color: [number, number, number]; // RGB 0-1
}

export interface GeminiConfig {
  apiKey: string;
}
