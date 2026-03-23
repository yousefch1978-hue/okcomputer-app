import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';
import AdminPage from '@/pages/AdminPage';
import MinesGame from '@/components/games/MinesGame';
import CoinFlipGame from '@/components/games/CoinFlipGame';
import CrashGame from '@/components/games/CrashGame';
import DiceGame from '@/components/games/DiceGame';
import BlackjackGame from '@/components/games/BlackjackGame';
import DragonTowerGame from '@/components/games/DragonTowerGame';
import RankingsPage from '@/pages/RankingsPage';
import { useAuthStore, initializeAuth } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { loadTransactions, useTransactionStore } from '@/store/transactionStore';
import { useWithdrawalStore } from '@/store/withdrawalStore';
import { usePromoCodeStore } from '@/store/promoCodeStore';

const validPages = new Set(['home','auth','admin','mines','coinflip','crash','dice','blackjack','dragontower','rankings']);
const getHashPage = () => {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home';
  return validPages.has(raw) ? raw : 'home';
};

function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return <motion.div key={pageKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>{children}</motion.div>;
}

function App() {
  const [currentPage, setCurrentPage] = useState(getHashPage());
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    (async () => {
      await initializeAuth();
      await Promise.allSettled([
        loadTransactions(),
        useWithdrawalStore.getState().loadWithdrawals(),
        usePromoCodeStore.getState().loadPromoCodes(),
      ]);
      setIsInitialized(true);
    })();
    const onHash = () => setCurrentPage(getHashPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      useAuthStore.getState().refreshUser();
      useTransactionStore.getState().loadTransactions();
      useWithdrawalStore.getState().loadWithdrawals();
      usePromoCodeStore.getState().loadPromoCodes();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handlePageChange = (page: string) => {
    window.location.hash = `#/${page}`;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'auth': return <PageTransition pageKey="auth"><AuthPage onPageChange={handlePageChange} /></PageTransition>;
      case 'admin': return (user?.role === 'admin') ? <PageTransition pageKey="admin"><AdminPage onPageChange={handlePageChange} /></PageTransition> : <PageTransition pageKey="home"><HomePage onPageChange={handlePageChange} /></PageTransition>;
      case 'mines': return <PageTransition pageKey="mines"><MinesGame /></PageTransition>;
      case 'coinflip': return <PageTransition pageKey="coinflip"><CoinFlipGame /></PageTransition>;
      case 'crash': return <PageTransition pageKey="crash"><CrashGame /></PageTransition>;
      case 'dice': return <PageTransition pageKey="dice"><DiceGame /></PageTransition>;
      case 'blackjack': return <PageTransition pageKey="blackjack"><BlackjackGame /></PageTransition>;
      case 'dragontower': return <PageTransition pageKey="dragontower"><DragonTowerGame /></PageTransition>;
      case 'rankings': return <PageTransition pageKey="rankings"><RankingsPage /></PageTransition>;
      default: return <PageTransition pageKey="home"><HomePage onPageChange={handlePageChange} /></PageTransition>;
    }
  };

  if (!isInitialized) return <div className="min-h-screen bg-dark-900 flex items-center justify-center"><div className="w-10 h-10 border-2 border-neon-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen w-full bg-dark-900 text-white relative overflow-x-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 z-0" />
      <div className="relative z-10 min-h-screen w-full">
        <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
        <main className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">
          <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
    </div>
  );
}

export default App;
