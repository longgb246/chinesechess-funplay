/**
 * 半盘炸弹棋 AI 引擎使用示例
 * 展示如何调用类似 ChessDB 的 API 接口
 */

import { getBestMove, quickEvaluate, GameStateSnapshot } from './bombingAI';
import { GameState, Cell, Piece } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT, createInitialHand } from '../constants';

// ==================== 示例 1: 初始化游戏状态 ====================

function createEmptyBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      row.push({ x, y, piece: null });
    }
    board.push(row);
  }
  return board;
}

// 创建初始游戏状态
const initialState: GameStateSnapshot = {
  board: createEmptyBoard(),
  hands: {
    RED: createInitialHand('RED'),
    BLACK: createInitialHand('BLACK')
  },
  currentPlayer: 'RED',
  gameState: GameState.PLACING
};

console.log('=== 示例 1: 游戏开始，红方落子阶段 ===');
console.log('红方手牌数量:', initialState.hands.RED.length);
console.log('黑方手牌数量:', initialState.hands.BLACK.length);

// ==================== 示例 2: 获取最佳落子位置 ====================

console.log('\n=== 示例 2: 调用 AI 获取最佳落子位置 ===');

// 调用 AI 引擎，搜索深度为 3
const result1 = getBestMove(initialState, 3);

if (result1.bestMove) {
  console.log('AI 推荐走法:', result1.bestMove.type);
  console.log('落子位置:', `(${result1.bestMove.position.x}, ${result1.bestMove.position.y})`);
  console.log('评分:', result1.bestMove.score.toFixed(2));
  console.log('推理:', result1.bestMove.reasoning);
  console.log('搜索深度:', result1.depth);
  console.log('搜索节点数:', result1.nodesSearched);
}

// ==================== 示例 3: 模拟中局移动阶段 ====================

console.log('\n=== 示例 3: 中局移动阶段 ===');

// 创建一个中局状态（手牌已用完，进入移动阶段）
const midGameBoard = createEmptyBoard();

// 在棋盘上放置一些棋子
midGameBoard[0][0].piece = { id: 'RED-0', type: '帅', owner: 'RED' };
midGameBoard[0][1].piece = { id: 'RED-1', type: '仕', owner: 'RED' };
midGameBoard[1][0].piece = { id: 'RED-2', type: '相', owner: 'RED' };
midGameBoard[1][1].piece = { id: 'RED-3', type: '马', owner: 'RED' };

midGameBoard[6][2].piece = { id: 'BLACK-0', type: '将', owner: 'BLACK' };
midGameBoard[6][3].piece = { id: 'BLACK-1', type: '士', owner: 'BLACK' };
midGameBoard[7][2].piece = { id: 'BLACK-2', type: '象', owner: 'BLACK' };
midGameBoard[7][3].piece = { id: 'BLACK-3', type: '马', owner: 'BLACK' };

const midGameState: GameStateSnapshot = {
  board: midGameBoard,
  hands: {
    RED: [],
    BLACK: []
  },
  currentPlayer: 'RED',
  gameState: GameState.MOVING
};

const result2 = getBestMove(midGameState, 3);

if (result2.bestMove) {
  console.log('AI 推荐走法:', result2.bestMove.type);
  if (result2.bestMove.from) {
    console.log('从:', `(${result2.bestMove.from.x}, ${result2.bestMove.from.y})`);
  }
  console.log('到:', `(${result2.bestMove.position.x}, ${result2.bestMove.position.y})`);
  console.log('评分:', result2.bestMove.score.toFixed(2));
  console.log('推理:', result2.bestMove.reasoning);
}

// ==================== 示例 4: 炸弹阶段 ====================

console.log('\n=== 示例 4: 炸弹阶段（形成四连后） ===');

// 创建一个形成四连的状态
const bombingBoard = createEmptyBoard();

// 红方形成横向四连
bombingBoard[0][0].piece = { id: 'RED-0', type: '帅', owner: 'RED' };
bombingBoard[0][1].piece = { id: 'RED-1', type: '仕', owner: 'RED' };
bombingBoard[0][2].piece = { id: 'RED-2', type: '相', owner: 'RED' };
bombingBoard[0][3].piece = { id: 'RED-3', type: '马', owner: 'RED' };

// 黑方棋子
bombingBoard[4][1].piece = { id: 'BLACK-0', type: '将', owner: 'BLACK' };
bombingBoard[5][1].piece = { id: 'BLACK-1', type: '士', owner: 'BLACK' };
bombingBoard[6][1].piece = { id: 'BLACK-2', type: '象', owner: 'BLACK' };
bombingBoard[7][1].piece = { id: 'BLACK-3', type: '马', owner: 'BLACK' };

const bombingState: GameStateSnapshot = {
  board: bombingBoard,
  hands: {
    RED: [
      { id: 'RED-4', type: '车', owner: 'RED' },
      { id: 'RED-5', type: '炮', owner: 'RED' }
    ],
    BLACK: []
  },
  currentPlayer: 'RED',
  gameState: GameState.BOMBING
};

const result3 = getBestMove(bombingState, 3);

if (result3.bestMove) {
  console.log('AI 推荐走法:', result3.bestMove.type);
  console.log('炸毁目标:', `(${result3.bestMove.position.x}, ${result3.bestMove.position.y})`);
  console.log('评分:', result3.bestMove.score.toFixed(2));
  console.log('推理:', result3.bestMove.reasoning);
}

// ==================== 示例 5: 快速评估局面 ====================

console.log('\n=== 示例 5: 快速评估当前局面 ===');

const quickScore = quickEvaluate(midGameState);
console.log('当前局面评分:', quickScore.toFixed(2));
console.log('评分说明: 正数表示对当前玩家有利，负数表示不利');

// ==================== 示例 6: 不同难度级别 ====================

console.log('\n=== 示例 6: 不同搜索深度（难度级别） ===');

// 简单难度：深度 1-2
const easyResult = getBestMove(initialState, 1);
console.log('简单难度 (深度1):', easyResult.bestMove?.reasoning);
console.log('搜索节点数:', easyResult.nodesSearched);

// 中等难度：深度 3-4
const mediumResult = getBestMove(initialState, 3);
console.log('\n中等难度 (深度3):', mediumResult.bestMove?.reasoning);
console.log('搜索节点数:', mediumResult.nodesSearched);

// 困难难度：深度 5+
const hardResult = getBestMove(initialState, 5);
console.log('\n困难难度 (深度5):', hardResult.bestMove?.reasoning);
console.log('搜索节点数:', hardResult.nodesSearched);

// ==================== API 使用总结 ====================

console.log('\n=== API 使用总结 ===');
console.log(`
主要 API 接口：

1. getBestMove(state, depth): EvaluationResult
   - 输入：当前游戏状态 + 搜索深度
   - 输出：最佳走法 + 评分 + 推理说明
   - 用途：获取 AI 推荐的最佳走法

2. quickEvaluate(state): number
   - 输入：当前游戏状态
   - 输出：局面评分
   - 用途：快速评估局面优劣，不进行搜索

状态表示：
{
  board: Cell[][]           // 4x8 棋盘
  hands: {                  // 双方手牌
    RED: Piece[],
    BLACK: Piece[]
  },
  currentPlayer: Player,    // 当前玩家
  gameState: GameState      // 游戏阶段
}

返回结果：
{
  score: number,            // 评分
  bestMove: {               // 最佳走法
    type: 'PLACE' | 'MOVE' | 'BOMB',
    position: Position,     // 目标位置
    from?: Position,        // 起始位置（仅移动）
    score: number,          // 走法评分
    reasoning: string       // 推理说明
  },
  depth: number,            // 搜索深度
  nodesSearched: number     // 搜索节点数
}

推荐搜索深度：
- 简单：1-2（快速响应）
- 中等：3-4（平衡性能和智能）
- 困难：5-6（高智能，较慢）
`);
