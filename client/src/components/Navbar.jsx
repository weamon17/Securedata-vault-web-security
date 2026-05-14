// client/src/components/Navbar.jsx
// Header điều hướng dark + icon + trạng thái user.

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, FlaskConical, Lock, LayoutDashboard, ScrollText, LogOut, LogIn, UserPlus, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';

const linkClass = ({ isActive }) =>
  'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ' +
  (isActive
    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent');

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-600/30 transition-colors">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">
            Secure<span className="text-indigo-400">Data</span>
          </span>
        </Link>

        {/* "local lab" badge */}
        <span className="hidden sm:inline-flex items-center text-[10px] uppercase tracking-widest font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
          local lab
        </span>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-2">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/lab" className={linkClass}>
            <FlaskConical className="w-3.5 h-3.5" />
            Lab
          </NavLink>
          {user && (
            <NavLink to="/vault" className={linkClass}>
              <Lock className="w-3.5 h-3.5" />
              Vault
            </NavLink>
          )}
          {user && user.role === 'admin' && (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </NavLink>
              <NavLink to="/audit" className={linkClass}>
                <ScrollText className="w-3.5 h-3.5" />
                Audit
              </NavLink>
            </>
          )}
        </nav>

        {/* User info / auth actions */}
        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-indigo-300 uppercase">
                    {user.username?.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-slate-300">{user.username}</span>
                {user.role === 'admin' && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full">
                    admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 px-3 py-1.5 rounded-lg transition-all duration-150"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent px-3 py-1.5 rounded-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg border border-indigo-600 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
