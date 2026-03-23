import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Users, History, Volume2, VolumeX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'start' | 'cashout' | 'crash' | 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'start') {
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
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
    } else if (type === 'crash') {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.6);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } else if (type === 'click') {
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  } catch (e) {}
};

interface LiveBet {
  id: string;
  username: string;
  amount: number;
  cashedOut?: number;
}

// Game counter for ensuring wins every 3-4 games
let crashGameCounter = 0;

// Generate crash point with admin rigging support
const generateCrashPoint = (adminMultiplier?: number | null): number => {
  if (adminMultiplier && adminMultiplier >= 1.01) {
    return adminMultiplier;
  }
  
  crashGameCounter++;
  
  // Every 3-4 games, guarantee a 2x-3x hit
  if (crashGameCounter % 4 === 0 || crashGameCounter % 3 === 0) {
    return 2.0 + Math.random() * 1.5; // 2.0x to 3.5x
  }
  
  // Other games: make people lose more
  const rand = Math.random();
  if (rand < 0.45) return 1.00 + Math.random() * 0.15; // 45% instant crash 1.00-1.15x
  if (rand < 0.70) return 1.15 + Math.random() * 0.35; // 25% crash 1.15-1.50x
  if (rand < 0.85) return 1.50 + Math.random() * 0.50; // 15% crash 1.50-2.00x
  if (rand < 0.95) return 2.0 + Math.random() * 1.0;   // 10% crash 2.00-3.00x
  return 3.0 + Math.random() * 15;                     // 5% moonshot 3.00-18.00x
};

export default function CrashGame() {
  const { user, updateBalance } = useAuthStore();
  const { crashState, addCrashHistory, addBet } = useGameStore();
  
  const [betAmount, setBetAmount] = useState('10');
  const [multiplier, setMultiplier] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'crashed'>('waiting');
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [graphPath, setGraphPath] = useState('M 0 200 ');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const graphDataRef = useRef<{ x: number; y: number }[]>([{ x: 0, y: 200 }]);
  const gameStateRef = useRef({ isProcessing: false });

  const playAudio = useCallback((type: 'start' | 'cashout' | 'crash' | 'click') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  // Generate fake live bets
  useEffect(() => {
    const usernames = ['CryptoKing', 'MoonShot', 'Lucky7', 'Diamond', 'Rocket', 'Star', 'Winner', 'ProGamer', 'Ace', 'KingPin'];
    
    const generateFakeBet = () => {
      const newBet: LiveBet = {
        id: Math.random().toString(36).substr(2, 9),
        username: usernames[Math.floor(Math.random() * usernames.length)],
        amount: Math.floor(Math.random() * 800) + 20,
      };
      setLiveBets(prev => [newBet, ...prev.slice(0, 14)]);
    };

    for (let i = 0; i < 5; i++) generateFakeBet();
    const interval = setInterval(() => { if (Math.random() > 0.3) generateFakeBet(); }, 6000);
    return () => clearInterval(interval);
  }, []);

  const startGame = () => {
    if (gameStateRef.current.isProcessing) return;
    
    const amount = parseFloat(betAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }

    if (!user) {
      toast.error('Please login to play');
      return;
    }

    if (amount > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    gameStateRef.current.isProcessing = true;
    updateBalance(-amount);
    
    // Generate seeds
    const newServerSeed = Math.random().toString(36).substring(2, 15);
    const newClientSeed = Math.random().toString(36).substring(2, 15);
    setServerSeed(newServerSeed);
    setClientSeed(newClientSeed);
    
    // Check for admin rigging
    const adminRigging = (window as any).adminRigging;
    const adminMultiplier = adminRigging?.enabled ? adminRigging.crashMultiplier : null;
    
    const newCrashPoint = generateCrashPoint(adminMultiplier);
    setCrashPoint(newCrashPoint);
    
    addBet({
      userId: user.id,
      username: user.username,
      game: 'crash',
      amount,
      multiplier: 1,
      payout: 0,
      result: 'pending',
    });

    setMultiplier(1);
    setIsPlaying(true);
    setHasCashedOut(false);
    setGameStatus('playing');
    graphDataRef.current = [{ x: 0, y: 200 }];
    setGraphPath('M 0 200 ');
    startTimeRef.current = Date.now();

    playAudio('start');
    animate();
  };

  const animate = useCallback(() => {
    if (!startTimeRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const newMultiplier = Math.pow(Math.E, 0.06 * elapsed);
    
    setMultiplier(newMultiplier);

    const x = Math.min(elapsed * 30, 400);
    const y = 200 - (newMultiplier - 1) * 50;
    graphDataRef.current.push({ x, y });
    
    const path = graphDataRef.current.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');
    setGraphPath(path);

    if (newMultiplier >= crashPoint) {
      setGameStatus('crashed');
      setIsPlaying(false);
      addCrashHistory(newMultiplier);
      playAudio('crash');
      toast.error(`Crashed at ${newMultiplier.toFixed(2)}x!`);
      gameStateRef.current.isProcessing = false;
      return;
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [crashPoint, addCrashHistory]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const handleCashout = () => {
    if (!isPlaying || hasCashedOut) return;

    const payout = parseFloat(betAmount) * multiplier;
    updateBalance(payout);
    
    setHasCashedOut(true);
    setIsPlaying(false);
    setGameStatus('waiting');
    addCrashHistory(multiplier);
    
    if (user) {
      setLiveBets(prev => prev.map(bet => 
        bet.username === user.username ? { ...bet, cashedOut: multiplier } : bet
      ));
    }
    
    playAudio('cashout');
    toast.success(`Cashed out at ${multiplier.toFixed(2)}x! Won $${payout.toFixed(2)}`);
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    gameStateRef.current.isProcessing = false;
  };

  const handleReset = () => {
    playAudio('click');
    setGameStatus('waiting');
    setMultiplier(1);
    setHasCashedOut(false);
    setGraphPath('M 0 200 ');
    graphDataRef.current = [{ x: 0, y: 200 }];
    gameStateRef.current.isProcessing = false;
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-fuchsia-500 flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Crash</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-400 text-sm">Cash out before the rocket crashes!</p>
        </motion.div>

        {/* Provably Fair Info */}
        {isPlaying && (
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
                <span className="text-gray-400 ml-1 font-mono">{serverSeed.slice(0, 8)}...</span>
              </div>
              <div>
                <span className="text-gray-500">Client Seed:</span>
                <span className="text-gray-400 ml-1 font-mono">{clientSeed.slice(0, 8)}...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 order-2 lg:order-1"
          >
            <div className="bg-dark-800/90 rounded-2xl border border-white/5 p-4 sm:p-6">
              {/* Bet Amount */}
              <div className="space-y-3 mb-6">
                <label className="text-sm text-gray-400">Bet Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlaying}
                    className="pl-12 h-12 bg-dark-700/50 border-white/10 text-white disabled:opacity-50 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => !isPlaying && setBetAmount(amt.toString())}
                      disabled={isPlaying}
                      className="flex-1 py-2 rounded-lg bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiplier Display */}
              <div className="mb-6 p-4 rounded-xl bg-dark-700/50 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">Multiplier</p>
                <p className={`text-3xl sm:text-4xl font-bold ${gameStatus === 'crashed' ? 'text-red-500' : 'text-neon-green'}`}>
                  {multiplier.toFixed(2)}x
                </p>
                {hasCashedOut && (
                  <p className="text-sm text-neon-green mt-1">
                    Won ${(parseFloat(betAmount) * multiplier).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Buttons */}
              {!isPlaying && gameStatus !== 'crashed' ? (
                <Button
                  onClick={startGame}
                  disabled={!user || parseFloat(betAmount) <= 0}
                  className="w-full h-12 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-xl"
                >
                  Place Bet
                </Button>
              ) : isPlaying ? (
                <Button
                  onClick={handleCashout}
                  className="w-full h-12 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-xl animate-pulse-glow"
                >
                  Cashout ({multiplier.toFixed(2)}x)
                </Button>
              ) : (
                <Button onClick={handleReset} className="w-full h-12 bg-dark-700 text-white hover:bg-dark-600 font-semibold rounded-xl">
                  Play Again
                </Button>
              )}

              {!user && (
                <p className="mt-4 text-center text-sm text-gray-500">Please login to play</p>
              )}

              {/* Balance */}
              {user && (
                <div className="mt-4 p-3 rounded-xl bg-dark-700/30 border border-white/5">
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className="text-lg font-bold text-white">${user.balance.toFixed(2)}</p>
                </div>
              )}

              {/* History */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">History</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {crashState.history.slice(0, 10).map((m, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${
                      m >= 2 ? 'bg-neon-green/20 text-neon-green' : 
                      m >= 1.5 ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {m.toFixed(2)}x
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Display */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 order-1 lg:order-2"
          >
            <div className="bg-dark-800/90 rounded-2xl border border-white/5 overflow-hidden">
              {/* Graph */}
              <div className="relative h-56 sm:h-72 lg:h-80 bg-dark-900">
                <div className="absolute inset-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="absolute w-full border-t border-white/5" style={{ top: `${100 - i * 20}%` }}>
                      <span className="absolute right-2 text-xs text-gray-600">{i}x</span>
                    </div>
                  ))}
                </div>

                <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00ff87" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00ff87" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${graphPath} L ${graphDataRef.current[graphDataRef.current.length - 1]?.x || 0} 200 L 0 200 Z`} fill="url(#graphGradient)" />
                  <motion.path
                    d={graphPath}
                    fill="none"
                    stroke={gameStatus === 'crashed' ? '#ef4444' : '#00ff87'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 10px ${gameStatus === 'crashed' ? '#ef4444' : '#00ff87'})` }}
                  />
                </svg>

                <div className="absolute top-4 left-4">
                  <motion.div
                    key={multiplier}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`text-4xl sm:text-5xl font-bold ${gameStatus === 'crashed' ? 'text-red-500' : 'text-neon-green'}`}
                    style={{ textShadow: `0 0 30px ${gameStatus === 'crashed' ? '#ef4444' : '#00ff87'}` }}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.div>
                </div>

                <div className="absolute top-4 right-4">
                  <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    gameStatus === 'playing' ? 'bg-neon-green/20 text-neon-green' : 
                    gameStatus === 'crashed' ? 'bg-red-500/20 text-red-500' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {gameStatus === 'playing' ? 'Running' : gameStatus === 'crashed' ? 'Crashed' : 'Waiting'}
                  </div>
                </div>

                <AnimatePresence>
                  {gameStatus === 'crashed' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                      <div className="text-4xl sm:text-6xl font-bold text-red-500" style={{ textShadow: '0 0 40px #ef4444' }}>
                        CRASHED
                      </div>
                      <div className="mt-2 text-lg text-red-400">
                        at {multiplier.toFixed(2)}x
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Live Bets */}
              <div className="p-3 sm:p-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Live Bets (updates every 5-7s)</span>
                </div>
                <div className="space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                  {liveBets.map((bet) => (
                    <motion.div
                      key={bet.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-dark-700/50"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-xs font-bold text-white">
                          {bet.username[0]}
                        </div>
                        <span className="text-sm text-white">{bet.username}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-sm text-gray-400">${bet.amount}</span>
                        {bet.cashedOut && (
                          <span className="text-sm text-neon-green font-medium">{bet.cashedOut.toFixed(2)}x</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
