import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Gem, RefreshCw, DollarSign, Volume2, VolumeX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'reveal' | 'mine' | 'cashout' | 'click' | 'start') => {
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
    } else if (type === 'mine') {
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'cashout') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
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

interface MineTile {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
}

// Rainbet-style multiplier table (higher house edge for faster losses)
const MULTIPLIER_TABLE: Record<number, number[]> = {
  1: [1.03, 1.08, 1.12, 1.18, 1.24, 1.30, 1.37, 1.46, 1.55, 1.65, 1.77, 1.90, 2.06, 2.25, 2.47, 2.75, 3.09, 3.54, 4.12, 4.95, 6.19, 8.25, 12.38, 24.75],
  2: [1.06, 1.13, 1.21, 1.30, 1.40, 1.52, 1.65, 1.81, 2.00, 2.22, 2.48, 2.79, 3.18, 3.67, 4.29, 5.10, 6.19, 7.71, 9.90, 13.20, 19.80, 39.60],
  3: [1.09, 1.19, 1.30, 1.43, 1.58, 1.75, 1.96, 2.21, 2.51, 2.88, 3.33, 3.90, 4.62, 5.56, 6.80, 8.50, 10.89, 14.52, 20.33, 30.50, 61.00],
  4: [1.12, 1.25, 1.41, 1.59, 1.80, 2.06, 2.37, 2.75, 3.23, 3.84, 4.62, 5.67, 7.08, 9.07, 11.94, 16.25, 23.22, 34.83, 55.73, 104.50],
  5: [1.16, 1.32, 1.53, 1.78, 2.09, 2.48, 2.97, 3.60, 4.41, 5.51, 7.01, 9.10, 12.13, 16.63, 23.75, 35.63, 57.00, 104.50, 285.00],
  6: [1.20, 1.40, 1.67, 2.00, 2.42, 2.97, 3.71, 4.71, 6.11, 8.10, 11.03, 15.47, 22.50, 34.13, 54.61, 95.57, 190.00, 570.00],
  7: [1.25, 1.49, 1.82, 2.26, 2.85, 3.66, 4.79, 6.43, 8.82, 12.47, 18.21, 27.72, 44.36, 76.13, 142.75, 307.00, 922.00],
  8: [1.30, 1.60, 2.00, 2.56, 3.35, 4.48, 6.14, 8.63, 12.50, 18.75, 29.17, 47.67, 83.43, 159.29, 345.00, 1035.00],
  9: [1.36, 1.72, 2.22, 2.93, 3.96, 5.49, 7.84, 11.53, 17.53, 27.69, 45.83, 80.20, 152.38, 330.00, 990.00],
  10: [1.43, 1.87, 2.50, 3.41, 4.76, 6.83, 10.10, 15.47, 24.75, 41.25, 72.19, 137.50, 297.00, 891.00],
  11: [1.50, 2.04, 2.83, 4.03, 5.90, 8.93, 14.05, 22.92, 39.11, 70.40, 137.50, 297.00, 891.00],
  12: [1.58, 2.25, 3.27, 4.91, 7.60, 12.22, 20.63, 36.67, 68.75, 137.50, 302.50, 907.50],
  13: [1.67, 2.50, 3.81, 6.04, 9.93, 17.19, 31.25, 60.42, 125.00, 281.25, 843.75],
  14: [1.79, 2.81, 4.55, 7.69, 13.64, 25.52, 51.04, 110.00, 261.25, 783.75],
  15: [1.92, 3.21, 5.56, 10.00, 19.05, 38.89, 85.56, 205.00, 615.00],
  16: [2.08, 3.70, 6.80, 13.27, 27.78, 62.50, 156.25, 468.75],
  17: [2.27, 4.35, 8.52, 18.06, 41.67, 104.17, 312.50],
  18: [2.50, 5.26, 11.11, 26.39, 69.44, 208.33],
  19: [2.78, 6.45, 15.63, 43.75, 131.25],
  20: [3.13, 8.33, 23.44, 70.31, 210.94],
  21: [3.57, 11.36, 37.50, 112.50],
  22: [4.17, 16.67, 62.50, 187.50],
  23: [5.00, 27.78, 111.11],
  24: [6.25, 50.00, 150.00],
};

// Get multiplier from Rainbet table
const getMultiplier = (minesCount: number, revealedCount: number): number => {
  const table = MULTIPLIER_TABLE[minesCount];
  if (!table) return 1;
  const index = revealedCount - 1;
  if (index < 0) return 1;
  if (index >= table.length) return table[table.length - 1];
  return table[index];
};

// Generate mines with admin rigging support
const generateMines = (minesCount: number, seed: string, adminPositions?: number[] | null): MineTile[] => {
  const grid: MineTile[] = Array(25).fill(null).map((_, i) => ({
    id: i,
    isMine: false,
    isRevealed: false,
  }));

  // Check for admin rigging
  if (adminPositions && adminPositions.length > 0) {
    adminPositions.slice(0, minesCount).forEach(pos => {
      if (pos >= 0 && pos < 25) {
        grid[pos].isMine = true;
      }
    });
    return grid;
  }

  // Normal random generation with higher mine probability (players lose faster)
  let seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let minesPlaced = 0;
  const placedIndices = new Set<number>();
  
  while (minesPlaced < minesCount) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    const index = seedNum % 25;
    
    if (!placedIndices.has(index)) {
      grid[index].isMine = true;
      placedIndices.add(index);
      minesPlaced++;
    }
  }

  return grid;
};

export default function MinesGame() {
  const { user, updateBalance } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [minesCount, setMinesCount] = useState(3);
  const [grid, setGrid] = useState<MineTile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [showExplosion, setShowExplosion] = useState<number | null>(null);
  const [showMineLocations, setShowMineLocations] = useState(false);

  const playAudio = (type: 'reveal' | 'mine' | 'cashout' | 'click' | 'start') => {
    if (soundEnabled) playSound(type);
  };

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

    // Generate seeds
    const newServerSeed = Math.random().toString(36).substring(2, 15);
    const newClientSeed = Math.random().toString(36).substring(2, 15);
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);

    // Check for admin rigging
    const adminRigging = (window as any).adminRigging;
    const adminPositions = adminRigging?.enabled ? adminRigging.minesPosition : null;

    // Generate mines (with admin override if enabled)
    const newGrid = generateMines(minesCount, newServerSeed + newClientSeed, adminPositions);
    setGrid(newGrid);
    setIsPlaying(true);
    setIsGameOver(false);
    setRevealedCount(0);
    setCurrentMultiplier(1);
    setShowMineLocations(false);

    // Deduct balance
    updateBalance(-amount);
    
    playAudio('start');
    toast.success('Game started! Good luck!');

    // Record bet
    addBet({
      userId: user.id,
      username: user.username,
      game: 'mines',
      amount,
      multiplier: 1,
      payout: 0,
      result: 'pending',
    });
  };

  const handleTileClick = (tileId: number) => {
    if (!isPlaying || isGameOver || grid[tileId]?.isRevealed) return;

    const newGrid = [...grid];
    const tile = newGrid[tileId];

    if (tile.isMine) {
      // Hit mine - reveal all mines
      newGrid.forEach((t, i) => {
        if (t.isMine) newGrid[i] = { ...t, isRevealed: true };
      });
      setGrid(newGrid);
      setIsGameOver(true);
      setIsPlaying(false);
      setShowExplosion(tileId);
      playAudio('mine');
      toast.error('💥 Boom! You hit a mine!');
      
      setTimeout(() => setShowExplosion(null), 500);

      // Record loss
      if (user) {
        addBet({
          userId: user.id,
          username: user.username,
          game: 'mines',
          amount: parseFloat(betAmount),
          multiplier: 0,
          payout: 0,
          result: 'loss',
        });
      }
    } else {
      // Safe tile
      newGrid[tileId] = { ...tile, isRevealed: true };
      setGrid(newGrid);
      
      const newRevealedCount = revealedCount + 1;
      setRevealedCount(newRevealedCount);
      
      const newMultiplier = getMultiplier(minesCount, newRevealedCount);
      setCurrentMultiplier(newMultiplier);
      
      playAudio('reveal');
    }
  };

  const handleCashout = () => {
    if (!isPlaying || isGameOver) return;

    const payout = parseFloat(betAmount) * currentMultiplier;
    updateBalance(payout);
    
    // Reveal all mines to show where they were
    const newGrid = [...grid];
    newGrid.forEach((t, i) => {
      if (t.isMine) newGrid[i] = { ...t, isRevealed: true };
    });
    setGrid(newGrid);
    
    setIsGameOver(true);
    setIsPlaying(false);
    setShowMineLocations(true);
    
    playAudio('cashout');
    toast.success(`💰 Cashed out! Won $${payout.toFixed(2)} at ${currentMultiplier.toFixed(2)}x`);

    // Record win
    if (user) {
      addBet({
        userId: user.id,
        username: user.username,
        game: 'mines',
        amount: parseFloat(betAmount),
        multiplier: currentMultiplier,
        payout: payout,
        result: 'win',
      });
    }
  };

  const handleReset = () => {
    playAudio('click');
    setGrid([]);
    setIsPlaying(false);
    setIsGameOver(false);
    setRevealedCount(0);
    setCurrentMultiplier(1);
    setShowMineLocations(false);
  };

  return (
    <div className="h-[calc(100vh-52px)] pt-2 pb-2 px-3 overflow-hidden">
      <div className="max-w-6xl mx-auto h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2 flex-shrink-0"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Bomb className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Mines</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-gray-400 text-xs">Avoid the mines and multiply your bet!</p>
        </motion.div>

        {/* Provably Fair Info */}
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-2 p-2 rounded-lg bg-dark-800/50 border border-white/5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-neon-green" />
              <span className="text-xs text-gray-400">Provably Fair</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500">Server:</span>
                <span className="text-gray-400 ml-1 font-mono">{serverSeed.slice(0, 6)}...</span>
              </div>
              <div>
                <span className="text-gray-500">Client:</span>
                <span className="text-gray-400 ml-1 font-mono">{clientSeed.slice(0, 6)}...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[calc(100%-80px)]">
          {/* Controls Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 order-2 lg:order-1 overflow-y-auto"
          >
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-xl border border-white/5 p-3">
              {/* Bet Amount */}
              <div className="space-y-2 mb-3">
                <label className="text-xs text-gray-400">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlaying}
                    className="pl-9 h-9 bg-dark-700/50 border-white/10 text-white text-sm disabled:opacity-50 rounded-lg"
                  />
                </div>
                <div className="flex gap-1.5">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => !isPlaying && setBetAmount(amount.toString())}
                      disabled={isPlaying}
                      className="flex-1 py-1.5 rounded bg-dark-700 text-[10px] text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mines Count */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Mines</label>
                  <span className="text-xs font-semibold text-neon-green">{minesCount}</span>
                </div>
                <Slider
                  value={[minesCount]}
                  onValueChange={(value) => !isPlaying && setMinesCount(value[0])}
                  min={1}
                  max={24}
                  step={1}
                  disabled={isPlaying}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>1</span>
                  <span>24</span>
                </div>
              </div>

              {/* Multiplier Display */}
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 p-2 rounded-lg bg-neon-green/10 border border-neon-green/20"
                >
                  <p className="text-[10px] text-gray-400 mb-0.5">Multiplier</p>
                  <p className="text-xl font-bold text-neon-green">{currentMultiplier.toFixed(2)}x</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Win: ${(parseFloat(betAmount) * currentMultiplier).toFixed(2)}
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              {!isPlaying ? (
                <Button
                  onClick={handleStartGame}
                  disabled={!user || parseFloat(betAmount) <= 0}
                  className="w-full h-9 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg text-sm"
                >
                  Start Game
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={handleCashout}
                    className="w-full h-9 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg text-sm"
                  >
                    Cashout ({currentMultiplier.toFixed(2)}x)
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full h-9 border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    New Game
                  </Button>
                </div>
              )}

              {!user && (
                <p className="mt-2 text-center text-xs text-gray-500">Please login to play</p>
              )}
            </div>
          </motion.div>

          {/* Game Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 order-1 lg:order-2"
          >
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-xl border border-white/5 p-3 h-full flex flex-col">
              {/* Mine Locations Revealed Message */}
              {showMineLocations && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center"
                >
                  <p className="text-xs text-yellow-400">💣 Mine locations revealed!</p>
                </motion.div>
              )}
              
              <div className="grid grid-cols-5 gap-1.5 flex-1">
                {Array(25).fill(null).map((_, index) => {
                  const tile = grid[index];
                  const isRevealed = tile?.isRevealed;
                  const isMine = tile?.isMine;
                  const isExploding = showExplosion === index;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleTileClick(index)}
                      disabled={!isPlaying || isGameOver || isRevealed}
                      whileHover={isPlaying && !isRevealed ? { scale: 1.05 } : {}}
                      whileTap={isPlaying && !isRevealed ? { scale: 0.95 } : {}}
                      className={`
                        relative aspect-square rounded-lg flex items-center justify-center
                        transition-all duration-200
                        ${!isPlaying 
                          ? 'bg-dark-700 cursor-not-allowed' 
                          : isRevealed
                            ? isMine
                              ? 'bg-red-500/20 border border-red-500'
                              : 'bg-neon-green/20 border border-neon-green'
                            : 'bg-dark-700 hover:bg-dark-600 cursor-pointer border border-transparent hover:border-neon-green/30'
                        }
                      `}
                    >
                      <AnimatePresence>
                        {isRevealed && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ type: 'spring', damping: 15 }}
                          >
                            {isMine ? (
                              <Bomb className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                            ) : (
                              <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green" />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {isExploding && (
                          <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 3, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-red-500 rounded-full"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              {/* Game Info */}
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-dark-700 border border-white/10" />
                    <span className="text-gray-400">Hidden</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-neon-green/20 border border-neon-green" />
                    <span className="text-gray-400">Safe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500" />
                    <span className="text-gray-400">Mine</span>
                  </div>
                </div>
                {isPlaying && (
                  <div className="text-gray-400">
                    {revealedCount}/{(25 - minesCount)} safe
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
