import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, Clock, AlertCircle, Database, ChevronRight, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAppContext } from '../context/AppContext';

export const OfflineSyncBadge: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { syncQueue, syncPendingItems, isSyncing, lastSyncTime } = useAppContext();
  const [showQueueModal, setShowQueueModal] = useState(false);

  const pendingCount = syncQueue.filter(item => item.status === 'PENDING').length;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          id="btn-network-sync-status"
          type="button"
          onClick={() => setShowQueueModal(true)}
          className={`flex items-center gap-1.5 px-2 py-1 border text-xs font-mono font-bold cursor-pointer transition-none ${
            !isOnline
              ? 'bg-amber-100 text-amber-900 border-amber-600'
              : pendingCount > 0
              ? 'bg-blue-50 text-blue-900 border-blue-600'
              : 'bg-neutral-100 text-neutral-800 border-neutral-300 hover:border-black'
          }`}
          title="View local-first offline synchronization queue"
        >
          {isOnline ? (
            <Wifi className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'text-blue-600 animate-pulse' : 'text-emerald-700'}`} />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
          )}

          <span>
            {!isOnline
              ? `Offline (${pendingCount} queued)`
              : pendingCount > 0
              ? `Syncing (${pendingCount})`
              : 'Online'}
          </span>

          {isSyncing && <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />}
        </button>

        {isOnline && pendingCount > 0 && (
          <button
            id="btn-force-sync-now"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              syncPendingItems();
            }}
            disabled={isSyncing}
            className="px-2 py-1 bg-black hover:bg-neutral-800 text-white font-mono text-[10px] font-bold uppercase border border-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Flush queued changes to central state"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        )}
      </div>

      {/* Floating Offline Notification Banner when offline */}
      {!isOnline && (
        <div
          id="banner-floating-offline-status"
          className="fixed bottom-4 left-4 z-50 bg-black text-white border-2 border-amber-400 p-3 shadow-2xl flex items-center gap-3 font-mono text-xs max-w-md animate-in slide-in-from-bottom-2"
        >
          <div className="w-7 h-7 bg-amber-500 text-black flex items-center justify-center font-bold flex-shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
              <span>Local-First Offline Mode</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </div>
            <p className="text-[11px] text-neutral-300 mt-0.5">
              Network disconnected. Orders and stock changes are saved safely to local storage and queued for synchronization.
            </p>
          </div>
          <button
            onClick={() => setShowQueueModal(true)}
            className="px-2 py-1 bg-amber-400 text-black font-bold text-[10px] uppercase border border-black hover:bg-amber-300 cursor-pointer whitespace-nowrap"
          >
            View Queue ({pendingCount})
          </button>
        </div>
      )}

      {/* Sync Queue Details Modal */}
      {showQueueModal && (
        <div
          id="modal-sync-queue-details"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowQueueModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white border-4 border-black p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-neutral-900" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">
                    Local Storage & Offline Sync Ledger
                  </h3>
                  <div className="text-[11px] text-neutral-600">
                    Network: <strong className={isOnline ? 'text-emerald-700' : 'text-amber-700'}>
                      {isOnline ? 'ONLINE' : 'OFFLINE (LOCAL STORAGE ACTIVE)'}
                    </strong>
                    {lastSyncTime && (
                      <span className="ml-2 text-neutral-500">
                        • Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="w-6 h-6 border border-black flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Sync Controls */}
            <div className="bg-neutral-100 border border-neutral-400 p-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-neutral-900 block">Pending Mutations</span>
                <span className="text-[11px] text-neutral-600">
                  {pendingCount === 0 
                    ? 'All local orders, stock updates & issues are synchronized.' 
                    : `${pendingCount} item(s) stored locally pending server broadcast.`}
                </span>
              </div>
              <button
                type="button"
                id="btn-modal-trigger-sync"
                onClick={() => syncPendingItems()}
                disabled={isSyncing || pendingCount === 0 || !isOnline}
                className="px-3 py-1.5 bg-black hover:bg-neutral-800 disabled:opacity-40 text-white font-bold uppercase border border-black flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto border border-neutral-300 p-2 divide-y divide-neutral-200 min-h-[160px] bg-neutral-50">
              {syncQueue.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 space-y-1">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-600" />
                  <p className="font-bold text-neutral-800">Local Ledger Clean & Synchronized</p>
                  <p className="text-[11px]">Any actions taken while offline will automatically record here.</p>
                </div>
              ) : (
                syncQueue.map((item) => (
                  <div key={item.id} className="py-2 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase border ${
                          item.status === 'SYNCED' 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-500' 
                            : item.status === 'FAILED'
                            ? 'bg-red-100 text-red-900 border-red-500'
                            : 'bg-amber-100 text-amber-900 border-amber-600 animate-pulse'
                        }`}>
                          {item.status}
                        </span>
                        <span className="font-bold text-neutral-900 text-xs">{item.description}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Action: {item.action} • {new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {item.status === 'SYNCED' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <span className="text-[10px] font-bold text-neutral-600">Queued</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with offline reassurance */}
            <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2 border border-neutral-300">
              <span className="font-bold text-neutral-800 block">Offline-First Guarantee:</span>
              All catalog browsing, cart operations, salesman order creation, invoice generation, and stock management operate reliably with or without an active internet connection using persistent browser storage.
            </div>

            <button
              onClick={() => setShowQueueModal(false)}
              className="w-full py-2 bg-neutral-200 hover:bg-neutral-300 text-black font-bold uppercase border border-black cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
