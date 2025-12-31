
import { Position, Piece, Player, PieceType, Move } from '../types';

export const isInsidePalace = (pos: Position, player: Player): boolean => {
  const { x, y } = pos;
  if (x < 3 || x > 5) return false;
  if (player === 'BLACK') return y >= 0 && y <= 2;
  return y >= 7 && y <= 9;
};

// Map pieces to FEN characters
const PIECE_TO_FEN: Record<string, string> = {
  '车': 'r', '马': 'n', '象': 'b', '相': 'b', '士': 'a', '仕': 'a', '将': 'k', '帅': 'k', '炮': 'c', '卒': 'p', '兵': 'p'
};

export const boardToFen = (board: (Piece | null)[][], currentPlayer: Player): string => {
  let fen = "";
  for (let y = 0; y < 10; y++) {
    let emptyCount = 0;
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        const char = PIECE_TO_FEN[piece.type] || 'p';
        fen += piece.owner === 'RED' ? char.toUpperCase() : char.toLowerCase();
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (y < 9) fen += "/";
  }
  fen += ` ${currentPlayer === 'RED' ? 'w' : 'b'} - - 0 1`;
  return fen;
};

export const parseApiMove = (moveStr: string): Move => {
  // moveStr looks like "h2e2"
  const fromX = moveStr.charCodeAt(0) - 97; // a-i
  const fromY = 9 - parseInt(moveStr[1]);   // 0-9
  const toX = moveStr.charCodeAt(2) - 97;
  const toY = 9 - parseInt(moveStr[3]);
  
  return {
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY }
  };
};

export const canMoveClassic = (
  piece: Piece,
  from: Position,
  to: Position,
  board: (Piece | null)[][]
): boolean => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const targetPiece = board[to.y][to.x];

  if (targetPiece?.owner === piece.owner) return false;

  switch (piece.type) {
    case '帅':
    case '将':
      if (!isInsidePalace(to, piece.owner)) return false;
      return absDx + absDy === 1;
    case '仕':
    case '士':
      if (!isInsidePalace(to, piece.owner)) return false;
      return absDx === 1 && absDy === 1;
    case '相':
    case '象':
      if (absDx !== 2 || absDy !== 2) return false;
      if (piece.owner === 'BLACK' && to.y > 4) return false;
      if (piece.owner === 'RED' && to.y < 5) return false;
      const eyeX = from.x + dx / 2;
      const eyeY = from.y + dy / 2;
      if (board[eyeY][eyeX]) return false;
      return true;
    case '马':
      if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
      const legX = absDx === 2 ? from.x + dx / 2 : from.x;
      const legY = absDy === 2 ? from.y + dy / 2 : from.y;
      if (board[legY][legX]) return false;
      return true;
    case '车':
      if (dx !== 0 && dy !== 0) return false;
      return countPiecesInBetween(from, to, board) === 0;
    case '炮':
      if (dx !== 0 && dy !== 0) return false;
      const count = countPiecesInBetween(from, to, board);
      if (targetPiece) return count === 1;
      return count === 0;
    case '兵':
    case '卒':
      const isBlack = piece.owner === 'BLACK';
      const forward = isBlack ? 1 : -1;
      const crossedRiver = isBlack ? from.y > 4 : from.y < 5;
      if (absDx === 0 && dy === forward) return true;
      if (crossedRiver && absDx === 1 && dy === 0) return true;
      return false;
    default:
      return false;
  }
};

const countPiecesInBetween = (from: Position, to: Position, board: (Piece | null)[][]): number => {
  let count = 0;
  if (from.x === to.x) {
    const start = Math.min(from.y, to.y);
    const end = Math.max(from.y, to.y);
    for (let i = start + 1; i < end; i++) {
      if (board[i][from.x]) count++;
    }
  } else if (from.y === to.y) {
    const start = Math.min(from.x, to.x);
    const end = Math.max(from.x, to.x);
    for (let i = start + 1; i < end; i++) {
      if (board[from.y][i]) count++;
    }
  }
  return count;
};

export const getInitialClassicBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(10).fill(null).map(() => Array(9).fill(null));
  const place = (y: number, x: number, type: PieceType, owner: Player) => {
    board[y][x] = { id: `${owner}-${type}-${x}-${y}`, type, owner };
  };
  place(0, 0, '车', 'BLACK'); place(0, 8, '车', 'BLACK');
  place(0, 1, '马', 'BLACK'); place(0, 7, '马', 'BLACK');
  place(0, 2, '象', 'BLACK'); place(0, 6, '象', 'BLACK');
  place(0, 3, '士', 'BLACK'); place(0, 5, '士', 'BLACK');
  place(0, 4, '将', 'BLACK');
  place(2, 1, '炮', 'BLACK'); place(2, 7, '炮', 'BLACK');
  place(3, 0, '卒', 'BLACK'); place(3, 2, '卒', 'BLACK'); place(3, 4, '卒', 'BLACK'); place(3, 6, '卒', 'BLACK'); place(3, 8, '卒', 'BLACK');
  place(9, 0, '车', 'RED'); place(9, 8, '车', 'RED');
  place(9, 1, '马', 'RED'); place(9, 7, '马', 'RED');
  place(9, 2, '相', 'RED'); place(9, 6, '相', 'RED');
  place(9, 3, '仕', 'RED'); place(9, 5, '仕', 'RED');
  place(9, 4, '帅', 'RED');
  place(7, 1, '炮', 'RED'); place(7, 7, '炮', 'RED');
  place(6, 0, '兵', 'RED'); place(6, 2, '兵', 'RED'); place(6, 4, '兵', 'RED'); place(6, 6, '兵', 'RED'); place(6, 8, '兵', 'RED');
  return board;
};
