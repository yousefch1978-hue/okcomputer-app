import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, Gem, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'reveal' | 'win' | 'lose' | 'click' | 'cashout' | 'start') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'reveal') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } else if (type === 'win' || type === 'cashout') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'lose') {
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'click') {
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'start') {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  } catch (e) {}
};

// Difficulty settings matching Rainbet Tower exactly
const DIFFICULTIES = {
  easy: { 
    name: 'Easy', 
    rows: 9, 
    tilesPerRow: 4, 
    mines: 1, // 3 safe, 1 mine
    multipliers: [1.23, 1.51, 1.86, 2.29, 2.82, 3.47, 4.27, 5.26, 6.48]
  },
  medium: { 
    name: 'Medium', 
    rows: 9, 
    tilesPerRow: 3, 
    mines: 1, // 2 safe, 1 mine
    multipliers: [1.47, 2.16, 3.18, 4.68, 6.88, 10.12, 14.88, 21.89, 32.21]
  },
  hard: { 
    name: 'Hard', 
    rows: 9, 
    tilesPerRow: 2, 
    mines: 1, // 1 safe, 1 mine
    multipliers: [1.94, 3.76, 7.30, 14.17, 27.52, 53.45, 103.80, 201.58, 391.48]
  },
  expert: { 
    name: 'Expert', 
    rows: 9, 
    tilesPerRow: 3, 
    mines: 2, // 1 safe, 2 mines
    multipliers: [2.94, 8.64, 25.40, 74.68, 219.50, 645.00, 1895.00, 5568.00, 16365.00]
  },
  master: { 
    name: 'Master', 
    rows: 9, 
    tilesPerRow: 4, 
    mines: 3, // 1 safe, 3 mines
    multipliers: [3.92, 15.37, 60.24, 236.00, 925.00, 3625.00, 14215.00, 55750.00, 218750.00]
  },
};

type Difficulty = keyof typeof DIFFICULTIES;

interface TowerTile {
  id: number;
  hasMine: boolean;
  isRevealed: boolean;
  isSelected: boolean;
}

// Generate tower with admin rigging
const generateTower = (difficulty: Difficulty, adminMinePositions?: number[] | null): TowerTile[][] => {
  const config = DIFFICULTIES[difficulty];
  const tower: TowerTile[][] = [];
  
  for (let row = 0; row < config.rows; row++) {
    const rowTiles: TowerTile[] = [];
    
    // Admin override for this row
    if (adminMinePositions && adminMinePositions[row] !== undefined) {
      const mineIndex = adminMinePositions[row];
      for (let tile = 0; tile < config.tilesPerRow; tile++) {
        rowTiles.push({
          id: row * config.tilesPerRow + tile,
          hasMine: tile === mineIndex,
          isRevealed: false,
          isSelected: false,
        });
      }
    } else {
      // Random placement
      const mineIndices: number[] = [];
      while (mineIndices.length < config.mines) {
        const idx = Math.floor(Math.random() * config.tilesPerRow);
        if (!mineIndices.includes(idx)) {
          mineIndices.push(idx);
        }
      }
      
      for (let tile = 0; tile < config.tilesPerRow; tile++) {
        rowTiles.push({
          id: row * config.tilesPerRow + tile,
          hasMine: mineIndices.includes(tile),
          isRevealed: false,
          isSelected: false,
        });
      }
    }
    tower.push(rowTiles);
  }
  
  return tower;
};

// House edge: 58% win rate for house (players lose more)
const shouldHouseWin = (): boolean => {
  const adminRigging = (window as any).adminRigging;
  if (adminRigging?.enabled && adminRigging.towerResult) {
    return adminRigging.towerResult === 'loss';
  }
  return Math.random() < 0.58; // 58% house edge - players lose more
};

export default function DragonTowerGame() {
  const { user, updateBalance } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [tower, setTower] = useState<TowerTile[][]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'finished'>('betting');
  const [soundEnabled] = useState(true);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  const config = DIFFICULTIES[difficulty];
  const currentMultiplier = currentRow > 0 ? config.multipliers[currentRow - 1] : 0;
  const nextMultiplier = currentRow < config.rows ? config.multipliers[currentRow] : 0;

  const playAudio = useCallback((type: 'reveal' | 'win' | 'lose' | 'click' | 'cashout' | 'start') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  const handleStartGame = () => {
    if (!user) {
      toast.error('Please login to play');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }

    if (amount > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    // Deduct balance
    updateBalance(-amount);

    // Check admin rigging
    const adminRigging = (window as any).adminRigging;
    const adminMinePositions = adminRigging?.enabled ? adminRigging.towerPositions : null;

    // Generate tower
    let newTower = generateTower(difficulty, adminMinePositions);
    
    // If house should win, ensure mine is placed early
    if (shouldHouseWin() && !adminRigging?.enabled) {
      const loseRow = Math.floor(Math.random() * 3) + 1; // Lose within rows 1-3
      const mineTile = Math.floor(Math.random() * config.tilesPerRow);
      // Regenerate with mine at specific position
      newTower = generateTower(difficulty, null);
      newTower[loseRow].forEach((tile, i) => {
        tile.hasMine = i === mineTile;
      });
    }

    setTower(newTower);
    setCurrentRow(0);
    setGameState('playing');

    playAudio('start');

    addBet({
      userId: user.id,
      username: user.username,
      game: 'dragontower',
      amount,
      multiplier: 1,
      payout: 0,
      result: 'pending',
    });
  };

  const handleTileClick = (rowIndex: number, tileIndex: number) => {
    if (gameState !== 'playing' || rowIndex !== currentRow) return;

    const newTower = [...tower];
    const tile = newTower[rowIndex][tileIndex];

    if (tile.hasMine) {
      // Hit mine - game over
      tile.isRevealed = true;
      setTower(newTower);
      setGameState('finished');
      playAudio('lose');
      toast.error('💀 You hit a mine!');

      // Record loss
      if (user) {
        addBet({
          userId: user.id,
          username: user.username,
          game: 'dragontower',
          amount: parseFloat(betAmount),
          multiplier: 0,
          payout: 0,
          result: 'loss',
        });
      }
    } else {
      // Safe - advance
      tile.isRevealed = true;
      tile.isSelected = true;
      setTower(newTower);
      setCurrentRow(rowIndex + 1);
      playAudio('reveal');

      // Check if reached top
      if (rowIndex + 1 >= config.rows) {
        // Won the tower!
        const winAmount = parseFloat(betAmount) * config.multipliers[config.multipliers.length - 1];
        updateBalance(winAmount);
        setGameState('finished');
        playAudio('win');
        toast.success(`🏆 Tower conquered! You won $${winAmount.toFixed(2)}!`);

        if (user) {
          addBet({
            userId: user.id,
            username: user.username,
            game: 'dragontower',
            amount: parseFloat(betAmount),
            multiplier: config.multipliers[config.multipliers.length - 1],
            payout: winAmount,
            result: 'win',
          });
        }
      }
    }
  };

  const handleCashout = () => {
    if (gameState !== 'playing' || currentRow === 0) return;

    const winAmount = parseFloat(betAmount) * currentMultiplier;
    updateBalance(winAmount);
    
    // Reveal all mines
    const newTower = tower.map(row => 
      row.map(tile => ({ ...tile, isRevealed: tile.hasMine || tile.isRevealed }))
    );
    setTower(newTower);
    
    setGameState('finished');
    
    playAudio('cashout');
    toast.success(`💰 Cashed out! Won $${winAmount.toFixed(2)} at ${currentMultiplier.toFixed(2)}x`);

    if (user) {
      addBet({
        userId: user.id,
        username: user.username,
        game: 'dragontower',
        amount: parseFloat(betAmount),
        multiplier: currentMultiplier,
        payout: winAmount,
        result: 'win',
      });
    }
  };

  const handleReset = () => {
    playAudio('click');
    setTower([]);
    setCurrentRow(0);
    setGameState('betting');
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setShowDifficultyDropdown(false);
    playAudio('click');
  };

  // Get difficulty indicator (gems and skulls)
  const getDifficultyIndicator = (diff: Difficulty) => {
    const config = DIFFICULTIES[diff];
    const safeTiles = config.tilesPerRow - config.mines;
    const gems = Array(safeTiles).fill(null).map((_, i) => (
      <Gem key={`gem-${i}`} className="w-3 h-3 text-emerald-400 fill-emerald-400" />
    ));
    const skulls = Array(config.mines).fill(null).map((_, i) => (
      <Skull key={`skull-${i}`} className="w-3 h-3 text-red-500 fill-red-500" />
    ));
    return [...gems, ...skulls];
  };

  return (
    <div className="h-[calc(100vh-64px)] pt-2 pb-2 px-3 overflow-hidden">
      <div className="max-w-6xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-2">
            {/* Manual/Auto Tabs */}
            <div className="flex gap-1 bg-dark-800/50 rounded-lg p-1">
              <button className="flex-1 py-1.5 px-3 bg-blue-500 text-white text-xs font-medium rounded">
                Manual
              </button>
              <button className="flex-1 py-1.5 px-3 text-gray-400 text-xs font-medium hover:text-white">
                Auto
              </button>
            </div>

            {/* Bet Amount */}
            <div className="bg-dark-800/50 rounded-lg p-3">
              <label className="text-xs text-gray-400 mb-1.5 block">Bet Amount</label>
              <div className="relative mb-2">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => gameState === 'betting' && setBetAmount(e.target.value)}
                  disabled={gameState !== 'betting'}
                  className="pl-8 h-9 bg-dark-700/50 border-white/10 text-white text-sm disabled:opacity-50 rounded-lg"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => gameState === 'betting' && setBetAmount((parseFloat(betAmount || '0') / 2).toString())}
                  disabled={gameState !== 'betting'}
                  className="flex-1 py-1 rounded bg-dark-700 text-[10px] text-gray-400 hover:text-white disabled:opacity-50"
                >
                  ½
                </button>
                <button
                  onClick={() => gameState === 'betting' && setBetAmount((parseFloat(betAmount || '0') * 2).toString())}
                  disabled={gameState !== 'betting'}
                  className="flex-1 py-1 rounded bg-dark-700 text-[10px] text-gray-400 hover:text-white disabled:opacity-50"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Risk/Difficulty */}
            <div className="bg-dark-800/50 rounded-lg p-3 relative">
              <label className="text-xs text-gray-400 mb-1.5 block">Risk</label>
              <button
                onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                disabled={gameState !== 'betting'}
                className="w-full flex items-center justify-between h-9 px-3 bg-dark-700/50 border border-white/10 rounded-lg text-sm text-white disabled:opacity-50"
              >
                <span>{config.name}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDifficultyDropdown && gameState === 'betting' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-white/10 rounded-lg z-10 overflow-hidden">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => handleDifficultyChange(diff)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-700 text-left"
                    >
                      <span className="text-sm text-white">{DIFFICULTIES[diff].name}</span>
                      <div className="flex gap-0.5">
                        {getDifficultyIndicator(diff)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profit Display */}
            <div className="bg-dark-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Current Profit</span>
                <span className="text-xs text-gray-400">Next</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-400 font-medium">
                  ${gameState === 'playing' && currentRow > 0 
                    ? (parseFloat(betAmount) * currentMultiplier - parseFloat(betAmount)).toFixed(2) 
                    : '0.00'}
                </span>
                <span className="text-sm text-gray-400">
                  ${gameState === 'playing' && currentRow < config.rows 
                    ? (parseFloat(betAmount) * nextMultiplier - parseFloat(betAmount)).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-emerald-400">{currentMultiplier.toFixed(2)}x</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">{nextMultiplier.toFixed(2)}x</span>
              </div>
            </div>

            {/* Action Button */}
            {gameState === 'betting' ? (
              <Button
                onClick={handleStartGame}
                disabled={!user || parseFloat(betAmount) <= 0}
                className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
              >
                Bet
              </Button>
            ) : gameState === 'playing' ? (
              <div className="space-y-2">
                <Button
                  onClick={handleCashout}
                  disabled={currentRow === 0}
                  className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Cash Out {currentMultiplier > 0 && `(${currentMultiplier.toFixed(2)}x)`}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleReset}
                className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New Game
              </Button>
            )}

            {!user && (
              <p className="text-center text-xs text-gray-500">
                Please login to play
              </p>
            )}
          </div>

          {/* Right Panel - Tower */}
          <div className="lg:col-span-8 relative">
            <div className="h-full bg-gradient-to-b from-dark-800/30 to-dark-900/50 rounded-xl border border-white/5 relative overflow-hidden">
              {/* Tower Background */}
              <div className="absolute inset-0 flex justify-center">
                {/* Left Pillar */}
                <div className="absolute left-[15%] top-0 bottom-0 w-12 bg-gradient-to-r from-slate-700/50 to-slate-600/30 rounded-t-lg" />
                {/* Right Pillar */}
                <div className="absolute right-[15%] top-0 bottom-0 w-12 bg-gradient-to-l from-slate-700/50 to-slate-600/30 rounded-t-lg" />
                {/* Blue Flames */}
                <div className="absolute bottom-4 left-[15%] w-12 h-16 flex items-end justify-center">
                  <div className="w-8 h-12 bg-gradient-to-t from-blue-500 via-cyan-400 to-transparent rounded-full blur-sm animate-pulse" />
                </div>
                <div className="absolute bottom-4 right-[15%] w-12 h-16 flex items-end justify-center">
                  <div className="w-8 h-12 bg-gradient-to-t from-blue-500 via-cyan-400 to-transparent rounded-full blur-sm animate-pulse" />
                </div>
              </div>

              {/* Tower Grid */}
              <div className="relative h-full flex flex-col-reverse justify-center items-center gap-1 py-4">
                {tower.length > 0 ? (
                  tower.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1.5">
                      {row.map((tile, tileIndex) => {
                        const isClickable = gameState === 'playing' && rowIndex === currentRow && !tile.isRevealed;
                        
                        return (
                          <motion.button
                            key={tile.id}
                            onClick={() => handleTileClick(rowIndex, tileIndex)}
                            disabled={!isClickable}
                            whileHover={isClickable ? { scale: 1.05 } : {}}
                            whileTap={isClickable ? { scale: 0.95 } : {}}
                            className={`
                              w-14 h-10 sm:w-16 sm:h-12 rounded-md flex items-center justify-center
                              transition-all duration-200 border
                              ${tile.isRevealed && tile.hasMine
                                ? 'bg-red-900/60 border-red-500'
                                : tile.isSelected
                                  ? 'bg-emerald-900/60 border-emerald-500'
                                  : tile.isRevealed
                                    ? 'bg-dark-700/60 border-white/10'
                                    : isClickable
                                      ? 'bg-dark-700/40 border-white/20 hover:border-emerald-400/50 cursor-pointer'
                                      : 'bg-dark-800/40 border-white/5 cursor-not-allowed'
                              }
                            `}
                          >
                            <AnimatePresence>
                              {tile.isRevealed && tile.hasMine && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="text-lg"
                                >
                                  💀
                                </motion.div>
                              )}
                              {tile.isSelected && !tile.hasMine && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex flex-col items-center"
                                >
                                  <Gem className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                                  <span className="text-[8px] text-emerald-400 mt-0.5">
                                    x{config.multipliers[rowIndex].toFixed(2)}
                                  </span>
                                </motion.div>
                              )}
                              {!tile.isRevealed && !tile.isSelected && rowIndex === currentRow && gameState === 'playing' && (
                                <Gem className="w-4 h-4 text-gray-600" />
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-3">🏰</div>
                    <p className="text-gray-400 text-sm">Place a bet to start climbing</p>
                    <p className="text-gray-500 text-xs mt-1">Avoid the mines, reach the top!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
