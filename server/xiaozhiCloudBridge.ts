import { pluginRegistry } from './pluginRegistry.js';
import { mcpServerManager } from './mcpServer.js';

export interface XiaozhiCloudBridgeStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  url: string;
  connectedAt: string | null;
  lastPingMs: number | null;
  lastError: string | null;
  messagesSent: number;
  messagesReceived: number;
  activeToolsCount: number;
}

export class XiaozhiCloudBridge {
  private ws: WebSocket | null = null;
  private targetUrl: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastError: string | null = null;
  private connectedAt: string | null = null;
  private lastPingMs: number | null = null;
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private pingIntervalTimer: any = null;
  private reconnectTimer: any = null;
  private autoReconnect: boolean = true;
  private reconnectAttempts: number = 0;

  constructor() {
    // Check if URL was supplied via environment variable
    const envUrl = process.env.XIAOZHI_MCP_WS_URL;
    if (envUrl && envUrl.startsWith('ws')) {
      console.log(`[XiaozhiCloudBridge] Auto-connecting from XIAOZHI_MCP_WS_URL env var...`);
      this.connect(envUrl);
    }
  }

  public getStatus(): XiaozhiCloudBridgeStatus {
    return {
      status: this.status,
      url: this.targetUrl,
      connectedAt: this.connectedAt,
      lastPingMs: this.lastPingMs,
      lastError: this.lastError,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      activeToolsCount: pluginRegistry.getActiveTools().length,
    };
  }

  public connect(url?: string): void {
    if (url) {
      this.targetUrl = url.trim();
    }

    if (!this.targetUrl || !this.targetUrl.startsWith('ws')) {
      this.status = 'error';
      this.lastError = 'Invalid WebSocket URL. Must start with wss:// or ws://';
      return;
    }

    // Clean existing connection
    this.cleanup();

    this.status = 'connecting';
    this.lastError = null;
    this.autoReconnect = true;

    try {
      console.log(`[XiaozhiCloudBridge] Connecting to Xiaozhi Cloud: ${this.getSanitizedUrl()}`);
      this.ws = new WebSocket(this.targetUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.connectedAt = new Date().toISOString();
        this.reconnectAttempts = 0;
        this.lastError = null;
        console.log(`[XiaozhiCloudBridge] Successfully connected to Xiaozhi Cloud MCP gateway!`);

        // Send MCP initialize or announcement so Xiaozhi knows who we are
        this.sendJson({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {
            clientInfo: {
              name: 'xiaozhi-mcp-center',
              version: '1.2.0',
              description: 'Model Context Protocol Aggregator for Xiaozhi ESP32-S3',
            },
          },
        });

        // Start heartbeat ping every 25 seconds to keep connection and NAT session alive
        this.startHeartbeat();
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        this.messagesReceived++;
        try {
          const rawData = typeof event.data === 'string' ? event.data : event.data.toString();
          const request = JSON.parse(rawData);

          // Handle MCP JSON-RPC message
          const response = await mcpServerManager.handleJsonRpc(request, 'xiaozhi-esp32');

          if (response && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendJson(response);
          }
        } catch (err: any) {
          console.error('[XiaozhiCloudBridge] Error processing message from Xiaozhi Cloud:', err);
        }
      };

      this.ws.onerror = (err: any) => {
        this.status = 'error';
        this.lastError = err?.message || 'WebSocket connection error';
        console.warn('[XiaozhiCloudBridge] WebSocket error:', this.lastError);
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[XiaozhiCloudBridge] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
        this.status = 'disconnected';
        this.connectedAt = null;
        this.cleanupHeartbeat();

        if (this.autoReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err: any) {
      this.status = 'error';
      this.lastError = err?.message || 'Failed to initialize WebSocket client';
      console.error('[XiaozhiCloudBridge] Init error:', err);
    }
  }

  public disconnect(): void {
    this.autoReconnect = false;
    this.cleanup();
    this.status = 'disconnected';
    this.connectedAt = null;
    console.log('[XiaozhiCloudBridge] Disconnected by user.');
  }

  public notifyToolListChanged(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJson({
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
        params: {},
      });
    }
  }

  private sendJson(payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
      this.messagesSent++;
    } catch (err) {
      console.error('[XiaozhiCloudBridge] Failed to send JSON payload:', err);
    }
  }

  private startHeartbeat(): void {
    this.cleanupHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingStart = Date.now();
        this.sendJson({
          jsonrpc: '2.0',
          id: `ping-${Date.now()}`,
          method: 'ping',
          params: {},
        });
        this.lastPingMs = Date.now() - pingStart;
      }
    }, 25000);
  }

  private cleanupHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private cleanup(): void {
    this.cleanupHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Exponential backoff capped at 30 seconds
    const delay = Math.min(30000, 2000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)));
    console.log(`[XiaozhiCloudBridge] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.autoReconnect) {
        this.connect();
      }
    }, delay);
  }

  public getSanitizedUrl(): string {
    if (!this.targetUrl) return '';
    try {
      const urlObj = new URL(this.targetUrl);
      const token = urlObj.searchParams.get('token');
      if (token && token.length > 10) {
        urlObj.searchParams.set('token', token.substring(0, 6) + '...' + token.slice(-4));
      }
      return urlObj.toString();
    } catch {
      return this.targetUrl.substring(0, 30) + '...';
    }
  }
}

export const xiaozhiCloudBridge = new XiaozhiCloudBridge();
