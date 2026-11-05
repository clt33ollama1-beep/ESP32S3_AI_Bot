import React from 'react';
import { Plus, Bot, Download, Cloud } from 'lucide-react';
import { XiaozhiCloudBridgeStatus } from '../types.js';

interface TopBarProps {
  activeTab: 'plugins' | 'simulator' | 'secret-words' | 'automations' | 'protocol';
  setActiveTab: (tab: 'plugins' | 'simulator' | 'secret-words' | 'automations' | 'protocol') => void;
  onOpenCreateModal: () => void;
  onOpenExportModal: () => void;
  activeToolsCount: number;
  secretWordsCount?: number;
  cloudStatus?: XiaozhiCloudBridgeStatus;
  onOpenCloudSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenExportModal,
  activeToolsCount,
  secretWordsCount,
  cloudStatus,
  onOpenCloudSettings,
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Bot className="w-4 h-4" />
        </div>
        <a
          href="/"
          className="text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
        >
          Xiaozhi MCP Center
        </a>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
        <button
          onClick={() => setActiveTab('plugins')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'plugins'
              ? 'bg-slate-800 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Plugins ({activeToolsCount})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ESP32 Simulator
        </button>
        <button
          onClick={() => setActiveTab('secret-words')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'secret-words'
              ? 'bg-slate-800 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Secret Words {secretWordsCount !== undefined ? `(${secretWordsCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('automations')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'automations'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Automations
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'protocol'
              ? 'bg-slate-800 text-purple-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Protocol & Logs
        </button>
      </nav>

      {/* Zone 3: Primary actions & Cloud Gateway Indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Xiaozhi Outbound Cloud Bridge Status Indicator */}
        {cloudStatus && (
          <button
            onClick={onOpenCloudSettings}
            title={
              cloudStatus.status === 'connected'
                ? `Connected to Xiaozhi Cloud (${cloudStatus.sanitizedUrl || 'api.xiaozhi.me'}). Click to inspect.`
                : cloudStatus.status === 'connecting'
                ? 'Connecting to Xiaozhi Cloud... Click to inspect.'
                : cloudStatus.status === 'error'
                ? `Cloud Bridge Error: ${cloudStatus.lastError || 'Connection refused'}. Click to troubleshoot.`
                : `Xiaozhi Cloud Bridge Offline. ${cloudStatus.configuredInEnv ? 'Configured in .env.' : 'Click to configure.'}`
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border font-mono transition-all whitespace-nowrap shrink-0 ${
              cloudStatus.status === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : cloudStatus.status === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : cloudStatus.status === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudStatus.status === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : cloudStatus.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-sans text-[11px] font-medium hidden sm:inline">
              Cloud:
            </span>
            <span className="text-[11px] capitalize font-medium">
              {cloudStatus.status === 'connected'
                ? 'Active'
                : cloudStatus.status === 'connecting'
                ? 'Connecting'
                : cloudStatus.status === 'error'
                ? 'Error'
                : 'Offline'}
            </span>
          </button>
        )}

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all whitespace-nowrap shrink-0 border border-slate-700/60"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export & Deploy</span>
        </button>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-md transition-all whitespace-nowrap shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Plugin</span>
        </button>
      </div>
    </header>
  );
};
