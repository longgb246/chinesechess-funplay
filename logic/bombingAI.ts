/**
 * 半盘炸弹棋 AI 引擎
 * 类似 ChessDB 的接口设计，提供智能决策功能
 */

import { Cell, Position, Player, Piece, GameState } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT, WINNING_THRESHOLD } from '../constants';
import { checkFourInARow, getAdjacentCells } from './gameLogic';

// ==================== 类型定义 ====================

export interface GameStateSnapshot {
  board: Cell[][];
  hands: { RED: Piece[]; BLACK: Piece[] };
  currentPlayer: Player;
  gameState: GameState;
}

export interface AIMove {
  type: 'PLACE' | 'MOVE' | 'BOMB';
  position: Position;
  from?: Position; // 仅用于 MOVE
  score: number;
  reasoning: string;
}

export interface EvaluationResult {
  score: number;
  bestMove: AIMove | null;
  depth: number;
  nodesSearched: number;
}

// ==================== 评估权重配置 ====================

const WEIGHTS = {
  PIECE_COUNT: 100,        // 棋子数量优势
  FOUR_POTENTIAL: 50,      // 四连潜力
  CENTER_CONTROL: 20,      // 中心控制
  HAND_ADVANTAGE: 30,      // 手牌优势
  MOBILITY: 15,            // 移动灵活性
  WINNING: 10000,          // 胜利
  LOSING: -10000,          // 失败
  IMMEDIATE_FOUR: 5000,    // 立即形成四连（大幅提高优先级）
  BLOCK_OPPONENT_FOUR: 4500, // 阻止对方立即形成四连（次高优先级）
  THREE_IN_ROW: 200,       // 形成三连（为下一步四连做准备）
  BLOCK_THREE: 150,        // 阻止对方三连
};

// ==================== 工具函数 ====================

/**
 * 深拷贝棋盘
 */
function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map(row => 
    row.map(cell => ({
      x: cell.x,
      y: cell.y,
      piece: cell.piece ? { ...cell.piece } : null
    }))
  );
}

/**
 * 深拷贝手牌
 */
function cloneHands(hands: { RED: Piece[]; BLACK: Piece[] }): { RED: Piece[]; BLACK: Piece[] } {
  return {
    RED: hands.RED.map(p => ({ ...p })),
    BLACK: hands.BLACK.map(p => ({ ...p }))
  };
}

/**
 * 统计棋盘上某方的棋子数
 */
function countPiecesOnBoard(board: Cell[][], player: Player): number {
  let count = 0;
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x].piece?.owner === player) {
        count++;
      }
    }
  }
  return count;
}

/**
 * 获取对手
 */
function getOpponent(player: Player): Player {
  return player === 'RED' ? 'BLACK' : 'RED';
}

// ==================== 走法生成 ====================

/**
 * 生成所有合法的落子位置
 */
export function generatePlaceMoves(board: Cell[][]): Position[] {
  const moves: Position[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (!board[y][x].piece) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
}

/**
 * 生成所有合法的移动走法
 */
export function generateMoveMoves(board: Cell[][], player: Player): Array<{ from: Position; to: Position }> {
  const moves: Array<{ from: Position; to: Position }> = [];
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = board[y][x];
      if (cell.piece?.owner === player) {
        const adjacents = getAdjacentCells({ x, y });
        for (const adj of adjacents) {
          if (!board[adj.y][adj.x].piece) {
            moves.push({ from: { x, y }, to: adj });
          }
        }
      }
    }
  }
  
  return moves;
}

/**
 * 生成所有可炸毁的目标
 */
export function generateBombTargets(board: Cell[][], player: Player): Position[] {
  const targets: Position[] = [];
  const opponent = getOpponent(player);
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x].piece?.owner === opponent) {
        targets.push({ x, y });
      }
    }
  }
  
  return targets;
}

// ==================== 评估函数 ====================

/**
 * 检查是否有三连（距离四连一步）
 */
function checkThreeInARow(board: Cell[][], player: Player): number {
  let count = 0;
  
  // 检查横向
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x <= BOARD_WIDTH - 4; x++) {
      const line = [board[y][x], board[y][x+1], board[y][x+2], board[y][x+3]];
      const playerPieces = line.filter(c => c.piece?.owner === player).length;
      const emptySpaces = line.filter(c => !c.piece).length;
      if (playerPieces === 3 && emptySpaces === 1) count++;
    }
  }
  
  // 检查纵向
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
      const line = [board[y][x], board[y+1][x], board[y+2][x], board[y+3][x]];
      const playerPieces = line.filter(c => c.piece?.owner === player).length;
      const emptySpaces = line.filter(c => !c.piece).length;
      if (playerPieces === 3 && emptySpaces === 1) count++;
    }
  }
  
  // 检查对角线
  for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
    for (let x = 0; x <= BOARD_WIDTH - 4; x++) {
      const line = [board[y][x], board[y+1][x+1], board[y+2][x+2], board[y+3][x+3]];
      const playerPieces = line.filter(c => c.piece?.owner === player).length;
      const emptySpaces = line.filter(c => !c.piece).length;
      if (playerPieces === 3 && emptySpaces === 1) count++;
    }
  }
  
  for (let y = 0; y <= BOARD_HEIGHT - 4; y++) {
    for (let x = 3; x < BOARD_WIDTH; x++) {
      const line = [board[y][x], board[y+1][x-1], board[y+2][x-2], board[y+3][x-3]];
      const playerPieces = line.filter(c => c.piece?.owner === player).length;
      const emptySpaces = line.filter(c => !c.piece).length;
      if (playerPieces === 3 && emptySpaces === 1) count++;
    }
  }
  
  return count;
}

/**
 * 检查在某个位置落子后是否能形成四连
 * @param board 当前棋盘
 * @param pos 要检查的位置
 * @param player 玩家
 * @returns 是否能形成四连
 */
function canFormFourAtPosition(board: Cell[][], pos: Position, player: Player): boolean {
  if (board[pos.y][pos.x].piece) return false; // 位置已被占用
  
  // 临时放置棋子
  const testBoard = cloneBoard(board);
  testBoard[pos.y][pos.x].piece = { id: 'test', type: '兵', owner: player };
  
  // 检查是否形成四连
  return checkFourInARow(testBoard, player) !== null;
}

/**
 * 找出所有能让某方立即形成四连的位置
 * @param board 当前棋盘
 * @param player 玩家
 * @returns 能形成四连的位置列表
 */
function findWinningMoves(board: Cell[][], player: Player): Position[] {
  const winningMoves: Position[] = [];
  
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (!board[y][x].piece && canFormFourAtPosition(board, { x, y }, player)) {
        winningMoves.push({ x, y });
      }
    }
  }
  
  return winningMoves;
}

/**
 * 计算位置价值（中心位置更有价值）
 */
function getPositionValue(pos: Position): number {
  const centerX = BOARD_WIDTH / 2;
  const centerY = BOARD_HEIGHT / 2;
  const distanceFromCenter = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY);
  return 10 - distanceFromCenter;
}

/**
 * 计算棋盘控制分数
 */
function evaluateBoardControl(board: Cell[][], player: Player): number {
  let score = 0;
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x].piece?.owner === player) {
        score += getPositionValue({ x, y });
      }
    }
  }
  return score;
}

/**
 * 计算移动灵活性
 */
function evaluateMobility(board: Cell[][], player: Player): number {
  const moves = generateMoveMoves(board, player);
  return moves.length;
}

/**
 * 核心评估函数：评估当前局面对某方的优劣
 * 返回正数表示对该方有利，负数表示不利
 */
export function evaluatePosition(state: GameStateSnapshot, player: Player): number {
  const { board, hands } = state;
  const opponent = getOpponent(player);
  
  // 1. 检查胜负
  const playerTotal = countPiecesOnBoard(board, player) + hands[player].length;
  const opponentTotal = countPiecesOnBoard(board, opponent) + hands[opponent].length;
  
  if (opponentTotal < WINNING_THRESHOLD) {
    return WEIGHTS.WINNING;
  }
  if (playerTotal < WINNING_THRESHOLD) {
    return WEIGHTS.LOSING;
  }
  
  // 2. 棋子数量优势
  const pieceAdvantage = (playerTotal - opponentTotal) * WEIGHTS.PIECE_COUNT;
  
  // 3. 四连潜力（三连数量）
  const playerThrees = checkThreeInARow(board, player);
  const opponentThrees = checkThreeInARow(board, opponent);
  const fourPotential = (playerThrees * WEIGHTS.THREE_IN_ROW) - (opponentThrees * WEIGHTS.BLOCK_THREE);
  
  // 4. 位置控制
  const playerControl = evaluateBoardControl(board, player);
  const opponentControl = evaluateBoardControl(board, opponent);
  const controlAdvantage = (playerControl - opponentControl) * WEIGHTS.CENTER_CONTROL;
  
  // 5. 手牌优势
  const handAdvantage = (hands[player].length - hands[opponent].length) * WEIGHTS.HAND_ADVANTAGE;
  
  // 6. 移动灵活性
  const playerMobility = evaluateMobility(board, player);
  const opponentMobility = evaluateMobility(board, opponent);
  const mobilityAdvantage = (playerMobility - opponentMobility) * WEIGHTS.MOBILITY;
  
  // 综合评分
  return pieceAdvantage + fourPotential + controlAdvantage + handAdvantage + mobilityAdvantage;
}

// ==================== 模拟走法 ====================

/**
 * 模拟落子
 */
function simulatePlace(state: GameStateSnapshot, pos: Position): GameStateSnapshot {
  const newBoard = cloneBoard(state.board);
  const newHands = cloneHands(state.hands);
  const player = state.currentPlayer;
  
  if (newHands[player].length === 0) {
    return state; // 无效操作
  }
  
  const piece = newHands[player][0];
  newBoard[pos.y][pos.x].piece = { ...piece };
  newHands[player] = newHands[player].slice(1);
  
  // 检查四连
  const line = checkFourInARow(newBoard, player);
  if (line) {
    // 回收四连棋子
    const recycled = line.map(p => newBoard[p.y][p.x].piece!);
    line.forEach(p => { newBoard[p.y][p.x].piece = null; });
    newHands[player] = [...recycled, ...newHands[player]];
    
    return {
      board: newBoard,
      hands: newHands,
      currentPlayer: player,
      gameState: GameState.BOMBING
    };
  }
  
  // 切换回合
  const nextPlayer = getOpponent(player);
  const nextState = newHands[nextPlayer].length > 0 ? GameState.PLACING : GameState.MOVING;
  
  return {
    board: newBoard,
    hands: newHands,
    currentPlayer: nextPlayer,
    gameState: nextState
  };
}

/**
 * 模拟移动
 */
function simulateMove(state: GameStateSnapshot, from: Position, to: Position): GameStateSnapshot {
  const newBoard = cloneBoard(state.board);
  const newHands = cloneHands(state.hands);
  const player = state.currentPlayer;
  
  const piece = newBoard[from.y][from.x].piece;
  if (!piece || piece.owner !== player) {
    return state; // 无效操作
  }
  
  newBoard[to.y][to.x].piece = piece;
  newBoard[from.y][from.x].piece = null;
  
  // 检查四连
  const line = checkFourInARow(newBoard, player);
  if (line) {
    // 回收四连棋子
    const recycled = line.map(p => newBoard[p.y][p.x].piece!);
    line.forEach(p => { newBoard[p.y][p.x].piece = null; });
    newHands[player] = [...recycled, ...newHands[player]];
    
    return {
      board: newBoard,
      hands: newHands,
      currentPlayer: player,
      gameState: GameState.BOMBING
    };
  }
  
  // 切换回合
  const nextPlayer = getOpponent(player);
  const nextState = newHands[nextPlayer].length > 0 ? GameState.PLACING : GameState.MOVING;
  
  return {
    board: newBoard,
    hands: newHands,
    currentPlayer: nextPlayer,
    gameState: nextState
  };
}

/**
 * 模拟炸弹
 */
function simulateBomb(state: GameStateSnapshot, target: Position): GameStateSnapshot {
  const newBoard = cloneBoard(state.board);
  const newHands = cloneHands(state.hands);
  const player = state.currentPlayer;
  
  if (newHands[player].length === 0) {
    return state; // 无效操作
  }
  
  const bombPiece = newHands[player][0];
  newBoard[target.y][target.x].piece = { ...bombPiece };
  newHands[player] = newHands[player].slice(1);
  
  // 检查连环炸
  const line = checkFourInARow(newBoard, player);
  if (line) {
    // 回收四连棋子
    const recycled = line.map(p => newBoard[p.y][p.x].piece!);
    line.forEach(p => { newBoard[p.y][p.x].piece = null; });
    newHands[player] = [...recycled, ...newHands[player]];
    
    return {
      board: newBoard,
      hands: newHands,
      currentPlayer: player,
      gameState: GameState.BOMBING
    };
  }
  
  // 切换回合
  const nextPlayer = getOpponent(player);
  const nextState = newHands[nextPlayer].length > 0 ? GameState.PLACING : GameState.MOVING;
  
  return {
    board: newBoard,
    hands: newHands,
    currentPlayer: nextPlayer,
    gameState: nextState
  };
}

// ==================== Minimax 搜索算法 ====================

/**
 * Minimax 算法 + Alpha-Beta 剪枝
 */
function minimax(
  state: GameStateSnapshot,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  aiPlayer: Player,
  nodesSearched: { count: number }
): number {
  nodesSearched.count++;
  
  // 终止条件
  if (depth === 0) {
    return evaluatePosition(state, aiPlayer);
  }
  
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  
  // 检查游戏结束
  const playerTotal = countPiecesOnBoard(state.board, currentPlayer) + state.hands[currentPlayer].length;
  const opponentTotal = countPiecesOnBoard(state.board, opponent) + state.hands[opponent].length;
  
  if (playerTotal < WINNING_THRESHOLD || opponentTotal < WINNING_THRESHOLD) {
    return evaluatePosition(state, aiPlayer);
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    
    // 根据游戏状态生成走法
    if (state.gameState === GameState.PLACING) {
      const moves = generatePlaceMoves(state.board);
      for (const move of moves) {
        const newState = simulatePlace(state, move);
        const evalScore = minimax(newState, depth - 1, alpha, beta, false, aiPlayer, nodesSearched);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Beta 剪枝
      }
    } else if (state.gameState === GameState.MOVING) {
      const moves = generateMoveMoves(state.board, currentPlayer);
      for (const move of moves) {
        const newState = simulateMove(state, move.from, move.to);
        const evalScore = minimax(newState, depth - 1, alpha, beta, false, aiPlayer, nodesSearched);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    } else if (state.gameState === GameState.BOMBING) {
      // 炸弹阶段不进行深度搜索，直接评估（避免连环炸导致的搜索爆炸）
      const targets = generateBombTargets(state.board, currentPlayer);
      for (const target of targets) {
        const newState = simulateBomb(state, target);
        const evalScore = evaluatePosition(newState, aiPlayer);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    
    return maxEval;
  } else {
    let minEval = Infinity;
    
    if (state.gameState === GameState.PLACING) {
      const moves = generatePlaceMoves(state.board);
      for (const move of moves) {
        const newState = simulatePlace(state, move);
        const evalScore = minimax(newState, depth - 1, alpha, beta, true, aiPlayer, nodesSearched);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha 剪枝
      }
    } else if (state.gameState === GameState.MOVING) {
      const moves = generateMoveMoves(state.board, currentPlayer);
      for (const move of moves) {
        const newState = simulateMove(state, move.from, move.to);
        const evalScore = minimax(newState, depth - 1, alpha, beta, true, aiPlayer, nodesSearched);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    } else if (state.gameState === GameState.BOMBING) {
      // 炸弹阶段不进行深度搜索，直接评估（避免连环炸导致的搜索爆炸）
      const targets = generateBombTargets(state.board, currentPlayer);
      for (const target of targets) {
        const newState = simulateBomb(state, target);
        const evalScore = evaluatePosition(newState, aiPlayer);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    
    return minEval;
  }
}

// ==================== 主 API 接口 ====================

/**
 * 获取最佳走法（类似 ChessDB 的 query 接口）
 * @param state 当前游戏状态
 * @param depth 搜索深度（建议 2-4）
 * @returns 最佳走法和评估信息
 */
export function getBestMove(state: GameStateSnapshot, depth: number = 3): EvaluationResult {
  const nodesSearched = { count: 0 };
  const player = state.currentPlayer;
  let bestMove: AIMove | null = null;
  let bestScore = -Infinity;
  
  // 根据游戏状态生成并评估所有走法
  if (state.gameState === GameState.PLACING) {
    const moves = generatePlaceMoves(state.board);
    const opponent = getOpponent(player);
    
    // 优先检查：是否有立即获胜的走法
    const myWinningMoves = findWinningMoves(state.board, player);
    if (myWinningMoves.length > 0) {
      const winMove = myWinningMoves[0];
      return {
        score: WEIGHTS.WINNING,
        bestMove: {
          type: 'PLACE',
          position: winMove,
          score: WEIGHTS.WINNING,
          reasoning: `落子到 (${winMove.x}, ${winMove.y}) 立即形成四连获胜！`
        },
        depth,
        nodesSearched: nodesSearched.count
      };
    }
    
    // 次优先检查：是否需要阻止对方获胜
    const opponentWinningMoves = findWinningMoves(state.board, opponent);
    if (opponentWinningMoves.length > 0) {
      const blockMove = opponentWinningMoves[0];
      return {
        score: WEIGHTS.BLOCK_OPPONENT_FOUR,
        bestMove: {
          type: 'PLACE',
          position: blockMove,
          score: WEIGHTS.BLOCK_OPPONENT_FOUR,
          reasoning: `落子到 (${blockMove.x}, ${blockMove.y}) 阻止对方形成四连！`
        },
        depth,
        nodesSearched: nodesSearched.count
      };
    }
    
    // 正常搜索所有走法
    for (const move of moves) {
      const newState = simulatePlace(state, move);
      const score = minimax(newState, depth - 1, -Infinity, Infinity, false, player, nodesSearched);
      
      // 检查是否立即形成四连
      const immediateFour = checkFourInARow(newState.board, player);
      const adjustedScore = immediateFour ? score + WEIGHTS.IMMEDIATE_FOUR : score;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = {
          type: 'PLACE',
          position: move,
          score: adjustedScore,
          reasoning: immediateFour 
            ? `落子到 (${move.x}, ${move.y}) 立即形成四连！`
            : `落子到 (${move.x}, ${move.y}) 评分: ${adjustedScore.toFixed(0)}`
        };
      }
    }
  } else if (state.gameState === GameState.MOVING) {
    const moves = generateMoveMoves(state.board, player);
    
    // 优先检查移动是否能立即形成四连
    for (const move of moves) {
      const testBoard = cloneBoard(state.board);
      const piece = testBoard[move.from.y][move.from.x].piece;
      testBoard[move.from.y][move.from.x].piece = null;
      testBoard[move.to.y][move.to.x].piece = piece;
      
      if (checkFourInARow(testBoard, player)) {
        return {
          score: WEIGHTS.WINNING,
          bestMove: {
            type: 'MOVE',
            position: move.to,
            from: move.from,
            score: WEIGHTS.WINNING,
            reasoning: `从 (${move.from.x}, ${move.from.y}) 移动到 (${move.to.x}, ${move.to.y}) 立即形成四连获胜！`
          },
          depth,
          nodesSearched: nodesSearched.count
        };
      }
    }
    
    // 正常搜索
    for (const move of moves) {
      const newState = simulateMove(state, move.from, move.to);
      const score = minimax(newState, depth - 1, -Infinity, Infinity, false, player, nodesSearched);
      
      const immediateFour = checkFourInARow(newState.board, player);
      const adjustedScore = immediateFour ? score + WEIGHTS.IMMEDIATE_FOUR : score;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = {
          type: 'MOVE',
          position: move.to,
          from: move.from,
          score: adjustedScore,
          reasoning: immediateFour
            ? `从 (${move.from.x}, ${move.from.y}) 移动到 (${move.to.x}, ${move.to.y}) 立即形成四连！`
            : `从 (${move.from.x}, ${move.from.y}) 移动到 (${move.to.x}, ${move.to.y}) 评分: ${adjustedScore.toFixed(0)}`
        };
      }
    }
  } else if (state.gameState === GameState.BOMBING) {
    const targets = generateBombTargets(state.board, player);
    const opponent = getOpponent(player);
    
    // 炸弹阶段使用贪心策略，不进行深度搜索（避免连环炸导致的搜索爆炸）
    for (const target of targets) {
      const newState = simulateBomb(state, target);
      
      // 直接评估炸弹后的局面，不进行 minimax 搜索
      let score = evaluatePosition(newState, player);
      
      // 检查是否炸掉了对方的关键棋子
      const opponentThreesBefore = checkThreeInARow(state.board, opponent);
      const opponentThreesAfter = checkThreeInARow(newState.board, opponent);
      const blockValue = (opponentThreesBefore - opponentThreesAfter) * WEIGHTS.BLOCK_THREE;
      
      // 检查是否炸掉了对方能立即形成四连的位置
      const opponentWinningBefore = findWinningMoves(state.board, opponent);
      const opponentWinningAfter = findWinningMoves(newState.board, opponent);
      const blockWinValue = (opponentWinningBefore.length - opponentWinningAfter.length) * WEIGHTS.BLOCK_OPPONENT_FOUR;
      
      // 综合评分
      const adjustedScore = score + blockValue + blockWinValue;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        let reasoning = `炸毁 (${target.x}, ${target.y})`;
        
        if (blockWinValue > 0) {
          reasoning += ' 阻止对方立即获胜！';
        } else if (blockValue > 0) {
          reasoning += ' 破坏对方三连！';
        } else {
          reasoning += ` 评分: ${adjustedScore.toFixed(0)}`;
        }
        
        bestMove = {
          type: 'BOMB',
          position: target,
          score: adjustedScore,
          reasoning
        };
      }
    }
  }
  
  return {
    score: bestScore,
    bestMove,
    depth,
    nodesSearched: nodesSearched.count
  };
}

/**
 * 快速评估当前局面（不搜索，仅评估）
 */
export function quickEvaluate(state: GameStateSnapshot): number {
  return evaluatePosition(state, state.currentPlayer);
}
