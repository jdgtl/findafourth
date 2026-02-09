import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileImageUrl } from '@/lib/utils';
import { Home, Users, Star, User, Building2, LogOut } from 'lucide-react';

const AppLayout = ({ children }) => {
  const { player, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/clubs', icon: Building2, label: 'Clubs' },
    { path: '/crews', icon: Users, label: 'Crews' },
    { path: '/favorites', icon: Star, label: 'Favorites' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/home" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/20">
                <span className="text-white font-black text-xs">4</span>
              </div>
              <span className="text-lg font-serif text-white tracking-tight">Find4th</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-2 text-white hover:bg-white/10 ${
                      location.pathname === path ? 'bg-white/15' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={getProfileImageUrl(player?.profile_image_url)} />
                    <AvatarFallback className="bg-white/20 text-white text-sm">
                      {getInitials(player?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">
                    {player?.name || 'Player'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(10,15,26,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(52,211,153,0.1)' }}>
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                location.pathname === path
                  ? 'text-emerald-400'
                  : 'text-warm-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
