import React from 'react';
import { GoogleDrivePanel } from './GoogleDrivePanel.tsx';
import { Cloud, X } from 'lucide-react';

interface GoogleDriveHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveHubModal: React.FC<GoogleDriveHubModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      id="modal-gdrive-hub-backdrop" 
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4 font-mono overflow-y-auto"
    >
      <div 
        id="modal-gdrive-hub-content" 
        className="w-full max-w-5xl bg-neutral-100 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-100"
      >
        {/* Modal Top Header */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between border-b-2 border-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-400 text-black flex items-center justify-center font-black border border-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-white flex items-center gap-2">
                Google Drive Cloud Center
                <span className="text-[10px] font-normal px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Workspace API
                </span>
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                Store FMCG order spreadsheets, GST tax invoices, and full data backups directly in Google Drive.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-gdrive-modal"
            onClick={onClose}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-600 cursor-pointer flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          <GoogleDrivePanel onClose={onClose} asModal={true} />
        </div>
      </div>
    </div>
  );
};
