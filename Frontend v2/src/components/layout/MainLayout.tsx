import { Outlet, NavLink, Link } from 'react-router-dom';
import { PlayerBar } from '../music/PlayerBar';
import { SearchBar } from '../music/SearchBar';
import { Home, Search, Library, LogOut } from 'lucide-react';
import { BackendStatus } from './BackendStatus';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/library', label: 'Library', icon: Library },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 flex-shrink-0 glass-panel border-l-0 border-y-0 hidden md:flex flex-col z-10">
        <div className="p-6 flex items-center gap-3">
          <img src="/logo.png" alt="MUSIFY Logo" className="w-8 h-8 rounded-lg object-cover shadow-md border border-white/5" />
          <h1 className="text-2xl font-heading font-bold text-gradient tracking-wider">MUSIFY</h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink 
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all border-l-3 duration-300 ${
                  isActive 
                    ? 'bg-primary/10 border-primary text-primary shadow-[inset_0_0_12px_rgba(197,155,155,0.08)] shadow-lg shadow-black/10' 
                    : 'border-transparent text-text-secondary hover:bg-white/5 hover:text-foreground hover:translate-x-1'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="px-4 py-2 border-t border-white/5">
          <button
            onClick={() => {
              logout();
              toast.success('Logged out successfully');
            }}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold border-l-3 border-transparent text-text-secondary hover:bg-red-500/10 hover:text-red-400 hover:translate-x-1 transition-all duration-300 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        <BackendStatus />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 glass-panel border-x-0 border-t-0 flex items-center justify-between px-6 z-10 gap-4">
          <SearchBar />
          <div className="flex items-center gap-4 shrink-0">
            <Link 
              to="/profile" 
              className="relative w-8 h-8 rounded-full overflow-hidden border border-border hover:border-primary transition-all duration-300 block bg-surface/50 cursor-pointer"
              title="View Profile"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary bg-primary/10">
                  {user?.displayName ? user.displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'M'}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-[81px] left-0 right-0 z-[99] glass-panel border-x-0 border-b-0 flex items-center justify-around h-14 px-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Persistent Bottom Player */}
      <PlayerBar />
    </div>
  );
}
