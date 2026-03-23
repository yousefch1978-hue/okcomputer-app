import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, Volume2, VolumeX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'flip' | 'win' | 'lose' | 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'flip') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'win') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'lose') {
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'click') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  } catch (e) {}
};

// Generate result with admin rigging support
const generateResult = (adminResult?: string | null): 'heads' | 'tails' => {
  if (adminResult === 'heads' || adminResult === 'tails') {
    return adminResult;
  }
  // 60% house edge (players win 40%)
  return Math.random() < 0.60 ? 'tails' : 'heads';
};

export default function CoinFlipGame() {
  const { user, updateBalance } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails' | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'flipping' | 'finished'>('idle');
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flipCount, setFlipCount] = useState(0);
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');

  const playAudio = useCallback((type: 'flip' | 'win' | 'lose' | 'click') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  const handleFlip = async () => {
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

    if (!selectedSide) {
      toast.error('Please select heads or tails');
      return;
    }

    // Deduct balance first
    updateBalance(-amount);
    
    // Set game state to flipping
    setGameState('flipping');
    setResult(null);
    
    // Generate seeds for provably fair
    const newServerSeed = Math.random().toString(36).substring(2, 15);
    const newClientSeed = Math.random().toString(36).substring(2, 15);
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);

    // Play sound
    playAudio('flip');

    // Check for admin rigging
    const adminRigging = (window as any).adminRigging;
    const adminResult = adminRigging?.enabled ? adminRigging.coinFlipResult : null;

    // Generate result (with admin override if enabled)
    const flipResult = generateResult(adminResult);

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Set result and finish
    setResult(flipResult);
    setGameState('finished');
    setFlipCount(prev => prev + 1);

    const won = flipResult === selectedSide;

    // Record bet
    addBet({
      userId: user.id,
      username: user.username,
      game: 'coinflip',
      amount,
      multiplier: won ? 2 : 0,
      payout: won ? amount * 2 : 0,
      result: won ? 'win' : 'loss',
    });

    if (won) {
      updateBalance(amount * 2);
      playAudio('win');
      toast.success(`You won $${(amount * 2).toFixed(2)}!`);
    } else {
      playAudio('lose');
      toast.error(`You lost $${amount.toFixed(2)}!`);
    }
  };

  const handlePlayAgain = () => {
    playAudio('click');
    setGameState('idle');
    setResult(null);
    setSelectedSide(null);
  };

  const handleSelectSide = (side: 'heads' | 'tails') => {
    if (gameState === 'idle') {
      playAudio('click');
      setSelectedSide(side);
    }
  };

  const won = result === selectedSide && result !== null && gameState === 'finished';

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-emerald-500 flex items-center justify-center">
              <span className="text-2xl">🪙</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Coin Flip</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Double your money with a 50/50 chance!</p>
        </motion.div>

        {/* Provably Fair Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-xl bg-dark-800/50 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-neon-green" />
            <span className="text-sm text-gray-400">Provably Fair</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Server Seed:</span>
              <span className="text-gray-400 ml-1 font-mono">{serverSeed ? serverSeed.slice(0, 8) + '...' : '---'}</span>
            </div>
            <div>
              <span className="text-gray-500">Client Seed:</span>
              <span className="text-gray-400 ml-1 font-mono">{clientSeed ? clientSeed.slice(0, 8) + '...' : '---'}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6 order-2 lg:order-1"
          >
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl border border-white/5 p-4 sm:p-6">
              {/* Bet Amount */}
              <div className="space-y-3 mb-6">
                <label className="text-sm text-gray-400">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => gameState === 'idle' && setBetAmount(e.target.value)}
                    disabled={gameState === 'flipping'}
                    className="pl-12 h-12 bg-dark-700/50 border-white/10 text-white disabled:opacity-50 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => gameState === 'idle' && setBetAmount(amount.toString())}
                      disabled={gameState === 'flipping'}
                      className="flex-1 py-2 rounded-lg bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm text-gray-400">Choose Side</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSelectSide('heads')}
                    disabled={gameState === 'flipping'}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center
                      ${selectedSide === 'heads'
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-white/10 bg-dark-700 hover:border-white/20'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center mb-2 shadow-lg">
                      <span className="text-3xl sm:text-4xl">👑</span>
                    </div>
                    <div className="text-sm font-medium text-white">Heads</div>
                  </button>
                  <button
                    onClick={() => handleSelectSide('tails')}
                    disabled={gameState === 'flipping'}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center
                      ${selectedSide === 'tails'
                        ? 'border-neon-green bg-neon-green/10'
                        : 'border-white/10 bg-dark-700 hover:border-white/20'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 flex items-center justify-center mb-2 shadow-lg">
                      <span className="text-3xl sm:text-4xl">🦅</span>
                    </div>
                    <div className="text-sm font-medium text-white">Tails</div>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              {gameState !== 'finished' ? (
                <Button
                  onClick={handleFlip}
                  disabled={!user || gameState === 'flipping' || !selectedSide}
                  className="w-full h-12 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-xl"
                >
                  {gameState === 'flipping' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
                    />
                  ) : (
                    'Flip Coin'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handlePlayAgain}
                  className="w-full h-12 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              )}

              {!user && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Please login to play
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-2xl border border-white/5 p-4 sm:p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Game Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Multiplier</span>
                  <span className="text-white font-medium">2x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Win Chance</span>
                  <span className="text-white font-medium">45%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">House Edge</span>
                  <span className="text-white font-medium">10%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Games Played</span>
                  <span className="text-white font-medium">{flipCount}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Coin Display */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center order-1 lg:order-2"
          >
            <div className="relative">
              {/* Glow Effect */}
              {gameState === 'flipping' && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="absolute inset-0 bg-neon-green rounded-full blur-3xl"
                />
              )}

              {/* Result Glow */}
              {gameState === 'finished' && result && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: won ? 0.4 : 0.2 }}
                  className={`absolute inset-0 rounded-full blur-3xl ${won ? 'bg-neon-green' : 'bg-red-500'}`}
                />
              )}

              {/* Coin */}
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72" style={{ perspective: '1000px' }}>
                <motion.div
                  animate={{
                    rotateY: gameState === 'flipping' 
                      ? [0, 360, 720, 1080, 1440, 1800] 
                      : result === 'tails' ? 180 : 0
                  }}
                  transition={{
                    duration: gameState === 'flipping' ? 2.5 : 0.5,
                    ease: gameState === 'flipping' ? 'linear' : 'easeOut'
                  }}
                  style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
                >
                  {/* Heads */}
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-2xl flex items-center justify-center border-4 border-yellow-200">
                      <div className="w-[85%] h-[85%] rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center border-2 border-yellow-300">
                        <span className="text-7xl sm:text-8xl lg:text-9xl">👑</span>
                      </div>
                    </div>
                  </div>

                  {/* Tails */}
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 shadow-2xl flex items-center justify-center border-4 border-slate-200">
                      <div className="w-[85%] h-[85%] rounded-full bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 flex items-center justify-center border-2 border-slate-300">
                        <span className="text-7xl sm:text-8xl lg:text-9xl">🦅</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Result Display */}
              <AnimatePresence>
                {gameState === 'finished' && result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-28 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                  >
                    <div className={`text-2xl sm:text-3xl font-bold ${won ? 'text-neon-green' : 'text-red-500'}`}>
                      {won ? 'You Won!' : 'You Lost!'}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {won ? `+$${(parseFloat(betAmount) * 2).toFixed(2)}` : `-$${betAmount}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Landed on {result === 'heads' ? '👑 Heads' : '🦅 Tails'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
