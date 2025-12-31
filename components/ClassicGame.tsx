
import React, { useState, useEffect, useCallback } from 'react';
import { Piece, Player, Position, AiLevel, Move } from '../types';
import { getInitialClassicBoard, canMoveClassic, boardToFen, parseApiMove } from '../logic/classicLogic';
import XiangqiPiece from './XiangqiPiece';
import { RotateCcw, ArrowLeft, Trophy, Undo2, Cpu, Users, Lightbulb, Loader2, Target } from 'lucide-react';

interface ClassicGameProps {
  onBack: () => void;
}

interface ClassicHistoryState {
  board: (Piece | null)[][];
  currentPlayer: Player;
  winner: Player | null;
}

const CELL_SIZE = 56;
const BOARD_PADDING = CELL_SIZE / 2;

const ClassicGame: React.FC<ClassicGameProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(Piece | null)[][]>(getInitialClassicBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('RED');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<ClassicHistoryState[]>([]);
  
  // AI Settings
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [aiLevel, setAiLevel] = useState<AiLevel>('高手');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Hints
  const [hint, setHint] = useState<Move | null>(null);
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const [hoveredHint, setHoveredHint] = useState<boolean>(false);

  const fetchMovesFromDb = async (fen: string) => {
    try {
      const response = await fetch(`https://www.chessdb.cn/chessdb.php?action=queryall&board=${encodeURIComponent(fen)}`);
      const text = await response.text();
      if (text.startsWith('move:')) {
        return text.split('|').map(item => {
          const parts = item.split(',');
          const moveData = parts[0].split(':')[1];
          const score = parseInt(parts[1].split(':')[1]);
          return { ...parseApiMove(moveData), score, raw: moveData };
        }).sort((a, b) => b.score - a.score);
      }
      return [];
    } catch (e) {
      console.error("ChessDB API Error", e);
      return [];
    }
  };

  const executeAiMove = useCallback(async () => {
    if (winner || !aiMode || currentPlayer === 'RED') return;
    
    setIsAiThinking(true);
    const fen = boardToFen(board, currentPlayer);
    const moves = await fetchMovesFromDb(fen);
    
    let chosenMove: any;
    if (moves.length > 0) {
      if (aiLevel === '大师') {
        chosenMove = moves[0];
      } else if (aiLevel === '高手') {
        const topCount = Math.min(moves.length, 3);
        chosenMove = moves[Math.floor(Math.random() * topCount)];
      } else {
        const midIdx = Math.floor(moves.length / 2);
        chosenMove = moves[midIdx];
      }
      
      setTimeout(() => {
        pushToHistory();
        movePiece(chosenMove.from, chosenMove.to);
        setIsAiThinking(false);
      }, 800);
    } else {
      setIsAiThinking(false);
    }
  }, [board, currentPlayer, aiMode, aiLevel, winner]);

  useEffect(() => {
    if (aiMode && currentPlayer === 'BLACK' && !winner) {
      executeAiMove();
    }
  }, [currentPlayer, aiMode, executeAiMove, winner]);

  const pushToHistory = () => {
    setHistory(prev => [...prev, {
      board: board.map(row => row.map(piece => piece ? { ...piece } : null)),
      currentPlayer,
      winner
    }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBoard(lastState.board);
    setCurrentPlayer(lastState.currentPlayer);
    setWinner(lastState.winner);
    setSelectedPos(null);
    setHint(null);
  };

  const handleCellClick = (x: number, y: number) => {
    if (winner || isAiThinking) return;
    const piece = board[y][x];

    if (selectedPos) {
      if (selectedPos.x === x && selectedPos.y === y) {
        setSelectedPos(null);
      } else {
        const selectedPiece = board[selectedPos.y][selectedPos.x]!;
        if (canMoveClassic(selectedPiece, selectedPos, { x, y }, board)) {
          pushToHistory();
          movePiece(selectedPos, { x, y });
        } else if (piece?.owner === currentPlayer) {
          setSelectedPos({ x, y });
        }
      }
    } else if (piece?.owner === currentPlayer) {
      setSelectedPos({ x, y });
    }
  };

  const movePiece = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    const target = newBoard[to.y][to.x];
    const piece = newBoard[from.y][from.x];

    if (target?.type === '帅' || target?.type === '将') {
      setWinner(currentPlayer);
    }

    newBoard[to.y][to.x] = piece;
    newBoard[from.y][from.x] = null;
    
    setBoard(newBoard);
    setSelectedPos(null);
    setHint(null);
    setCurrentPlayer(currentPlayer === 'RED' ? 'BLACK' : 'RED');
  };

  const reset = () => {
    setBoard(getInitialClassicBoard());
    setCurrentPlayer('RED');
    setSelectedPos(null);
    setWinner(null);
    setHistory([]);
    setHint(null);
    setIsAiThinking(false);
  };

  const getHint = async () => {
    if (winner || isAiThinking || isFetchingHint) return;
    setIsFetchingHint(true);
    const fen = boardToFen(board, currentPlayer);
    const moves = await fetchMovesFromDb(fen);
    if (moves.length > 0) {
      setHint(moves[0]);
    }
    setIsFetchingHint(false);
  };

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 p-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-64 flex flex-col gap-4">
        <div className="bg-white/90 backdrop-blur p-5 rounded-2xl shadow-xl border border-amber-100">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-amber-800 transition-colors mb-6 font-bold">
            <ArrowLeft size={20} /> 返回主页
          </button>
          
          <div className="space-y-4">
             <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">游戏模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setAiMode(false); reset(); }}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${!aiMode ? 'bg-amber-50 border-amber-600' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                  >
                    <Users size={20} className={!aiMode ? 'text-amber-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold mt-1">双人对战</span>
                  </button>
                  <button 
                    onClick={() => { setAiMode(true); reset(); }}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${aiMode ? 'bg-red-50 border-red-600' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                  >
                    <Cpu size={20} className={aiMode ? 'text-red-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold mt-1">人机对弈</span>
                  </button>
                </div>
             </div>

             {aiMode && (
               <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">AI 难度</label>
                  <select 
                    value={aiLevel}
                    onChange={(e) => setAiLevel(e.target.value as AiLevel)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="大师">大师 (最强)</option>
                    <option value="高手">高手 (稳健)</option>
                    <option value="入门">入门 (轻松)</option>
                  </select>
               </div>
             )}

             <div className="pt-4 border-t flex flex-col gap-3">
                <button 
                  onClick={getHint}
                  disabled={isFetchingHint || isAiThinking || !!winner}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {isFetchingHint ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
                  获得提示
                </button>
                <div className="flex gap-2">
                  <button onClick={handleUndo} disabled={history.length === 0} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-colors">
                    <Undo2 size={18} />
                  </button>
                  <button onClick={reset} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors">
                    <RotateCcw size={18} />
                  </button>
                </div>
             </div>
          </div>
        </div>

        {hint && (
          <div 
            className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-200 shadow-lg animate-in slide-in-from-left duration-300 relative group cursor-pointer"
            onMouseEnter={() => setHoveredHint(true)}
            onMouseLeave={() => setHoveredHint(false)}
            onClick={() => {
              pushToHistory();
              movePiece(hint.from, hint.to);
            }}
          >
             <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">AI 推荐</div>
             <p className="text-xs font-bold text-amber-800 mb-1">建议走法：</p>
             <div className="flex items-center justify-between">
                <span className="text-lg font-black text-slate-800">
                  {board[hint.from.y][hint.from.x]?.type} ({String.fromCharCode(97 + hint.from.x)}{9 - hint.from.y}) → {String.fromCharCode(97 + hint.to.x)}{9 - hint.to.y}
                </span>
                <div className="flex items-center gap-1 text-red-600 font-bold">
                  <Target size={14} /> {hint.score}
                </div>
             </div>
             <div className="mt-2 text-[10px] text-amber-600 italic">点击卡片自动执行</div>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col items-center">
        <div className="mb-4 bg-white/80 backdrop-blur px-8 py-3 rounded-full shadow-sm border border-amber-100 flex items-center gap-4">
           <div className={`w-3 h-3 rounded-full ${currentPlayer === 'RED' ? 'bg-red-600' : 'bg-slate-900'} animate-pulse`} />
           <h2 className={`text-2xl font-bold xiangqi-font ${currentPlayer === 'RED' ? 'text-red-700' : 'text-slate-900'}`}>
             {currentPlayer === 'RED' ? '红方回合' : (aiMode ? `AI 思考中...` : '黑方回合')}
           </h2>
           {isAiThinking && <Loader2 className="animate-spin text-red-600" size={20} />}
        </div>

        <div 
          className="relative bg-[#f4e4bc] rounded-sm shadow-2xl border-[12px] border-[#8b4513] mx-auto mb-8"
          style={{ 
            width: CELL_SIZE * 9 + BOARD_PADDING * 2, 
            height: CELL_SIZE * 10 + BOARD_PADDING * 2,
            padding: BOARD_PADDING
          }}
        >
          {/* Column Labels (a-i) - Fixed alignment */}
          <div className="absolute w-full flex" style={{ bottom: -28, left: BOARD_PADDING }}>
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(l => (
              <span key={l} className="flex-shrink-0 text-center text-[11px] font-black text-[#8b4513]/60 uppercase" style={{ width: CELL_SIZE }}>{l}</span>
            ))}
          </div>
          {/* Row Labels (9-0) - Fixed alignment */}
          <div className="absolute h-full flex flex-col" style={{ left: -24, top: BOARD_PADDING }}>
            {['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'].map(n => (
              <span key={n} className="flex-shrink-0 flex items-center justify-center text-[11px] font-black text-[#8b4513]/60" style={{ height: CELL_SIZE }}>{n}</span>
            ))}
          </div>

          <div className="absolute inset-0 pointer-events-none" style={{ margin: BOARD_PADDING }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={`h-${i}`} className="absolute w-full h-px bg-[#5d4037]" style={{ top: i * CELL_SIZE + CELL_SIZE / 2 }} />
            ))}
            {Array.from({ length: 9 }).map((_, i) => {
              const isEdge = i === 0 || i === 8;
              return (
                <React.Fragment key={`v-parent-${i}`}>
                  <div className="absolute w-px bg-[#5d4037]" style={{ left: i * CELL_SIZE + CELL_SIZE / 2, top: CELL_SIZE / 2, height: isEdge ? CELL_SIZE * 9 : CELL_SIZE * 4 }} />
                  {!isEdge && <div className="absolute w-px bg-[#5d4037]" style={{ left: i * CELL_SIZE + CELL_SIZE / 2, top: CELL_SIZE * 5.5, height: CELL_SIZE * 4 }} />}
                </React.Fragment>
              );
            })}
            <svg className="absolute top-0 left-0 w-full h-full">
              <line x1={3 * CELL_SIZE + CELL_SIZE / 2} y1={0.5 * CELL_SIZE} x2={5 * CELL_SIZE + CELL_SIZE / 2} y2={2.5 * CELL_SIZE} stroke="#5d4037" />
              <line x1={5 * CELL_SIZE + CELL_SIZE / 2} y1={0.5 * CELL_SIZE} x2={3 * CELL_SIZE + CELL_SIZE / 2} y2={2.5 * CELL_SIZE} stroke="#5d4037" />
              <line x1={3 * CELL_SIZE + CELL_SIZE / 2} y1={7.5 * CELL_SIZE} x2={5 * CELL_SIZE + CELL_SIZE / 2} y2={9.5 * CELL_SIZE} stroke="#5d4037" />
              <line x1={5 * CELL_SIZE + CELL_SIZE / 2} y1={7.5 * CELL_SIZE} x2={3 * CELL_SIZE + CELL_SIZE / 2} y2={9.5 * CELL_SIZE} stroke="#5d4037" />
            </svg>
            <div className="absolute flex justify-around w-full items-center" style={{ top: CELL_SIZE * 4.5, height: CELL_SIZE }}>
              <span className="text-3xl xiangqi-font text-[#5d4037] -rotate-90 opacity-60">楚河</span>
              <span className="text-3xl xiangqi-font text-[#5d4037] -rotate-90 opacity-60">汉界</span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-9 grid-rows-10" style={{ width: CELL_SIZE * 9, height: CELL_SIZE * 10 }}>
            {board.map((row, y) => row.map((piece, x) => {
              const isSelected = selectedPos?.x === x && selectedPos?.y === y;
              const canMove = selectedPos && canMoveClassic(board[selectedPos.y][selectedPos.x]!, selectedPos, { x, y }, board);
              
              // Hint Visuals
              const isHintFrom = hint && hint.from.x === x && hint.from.y === y;
              const isHintTo = hint && hint.to.x === x && hint.to.y === y;
              
              return (
                <div key={`${x}-${y}`} onClick={() => handleCellClick(x, y)} className="relative flex items-center justify-center cursor-pointer group" style={{ width: CELL_SIZE, height: CELL_SIZE }}>
                  
                  {/* Hint Shadows - Highlighted both 'from' and 'to' as requested */}
                  {(isHintTo || isHintFrom) && (
                    <div className={`absolute inset-0 border-4 border-amber-400 rounded-full scale-110 animate-pulse z-0 ${hoveredHint ? 'opacity-100' : 'opacity-40'}`} />
                  )}

                  {!piece && canMove && <div className="w-3 h-3 rounded-full bg-amber-600/30" />}
                  {piece && piece.owner !== currentPlayer && canMove && <div className="absolute inset-0 border-4 border-red-500/40 rounded-full" />}
                  
                  {piece && <XiangqiPiece piece={piece} isSelected={isSelected} />}

                  {/* Ghost piece for hint hover */}
                  {isHintTo && hoveredHint && board[hint.from.y][hint.from.x] && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none scale-100 transform transition-all">
                      <XiangqiPiece piece={board[hint.from.y][hint.from.x]!} isGhost={true} />
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      {winner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm border-4 border-[#8b4513]">
            <Trophy className="text-amber-500 w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4 xiangqi-font text-[#8b4513]">
              {winner === 'RED' ? '红方胜利' : '黑方胜利'}
            </h2>
            <div className="flex gap-4">
              <button onClick={handleUndo} className="flex-1 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold">悔棋</button>
              <button onClick={reset} className="flex-1 py-3 bg-[#8b4513] text-white rounded-xl font-bold">再战一局</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassicGame;
