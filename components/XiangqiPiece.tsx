
import React from 'react';
import { Piece, Player } from '../types';

interface XiangqiPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  isGhost?: boolean;
}

const XiangqiPiece: React.FC<XiangqiPieceProps> = ({ piece, isSelected, isClickable, onClick, isGhost }) => {
  const isRed = piece.owner === 'RED';
  
  return (
    <div 
      onClick={isClickable ? onClick : undefined}
      className={`
        relative w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer
        transition-all duration-300 transform
        ${isGhost ? 'opacity-40 grayscale' : 'opacity-100'}
        ${isSelected ? 'scale-110 shadow-xl -translate-y-1' : 'hover:scale-105'}
        ${isRed ? 'bg-[#d8c3a5] border-[1.5px] border-[#8b0000]' : 'bg-[#e8d5b5] border-[1.5px] border-[#1a1a1a]'}
        shadow-md
      `}
    >
      {/* Wood texture simulation */}
      <div className="absolute inset-0 rounded-full opacity-10 pointer-events-none bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:5px_5px]" />
      
      {/* Inner Ring */}
      <div className={`
        w-[36px] h-[36px] rounded-full border flex items-center justify-center
        ${isRed ? 'border-[#8b0000]' : 'border-[#1a1a1a]'}
      `}>
        <span className={`
          text-2xl font-bold xiangqi-font select-none
          ${isRed ? 'text-[#8b0000]' : 'text-[#1a1a1a]'}
        `}>
          {piece.type}
        </span>
      </div>

      {/* Selection Glow */}
      {isSelected && (
        <div className={`absolute -inset-1 rounded-full animate-pulse border-2 ${isRed ? 'border-red-400' : 'border-gray-500'}`} />
      )}
    </div>
  );
};

export default XiangqiPiece;
