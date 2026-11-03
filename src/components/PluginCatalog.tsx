import React, { useState } from 'react';
import {
  Search,
  Cpu,
  Home,
  Clock,
  Globe,
  Radio,
  Sliders,
  Play,
  Trash2,
  CheckCircle2,
  Plus,
  Bus,
  Loader2,
} from 'lucide-react';
import { McpToolDefinition } from '../types.js';

interface PluginCatalogProps {
  tools: McpToolDefinition[];
  onToggleTool: (toolName: string) => void;
  onDeleteTool: (toolName: string) => void;
  onTestTool: (tool: McpToolDefinition) => void;
  onOpenCreate: () => void;
}

export const PluginCatalog: React.FC<PluginCatalogProps> = ({
  tools,
  onToggleTool,
  onDeleteTool,
  onTestTool,
  onOpenCreate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Hong Kong KMB Bus Live ETA Widget state
  const [busRoute, setBusRoute] = useState('71A');
  const [busOrigin, setBusOrigin] = useState('Tai Po Market MTR');
  const [busDestination, setBusDestination] = useState('Tai Po Center');
  const [busLimit, setBusLimit] = useState(2);
  const [busResult, setBusResult] = useState<any>(null);
  const [busLoading, setBusLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleQueryBusEta = async (
    routeOverride?: string,
    originOverride?: string,
    destOverride?: string,
    limitOverride?: number
  ) => {
    const route = (routeOverride !== undefined ? routeOverride : busRoute).trim().toUpperCase();
    const origin = (originOverride !== undefined ? originOverride : busOrigin).trim();
    const destination = (destOverride !== undefined ? destOverride : busDestination).trim();
    const limit = limitOverride !== undefined ? limitOverride : busLimit;

    if (!route) return;
    setBusLoading(true);
    try {
      const args: Record<string, any> = { route };
      if (origin) args.origin = origin;
      if (destination) args.destination = destination;
      if (limit) args.limit = limit;

      const res = await fetch('/api/plugins/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'kmb_bus_get_eta',
          args,
          caller: 'simulator',
        }),
      });
      const data = await res.json();
      setBusResult(data.result);
    } catch (err: any) {
      setBusResult({ status: 'error', message: err.message || 'Failed to fetch ETA' });
    } finally {
      setBusLoading(false);
    }
  };

  const handleBroadcastBusToXiaozhi = async () => {
    if (!busResult?.summary) return;
    setBroadcasting(true);
    try {
      await fetch('/api/plugins/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'speech_broadcast_alert',
          args: {
            message: busResult.summary,
            emotion: 'happy',
          },
          caller: 'simulator',
        }),
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Plugins', icon: Sliders },
    { id: 'hardware', label: 'ESP32 Hardware', icon: Cpu },
    { id: 'smarthome', label: 'Smart Home & IoT', icon: Home },
    { id: 'productivity', label: 'Productivity & Timers', icon: Clock },
    { id: 'web', label: 'Web & Intelligence', icon: Globe },
    { id: 'media', label: 'Audio & Media', icon: Radio },
    { id: 'custom', label: 'Custom Plugins', icon: Plus },
  ];

  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'custom'
        ? tool.isCustom
        : tool.category === selectedCategory;

    const matchesSearch =
      search.trim() === '' ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const activeCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Overview & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Plugin Aggregator & Tool Registry
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{tools.length} Registered MCP Tools</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400">
              {activeCount} Active
            </span>
            <span aria-hidden="true">·</span>
            <span>Xiaozhi ESP32-S3 Ready</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools or parameters..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Category Filter Tabs (Interactive Filter Buttons) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-lg border border-slate-800/80 overflow-x-auto">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isSelected
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive KMB Bus Live ETA Widget */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Hong Kong KMB & LWB Live Bus ETA (Open Data <code className="text-rose-400 font-mono text-xs">hk-td-tis_21-etakmb</code>)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time arrival countdowns powered by data.gov.hk & data.etabus.gov.hk
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 self-start sm:self-auto">
            API: data.etabus.gov.hk/v1
          </span>
        </div>

        {/* Bus Query Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Route</label>
              <input
                type="text"
                value={busRoute}
                onChange={(e) => setBusRoute(e.target.value)}
                placeholder="Route (e.g. 71A, 1A, 960)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-400 uppercase"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Boarding Stop / Origin (Optional)</label>
              <input
                type="text"
                value={busOrigin}
                onChange={(e) => setBusOrigin(e.target.value)}
                placeholder="e.g. Tai Po Market MTR / 大埔墟站"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Destination (Optional)</label>
              <input
                type="text"
                value={busDestination}
                onChange={(e) => setBusDestination(e.target.value)}
                placeholder="e.g. Tai Po Center / 大埔中心"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col justify-end">
              <button
                onClick={() => handleQueryBusEta()}
                disabled={busLoading || !busRoute.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition-all whitespace-nowrap shadow-sm"
              >
                {busLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Query ETA</span>
              </button>
            </div>
          </div>

          {/* Quick Route & Landmark Scenarios */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono pt-1">
            <span className="text-slate-500 shrink-0">Scenarios:</span>
            <button
              onClick={() => {
                setBusRoute('71A');
                setBusOrigin('Tai Po Market MTR');
                setBusDestination('Tai Po Center');
                setBusLimit(2);
                handleQueryBusEta('71A', 'Tai Po Market MTR', 'Tai Po Center', 2);
              }}
              className="px-2.5 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors whitespace-nowrap shrink-0"
            >
              71A: Tai Po Market MTR → Tai Po Center (Next 2)
            </button>
            <button
              onClick={() => {
                setBusRoute('1A');
                setBusOrigin('Star Ferry');
                setBusDestination('Sau Mau Ping');
                setBusLimit(3);
                handleQueryBusEta('1A', 'Star Ferry', 'Sau Mau Ping', 3);
              }}
              className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              1A: Star Ferry → Sau Mau Ping
            </button>
            <button
              onClick={() => {
                setBusRoute('960');
                setBusOrigin('Kin Sang');
                setBusDestination('Exhibition Centre');
                setBusLimit(3);
                handleQueryBusEta('960', 'Kin Sang', 'Exhibition Centre', 3);
              }}
              className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              960: Tuen Mun → Wan Chai
            </button>
            <button
              onClick={() => {
                setBusRoute('B1');
                setBusOrigin('');
                setBusDestination('');
                setBusLimit(3);
                handleQueryBusEta('B1', '', '', 3);
              }}
              className="px-2 py-1 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              B1 (Border)
            </button>
          </div>

          {/* Bus ETA Results Display */}
          {busResult && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              {busResult.status === 'success' && busResult.nextBus ? (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded font-mono font-bold text-xs">
                          KMB {busResult.route}
                        </span>
                        {busResult.origin && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded font-mono">
                            From: {busResult.origin}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white">
                          To {busResult.destination || busResult.nextBus.destinationTc}
                        </span>
                        {busResult.destinationEn && (
                          <span className="text-xs text-slate-400 font-mono">
                            ({busResult.destinationEn})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Status: <span className="text-slate-300">{busResult.nextBus.remark}</span> · Direction: <span className="text-slate-300">{busResult.direction || busResult.nextBus.direction}</span>
                      </p>
                      {busResult.summary && (
                        <p className="text-[11px] text-amber-300/80 mt-1.5 font-mono italic">
                          Xiaozhi voice output: "{busResult.summary}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right font-mono">
                        <div className={`text-2xl font-bold tabular-nums ${busResult.nextBus.minutesRemaining <= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {busResult.nextBus.countdownText || (busResult.nextBus.minutesRemaining > 0 ? `${busResult.nextBus.minutesRemaining} min` : 'Arriving now')}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          ETA {busResult.nextBus.etaTime}
                        </div>
                      </div>

                      <button
                        onClick={handleBroadcastBusToXiaozhi}
                        disabled={broadcasting}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-500/10"
                        title="Xiaozhi bot will speak this arrival countdown aloud"
                      >
                        {broadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                        <span>Broadcast to Bot</span>
                      </button>
                    </div>
                  </div>

                  {/* Subsequent Buses Strip */}
                  {busResult.upcomingDepartures && busResult.upcomingDepartures.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {busResult.upcomingDepartures.slice(1, 4).map((bus: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 font-mono text-xs flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <span className="text-slate-400 block text-[10px]">Bus #{idx + 2} · {bus.direction}</span>
                            <span className="text-slate-200 truncate">{bus.destinationTc}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-semibold tabular-nums ${bus.minutesRemaining <= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {bus.countdownText || `${bus.minutesRemaining} min`}
                            </span>
                            <span className="text-[10px] text-slate-500 block tabular-nums">
                              {bus.etaTime}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                  {busResult.message || 'No active departures available for this route right now.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">
            No matching tools found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or create a new custom plugin for Xiaozhi AI.
          </p>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Plugin</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTools.map((tool) => {
            const propCount = Object.keys(tool.inputSchema.properties || {}).length;

            return (
              <div
                key={tool.name}
                className={`p-5 rounded-xl border transition-all ${
                  tool.enabled
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 opacity-60'
                }`}
              >
                {/* Header: Name, metadata, toggle */}
                <div className="flex items-start justify-between gap-4 mb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-amber-400 truncate">
                        {tool.name}
                      </span>
                      {tool.isCustom && (
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                          [Custom]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="capitalize">{tool.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {propCount} {propCount === 1 ? 'argument' : 'arguments'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase font-mono text-[10px]">
                        {tool.handlerType}
                      </span>
                    </div>
                  </div>

                  {/* Enable / Disable switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onToggleTool(tool.name)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        tool.enabled ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={tool.enabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                          tool.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-4">
                  {tool.description}
                </p>

                {/* Parameter names preview */}
                {propCount > 0 && (
                  <div className="mb-4 text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400">params:</span>
                    {Object.keys(tool.inputSchema.properties || {}).map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800/80"
                      >
                        {p}
                        {tool.inputSchema.required?.includes(p) && (
                          <span className="text-amber-400 ml-0.5">*</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTestTool(tool)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current text-amber-400" />
                      <span>Test Tool</span>
                    </button>
                  </div>

                  {tool.isCustom && (
                    <button
                      onClick={() => onDeleteTool(tool.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                      title="Delete custom plugin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
