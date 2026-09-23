import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  // If already running as an installed PWA, hide or show subtle indicator
  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setInstalledNotice(true);
      setTimeout(() => setInstalledNotice(false), 4000);
    }
  };

  return (
    <>
      {/* Chromium / Android / Desktop Install Button */}
      {isInstallable && (
        <button
          id="btn-pwa-install-app"
          onClick={handleInstall}
          className={`flex items-center gap-1.5 font-mono uppercase text-xs font-black cursor-pointer transition-none ${
            variant === 'header'
              ? 'bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1.5 border border-black shadow-xs'
              : 'bg-black text-white hover:bg-neutral-800 px-3 py-2 border border-black'
          }`}
          title="Install Distribution Hub to your device for full offline access"
        >
          <Download className="w-3.5 h-3.5 text-black" />
          <span>Install App (Offline PWA)</span>
        </button>
      )}

      {/* iOS Safari Fallback Button */}
      {isIOS && (
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-400 px-2 py-1 text-xs font-mono font-bold cursor-pointer"
          title="How to install on iOS Safari"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>
      )}

      {/* Successful Install Notification */}
      {installedNotice && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white border-2 border-amber-400 p-3 shadow-xl flex items-center gap-2 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>App installed successfully! You can launch it anytime offline from your home screen.</span>
        </div>
      )}

      {/* iOS Safari Installation Instruction Modal */}
      {showIOSGuide && (
        <div 
          id="modal-ios-install-guide"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div 
            className="w-full max-w-sm bg-white border-4 border-black p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900 font-mono">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-6 h-6 border border-black flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-neutral-800">
              <p className="leading-relaxed">
                To run <strong>Distribution & Retail Hub</strong> offline as a standalone app on iOS:
              </p>
              <ol className="list-decimal list-inside space-y-2 bg-neutral-50 border border-neutral-300 p-3">
                <li>
                  Tap the <span className="font-bold border border-neutral-400 px-1 py-0.5 bg-white">Share</span> button in Safari's bottom toolbar.
                </li>
                <li>
                  Scroll down the share sheet and tap <span className="font-bold border border-neutral-400 px-1 py-0.5 bg-white">Add to Home Screen</span>.
                </li>
                <li>
                  Confirm the name and tap <span className="font-bold text-black uppercase">Add</span> in the top right.
                </li>
              </ol>
              <p className="text-[11px] text-neutral-500">
                ✓ Works 100% offline with zero data consumption once saved to your home screen.
              </p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-black text-white hover:bg-neutral-800 font-mono text-xs font-bold uppercase border-2 border-black cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
