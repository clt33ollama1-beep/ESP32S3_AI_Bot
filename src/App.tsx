/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar.js';
import { PluginCatalog } from './components/PluginCatalog.js';
import { XiaozhiSimulator } from './components/XiaozhiSimulator.js';
import { AutomationEngine } from './components/AutomationEngine.js';
import { ProtocolInspector } from './components/ProtocolInspector.js';
import { PluginTestModal } from './components/PluginTestModal.js';
import { CreatePluginModal } from './components/CreatePluginModal.js';
import { ExportDeployModal } from './components/ExportDeployModal.js';
import {
  McpToolDefinition,
  XiaozhiDeviceState,
  AutomationRule,
  ToolExecutionLog,
} from './types.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<'plugins' | 'simulator' | 'automations' | 'protocol'>('plugins');

  const [tools, setTools] = useState<McpToolDefinition[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<ToolExecutionLog[]>([]);
  const [deviceState, setDeviceState] = useState<XiaozhiDeviceState>({
    deviceId: 'esp32s3-xz-8a4b2c',
    deviceName: 'Xiaozhi AI Companion (ESP32-S3)',
    status: 'idle',
    firmwareVersion: 'v2.4.2-mcp',
    ipAddress: '192.168.1.188',
    batteryLevel: 88,
    wifiRssi: -54,
    currentExpression: 'happy',
    ledRing: {
      mode: 'solid',
      color: '#FF9900',
      brightness: 75,
    },
    lastSeen: new Date().toISOString(),
  });

  const [testingTool, setTestingTool] = useState<McpToolDefinition | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Fetch tools from server
  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins');
      const data = await res.json();
      if (data.tools) {
        setTools(data.tools);
      }
    } catch (err) {
      console.warn('Failed to fetch tools:', err);
    }
  }, []);

  // Fetch automations
  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (err) {
      console.warn('Failed to fetch automations:', err);
    }
  }, []);

  // Fetch execution logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Failed to fetch logs:', err);
    }
  }, []);

  // Fetch Xiaozhi device status
  const fetchDeviceState = useCallback(async () => {
    try {
      const res = await fetch('/api/xiaozhi/device');
      const data = await res.json();
      if (data.deviceId) {
        setDeviceState(data);
      }
    } catch (err) {
      console.warn('Failed to fetch device state:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    Promise.all([fetchTools(), fetchAutomations(), fetchLogs(), fetchDeviceState()]).finally(() => {
      setLoadingInitial(false);
    });

    // Periodic telemetry refresh
    const interval = setInterval(() => {
      fetchLogs();
      fetchDeviceState();
    }, 4500);

    return () => clearInterval(interval);
  }, [fetchTools, fetchAutomations, fetchLogs, fetchDeviceState]);

  // Tool actions
  const handleToggleTool = async (name: string) => {
    try {
      const res = await fetch(`/api/plugins/${name}/toggle`, { method: 'POST' });
      const data = await res.json();
      setTools((prev) =>
        prev.map((t) => (t.name === name ? { ...t, enabled: data.enabled } : t))
      );
    } catch (err) {
      console.error('Toggle tool error:', err);
    }
  };

  const handleDeleteTool = async (name: string) => {
    try {
      const res = await fetch(`/api/plugins/${name}`, { method: 'DELETE' });
      if (res.ok) {
        setTools((prev) => prev.filter((t) => t.name !== name));
      }
    } catch (err) {
      console.error('Delete tool error:', err);
    }
  };

  const handleDeviceStateChange = (updates: Partial<XiaozhiDeviceState>) => {
    setDeviceState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* 3-Zone Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        activeToolsCount={tools.filter((t) => t.enabled).length}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'plugins' && (
          <PluginCatalog
            tools={tools}
            onToggleTool={handleToggleTool}
            onDeleteTool={handleDeleteTool}
            onTestTool={(tool) => setTestingTool(tool)}
            onOpenCreate={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'simulator' && (
          <XiaozhiSimulator
            deviceState={deviceState}
            onRefreshDevice={fetchDeviceState}
            onDeviceStateChange={handleDeviceStateChange}
          />
        )}

        {activeTab === 'automations' && (
          <AutomationEngine
            rules={rules}
            tools={tools}
            onRefreshRules={fetchAutomations}
            onRefreshLogs={fetchLogs}
          />
        )}

        {activeTab === 'protocol' && (
          <ProtocolInspector
            logs={logs}
            onClearLogs={async () => {
              await fetch('/api/logs', { method: 'DELETE' });
              setLogs([]);
            }}
            activeToolsCount={tools.filter((t) => t.enabled).length}
          />
        )}
      </main>

      {/* Quiet Technical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Xiaozhi AI MCP Center</span>
            <span aria-hidden="true">·</span>
            <span>ESP32-S3 Xtensa LX7</span>
            <span aria-hidden="true">·</span>
            <span>JSON-RPC 2.0 / SSE</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-emerald-400">
              ● Gateway Active
            </span>
            <span>Port 3000</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PluginTestModal
        tool={testingTool}
        onClose={() => setTestingTool(null)}
        onExecutionComplete={() => {
          fetchLogs();
          fetchDeviceState();
        }}
      />

      <CreatePluginModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newTool) => {
          setTools((prev) => [newTool, ...prev]);
          fetchTools();
        }}
      />

      <ExportDeployModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
