import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface GoogleDriveConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemNames?: string[];
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GoogleDriveConfirmModal: React.FC<GoogleDriveConfirmModalProps> = ({
  isOpen,
  title,
  description,
  itemNames = [],
  confirmLabel = 'Delete Permanently',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="gdrive-confirm-modal-backdrop" 
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 font-mono"
    >
      <div 
        id="gdrive-confirm-modal-box" 
        className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 animate-in fade-in zoom-in duration-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${isDestructive ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'} border-2 border-black flex items-center justify-center`}>
              {isDestructive ? <Trash2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">
                {title}
              </h3>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">
                Google Drive Safety Confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 text-black hover:bg-neutral-200 border border-black cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs text-neutral-800">
          <p className="leading-relaxed">
            {description}
          </p>

          {itemNames.length > 0 && (
            <div className="bg-neutral-100 border-2 border-neutral-300 p-2.5 max-h-32 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold uppercase text-neutral-600 block mb-1">
                Affected Drive Items ({itemNames.length}):
              </span>
              {itemNames.map((name, idx) => (
                <div key={idx} className="font-bold text-neutral-900 truncate text-[11px]">
                  • {name}
                </div>
              ))}
            </div>
          )}

          {isDestructive && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-800 text-[11px] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
              <span>This action cannot be undone. The file will be removed from your Google Drive.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
          <button
            type="button"
            id="btn-confirm-modal-cancel"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-2 bg-white hover:bg-neutral-200 text-black border-2 border-black text-xs font-black uppercase cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-modal-action"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-black hover:bg-neutral-800 text-amber-400'
            } border-2 border-black text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-40`}
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
