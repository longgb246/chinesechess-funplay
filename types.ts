
export type Player = 'RED' | 'BLACK';

export enum GameState {
  PLACING = 'PLACING',
  MOVING = 'MOVING',
  BOMBING = 'BOMBING',
  REPLACING = 'REPLACING',
  GAMEOVER = 'GAMEOVER'
}

export type GameMode = 'HOME' | 'CLASSIC' | 'BOMBING';

export type AiLevel = '大师' | '高手' | '入门';

export type PieceType = '帅' | '仕' | '相' | '马' | '车' | '炮' | '兵' | '将' | '士' | '象' | '卒';

export interface Piece {
  id: string;
  type: PieceType;
  owner: Player;
}

export interface Cell {
  x: number;
  y: number;
  piece: Piece | null;
}

export interface Position {
  x: number;
  y: number;
}

export interface Move {
  from: Position;
  to: Position;
  score?: number;
  label?: string;
}

export type LastMoveType = 'PLACE' | 'MOVE' | 'BOMB' | 'FOUR_IN_ROW';

export interface LastMove {
  type: LastMoveType;
  positions: Position[];  // 相关位置数组
  from?: Position;        // 移动的起点（仅 MOVE 类型）
}
