import React, { useState } from 'react';
import {
  Copy,
  Check,
  Radio,
  FileCode,
  Terminal,
  Activity,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { ToolExecutionLog } from '../types.js';

interface ProtocolInspectorProps {
  logs: ToolExecutionLog[];
  onClearLogs: () => void;
  activeToolsCount: number;
}

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({
  logs,
  onClearLogs,
  activeToolsCount,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<ToolExecutionLog | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const sseUrl = `${baseUrl}/mcp/sse`;
  const rpcUrl = `${baseUrl}/api/mcp/rpc`;

  const xiaozhiFirmwareConfig = JSON.stringify(
    {
      mcp_endpoint: sseUrl,
      mcp_rpc_fallback: rpcUrl,
      mcp_transport: 'sse',
      device_id: 'esp32s3-xz-8a4b2c',
      auto_reconnect: true,
      heartbeat_interval_s: 30,
    },
    null,
    2
  );

  const xiaozhiServerYaml = `# xiaozhi-server / gateway config.yaml
mcp_servers:
  - name: "xiaozhi-mcp-center"
    transport: "sse"
    url: "${sseUrl}"
    direct_rpc: "${rpcUrl}"
    enabled: true
    timeout: 10000`;

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'xiaozhi-ai-hub': {
          url: sseUrl,
        },
      },
    },
    null,
    2
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handlePingServer = async () => {
    setPingLoading(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      });
      const data = await res.json();
      const latency = Math.round(performance.now() - start);
      setPingResult({
        latency,
        toolsFound: data?.result?.tools?.length || 0,
        status: 'OK',
      });
    } catch (e: any) {
      setPingResult({ status: 'Error', error: e.message });
    } finally {
      setPingLoading(false);
    }
  };

  const exportLogsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `xiaozhi-mcp-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Protocol status & Ping Test */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              Model Context Protocol (MCP) Server Gateway
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>JSON-RPC 2.0</span>
            <span aria-hidden="true">·</span>
            <span>SSE Stream Ready</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">{activeToolsCount} active tools</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pingResult && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {pingResult.latency}ms · {pingResult.toolsFound} tools verified
              </span>
            </div>
          )}

          <button
            onClick={handlePingServer}
            disabled={pingLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            {pingLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Test MCP Handshake</span>
          </button>
        </div>
      </div>

      {/* Connection Snippets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Box 1: Xiaozhi ESP32 Firmware */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                Xiaozhi ESP32-S3 Firmware
              </span>
              <button
                onClick={() => copyToClipboard(xiaozhiFirmwareConfig, 'firmware')}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                {copiedSection === 'firmware' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Paste into your ESP32-S3 LittleFS / SPIFFS <code className="text-amber-400">config.json</code>
            </p>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
            <pre>{xiaozhiFirmwareConfig}</pre>
          </div>
        </div>

        {/* Box 2: Xiaozhi Gateway Server */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                Xiaozhi Server / Gateway
              </span>
              <button
                onClick={() => copyToClipboard(xiaozhiServerYaml, 'server')}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                {copiedSection === 'server' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Paste into your <code className="text-cyan-400">config.yaml</code> for Python/Docker server
            </p>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
            <pre>{xiaozhiServerYaml}</pre>
          </div>
        </div>

        {/* Box 3: Claude Desktop / Cursor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                Claude Desktop / Cursor
              </span>
              <button
                onClick={() => copyToClipboard(claudeDesktopConfig, 'claude')}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                {copiedSection === 'claude' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Use this MCP Center in desktop LLM clients simultaneously
            </p>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
            <pre>{claudeDesktopConfig}</pre>
          </div>
        </div>
      </div>

      {/* Real-Time Tool Execution Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Real-Time Execution Logs & Telemetry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inspection of every JSON-RPC tool invocation with latency and parameter breakdown
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLogsJson}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No execution logs yet. Test a tool or send a voice command to Xiaozhi to see real-time events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Tool</th>
                  <th className="py-2.5 px-3">Caller</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/40 transition-colors font-mono cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400 font-semibold whitespace-nowrap">
                      {log.toolName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {log.caller}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 tabular-nums whitespace-nowrap">
                      {log.durationMs}ms
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-semibold text-amber-400">
                  {selectedLog.toolName}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  · {selectedLog.durationMs}ms · {selectedLog.caller}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="text-[11px] text-slate-400 mb-1">Arguments:</div>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-slate-300 max-h-40">
                  {JSON.stringify(selectedLog.arguments, null, 2)}
                </pre>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 mb-1">Result:</div>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-slate-300 max-h-48">
                  {typeof selectedLog.result === 'string'
                    ? selectedLog.result
                    : JSON.stringify(selectedLog.result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
