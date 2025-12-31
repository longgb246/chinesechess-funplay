
import React from 'react';
import { Cell, GameState, Position } from '../types';
import XiangqiPiece from './XiangqiPiece';

interface GameBoardProps {
  cells: Cell[][];
  onCellClick: (x: number, y: number) => void;
  selectedPos: Position | null;
  gameState: GameState;
  bombableIndices: Position[];
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  cells, 
  onCellClick, 
  selectedPos, 
  gameState,
  bombableIndices 
}) => {
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
            
            return (
              <div 
                key={`${x}-${y}`}
                onClick={() => onCellClick(x, y)}
                className={`
                  flex items-center justify-center rounded-sm transition-colors cursor-pointer
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
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
