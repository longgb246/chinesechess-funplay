
import { PieceType, Player, Piece } from './types';

export const BOARD_WIDTH = 4;
export const BOARD_HEIGHT = 8;
export const WINNING_THRESHOLD = 4;

const RED_PIECE_TYPES: PieceType[] = ['帅', '仕', '仕', '相', '相', '马', '马', '车', '车', '炮', '炮', '兵', '兵', '兵', '兵', '兵'];
const BLACK_PIECE_TYPES: PieceType[] = ['将', '士', '士', '象', '象', '马', '马', '车', '车', '炮', '炮', '卒', '卒', '卒', '卒', '卒'];

export const createInitialHand = (player: Player): Piece[] => {
  const types = player === 'RED' ? RED_PIECE_TYPES : BLACK_PIECE_TYPES;
  return types.map((type, index) => ({
    id: `${player}-${index}`,
    type,
    owner: player
  }));
};
