import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Profile, AppRole } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error.message);
      return null;
    }
    return data as Profile | null;
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).then((p) => {
          if (mounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          const p = await loadProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      const p = await loadProfile(data.user.id);
      setProfile(p);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const p = await loadProfile(session.user.id);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function canManageUsers(role: AppRole | undefined): boolean {
  return role === 'super_admin';
}

export function canManageStudents(role: AppRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'directeur' || role === 'secretaire' || role === 'censeur';
}

export function canManageGrades(role: AppRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'directeur' || role === 'directeur_etudes' || role === 'censeur' || role === 'enseignant';
}

export function canManagePayments(role: AppRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'comptable';
}

export function canManageAttendance(role: AppRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'directeur' || role === 'directeur_etudes' || role === 'surveillant_general' || role === 'surveillant_general_adjoint' || role === 'censeur' || role === 'enseignant';
}

export function canViewReports(role: AppRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'directeur' || role === 'directeur_etudes' || role === 'comptable' || role === 'surveillant_general';
}
