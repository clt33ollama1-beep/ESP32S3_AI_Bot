import React, { useState } from 'react';
import {
  Zap,
  Play,
  Plus,
  Clock,
  Radio,
  Globe,
  Loader2,
  CheckCircle2,
  Trash2,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { AutomationRule, McpToolDefinition } from '../types.js';

interface AutomationEngineProps {
  rules: AutomationRule[];
  tools: McpToolDefinition[];
  onRefreshRules: () => void;
  onRefreshLogs: () => void;
}

export const AutomationEngine: React.FC<AutomationEngineProps> = ({
  rules,
  tools,
  onRefreshRules,
  onRefreshLogs,
}) => {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; text: string } | null>(null);

  // Webhook Tester state
  const [webhookMessage, setWebhookMessage] = useState('Front door package delivered.');
  const [webhookEmotion, setWebhookEmotion] = useState<'neutral' | 'happy' | 'urgent'>('happy');
  const [webhookSending, setWebhookSending] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // New Rule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationRule['triggerType']>('hardware_event');
  const [hardwareEvent, setHardwareEvent] = useState<'button_press' | 'pir_motion' | 'low_battery'>('pir_motion');
  const [scheduleInterval, setScheduleInterval] = useState(30);
  const [actionType, setActionType] = useState<AutomationRule['actionType']>('speak_alert');
  const [selectedTool, setSelectedTool] = useState(tools[0]?.name || 'esp32_set_led_ring');
  const [voiceText, setVoiceText] = useState('Alert: Sensor event triggered!');
  const [creating, setCreating] = useState(false);

  const handleToggle = async (id: string) => {
    await fetch(`/api/automations/${id}/toggle`, { method: 'POST' });
    onRefreshRules();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    onRefreshRules();
  };

  const handleTriggerNow = async (id: string) => {
    setTriggeringId(id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/automations/${id}/trigger`, { method: 'POST' });
      const data = await res.json();
      setFeedbackMsg({ id, text: 'Rule executed successfully!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      onRefreshRules();
      onRefreshLogs();
    } catch (e) {
      setFeedbackMsg({ id, text: 'Execution failed.' });
    } finally {
      setTriggeringId(null);
    }
  };

  const handleSendWebhookTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSending(true);
    try {
      await fetch('/api/webhook/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: webhookMessage, emotion: webhookEmotion }),
      });
      onRefreshLogs();
    } finally {
      setWebhookSending(false);
    }
  };

  const copyCurl = () => {
    const curl = `curl -X POST "${window.location.origin}/api/webhook/trigger" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Warning: High temperature detected in server rack", "emotion": "urgent"}'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const newRule: Partial<AutomationRule> = {
        name: name.trim(),
        description: description.trim() || 'Custom automated trigger rule',
        enabled: true,
        triggerType,
        triggerConfig: {
          hardwareEvent: triggerType === 'hardware_event' ? hardwareEvent : undefined,
          scheduleIntervalMin: triggerType === 'schedule' ? scheduleInterval : undefined,
          webhookEndpoint: triggerType === 'webhook' ? '/api/webhook/trigger' : undefined,
        },
        actionType,
        actionConfig: {
          toolName: actionType === 'execute_tool' ? selectedTool : undefined,
          voiceMessage: actionType === 'speak_alert' ? voiceText : undefined,
        },
      };

      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      onRefreshRules();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Automation & Real-Time Event Rules
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bridge physical ESP32-S3 sensor triggers, schedules, and external webhooks to MCP tools & voice alerts
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap self-start"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Automation</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => {
          const isTriggering = triggeringId === rule.id;

          return (
            <div
              key={rule.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                rule.enabled
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">
                    {rule.name}
                  </h4>
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={rule.enabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        rule.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {rule.description}
                </p>

                {/* Metadata */}
                <div className="space-y-1 text-[11px] text-slate-500 font-mono mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Trigger:</span>
                    <span className="text-amber-400">
                      {rule.triggerType === 'hardware_event'
                        ? `Event: ${rule.triggerConfig.hardwareEvent}`
                        : rule.triggerType === 'schedule'
                        ? `Every ${rule.triggerConfig.scheduleIntervalMin} min`
                        : 'HTTP Webhook'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Action:</span>
                    <span className="text-cyan-400 truncate">
                      {rule.actionType === 'speak_alert'
                        ? 'Xiaozhi Voice TTS'
                        : `MCP Tool (${rule.actionConfig.toolName})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Fired:</span>
                    <span className="tabular-nums text-slate-300">
                      {rule.triggerCount} times
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleTriggerNow(rule.id)}
                  disabled={isTriggering || !rule.enabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  {isTriggering ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current text-emerald-400" />
                  )}
                  <span>Trigger Now</span>
                </button>

                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {feedbackMsg?.id === rule.id && (
                <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook Gateway Integration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Real-Time Webhook Gateway
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Send incoming POST requests from Home Assistant, curl, or IoT sensors to trigger instant voice broadcasts on Xiaozhi
            </p>
          </div>
          <button
            onClick={copyCurl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {copiedCurl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied cURL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL Command</span>
              </>
            )}
          </button>
        </div>

        {/* Interactive Webhook Simulator */}
        <form onSubmit={handleSendWebhookTest} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Broadcast Message
            </label>
            <input
              type="text"
              value={webhookMessage}
              onChange={(e) => setWebhookMessage(e.target.value)}
              placeholder="e.g. Front door opened or Laundry cycle finished"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Vocal Inflection
            </label>
            <select
              value={webhookEmotion}
              onChange={(e) => setWebhookEmotion(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200"
            >
              <option value="happy">Happy</option>
              <option value="neutral">Neutral</option>
              <option value="urgent">Urgent Alert</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={webhookSending}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-all"
            >
              {webhookSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Test Webhook</span>
            </button>
          </div>
        </form>
      </div>

      {/* New Automation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Create Automation Rule
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Night Mood Light Activation"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Trigger Type
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value="hardware_event">ESP32 Hardware Event</option>
                  <option value="schedule">Periodic Timer (Schedule)</option>
                  <option value="webhook">Incoming HTTP Webhook</option>
                </select>
              </div>

              {triggerType === 'hardware_event' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Event Trigger
                  </label>
                  <select
                    value={hardwareEvent}
                    onChange={(e) => setHardwareEvent(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value="pir_motion">PIR Motion Detected</option>
                    <option value="button_press">ESP32 Button A Long Press</option>
                    <option value="low_battery">Battery drops below 20%</option>
                  </select>
                </div>
              )}

              {triggerType === 'schedule' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={scheduleInterval}
                    onChange={(e) => setScheduleInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value="speak_alert">Speak Audio Announcement</option>
                  <option value="execute_tool">Execute MCP Tool</option>
                </select>
              </div>

              {actionType === 'speak_alert' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Voice Alert Message
                  </label>
                  <input
                    type="text"
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target MCP Tool
                  </label>
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
                  >
                    {tools.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
