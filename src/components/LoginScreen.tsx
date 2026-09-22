import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Key, CheckCircle2 } from 'lucide-react';

export function LoginScreen() {
  const { login, salesmen } = useApp();
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
    // Instant responsive login
    const res = login(username, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Invalid username or password.');
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div id="login-unified-gate" className="min-h-screen bg-neutral-200 flex flex-col justify-center items-center p-4 font-mono">
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
              className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-700" />
                Username / Agent ID
              </span>
              <span className="text-[10px] text-neutral-500 font-normal">e.g. admin or rahul</span>
            </label>
            <input
              id="login-input-username"
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (admin, rahul, vikas...)"
              className="w-full border-2 border-black p-2.5 text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label 
              htmlFor="login-input-password" 
              className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-700" />
                Password
              </span>
              <span className="text-[10px] text-neutral-500 font-normal">admin123 or 123</span>
            </label>
            <input
              id="login-input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
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

        {/* Quick Demo Credentials Assistant */}
        <div className="border-t-2 border-black pt-4 bg-neutral-50 p-3 -mx-2 border border-neutral-300">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase text-neutral-900 mb-2">
            <Key className="w-3.5 h-3.5 text-neutral-700" />
            Quick Demo Login Accounts:
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Admin Fill */}
            <div className="flex items-center justify-between bg-white border border-neutral-300 p-1.5">
              <div>
                <span className="font-bold text-black uppercase">Admin (Super Stockist):</span>
                <span className="text-neutral-600 block text-[11px]">admin / admin123</span>
              </div>
              <button
                type="button"
                id="btn-fill-admin-creds"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="px-2 py-1 bg-neutral-900 text-white text-[10px] font-bold uppercase hover:bg-black cursor-pointer"
              >
                Autofill
              </button>
            </div>

            {/* Salesman 1: Rahul */}
            <div className="flex items-center justify-between bg-white border border-neutral-300 p-1.5">
              <div>
                <span className="font-bold text-blue-900 uppercase">Salesman 1 (Rahul):</span>
                <span className="text-neutral-600 block text-[11px]">rahul / 123</span>
              </div>
              <button
                type="button"
                id="btn-fill-salesman-rahul"
                onClick={() => handleQuickFill('rahul', '123')}
                className="px-2 py-1 bg-blue-700 text-white text-[10px] font-bold uppercase hover:bg-blue-800 cursor-pointer"
              >
                Autofill
              </button>
            </div>

            {/* Salesman 2: Vikas */}
            <div className="flex items-center justify-between bg-white border border-neutral-300 p-1.5">
              <div>
                <span className="font-bold text-emerald-900 uppercase">Salesman 2 (Vikas):</span>
                <span className="text-neutral-600 block text-[11px]">vikas / 123</span>
              </div>
              <button
                type="button"
                id="btn-fill-salesman-vikas"
                onClick={() => handleQuickFill('vikas', '123')}
                className="px-2 py-1 bg-emerald-700 text-white text-[10px] font-bold uppercase hover:bg-emerald-800 cursor-pointer"
              >
                Autofill
              </button>
            </div>

            {/* Dynamically added salesmen if any */}
            {salesmen.filter((s) => s.username !== 'rahul' && s.username !== 'vikas').map((extra) => (
              <div key={extra.id} className="flex items-center justify-between bg-white border border-neutral-300 p-1.5">
                <div>
                  <span className="font-bold text-purple-900 uppercase">{extra.name}:</span>
                  <span className="text-neutral-600 block text-[11px]">{extra.username} / {extra.password || '123'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickFill(extra.username, extra.password || '123')}
                  className="px-2 py-1 bg-purple-700 text-white text-[10px] font-bold uppercase hover:bg-purple-800 cursor-pointer"
                >
                  Autofill
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 text-[10px] text-neutral-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Strict Role Isolation: Salesmen cannot access Admin tabs or other agents' data.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
