import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200',
                isActive 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 active:scale-95'
              )}
              aria-label={label}
            >
              <Icon 
                size={22} 
                className={cn(
                  'transition-transform duration-200',
                  isActive && 'scale-110'
                )} 
              />
              <span className="text-xs font-medium mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}