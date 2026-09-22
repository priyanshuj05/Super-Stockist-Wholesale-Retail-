/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { AdminView } from './pages/AdminView.tsx';
import { SalesmanView } from './pages/SalesmanView.tsx';

function MainRouter() {
  const { currentUser, isMobilePreview, setIsMobilePreview } = useApp();

  // 1. Unified Login Gate (Default Screen on Refresh/Open if not authenticated)
  if (!currentUser) {
    return <LoginScreen />;
  }

  // 2. Strict Role Isolation:
  // Admin gets the Admin / Super Stockist dashboard
  // Salesman gets locked exclusively to their personal SalesmanView
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <main id="main-content-viewport" className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      <Header />

      <div className={`flex-1 ${isMobilePreview ? 'bg-neutral-800 p-2 sm:p-6 flex flex-col items-center justify-start min-h-[calc(100vh-140px)]' : ''}`}>
        {isMobilePreview ? (
          <div className="w-full flex flex-col items-center">
            {/* Mobile frame header bar */}
            <div className="w-[412px] max-w-full bg-black text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-mono border-t-4 border-x-4 border-black">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold">412px SMARTPHONE VIEWPORT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">9:41 AM • 100%</span>
                <button
                  id="btn-exit-mobile-frame"
                  onClick={() => setIsMobilePreview(false)}
                  className="px-1.5 py-0.2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-neutral-600 cursor-pointer"
                  title="Close mobile preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Constrained 412px screen */}
            <div 
              id="mobile-preview-device-screen"
              className="w-[412px] max-w-full bg-white border-4 border-black shadow-2xl overflow-y-auto max-h-[850px]"
              style={{ minHeight: '680px' }}
            >
              {isAdmin ? <AdminView /> : <SalesmanView />}
            </div>

            <div className="w-[412px] max-w-full bg-black text-neutral-400 px-3 py-1 text-[10px] font-mono text-center border-b-4 border-x-4 border-black">
              Simulating field salesman device (OnePlus / Redmi 412×915 viewport)
            </div>
          </div>
        ) : (
          <>
            {isAdmin ? <AdminView /> : <SalesmanView />}
          </>
        )}
      </div>

      {/* System diagnostics & rapid testing footer */}
      <footer id="app-footer" className="mt-auto border-t-2 border-black bg-white px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-neutral-600">
          <div>
            <span className="font-bold text-black uppercase">ARCHITECTURE:</span> Authenticated Role Isolation • Sharp-Edge High Contrast
          </div>
          <div className="flex items-center gap-3">
            <span>Role: <strong className="text-black">{currentUser.role}</strong></span>
            <span>•</span>
            <span>Agent: <strong className="text-black">{currentUser.name}</strong></span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}

