import { useEffect, useState } from 'react';
import { useAuthStore, initializeAuth } from './store/authStore';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import RankingsPage from './pages/RankingsPage';

type Page = 'auth' | 'home' | 'admin' | 'rankings';

function App() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('auth');

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      await initializeAuth();

      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (!mounted) return;

      if (sessionUser) {
        const email = sessionUser.email || '';
        const username =
          sessionUser.user_metadata?.username ||
          email.split('@')[0] ||
          'Player';

        const appUser = {
          id: sessionUser.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(sessionUser.user_metadata?.balance ?? 0),
          createdAt: sessionUser.created_at || new Date().toISOString(),
        };

        setUser(appUser);
        setCurrentPage(appUser.role === 'admin' ? 'admin' : 'home');
      } else {
        setUser(null);
        setCurrentPage('auth');
      }

      setLoading(false);
    };

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const sessionUser = session?.user;

      if (sessionUser) {
        const email = sessionUser.email || '';
        const username =
          sessionUser.user_metadata?.username ||
          email.split('@')[0] ||
          'Player';

        const appUser = {
          id: sessionUser.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(sessionUser.user_metadata?.balance ?? 0),
          createdAt: sessionUser.created_at || new Date().toISOString(),
        };

        setUser(appUser);
        setCurrentPage(appUser.role === 'admin' ? 'admin' : 'home');
      } else {
        setUser(null);
        setCurrentPage('auth');
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser]);

  const handlePageChange = (page: string) => {
    if (page === 'auth' || page === 'home' || page === 'admin' || page === 'rankings') {
      setCurrentPage(page);
      return;
    }

    if (!isAuthenticated) {
      setCurrentPage('auth');
      return;
    }

    setCurrentPage(user?.role === 'admin' ? 'admin' : 'home');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || currentPage === 'auth') {
    return <AuthPage onPageChange={handlePageChange} />;
  }

  if (currentPage === 'rankings') {
    return <RankingsPage onPageChange={handlePageChange} />;
  }

  if (user?.role === 'admin' || currentPage === 'admin') {
    return <AdminPage onPageChange={handlePageChange} />;
  }

  return <HomePage onPageChange={handlePageChange} />;
}

export default App;
