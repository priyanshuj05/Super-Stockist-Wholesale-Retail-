import { useApp } from '../context/AppContext.tsx';
import { Building2, Briefcase, Zap, RefreshCw, LogOut, UserCheck } from 'lucide-react';
import { HeaderMetricsBar } from './HeaderMetricsBar.tsx';

export function Header() {
  const { currentUser, logout, salesman } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header id="app-persistent-header" className="w-full bg-white border-b-2 border-black sticky top-0 z-50">
      {/* Top utility sub-bar */}
      <div id="header-system-bar" className="bg-neutral-950 text-white px-3 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono border-b border-black">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-emerald-400"></span>
          <span className="font-bold tracking-wider uppercase text-neutral-100">B2B FMCG DISTRO OS</span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-300 hidden sm:inline">AUTHENTICATED ROLE ISOLATION</span>
        </div>
        <div className="flex items-center gap-3">
          <span id="badge-network-status" className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 border border-neutral-700 text-neutral-200">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>3G ZERO-LATENCY</span>
          </span>
          <span id="badge-sync-status" className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 border border-neutral-700 text-neutral-300">
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>SESSION LOCKED</span>
          </span>
        </div>
      </div>

      {/* Main Bar with brand, authenticated user badge, and persistent Logout button */}
      <div className="px-3 sm:px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50 border-b border-neutral-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-black text-amber-400 flex items-center justify-center font-black text-sm tracking-tighter border-2 border-black">
            {isAdmin ? <Building2 className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight uppercase leading-none text-neutral-900 flex items-center gap-2">
              Distribution & Billing System
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                isAdmin 
                  ? 'bg-amber-100 text-black border-amber-500' 
                  : 'bg-blue-100 text-blue-900 border-blue-500'
              }`}>
                {isAdmin ? 'ADMIN CONSOLE' : 'SALESMAN PORTAL'}
              </span>
            </h1>
            <p className="text-[11px] font-mono text-neutral-600 leading-tight mt-0.5">
              {isAdmin 
                ? 'Super Stockist Depot Management, Pricing Control & Quota Allocation' 
                : `Field Terminal • Authenticated Representative: ${currentUser?.name || salesman.name}`
              }
            </p>
          </div>
        </div>

        {/* Authenticated User Status and Persistent Logout Button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto md:ml-0 font-mono text-xs">
          <div className="bg-white border-2 border-black px-2.5 py-1.5 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase leading-none">Logged in as</span>
              <span className="font-black text-black leading-tight block">
                {currentUser?.name || 'Authorized User'}
                <span className="text-neutral-500 font-normal ml-1">(@{currentUser?.username})</span>
              </span>
            </div>
          </div>

          <button
            id="btn-header-logout"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-black cursor-pointer shadow-sm active:translate-y-0.5 transition-none"
            title="Log out and return to unified login gate"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Quick Header Metrics Bar (Only for Admin, or tailored for Salesman) */}
      <HeaderMetricsBar />
    </header>
  );
}
