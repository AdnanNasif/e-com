import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (pass: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  loginError: string;
  isAuthLoading: boolean;
  onAuthSubmit: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  loginError,
  isAuthLoading,
  onAuthSubmit,
  onGoogleLogin
}: LoginModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white dark:bg-neutral-900 shadow-2xl"
          >
            <div className="absolute right-6 top-6 z-10">
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 md:p-12">
              <div className="mb-10 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="h-16 w-16 items-center justify-center rounded-2xl bg-black p-3 shadow-xl">
                    <img src="/logo_gold.png" alt="Liz Lifestyle" className="h-full w-full object-contain" />
                  </div>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic">
                  {authMode === 'login' ? 'Welcome Back' : 'Join the Elite'}
                </h2>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                  {authMode === 'login' ? 'Sign in to your account' : 'Register for an exclusive experience'}
                </p>
              </div>

              <form onSubmit={onAuthSubmit} className="space-y-6">
                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Full Name</label>
                    <div className="relative">
                      <Input
                        placeholder="Your Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-4 pr-4"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-neutral-400" />
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-12 pr-4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-4 w-4 text-neutral-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none pl-12 pr-4"
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs font-bold text-red-500 text-center animate-pulse">
                    {loginError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                  {isAuthLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    authMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-100 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-neutral-900 px-4 text-neutral-400 font-bold tracking-tighter">Or continue with</span>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  onClick={onGoogleLogin}
                  variant="outline"
                  className="w-full border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
                  Google Account
                </Button>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  }}
                  className="text-xs font-bold text-neutral-400 hover:text-emerald-600 transition-colors"
                >
                  {authMode === 'login'
                    ? 'No account? Join the lifestyle here'
                    : 'Already a member? Sign in here'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
