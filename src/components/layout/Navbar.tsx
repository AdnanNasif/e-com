import { ShoppingBag, Search, User as UserIcon, Menu, LogOut, Sun, Moon, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  showAdminDashboard?: boolean;
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onToggleMenu: () => void;
  onGoHome: () => void;
}

export function Navbar({
  user,
  isAdmin,
  showAdminDashboard,
  cartCount,
  searchQuery,
  setSearchQuery,
  isDarkMode,
  setIsDarkMode,
  onOpenCart,
  onOpenProfile,
  onOpenLogin,
  onOpenAdmin,
  onLogout,
  onToggleMenu,
  onGoHome
}: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!showAdminDashboard && (
            <Button variant="ghost" size="icon" onClick={onToggleMenu}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onGoHome}
          >
            <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
              <ShoppingBag className="w-5 h-5 text-white dark:text-neutral-900" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-xl tracking-tight text-neutral-900 dark:text-white leading-none">
                LIZ
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                Lifestyle
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input 
            className="pl-10 h-11 bg-neutral-50 dark:bg-neutral-800 border-none rounded-full focus-visible:ring-1 focus-visible:ring-neutral-200" 
            placeholder="Find your elegance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant={showAdminDashboard ? "default" : "outline"} 
                  size="sm"
                  onClick={onOpenAdmin}
                  className="hidden md:flex border-neutral-200 dark:border-neutral-700 font-mono text-[10px] h-8 gap-2"
                >
                  <Lock className="w-3 h-3" />
                  {showAdminDashboard ? 'VIEW SHOP' : 'ADMIN'}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onOpenProfile} className="relative group">
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>
              </Button>
              <Button variant="ghost" size="icon" onClick={onLogout} title="Logout">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="font-sans font-medium" onClick={onOpenLogin}>
              Login
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 mx-2 hidden md:block dark:bg-neutral-800" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={onOpenCart}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-2 border-white dark:border-neutral-900"
              >
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}
