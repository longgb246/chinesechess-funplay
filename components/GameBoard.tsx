
import React from 'react';
import { Cell, GameState, Position, LastMove } from '../types';
import { AIMove } from '../logic/bombingAI';
import XiangqiPiece from './XiangqiPiece';

interface GameBoardProps {
  cells: Cell[][];
  onCellClick: (x: number, y: number) => void;
  selectedPos: Position | null;
  gameState: GameState;
  bombableIndices: Position[];
  hint?: AIMove | null;
  hoveredHint?: boolean;
  lastMove?: LastMove | null;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  cells, 
  onCellClick, 
  selectedPos, 
  gameState,
  bombableIndices,
  hint,
  hoveredHint = false,
  lastMove = null
}) => {
  const CELL_SIZE = 62;
  const BOARD_PADDING = 20;
  return (
    <div className="relative bg-[#f4e4bc] p-5 rounded-sm shadow-2xl border-[6px] border-[#8b4513] mx-auto w-fit">
      {/* The Half Board Background Lines */}
      <div className="absolute inset-5 pointer-events-none border border-[#5d4037] opacity-30">
        {/* Horizontal Lines */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full h-px bg-[#5d4037]" style={{ top: `${(i/8)*100}%` }} />
        ))}
        {/* Vertical Lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`v-${i}`} className="absolute h-full w-px bg-[#5d4037]" style={{ left: `${(i/4)*100}%` }} />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 relative z-10">
        {cells.map((row, y) => (
          row.map((cell, x) => {
            const isSelected = selectedPos?.x === x && selectedPos?.y === y;
            const isBombable = bombableIndices.some(p => p.x === x && p.y === y);
            
            // 检查是否是提示位置
            const isHintTarget = hint && hint.position.x === x && hint.position.y === y;
            const isHintFrom = hint && hint.from && hint.from.x === x && hint.from.y === y;
            
            // 检查是否是最后一步操作的位置
            const isLastMoveTarget = lastMove && lastMove.positions.some(p => p.x === x && p.y === y);
            const isLastMoveFrom = lastMove && lastMove.from && lastMove.from.x === x && lastMove.from.y === y;
            
            return (
              <div 
                key={`${x}-${y}`}
                onClick={() => onCellClick(x, y)}
                className={`
                  flex items-center justify-center rounded-sm transition-colors cursor-pointer relative
                  ${isBombable ? 'bg-red-500/30 animate-pulse border-2 border-red-500' : 'hover:bg-amber-100/30'}
                  ${isSelected ? 'bg-amber-200/60 shadow-inner' : ''}
                `}
                style={{ width: '62px', height: '62px' }}
              >
                {cell.piece && (
                  <XiangqiPiece 
                    piece={cell.piece} 
                    isSelected={isSelected}
                  />
                )}
                {!cell.piece && isBombable && (
                   <div className="w-10 h-10 rounded-full border border-dashed border-red-500 flex items-center justify-center">
                     <span className="text-red-600 text-[10px] font-black">炸</span>
                   </div>
                )}
                
                {/* AI 提示黄圈 - 目标位置 */}
                {isHintTarget && (
                  <div 
                    className={`absolute inset-0 rounded-full border-4 transition-all duration-300 pointer-events-none ${
                      hoveredHint ? 'bg-amber-400/40 border-amber-500' : 'bg-amber-300/30 border-amber-400'
                    }`}
                    style={{ 
                      width: '48px',
                      height: '48px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
                
                {/* AI 提示黄圈 - 起始位置（仅移动时） */}
                {isHintFrom && (
                  <div 
                    className={`absolute inset-0 rounded-full border-4 transition-all duration-300 pointer-events-none ${
                      hoveredHint ? 'bg-amber-400/40 border-amber-500' : 'bg-amber-300/30 border-amber-400'
                    }`}
                    style={{ 
                      width: '48px',
                      height: '48px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
                
                {/* 最后一步操作标记 */}
                {isLastMoveTarget && lastMove && (
                  <div 
                    className={`absolute inset-0 rounded-full border-4 transition-all duration-500 pointer-events-none animate-pulse ${
                      lastMove.type === 'PLACE' || lastMove.type === 'MOVE' 
                        ? 'bg-blue-300/30 border-blue-400'  // 落子/移动：蓝圈
                        : lastMove.type === 'BOMB'
                        ? 'bg-red-300/30 border-red-400'    // 炸弹：红圈
                        : 'bg-green-300/30 border-green-400' // 四连：绿圈
                    }`}
                    style={{ 
                      width: '48px',
                      height: '48px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
                
                {/* 最后一步移动的起点标记 */}
                {isLastMoveFrom && lastMove && lastMove.type === 'MOVE' && (
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-dashed transition-all duration-500 pointer-events-none animate-pulse bg-blue-200/20 border-blue-300"
                    style={{ 
                      width: '48px',
                      height: '48px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
