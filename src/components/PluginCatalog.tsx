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
