
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Player, GameState, Cell, Position, Piece, GameMode, AiLevel, LastMove
} from './types.ts';
import { BOARD_WIDTH, BOARD_HEIGHT, WINNING_THRESHOLD, createInitialHand } from './constants.ts';
import { checkFourInARow, getAdjacentCells } from './logic/gameLogic.ts';
import { getBestMove, GameStateSnapshot, AIMove } from './logic/bombingAI.ts';
import GameBoard from './components/GameBoard.tsx';
import ClassicGame from './components/ClassicGame.tsx';
import { Trophy, RotateCcw, Swords, Bomb, MousePointer2, Flag, LayoutGrid, Gamepad2, ArrowLeft, Grid3X3, Undo2, Target, Sparkles, Bot } from 'lucide-react';

interface GameHistoryState {
  board: Cell[][];
  currentPlayer: Player;
  gameState: GameState;
  hands: { RED: Piece[], BLACK: Piece[] };
  message: string;
  winner: Player | null;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('HOME');
  const [board, setBoard] = useState<Cell[][]>(() => {
    const rows: Cell[][] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < BOARD_WIDTH; x++) {
        row.push({ x, y, piece: null });
      }
      rows.push(row);
    }
    return rows;
  });

  const [currentPlayer, setCurrentPlayer] = useState<Player>('RED');
  const [gameState, setGameState] = useState<GameState>(GameState.PLACING);
  const [hands, setHands] = useState<{ RED: Piece[], BLACK: Piece[] }>({
    RED: createInitialHand('RED'),
    BLACK: createInitialHand('BLACK')
  });
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [message, setMessage] = useState<string>("红方执先，请落子。");
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<GameHistoryState[]>([]);
  
  // AI 相关状态
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [aiLevel, setAiLevel] = useState<AiLevel>('高手');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hint, setHint] = useState<AIMove | null>(null);
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const [hoveredHint, setHoveredHint] = useState<boolean>(false);
  
  // 最后一步操作追踪
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const pushToHistory = () => {
    setHistory(prev => [...prev, {
      board: board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null }))),
      currentPlayer,
      gameState,
      hands: {
        RED: [...hands.RED],
        BLACK: [...hands.BLACK]
      },
      message,
      winner
    }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setBoard(lastState.board);
    setCurrentPlayer(lastState.currentPlayer);
    setGameState(lastState.gameState);
    setHands(lastState.hands);
    setMessage(lastState.message);
    setWinner(lastState.winner);
    setSelectedPos(null);
  };

  const countPiecesOnBoard = (player: Player) => {
    let count = 0;
    board.forEach(row => row.forEach(cell => {
      if (cell.piece?.owner === player) count++;
    }));
    return count;
  };

  const hasAvailableMoves = useCallback((player: Player) => {
    if (hands[player].length > 0) return true;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x];
        if (cell.piece?.owner === player) {
          const adjacents = getAdjacentCells({ x, y });
          if (adjacents.some(adj => !board[adj.y][adj.x].piece)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board, hands]);

  const checkGameEnd = useCallback(() => {
    if (winner || mode !== 'BOMBING') return;

    const redTotal = countPiecesOnBoard('RED') + hands.RED.length;
    const blackTotal = countPiecesOnBoard('BLACK') + hands.BLACK.length;

    if (redTotal > 0 && redTotal < WINNING_THRESHOLD) {
      setWinner('BLACK');
      setGameState(GameState.GAMEOVER);
      setMessage("黑方胜！红方棋子不足 4 枚。");
    } else if (blackTotal > 0 && blackTotal < WINNING_THRESHOLD) {
      setWinner('RED');
      setGameState(GameState.GAMEOVER);
      setMessage("红方胜！黑方棋子不足 4 枚。");
    } else if (gameState === GameState.MOVING) {
      if (!hasAvailableMoves(currentPlayer)) {
        const opposingPlayer = currentPlayer === 'RED' ? 'BLACK' : 'RED';
        setWinner(opposingPlayer);
        setGameState(GameState.GAMEOVER);
        setMessage(`${currentPlayer === 'RED' ? '红方' : '黑方'}无法移动，${opposingPlayer === 'RED' ? '红方' : '黑方'}获胜！`);
      }
    }
  }, [board, hands, gameState, currentPlayer, hasAvailableMoves, winner, mode]);

  useEffect(() => {
    checkGameEnd();
  }, [board, hands, gameState, checkGameEnd]);

  const handleCellClick = (x: number, y: number) => {
    if (gameState === GameState.GAMEOVER) return;
    const cell = board[y][x];
    if (gameState === GameState.PLACING) {
      if (!cell.piece) {
        pushToHistory();
        placePiece(x, y);
      }
    } else if (gameState === GameState.MOVING) {
      if (selectedPos) {
        if (selectedPos.x === x && selectedPos.y === y) {
          setSelectedPos(null);
        } else {
          const adjacents = getAdjacentCells(selectedPos);
          if (adjacents.some(p => p.x === x && p.y === y) && !cell.piece) {
            pushToHistory();
            movePiece(selectedPos, { x, y });
          } else if (cell.piece?.owner === currentPlayer) {
            setSelectedPos({ x, y });
          }
        }
      } else if (cell.piece?.owner === currentPlayer) {
        setSelectedPos({ x, y });
      }
    } else if (gameState === GameState.BOMBING) {
      if (cell.piece && cell.piece.owner !== currentPlayer) {
        pushToHistory();
        bombOpponent(x, y);
      }
    }
  };

  const placePiece = (x: number, y: number) => {
    const hand = hands[currentPlayer];
    if (hand.length === 0) return;
    const piece = hand[0];
    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = { ...newBoard[y][x], piece };
    const nextHand = hand.slice(1);
    const updatedHands = { ...hands, [currentPlayer]: nextHand };
    setHands(updatedHands);
    setBoard(newBoard);
    
    // 记录落子操作
    setLastMove({
      type: 'PLACE',
      positions: [{ x, y }]
    });
    
    afterAction(newBoard, currentPlayer, nextHand);
  };

  const movePiece = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.y][from.x].piece;
    newBoard[from.y][from.x].piece = null;
    newBoard[to.y][to.x].piece = piece;
    setBoard(newBoard);
    setSelectedPos(null);
    
    // 记录移动操作
    setLastMove({
      type: 'MOVE',
      positions: [to],
      from: from
    });
    
    afterAction(newBoard, currentPlayer, hands[currentPlayer]);
  };

  const bombOpponent = (x: number, y: number) => {
    const hand = hands[currentPlayer];
    if (hand.length === 0) return;
    const bombingPiece = hand[0];
    const newBoard = board.map(row => [...row]);
    newBoard[y][x].piece = bombingPiece;
    const afterBombHand = hand.slice(1);
    const updatedHands = { ...hands, [currentPlayer]: afterBombHand };
    setHands(updatedHands);
    setBoard(newBoard);
    
    // 记录炸弹操作
    setLastMove({
      type: 'BOMB',
      positions: [{ x, y }]
    });
    
    const line = checkFourInARow(newBoard, currentPlayer);
    if (line) {
      const reactionBoard = newBoard.map(row => [...row]);
      const recycledPieces: Piece[] = [];
      line.forEach(pos => {
        if (reactionBoard[pos.y][pos.x].piece) {
          recycledPieces.push(reactionBoard[pos.y][pos.x].piece!);
          reactionBoard[pos.y][pos.x].piece = null;
        }
      });
      const finalHand = [...recycledPieces, ...afterBombHand];
      setBoard(reactionBoard);
      const chainHands = { ...hands, [currentPlayer]: finalHand };
      setHands(chainHands);
      setGameState(GameState.BOMBING);
      setMessage("连环炸！再次形成四连，回收棋子并继续吃子。");
      
      // 更新为四连回收操作
      setLastMove({
        type: 'FOUR_IN_ROW',
        positions: line
      });
    } else {
      switchTurn(currentPlayer, updatedHands);
    }
  };

  const afterAction = (currentBoard: Cell[][], player: Player, currentHand: Piece[]) => {
    const line = checkFourInARow(currentBoard, player);
    if (line) {
      const newBoard = currentBoard.map(row => [...row]);
      const recycledPieces: Piece[] = [];
      line.forEach(pos => {
        if (newBoard[pos.y][pos.x].piece) {
          recycledPieces.push(newBoard[pos.y][pos.x].piece!);
          newBoard[pos.y][pos.x].piece = null;
        }
      });
      setBoard(newBoard);
      const newHand = [...recycledPieces, ...currentHand];
      const newHands = { ...hands, [player]: newHand };
      setHands(newHands);
      setGameState(GameState.BOMBING);
      setMessage("四连珠！已回收棋子，请选择对方一个棋子炸毁（吃掉）。");
      
      // 记录四连回收操作
      setLastMove({
        type: 'FOUR_IN_ROW',
        positions: line
      });
    } else {
      switchTurn(player, { ...hands, [player]: currentHand });
    }
  };

  const switchTurn = (lastPlayer: Player, currentHands: { RED: Piece[], BLACK: Piece[] }) => {
    const nextPlayer = lastPlayer === 'RED' ? 'BLACK' : 'RED';
    setCurrentPlayer(nextPlayer);
    const nextHand = currentHands[nextPlayer];
    if (nextHand.length > 0) {
      setGameState(GameState.PLACING);
      setMessage(`${nextPlayer === 'RED' ? '红方' : '黑方'}回合：请落子。`);
    } else {
      setGameState(GameState.MOVING);
      setMessage(`${nextPlayer === 'RED' ? '红方' : '黑方'}回合：手中无子，请移动。`);
    }
  };

  const resetGame = () => {
    setBoard(Array.from({ length: BOARD_HEIGHT }, (_, y) => 
      Array.from({ length: BOARD_WIDTH }, (_, x) => ({ x, y, piece: null }))
    ));
    setCurrentPlayer('RED');
    setGameState(GameState.PLACING);
    setHands({ RED: createInitialHand('RED'), BLACK: createInitialHand('BLACK') });
    setSelectedPos(null);
    setMessage("红方执先，请落子。");
    setWinner(null);
    setHistory([]);
    setHint(null);
    setIsAiThinking(false);
    setLastMove(null);
  };

  // AI 执行走法
  const executeAIMove = useCallback(async () => {
    if (winner || !aiMode || currentPlayer === 'RED' || isAiThinking) return;
    
    setIsAiThinking(true);
    setHint(null);
    
    // 延迟以模拟思考
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const snapshot: GameStateSnapshot = {
      board: board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null }))),
      hands: { RED: [...hands.RED], BLACK: [...hands.BLACK] },
      currentPlayer,
      gameState
    };
    
    // 根据难度选择搜索深度
    let depth = 3;
    if (aiLevel === '大师') depth = 4;
    else if (aiLevel === '入门') depth = 2;
    
    const result = getBestMove(snapshot, depth);
    
    if (result.bestMove) {
      const move = result.bestMove;
      pushToHistory();
      
      if (move.type === 'PLACE') {
        handleCellClick(move.position.x, move.position.y);
      } else if (move.type === 'MOVE' && move.from) {
        setSelectedPos(move.from);
        setTimeout(() => {
          handleCellClick(move.position.x, move.position.y);
          setIsAiThinking(false);
        }, 300);
        return;
      } else if (move.type === 'BOMB') {
        handleCellClick(move.position.x, move.position.y);
      }
    }
    
    setIsAiThinking(false);
  }, [board, hands, currentPlayer, gameState, aiMode, aiLevel, winner, isAiThinking]);

  // AI 自动走棋
  useEffect(() => {
    if (aiMode && currentPlayer === 'BLACK' && !winner && mode === 'BOMBING') {
      executeAIMove();
    }
  }, [currentPlayer, aiMode, executeAIMove, winner, mode]);

  // 获取 AI 提示
  const getHint = async () => {
    if (winner || isAiThinking || isFetchingHint || gameState === GameState.GAMEOVER) return;
    
    setIsFetchingHint(true);
    
    const snapshot: GameStateSnapshot = {
      board: board.map(row => row.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null }))),
      hands: { RED: [...hands.RED], BLACK: [...hands.BLACK] },
      currentPlayer,
      gameState
    };
    
    const result = getBestMove(snapshot, 3);
    
    if (result.bestMove) {
      setHint(result.bestMove);
    }
    
    setIsFetchingHint(false);
  };

  // 执行提示走法
  const executeHint = () => {
    if (!hint) return;
    pushToHistory();
    
    if (hint.type === 'PLACE') {
      handleCellClick(hint.position.x, hint.position.y);
    } else if (hint.type === 'MOVE' && hint.from) {
      setSelectedPos(hint.from);
      setTimeout(() => {
        handleCellClick(hint.position.x, hint.position.y);
      }, 100);
    } else if (hint.type === 'BOMB') {
      handleCellClick(hint.position.x, hint.position.y);
    }
    
    setHint(null);
  };

  if (mode === 'HOME') {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 text-[#4a321f] relative overflow-hidden">
        {/* Traditional Chinese Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border-[20px] border-[#b91c1c]" />
          <div className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full border-[40px] border-[#b91c1c]" />
          <div className="absolute top-1/4 right-10 flex flex-col gap-2 opacity-20">
             {['楚', '河', '汉', '界'].map((char, i) => (
               <span key={i} className="text-9xl xiangqi-font">{char}</span>
             ))}
          </div>
        </div>
        
        <div className="relative z-10 text-center flex flex-col items-center max-w-2xl bg-white/40 backdrop-blur-sm p-12 rounded-[40px] border-2 border-[#b91c1c]/10 shadow-2xl">
          <div className="mb-6 w-24 h-24 flex items-center justify-center bg-[#4a1010] rounded-full shadow-lg border-4 border-[#e2d1b0]">
            <Grid3X3 className="w-12 h-12 text-[#e2d1b0]" />
          </div>
          
          <div className="mb-2">
            <span className="text-[#b91c1c] font-bold tracking-[0.5em] text-lg uppercase mb-4 block">Traditional Strategy Game</span>
            <h1 className="text-8xl font-bold mb-4 xiangqi-font text-[#b91c1c] drop-shadow-md">
              中国象棋
            </h1>
            <div className="flex items-center gap-4 w-full mb-12">
              <div className="h-px bg-gradient-to-r from-transparent via-[#b91c1c] to-transparent flex-1" />
              <p className="text-2xl text-[#7c2d12] tracking-[0.3em] font-serif font-bold italic">兵贵神速 • 棋逢对手</p>
              <div className="h-px bg-gradient-to-r from-transparent via-[#b91c1c] to-transparent flex-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-4">
            <button 
              onClick={() => setMode('CLASSIC')}
              className="group relative flex flex-col items-center p-10 bg-[#fff] border-b-8 border-[#8b4513] rounded-3xl transition-all hover:scale-105 hover:-translate-y-2 hover:shadow-2xl active:scale-95"
            >
              <div className="w-16 h-16 mb-4 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-200 group-hover:bg-[#4a1010] group-hover:border-[#e2d1b0] transition-colors">
                <LayoutGrid className="w-8 h-8 text-[#b91c1c] group-hover:text-[#e2d1b0]" />
              </div>
              <h3 className="text-3xl font-bold xiangqi-font text-[#4a321f]">经典模式</h3>
              <p className="text-base text-[#7c2d12]/60 mt-2 font-serif">传世经典，步步为营</p>
            </button>

            <button 
              onClick={() => { setMode('BOMBING'); resetGame(); }}
              className="group relative flex flex-col items-center p-10 bg-[#fff] border-b-8 border-[#b91c1c] rounded-3xl transition-all hover:scale-105 hover:-translate-y-2 hover:shadow-2xl active:scale-95"
            >
              <div className="w-16 h-16 mb-4 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-200 group-hover:bg-[#4a1010] group-hover:border-[#e2d1b0] transition-colors">
                <Bomb className="w-8 h-8 text-red-600 group-hover:text-[#e2d1b0]" />
              </div>
              <h3 className="text-3xl font-bold xiangqi-font text-[#4a321f]">半走炸弹</h3>
              <p className="text-base text-[#7c2d12]/60 mt-2 font-serif">奇策玩法，横扫千军</p>
            </button>
          </div>

          <div className="mt-16 text-[#b91c1c]/40 text-sm tracking-widest font-bold">
            中华博大精深 • 棋艺源远流长
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'CLASSIC') {
    return (
      <div className="min-h-screen bg-[#fefce8] flex flex-col items-center py-8 px-4">
        <ClassicGame onBack={() => setMode('HOME')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center py-8 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-t-4 border-[#b91c1c]">
        <button onClick={() => setMode('HOME')} className="flex items-center gap-2 text-slate-500 hover:text-[#b91c1c] transition-colors">
          <ArrowLeft size={20} /> <span className="text-sm font-bold">返回主页</span>
        </button>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Swords className="text-[#b91c1c]" size={18} /> 半走炸弹
        </h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleUndo} 
            disabled={history.length === 0}
            className={`p-2 rounded-full transition-colors ${history.length === 0 ? 'text-slate-300' : 'bg-slate-100 hover:bg-amber-100 text-amber-700'}`}
            title="悔棋"
          >
            <Undo2 size={18} />
          </button>
          <button onClick={resetGame} className="p-2 bg-slate-100 hover:bg-red-100 text-slate-600 rounded-full transition-colors" title="重新开始">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-5xl">
        <div className="w-full lg:w-48 order-2 lg:order-1 flex flex-col gap-4">
          <PlayerCard 
            player="RED" isCurrent={currentPlayer === 'RED'} 
            onBoard={countPiecesOnBoard('RED')} inHand={hands.RED.length} 
            onSurrender={() => { pushToHistory(); setWinner('BLACK'); }} gameOver={!!winner}
          />
          <PlayerCard 
            player="BLACK" isCurrent={currentPlayer === 'BLACK'} 
            onBoard={countPiecesOnBoard('BLACK')} inHand={hands.BLACK.length} 
            onSurrender={() => { pushToHistory(); setWinner('RED'); }} gameOver={!!winner}
            isAI={aiMode}
          />
          
          {/* AI 控制面板 */}
          <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-purple-500">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
              <Bot size={14} /> AI 设置
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-bold">AI 对战</span>
                <button
                  onClick={() => setAiMode(!aiMode)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    aiMode ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {aiMode ? '开启' : '关闭'}
                </button>
              </div>
              
              {aiMode && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-bold">难度</span>
                  <select
                    value={aiLevel}
                    onChange={(e) => setAiLevel(e.target.value as AiLevel)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="入门">入门</option>
                    <option value="高手">高手</option>
                    <option value="大师">大师</option>
                  </select>
                </div>
              )}
              
              {isAiThinking && (
                <div className="text-xs text-purple-600 font-bold flex items-center gap-2 animate-pulse">
                  <Sparkles size={12} /> AI 思考中...
                </div>
              )}
            </div>
          </div>
          
          {/* AI 提示 */}
          {hint && (
            <div
              className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 shadow-lg animate-in slide-in-from-left duration-300 relative group cursor-pointer"
              onMouseEnter={() => setHoveredHint(true)}
              onMouseLeave={() => setHoveredHint(false)}
              onClick={executeHint}
            >
              <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">AI 推荐</div>
              <p className="text-xs font-bold text-amber-800 mb-1">建议走法：</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-800">
                  {hint.type === 'PLACE' && `落子 (${hint.position.x}, ${hint.position.y})`}
                  {hint.type === 'MOVE' && hint.from && `移动 (${hint.from.x}, ${hint.from.y}) → (${hint.position.x}, ${hint.position.y})`}
                  {hint.type === 'BOMB' && `炸毁 (${hint.position.x}, ${hint.position.y})`}
                </span>
                <Target className="text-amber-600" size={16} />
              </div>
              <p className="text-[10px] text-amber-700 mt-2">{hint.reasoning}</p>
            </div>
          )}
          
          <button
            onClick={getHint}
            disabled={!!winner || isAiThinking || isFetchingHint}
            className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
              winner || isAiThinking || isFetchingHint
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            <Target size={16} />
            {isFetchingHint ? '计算中...' : '获得提示'}
          </button>
        </div>

        <div className="flex flex-col items-center order-1 lg:order-2">
          <div className="mb-4 bg-red-50 px-6 py-2 rounded-full border border-red-200 shadow-sm flex items-center gap-2 text-sm">
             {gameState === GameState.BOMBING ? <Bomb className="text-red-500 animate-bounce" size={16} /> : <MousePointer2 className="text-amber-600" size={14}/>}
             <span className="text-[#7c2d12] font-bold">{message}</span>
          </div>
          <GameBoard 
            cells={board} 
            onCellClick={handleCellClick} 
            selectedPos={selectedPos} 
            gameState={gameState} 
            bombableIndices={[]}
            hint={hint}
            hoveredHint={hoveredHint}
            lastMove={lastMove}
          />
        </div>

        <div className="w-full lg:w-48 order-3 flex flex-col gap-4">
           <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-[#b91c1c]">
             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">玩法精要</h3>
             <ul className="text-[10px] text-slate-600 space-y-2 list-disc list-inside leading-tight font-serif">
               <li><b>四连触发</b>：横、竖、斜 4 连时回收。</li>
               <li><b>炸毁吃子</b>：回收后消耗 1 子吃掉对方任意 1 子。</li>
               <li><b>胜负</b>：对方少于 4 子或无法移动。</li>
             </ul>
           </div>
        </div>
      </div>

      {winner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 border-4 border-[#b91c1c]">
            <Trophy className="text-[#fcd34d] w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 xiangqi-font text-[#b91c1c]">
              {winner === 'RED' ? '红方大捷' : '黑方大捷'}
            </h2>
            <p className="text-sm text-slate-500 mb-8 font-serif font-bold">{message}</p>
            <div className="flex gap-4">
              <button onClick={handleUndo} className="flex-1 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold shadow-md hover:bg-amber-200 transition-colors">悔棋</button>
              <button onClick={resetGame} className="flex-1 py-3 bg-[#b91c1c] text-white rounded-xl font-bold shadow-lg hover:bg-red-800 transition-colors">再战一局</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerCard = ({ player, isCurrent, onBoard, inHand, onSurrender, gameOver, isAI }: { player: Player, isCurrent: boolean, onBoard: number, inHand: number, onSurrender: () => void, gameOver: boolean, isAI?: boolean }) => {
  const isRed = player === 'RED';
  return (
    <div className={`p-4 rounded-xl shadow-md border-l-8 transition-all flex flex-col gap-2 ${isCurrent ? (isRed ? 'bg-red-50 border-red-600 scale-105' : 'bg-slate-100 border-slate-800 scale-105') : 'bg-white border-transparent opacity-60'}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-sm flex items-center gap-2 ${isRed ? 'text-red-800' : 'text-slate-800'}`}>
          {isRed ? '红方' : '黑方'} 
          {isAI && <Bot size={12} className="text-purple-500" />}
          {isCurrent && <span className="text-[8px] bg-white px-2 py-0.5 rounded-full border border-current animate-pulse">行动中</span>}
        </h2>
        {isCurrent && !gameOver && !isAI && (
          <button onClick={onSurrender} className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors" title="投降"><Flag size={12} /></button>
        )}
      </div>
      <div className="text-[10px] space-y-1 font-serif">
        <div className="flex justify-between"><span>场上:</span> <b>{onBoard}</b></div>
        <div className="flex justify-between"><span>手中:</span> <b>{inHand}</b></div>
        <div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>总计:</span> <b>{onBoard + inHand}</b></div>
      </div>
    </div>
  );
};

export default App;
