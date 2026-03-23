import { useEffect, useState } from 'react';
import { useAuthStore, initializeAuth } from './store/authStore';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';

function App() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      await initializeAuth();

      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      if (data.user) {
        const email = data.user.email || '';
        const username =
          data.user.user_metadata?.username ||
          email.split('@')[0] ||
          'Player';

        setUser({
          id: data.user.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(data.user.user_metadata?.balance ?? 0),
          createdAt: data.user.created_at || new Date().toISOString(),
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const email = session.user.email || '';
        const username =
          session.user.user_metadata?.username ||
          email.split('@')[0] ||
          'Player';

        setUser({
          id: session.user.id,
          email,
          username,
          role: email.toLowerCase() === 'yousefch1978@gmail.com' ? 'admin' : 'user',
          balance: Number(session.user.user_metadata?.balance ?? 0),
          createdAt: session.user.created_at || new Date().toISOString(),
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  if (user?.role === 'admin') {
    return <Admin />;
  }

  return <Dashboard />;
}

export default App;
