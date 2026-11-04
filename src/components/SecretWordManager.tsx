import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2,
  Volume2,
  Check,
  Copy,
  Clock,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { SecretWordAlias } from '../types.js';

interface SecretWordManagerProps {
  secretWords: SecretWordAlias[];
  onRefreshSecretWords: () => void;
  onRefreshLogs?: () => void;
  onRefreshDevice?: () => void;
}

export const SecretWordManager: React.FC<SecretWordManagerProps> = ({
  secretWords,
  onRefreshSecretWords,
  onRefreshLogs,
  onRefreshDevice,
}) => {
  // Test sandbox state
  const [testInput, setTestInput] = useState('How my bus for school');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<any>(null);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [expandedPrompt, setExpandedPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [matchMode, setMatchMode] = useState<'contains' | 'exact' | 'fuzzy'>('contains');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const presets = [
    {
      trigger: 'How my bus for school',
      expanded: 'I am in TaiPo market MTR station, what is the coming two eta for 71A in minutes',
      desc: 'School commute 71A bus countdown at Tai Po Market MTR',
    },
    {
      trigger: '返學巴士',
      expanded: '我喺大埔墟站想去大埔中心，71A 下2班車幾多分鐘到？',
      desc: 'Cantonese school commute shortcut for 71A at Tai Po Market',
    },
    {
      trigger: 'Heading home',
      expanded: 'When is the next 960 bus arriving from Exhibition Centre towards Tuen Mun',
      desc: 'Evening commute shortcut for KMB 960 to Tuen Mun',
    },
    {
      trigger: 'Morning briefing',
      expanded: 'Set LED ring to warm gold, play success chime, and tell me the latest tech news',
      desc: 'Morning wake-up routine with mood light, chime, and news briefing',
    },
    {
      trigger: 'Goodnight Xiaozhi',
      expanded: 'Turn off LED ring, show sleep face on OLED, and turn off living room light',
      desc: 'Bedtime routine: switches off lights and displays sleepy expression',
    },
  ];

  const handleTestResolution = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    setExecutionOutput(null);
    try {
      const res = await fetch('/api/secret-words/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: testInput }),
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setTesting(false);
    }
  };

  const handleExecuteVoiceCommand = async (phraseToRun?: string) => {
    const phrase = phraseToRun || testInput;
    if (!phrase.trim()) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/xiaozhi/simulate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: phrase }),
      });
      const data = await res.json();
      setExecutionOutput(data);
      onRefreshSecretWords();
      onRefreshLogs?.();
      onRefreshDevice?.();
    } finally {
      setExecuting(false);
    }
  };

  const handleToggle = async (id: string) => {
    await fetch(`/api/secret-words/${id}/toggle`, { method: 'POST' });
    onRefreshSecretWords();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/secret-words/${id}`, { method: 'DELETE' });
    onRefreshSecretWords();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhrase.trim() || !expandedPrompt.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/secret-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          triggerPhrase: triggerPhrase.trim(),
          expandedPrompt: expandedPrompt.trim(),
          description: description.trim(),
          matchMode,
          enabled: true,
        }),
      });
      setIsModalOpen(false);
      setEditingId(null);
      setTriggerPhrase('');
      setExpandedPrompt('');
      setDescription('');
      onRefreshSecretWords();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (sw: SecretWordAlias) => {
    setEditingId(sw.id);
    setTriggerPhrase(sw.triggerPhrase);
    setExpandedPrompt(sw.expandedPrompt);
    setDescription(sw.description || '');
    setMatchMode(sw.matchMode || 'contains');
    setIsModalOpen(true);
  };

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTriggerPhrase(p.trigger);
    setExpandedPrompt(p.expanded);
    setDescription(p.desc);
    setMatchMode('contains');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Description */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  Secret Words & Voice Aliases
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {secretWords.filter((w) => w.enabled).length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Setup shorthand phrases or secret keywords that translate into complete commands and trigger MCP tools automatically
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setTriggerPhrase('');
              setExpandedPrompt('');
              setDescription('');
              setMatchMode('contains');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-lg transition-all whitespace-nowrap shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Secret Word</span>
          </button>
        </div>

        {/* Live Translation Architecture Explainer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>1. Voice Trigger (Secret Word)</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800">
              "How my bus for school"
            </p>
            <p className="text-[11px] text-slate-500">
              User speaks a short keyword or convenient alias to Xiaozhi bot
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>2. MCP Translation Layer</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800 truncate">
              ➔ "I am in TaiPo market MTR... next 2 eta 71A"
            </p>
            <p className="text-[11px] text-slate-500">
              MCP Center intercepts and translates phrase into full detailed intent
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>3. Tool Execution & Voice</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800 truncate">
              kmb_bus_get_eta({'{ route: "71A", ... }'})
            </p>
            <p className="text-[11px] text-slate-500">
              Bot runs plugin and speaks real-time countdown minutes aloud
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Translation & Execution Sandbox */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Live Alias Translation Sandbox
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Simulate incoming voice prompts
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type phrase (e.g. 'How my bus for school', 'Heading home', '返學巴士')..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestResolution}
              disabled={testing || !testInput.trim()}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap border border-slate-700"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Inspect Translation'}
            </button>
            <button
              onClick={() => handleExecuteVoiceCommand()}
              disabled={executing || !testInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-all whitespace-nowrap shadow-sm"
            >
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Translate & Run Tool</span>
            </button>
          </div>
        </div>

        {/* Quick Example Trigger Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono pt-1">
          <span className="text-slate-500 shrink-0">Try Phrases:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTestInput(p.trigger);
                handleExecuteVoiceCommand(p.trigger);
              }}
              className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              "{p.trigger}"
            </button>
          ))}
        </div>

        {/* Test Resolution Display */}
        {testResult && (
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Match Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  testResult.matched
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {testResult.matched ? 'MATCHED SECRET WORD' : 'NO SECRET WORD MATCH (PASS-THROUGH)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Original Spoken Phrase</span>
                <span className="text-slate-200">{testResult.originalPrompt}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-amber-400 block text-[10px] uppercase">Translated Execution Prompt</span>
                <span className="text-amber-200">{testResult.resolvedPrompt}</span>
              </div>
            </div>
          </div>
        )}

        {/* Execution Output Display */}
        {executionOutput && (
          <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span className="text-white font-semibold">Xiaozhi Execution Result:</span>
              </div>
              {executionOutput.secretWordTriggered && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  Secret Word Alias Applied
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs font-mono">
              <p className="text-amber-300 italic">"{executionOutput.replyText}"</p>
            </div>

            {executionOutput.toolCallsExecuted && executionOutput.toolCallsExecuted.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase">MCP Tools Triggered:</span>
                {executionOutput.toolCallsExecuted.map((tc: any, i: number) => (
                  <div key={i} className="p-2.5 bg-slate-900/60 rounded border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <div>
                      <span className="text-cyan-400 font-semibold">{tc.name}</span>
                      <span className="text-slate-500 text-[10px] ml-2">({JSON.stringify(tc.arguments)})</span>
                    </div>
                    <span className="text-emerald-400 text-[10px]">Success</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secret Words Catalog List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-white">
            Configured Secret Words ({secretWords.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Active in voice simulator & MCP server
          </span>
        </div>

        {secretWords.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">
              No Secret Words configured yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create aliases to translate short voice commands like "How my bus for school" into full queries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {secretWords.map((sw) => (
              <div
                key={sw.id}
                className={`p-4 rounded-xl border transition-all ${
                  sw.enabled
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                        "{sw.triggerPhrase}"
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        Mode: {sw.matchMode}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Triggered {sw.triggerCount || 0} times
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-200">
                      <span className="text-slate-500 text-[10px] block uppercase mb-0.5">Translates to:</span>
                      "{sw.expandedPrompt}"
                    </div>

                    {sw.description && (
                      <p className="text-xs text-slate-400">
                        {sw.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                      {sw.lastTriggered && (
                        <span>Last used: {new Date(sw.lastTriggered).toLocaleTimeString()}</span>
                      )}
                      <span>Created: {new Date(sw.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                    <button
                      onClick={() => {
                        setTestInput(sw.triggerPhrase);
                        handleExecuteVoiceCommand(sw.triggerPhrase);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 whitespace-nowrap"
                      title="Test this secret word in the voice engine"
                    >
                      <Play className="w-3 h-3 fill-current text-amber-400" />
                      <span>Test Trigger</span>
                    </button>

                    <button
                      onClick={() => handleToggle(sw.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        sw.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {sw.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(sw)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(sw.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete secret word"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: New / Edit Secret Word */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {editingId ? 'Edit Secret Word / Voice Alias' : 'Create Secret Word / Voice Alias'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {/* Presets Quick Fill */}
            {!editingId && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-slate-400">
                  Quick Fill from Templates:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono pb-1">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-300 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      {p.trigger}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Secret Word / Trigger Phrase <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  placeholder="e.g. How my bus for school, Heading home, 返學巴士"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The spoken phrase or keyword user will say to Xiaozhi bot
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Translated Command / Expanded Intent <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={expandedPrompt}
                  onChange={(e) => setExpandedPrompt(e.target.value)}
                  placeholder="e.g. I am in TaiPo market MTR station, what is the coming two eta for 71A in minutes"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The full prompt passed to the MCP router and tools (e.g. kmb_bus_get_eta, iot_toggle_device)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Match Mode
                  </label>
                  <select
                    value={matchMode}
                    onChange={(e) => setMatchMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="contains">Contains / Lenient (Recommended)</option>
                    <option value="exact">Exact Match</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. School bus 71A shortcut"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !triggerPhrase.trim() || !expandedPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editingId ? 'Update Alias' : 'Save Secret Word'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
