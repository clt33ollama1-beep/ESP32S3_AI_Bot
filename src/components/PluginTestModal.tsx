import React, { useState } from 'react';
import { X, Play, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { McpToolDefinition } from '../types.js';

interface PluginTestModalProps {
  tool: McpToolDefinition | null;
  onClose: () => void;
  onExecutionComplete?: () => void;
}

export const PluginTestModal: React.FC<PluginTestModalProps> = ({
  tool,
  onClose,
  onExecutionComplete,
}) => {
  if (!tool) return null;

  // Initialize form state from schema defaults or empty values
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    const props = tool.inputSchema.properties || {};
    for (const [key, field] of Object.entries(props)) {
      if (field.default !== undefined) {
        initial[key] = field.default;
      } else if (field.enum && field.enum.length > 0) {
        initial[key] = field.enum[0];
      } else if (field.type === 'number') {
        initial[key] = 1;
      } else if (field.type === 'boolean') {
        initial[key] = false;
      } else {
        initial[key] = '';
      }
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isError, setIsError] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (key: string, val: any) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    setIsError(false);
    const start = performance.now();

    try {
      // Cast numerical inputs where needed
      const sanitizedArgs: Record<string, any> = {};
      const props = tool.inputSchema.properties || {};
      for (const [k, v] of Object.entries(formValues)) {
        if (props[k]?.type === 'number') {
          sanitizedArgs[k] = v === '' ? 0 : Number(v);
        } else {
          sanitizedArgs[k] = v;
        }
      }

      const res = await fetch('/api/plugins/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: tool.name,
          args: sanitizedArgs,
          caller: 'simulator',
        }),
      });

      const data = await res.json();
      setLatencyMs(Math.round(performance.now() - start));
      setResult(data.result);
      setIsError(!!data.isError);
      onExecutionComplete?.();
    } catch (err: any) {
      setLatencyMs(Math.round(performance.now() - start));
      setIsError(true);
      setResult({ error: err?.message || 'Execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const properties = tool.inputSchema.properties || {};
  const propKeys = Object.keys(properties);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-amber-400">
                {tool.name}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 capitalize">
                {tool.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {tool.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Arguments Form */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Input Arguments
            </h4>

            {propKeys.length === 0 ? (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400">
                This tool requires no input arguments (e.g. status probe or sensor snapshot).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propKeys.map((key) => {
                  const prop = properties[key];
                  const isRequired = tool.inputSchema.required?.includes(key);

                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono font-medium text-slate-200">
                          {key}
                          {isRequired && (
                            <span className="text-amber-400 ml-1">*</span>
                          )}
                        </label>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {prop.type}
                        </span>
                      </div>

                      {prop.enum && prop.enum.length > 0 ? (
                        <select
                          value={formValues[key] ?? ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                        >
                          {prop.enum.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : prop.type === 'boolean' ? (
                        <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-700/80 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formValues[key]}
                            onChange={(e) => handleInputChange(key, e.target.checked)}
                            className="rounded bg-slate-800 border-slate-600 text-amber-500 focus:ring-0"
                          />
                          <span className="text-xs text-slate-300">Enabled</span>
                        </label>
                      ) : (
                        <input
                          type={prop.type === 'number' ? 'number' : 'text'}
                          value={formValues[key] ?? ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          placeholder={prop.description || key}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                        />
                      )}

                      {prop.description && (
                        <p className="text-[11px] text-slate-500">
                          {prop.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Execution Result */}
          {result !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Execution Result
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs ${
                      isError ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isError ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Success</span>
                      </>
                    )}
                  </span>
                  {latencyMs !== null && (
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      · {latencyMs}ms
                    </span>
                  )}
                </div>

                <button
                  onClick={copyPayload}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Output</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative p-3.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-60">
                <pre>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Invoking Tool...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Tool</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
