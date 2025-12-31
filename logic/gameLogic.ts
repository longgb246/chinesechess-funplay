
import { Cell, Position, Player } from '../types';
// Fix: Import board dimensions from constants.ts instead of types.ts
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

export const checkFourInARow = (cells: Cell[][], player: Player): Position[] | null => {
  // Check Horizontal
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x <= BOARD_WIDTH - 4; x++) {
      const line = [cells[y][x], cells[y][x+1], cells[y][x+2], cells[y][x+3]];
      if (line.every(c => c.piece?.owner === player)) {
        return line.map(c => ({ x: c.x, y: c.y }));
      }
    }
  }

  // Check Vertical
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
      const line = [cells[y][x], cells[y+1][x], cells[y+2][x], cells[y+3][x]];
      if (line.every(c => c.piece?.owner === player)) {
        return line.map(c => ({ x: c.x, y: c.y }));
      }
    }
  }

  // Check Diagonal (Down-Right)
  for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
    for (let x = 0; x <= BOARD_WIDTH - 4; x++) {
      const line = [cells[y][x], cells[y+1][x+1], cells[y+2][x+2], cells[y+3][x+3]];
      if (line.every(c => c.piece?.owner === player)) {
        return line.map(c => ({ x: c.x, y: c.y }));
      }
    }
  }

  // Check Diagonal (Down-Left)
  for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
    for (let x = 3; x < BOARD_WIDTH; x++) {
       // Only if width was larger. For 4x8, x can only be 3.
       const line = [cells[y][x], cells[y+1][x-1], cells[y+2][x-2], cells[y+3][x-3]];
       if (line.every(c => c.piece?.owner === player)) {
         return line.map(c => ({ x: c.x, y: c.y }));
       }
    }
  }

  return null;
};

export const getAdjacentCells = (pos: Position): Position[] => {
  const { x, y } = pos;
  const adj: Position[] = [];
  if (x > 0) adj.push({ x: x - 1, y });
  if (x < BOARD_WIDTH - 1) adj.push({ x: x + 1, y });
  if (y > 0) adj.push({ x, y: y - 1 });
  if (y < BOARD_HEIGHT - 1) adj.push({ x, y: y + 1 });
  return adj;
};