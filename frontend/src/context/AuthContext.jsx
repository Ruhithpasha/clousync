import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error) setProfile(data);
    } catch (err) {
      console.error('Profile Fetch Error:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const lastFetchedUserId = { current: null };

    const handleSession = async (session) => {
      if (!isMounted) return;
      
      const currentUser = session?.user ?? null;
      
      // Prevent redundant processing if user hasn't changed
      if (currentUser?.id === lastFetchedUserId.current && profile) {
        return;
      }
      
      setUser(currentUser);

      if (currentUser) {
        // Prevent concurrent fetches for the same user
        if (lastFetchedUserId.current === currentUser.id) return;
        lastFetchedUserId.current = currentUser.id;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (!error && isMounted) {
            setProfile(data);
          }
        } catch (err) {
          console.error('Profile Fetch Error:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        lastFetchedUserId.current = null;
        setProfile(null);
        if (isMounted) setLoading(false);
      }
    };

    // Listen for auth state changes (this fires immediately on subscribe)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: () => user && fetchProfile(user.id) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
