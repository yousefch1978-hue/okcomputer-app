import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore, initializeAuth } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import Index from '@/pages/Index';

function App() {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      await initializeAuth();

      const { data } = await supabase.auth.getUser();

      if (mounted) {
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
      }
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Index />
      <Toaster />
    </>
  );
}

export default App;
