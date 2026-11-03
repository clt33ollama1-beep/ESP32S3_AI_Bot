import React, { useState } from 'react';
import { X, Plus, Trash2, Code2, Globe, Cpu, Loader2 } from 'lucide-react';
import { McpToolDefinition, McpToolParameter } from '../types.js';

interface CreatePluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tool: McpToolDefinition) => void;
}

interface ParamItem {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
  enumValues: string;
}

export const CreatePluginModal: React.FC<CreatePluginModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'hardware' | 'smarthome' | 'productivity' | 'web' | 'media' | 'custom'>('custom');
  const [handlerType, setHandlerType] = useState<'mock' | 'webhook'>('mock');
  const [mockReturnValue, setMockReturnValue] = useState('{\n  "status": "success",\n  "message": "Custom action completed by Xiaozhi bot."\n}');

  // Webhook settings
  const [webhookUrl, setWebhookUrl] = useState('https://');
  const [webhookMethod, setWebhookMethod] = useState<'GET' | 'POST' | 'PUT'>('POST');

  // Dynamic parameters
  const [params, setParams] = useState<ParamItem[]>([
    {
      id: 'p-1',
      name: 'action_target',
      type: 'string',
      description: 'The target item or parameter to configure',
      required: true,
      enumValues: '',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addParam = () => {
    setParams((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        name: '',
        type: 'string',
        description: '',
        required: false,
        enumValues: '',
      },
    ]);
  };

  const removeParam = (id: string) => {
    setParams((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParam = (id: string, updates: Partial<ParamItem>) => {
    setParams((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Plugin tool name is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required for LLM reasoning');
      return;
    }

    // Build JSON Schema properties
    const properties: Record<string, McpToolParameter> = {};
    const required: string[] = [];

    for (const p of params) {
      if (!p.name.trim()) continue;
      const paramName = p.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const paramDef: McpToolParameter = {
        type: p.type,
        description: p.description || paramName,
      };

      if (p.enumValues.trim()) {
        paramDef.enum = p.enumValues
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      properties[paramName] = paramDef;
      if (p.required) {
        required.push(paramName);
      }
    }

    const payload: Partial<McpToolDefinition> = {
      name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      description: description.trim(),
      category,
      enabled: true,
      isCustom: true,
      pluginId: `custom_${name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
      handlerType,
      inputSchema: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
      mockReturnValue: handlerType === 'mock' ? mockReturnValue : undefined,
      webhookConfig:
        handlerType === 'webhook'
          ? {
              url: webhookUrl,
              method: webhookMethod,
            }
          : undefined,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create plugin');
      }

      const data = await res.json();
      onCreated(data.tool);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error saving custom plugin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Create Custom MCP Plugin
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Expose new hardware controls or web services to Xiaozhi ESP32-S3 via Model Context Protocol
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tool Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. coffee_machine_brew"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Lowercase snake_case identifier used in MCP tools/call
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="custom">Custom / Script</option>
                <option value="hardware">ESP32 Hardware</option>
                <option value="smarthome">Smart Home & IoT</option>
                <option value="productivity">Productivity & Timers</option>
                <option value="web">Web & Intelligence</option>
                <option value="media">Audio & Media</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tool Description (LLM Instruction) <span className="text-amber-400">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain to Xiaozhi AI when and why to invoke this tool..."
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
            />
          </div>

          {/* Handler Type Tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Execution Handler
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHandlerType('mock')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  handlerType === 'mock'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Simulated Output (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setHandlerType('webhook')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  handlerType === 'webhook'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>External HTTP Webhook</span>
              </button>
            </div>
          </div>

          {handlerType === 'mock' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mock Return Payload (JSON)
              </label>
              <textarea
                rows={3}
                value={mockReturnValue}
                onChange={(e) => setMockReturnValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Method
                </label>
                <select
                  value={webhookMethod}
                  onChange={(e) => setWebhookMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://homeassistant.local:8123/api/webhook/xyz"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Parameters Schema Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Input Schema Parameters
              </label>
              <button
                type="button"
                onClick={addParam}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-2">
              {params.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateParam(p.id, { name: e.target.value })}
                      placeholder="field_name"
                      className="md:col-span-4 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => updateParam(p.id, { type: e.target.value as any })}
                      className="md:col-span-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <label className="md:col-span-3 flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.required}
                        onChange={(e) => updateParam(p.id, { required: e.target.checked })}
                        className="rounded bg-slate-800 text-amber-500"
                      />
                      <span>Required</span>
                    </label>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeParam(p.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={p.description}
                    onChange={(e) => updateParam(p.id, { description: e.target.value })}
                    placeholder="Description (e.g. Temperature setpoint in Celsius)"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Tool in MCP</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
