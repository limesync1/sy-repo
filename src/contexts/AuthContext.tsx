import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AUTH_EMAIL_COOLDOWN_SECONDS, getSignupStatus, normalizeAuthEmail, type SignupStatus } from "@/lib/auth-flow";
import { translateAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, redirectPath?: string) => Promise<{ error: Error | null; status?: SignupStatus }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmation: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  emailCooldown: number;
  isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = window.setTimeout(() => setEmailCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [emailCooldown]);

  useEffect(() => {
    let initialResolved = false;
    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
      // Any newer event supersedes the initial fetch, including sign-out.
      initialResolved = true;
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (initialResolved) return;
      initialResolved = true;
      applySession(currentSession);
    }).catch(() => {
      if (!initialResolved) applySession(null);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, redirectPath = "/log-ind") => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeAuthEmail(email), password,
        options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
      });
      if (error) return { error };
      setEmailCooldown(AUTH_EMAIL_COOLDOWN_SECONDS);
      return { error: null, status: getSignupStatus(data) };
    } catch (error) { return { error: error instanceof Error ? error : new Error("network_error") }; }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizeAuthEmail(email), password });
      return { error };
    } catch (error) { return { error: error instanceof Error ? error : new Error("network_error") }; }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error(translateAuthError(error, "Du blev ikke logget ud. Prøv igen."));
      else if (isNativeApp()) {
        // In the app, logging out returns to the owner/employee choice.
        saveNativeRole(null);
        window.location.replace("/app");
      }
    } catch (error) { toast.error(translateAuthError(error, "Du blev ikke logget ud. Prøv igen.")); }
  };

  /**
   * Sender en mail med link til /reset-password så brugeren kan vælge ny adgangskode.
   * Linket åbner siden med et recovery-token i URL'en — siden tager sig af resten.
   */
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeAuthEmail(email), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (!error) setEmailCooldown(AUTH_EMAIL_COOLDOWN_SECONDS);
      return { error };
    } catch (error) { return { error: error instanceof Error ? error : new Error("network_error") }; }
  };

  const resendConfirmation = async (email: string, redirectPath = "/log-ind") => {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: normalizeAuthEmail(email),
        options: { emailRedirectTo: `${window.location.origin}${redirectPath}` } });
      if (!error) setEmailCooldown(AUTH_EMAIL_COOLDOWN_SECONDS);
      return { error };
    } catch (error) { return { error: error instanceof Error ? error : new Error("network_error") }; }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, resendConfirmation, emailCooldown, isPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
};
