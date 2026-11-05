import 'dotenv/config';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { pluginRegistry } from './server/pluginRegistry.js';
import { mcpServerManager } from './server/mcpServer.js';
import { simulateXiaozhiInteraction } from './server/geminiService.js';
import { xiaozhiCloudBridge } from './server/xiaozhiCloudBridge.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const args = process.argv.slice(2);
  const portArgIndex = args.indexOf('--port');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    const p = parseInt(args[portArgIndex + 1], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }
  return 3000;
}

const PORT = resolvePort();

// Enable CORS & JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// 1. Model Context Protocol (MCP) Endpoints
// ==========================================

// Official MCP SSE Transport endpoint
app.get('/mcp/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sessionId = `mcp-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  mcpServerManager.addSseClient(sessionId, res);

  req.on('close', () => {
    mcpServerManager.removeSseClient(sessionId);
  });
});

// Official MCP message POST endpoint (matches session)
app.post('/mcp/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const caller = (req.headers['x-caller'] as any) || 'mcp-client';
  const responsePayload = await mcpServerManager.handleJsonRpc(req.body, caller);

  if (responsePayload === null) {
    return res.status(202).send();
  }
  return res.json(responsePayload);
});

// Direct HTTP JSON-RPC 2.0 Endpoint (Xiaozhi ESP32-S3 direct RPC & Web testing)
app.post('/api/mcp/rpc', async (req: Request, res: Response) => {
  const caller = (req.headers['x-caller'] as any) || 'xiaozhi-esp32';
  const responsePayload = await mcpServerManager.handleJsonRpc(req.body, caller);

  if (responsePayload === null) {
    return res.status(204).send();
  }
  return res.json(responsePayload);
});

// Exportable MCP Server Configurations for Xiaozhi Firmware and Claude/Cursor
app.get('/api/mcp/config', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const xiaozhiFirmwareConfig = {
    mcp_enabled: true,
    mcp_mode: 'sse',
    mcp_server_url: `${baseUrl}/mcp/sse`,
    mcp_direct_rpc_url: `${baseUrl}/api/mcp/rpc`,
    heartbeat_interval_sec: 30,
    active_tools_count: pluginRegistry.getActiveTools().length,
  };

  const claudeDesktopConfig = {
    mcpServers: {
      'xiaozhi-center': {
        url: `${baseUrl}/mcp/sse`,
      },
    },
  };

  const xiaozhiServerYaml = `
# Xiaozhi AI ESP32 Server Configuration (config.yaml)
mcp:
  enabled: true
  transport: sse
  url: "${baseUrl}/mcp/sse"
  rpc_endpoint: "${baseUrl}/api/mcp/rpc"
  auto_reconnect: true
  timeout_ms: 8000
`.trim();

  res.json({
    baseUrl,
    xiaozhiFirmwareConfig,
    claudeDesktopConfig,
    xiaozhiServerYaml,
    activeToolsCount: pluginRegistry.getActiveTools().length,
  });
});

// Direct export: Stream tar.gz archive of the complete source repository
app.get('/api/project/download', (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Disposition', `attachment; filename="xiaozhi-mcp-center-${timestamp}.tar.gz"`);
  res.setHeader('Content-Type', 'application/gzip');

  const tarProcess = spawn('tar', [
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.git',
    '-czf',
    '-',
    '.',
  ]);

  tarProcess.stdout.pipe(res);

  tarProcess.stderr.on('data', (data) => {
    console.warn(`tar warning: ${data}`);
  });

  tarProcess.on('error', (err) => {
    console.error('Failed to create archive:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate archive' });
    }
  });
});

// ==========================================
// 2. Custom Plugins & Tool Management Endpoints
// ==========================================

// Get all tools & plugins
app.get('/api/plugins', (_req: Request, res: Response) => {
  const tools = pluginRegistry.getAllTools();
  res.json({
    tools,
    total: tools.length,
    activeCount: tools.filter((t) => t.enabled).length,
  });
});

// Upsert a tool / custom plugin
app.post('/api/plugins', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name || !body.description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  // Sanitize tool name: letters, numbers, underscores only
  const sanitizedName = body.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

  const tool = {
    ...body,
    name: sanitizedName,
    enabled: body.enabled ?? true,
    category: body.category || 'custom',
    isCustom: body.isCustom ?? true,
    pluginId: body.pluginId || `custom_${sanitizedName}`,
    handlerType: body.handlerType || 'mock',
    inputSchema: body.inputSchema || {
      type: 'object',
      properties: {},
    },
  };

  pluginRegistry.upsertTool(tool);
  mcpServerManager.broadcastToolListChanged();
  xiaozhiCloudBridge.notifyToolListChanged();

  res.json({ success: true, tool });
});

// Toggle tool enabled state
app.post('/api/plugins/:name/toggle', (req: Request, res: Response) => {
  const toolName = req.params.name;
  const isEnabled = pluginRegistry.toggleTool(toolName);
  mcpServerManager.broadcastToolListChanged();
  xiaozhiCloudBridge.notifyToolListChanged();
  res.json({ success: true, toolName, enabled: isEnabled });
});

// Delete custom tool
app.delete('/api/plugins/:name', (req: Request, res: Response) => {
  const toolName = req.params.name;
  const deleted = pluginRegistry.deleteTool(toolName);
  if (!deleted) {
    return res.status(400).json({ error: 'Cannot delete default tool or tool not found' });
  }
  mcpServerManager.broadcastToolListChanged();
  xiaozhiCloudBridge.notifyToolListChanged();
  res.json({ success: true, toolName });
});

// Xiaozhi Cloud Bridge (wss://api.xiaozhi.me/mcp/?token=...)
app.get('/api/xiaozhi/cloud-bridge', (_req: Request, res: Response) => {
  res.json(xiaozhiCloudBridge.getStatus());
});

app.post('/api/xiaozhi/cloud-bridge/connect', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'WebSocket entrypoint URL is required' });
  }
  xiaozhiCloudBridge.connect(url);
  res.json(xiaozhiCloudBridge.getStatus());
});

app.post('/api/xiaozhi/cloud-bridge/disconnect', (_req: Request, res: Response) => {
  xiaozhiCloudBridge.disconnect();
  res.json(xiaozhiCloudBridge.getStatus());
});

app.post('/api/xiaozhi/cloud-bridge/reload-env', (_req: Request, res: Response) => {
  xiaozhiCloudBridge.initFromEnv(true);
  res.json(xiaozhiCloudBridge.getStatus());
});

// Direct test execution of a tool
app.post('/api/plugins/execute', async (req: Request, res: Response) => {
  const { toolName, args, caller } = req.body;
  if (!toolName) {
    return res.status(400).json({ error: 'toolName is required' });
  }

  const { result, isError } = await pluginRegistry.executeTool(toolName, args || {}, caller || 'simulator');
  res.json({
    toolName,
    result,
    isError,
    deviceState: pluginRegistry.deviceState,
  });
});

// ==========================================
// 3. Xiaozhi Device State & Chat Simulator
// ==========================================

// Get Xiaozhi ESP32-S3 Hardware State
app.get('/api/xiaozhi/device', (_req: Request, res: Response) => {
  res.json(pluginRegistry.deviceState);
});

// Update Xiaozhi Hardware State
app.post('/api/xiaozhi/device', (req: Request, res: Response) => {
  const { expression, ledRing, batteryLevel, status } = req.body;
  if (expression) pluginRegistry.deviceState.currentExpression = expression;
  if (ledRing) pluginRegistry.deviceState.ledRing = { ...pluginRegistry.deviceState.ledRing, ...ledRing };
  if (typeof batteryLevel === 'number') pluginRegistry.deviceState.batteryLevel = batteryLevel;
  if (status) pluginRegistry.deviceState.status = status;
  pluginRegistry.deviceState.lastSeen = new Date().toISOString();

  res.json({ success: true, state: pluginRegistry.deviceState });
});

// Conversational Simulator with Function Calling
app.post('/api/xiaozhi/simulate-chat', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const result = await simulateXiaozhiInteraction(prompt);
  res.json({
    ...result,
    deviceState: pluginRegistry.deviceState,
  });
});

// ==========================================
// 4. Secret Words & Voice Aliases Endpoints
// ==========================================

app.get('/api/secret-words', (_req: Request, res: Response) => {
  res.json({ secretWords: pluginRegistry.getSecretWords() });
});

app.post('/api/secret-words', (req: Request, res: Response) => {
  const { triggerPhrase, expandedPrompt, description, matchMode, enabled, id } = req.body;
  if (!triggerPhrase || !expandedPrompt) {
    return res.status(400).json({ error: 'triggerPhrase and expandedPrompt are required' });
  }

  const alias = {
    id: id || `sw-${Date.now()}`,
    triggerPhrase: triggerPhrase.trim(),
    expandedPrompt: expandedPrompt.trim(),
    description: description?.trim() || '',
    matchMode: matchMode || 'contains',
    enabled: enabled ?? true,
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };

  pluginRegistry.upsertSecretWord(alias);
  res.json({ success: true, alias });
});

app.delete('/api/secret-words/:id', (req: Request, res: Response) => {
  const deleted = pluginRegistry.deleteSecretWord(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/secret-words/:id/toggle', (req: Request, res: Response) => {
  const enabled = pluginRegistry.toggleSecretWord(req.params.id);
  res.json({ success: true, enabled });
});

app.post('/api/secret-words/test', (req: Request, res: Response) => {
  const { phrase } = req.body;
  if (!phrase) {
    return res.status(400).json({ error: 'phrase is required' });
  }
  const resolution = pluginRegistry.resolveSecretWord(phrase);
  res.json(resolution);
});

// ==========================================
// 5. Automations & Webhooks
// ==========================================

app.get('/api/automations', (_req: Request, res: Response) => {
  res.json(pluginRegistry.getAutomations());
});

app.post('/api/automations', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const rule = {
    ...body,
    id: body.id || `auto-${Date.now()}`,
    enabled: body.enabled ?? true,
    triggerCount: body.triggerCount || 0,
  };

  pluginRegistry.upsertAutomation(rule);
  res.json({ success: true, rule });
});

app.delete('/api/automations/:id', (req: Request, res: Response) => {
  const deleted = pluginRegistry.deleteAutomation(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/automations/:id/toggle', (req: Request, res: Response) => {
  const enabled = pluginRegistry.toggleAutomation(req.params.id);
  res.json({ success: true, enabled });
});

// Manual trigger an automation rule
app.post('/api/automations/:id/trigger', async (req: Request, res: Response) => {
  const automations = pluginRegistry.getAutomations();
  const rule = automations.find((a) => a.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }

  rule.triggerCount += 1;
  rule.lastTriggered = new Date().toISOString();

  let executionResult: any = null;

  if (rule.actionType === 'execute_tool' && rule.actionConfig?.toolName) {
    executionResult = await pluginRegistry.executeTool(
      rule.actionConfig.toolName,
      rule.actionConfig.toolArguments || {},
      'automation'
    );
  } else if (rule.actionType === 'speak_alert' && rule.actionConfig?.voiceMessage) {
    executionResult = await pluginRegistry.executeTool(
      'speech_broadcast_alert',
      {
        message: rule.actionConfig.voiceMessage,
        emotion: rule.actionConfig.voiceEmotion || 'neutral',
      },
      'automation'
    );
  }

  res.json({ success: true, rule, executionResult, deviceState: pluginRegistry.deviceState });
});

// Incoming Webhook trigger
app.post('/api/webhook/trigger', async (req: Request, res: Response) => {
  const payload = req.body || {};
  const message = payload.message || payload.alert || payload.text || 'Incoming sensor trigger event received.';
  const emotion = payload.emotion || 'urgent';

  const executionResult = await pluginRegistry.executeTool(
    'speech_broadcast_alert',
    { message, emotion },
    'api'
  );

  res.json({
    status: 'received',
    message: 'Xiaozhi voice alert triggered via webhook',
    payload,
    executionResult,
    deviceState: pluginRegistry.deviceState,
  });
});

// ==========================================
// 5. Execution Logs & Metrics
// ==========================================

app.get('/api/logs', (_req: Request, res: Response) => {
  res.json(pluginRegistry.getLogs());
});

app.delete('/api/logs', (_req: Request, res: Response) => {
  pluginRegistry.clearLogs();
  res.json({ success: true });
});

// ==========================================
// 6. Vite Mounting (Dev & Prod)
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Xiaozhi AI MCP Center running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
