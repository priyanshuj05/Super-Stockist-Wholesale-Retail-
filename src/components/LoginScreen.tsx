import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { OfflineSyncBadge } from './OfflineSyncBadge.tsx';

export function LoginScreen() {
  const { login, setCurrentRoute } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Please enter your Username or ID.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    const res = login(username, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Invalid username or password.');
    }
  };

  return (
    <div id="login-unified-gate" className="min-h-screen bg-neutral-200 flex flex-col justify-center items-center p-4 font-mono">
      {/* Top Status & Install Helper Bar */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between gap-2">
        <OfflineSyncBadge />
        <PWAInstallButton variant="header" />
      </div>

      {/* Container Card with strict border-block styling */}
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
        
        {/* Header Block */}
        <div className="border-b-2 border-black pb-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black text-amber-400 mb-3 border-2 border-black">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-950">
            FMCG Distro OS
          </h1>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 mt-1">
            Authenticated Access Gate
          </p>
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div 
            id="login-error-alert"
            className="p-3 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="login-input-username" 
              className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-neutral-700" />
              <span>Username / Agent ID</span>
            </label>
            <input
              id="login-input-username"
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full border-2 border-black p-2.5 text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label 
              htmlFor="login-input-password" 
              className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-neutral-700" />
              <span>Password</span>
            </label>
            <input
              id="login-input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border-2 border-black p-2.5 text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-black hover:bg-neutral-800 text-white font-black text-sm uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 cursor-pointer transition-none active:translate-y-0.5"
          >
            <span>Authorize & Unlock</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </form>

        {/* Guest Retail Storefront Entry Point */}
        <div className="pt-3 border-t-2 border-black space-y-2">
          <div className="text-[11px] font-mono text-neutral-600 font-bold uppercase text-center">
            — Or Browse as Consumer / Guest —
          </div>
          <button
            type="button"
            id="btn-guest-retail-storefront"
            onClick={() => setCurrentRoute('/store')}
            className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-300" />
            <span>Open Consumer Store (Guest Mode)</span>
          </button>
          <p className="text-[10px] text-center text-neutral-500 font-sans">
            Browse grocery staples with genuine retail pricing, slide-over cart & phone OTP checkout.
          </p>
        </div>

      </div>
    </div>
  );
}
