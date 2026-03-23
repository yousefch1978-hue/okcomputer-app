import { useEffect, useState } from 'react';
import { useAuthStore, initializeAuth } from './store/authStore';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';

function App() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

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

        setUser({
          id: sessionUser.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(sessionUser.user_metadata?.balance ?? 0),
          createdAt: sessionUser.created_at || new Date().toISOString(),
        });
      } else {
        setUser(null);
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

        setUser({
          id: sessionUser.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(sessionUser.user_metadata?.balance ?? 0),
          createdAt: sessionUser.created_at || new Date().toISOString(),
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser]);

  const handlePageChange = (_page: string) => {};

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

  if (!isAuthenticated) {
    return <AuthPage onPageChange={handlePageChange} />;
  }

  if (user?.role === 'admin') {
    return <AdminPage onPageChange={handlePageChange} />;
  }

  return <HomePage onPageChange={handlePageChange} />;
}

export default App;
