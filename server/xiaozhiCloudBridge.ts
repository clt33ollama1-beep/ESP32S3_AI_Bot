import dotenv from 'dotenv';
import { pluginRegistry } from './pluginRegistry.js';
import { mcpServerManager } from './mcpServer.js';

// Ensure .env is loaded in this module
dotenv.config();

export interface XiaozhiCloudBridgeStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  url: string;
  sanitizedUrl: string;
  configuredInEnv: boolean;
  connectedAt: string | null;
  lastPingMs: number | null;
  lastError: string | null;
  messagesSent: number;
  messagesReceived: number;
  activeToolsCount: number;
  reconnectAttempts: number;
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
    this.initFromEnv(false);
  }

  /**
   * Cleans URL of any accidental surrounding quotes, whitespace, or escapes
   */
  public cleanUrl(urlStr: string): string {
    if (!urlStr) return '';
    return urlStr
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
      .trim();
  }

  /**
   * Sanitizes token parameter in the URL for safe display in logs and UI
   */
  public sanitizeUrl(urlStr: string): string {
    const raw = this.cleanUrl(urlStr);
    if (!raw) return '';
    try {
      const urlObj = new URL(raw);
      const token = urlObj.searchParams.get('token');
      if (token && token.length > 10) {
        urlObj.searchParams.set('token', token.substring(0, 6) + '...' + token.slice(-4));
      }
      return urlObj.toString();
    } catch {
      return raw.length > 40 ? raw.substring(0, 36) + '...' : raw;
    }
  }

  /**
   * Initializes or reloads outbound WebSocket connection using XIAOZHI_MCP_WS_URL from .env
   */
  public initFromEnv(forceReloadDotenv: boolean = true): void {
    if (forceReloadDotenv) {
      try {
        dotenv.config({ override: true });
      } catch (err) {
        console.warn('[XiaozhiCloudBridge] Note: dotenv reload failed:', err);
      }
    }

    const envUrl = this.cleanUrl(process.env.XIAOZHI_MCP_WS_URL || '');
    if (envUrl && (envUrl.startsWith('ws://') || envUrl.startsWith('wss://'))) {
      console.log(`[XiaozhiCloudBridge] Auto-connecting from XIAOZHI_MCP_WS_URL: ${this.sanitizeUrl(envUrl)}`);
      this.targetUrl = envUrl;
      this.connect(envUrl);
    } else if (envUrl) {
      this.targetUrl = envUrl;
      this.status = 'error';
      this.lastError = `Invalid XIAOZHI_MCP_WS_URL in .env: must start with wss:// or ws:// (got "${envUrl.substring(0, 15)}...")`;
      console.warn(`[XiaozhiCloudBridge] ${this.lastError}`);
    } else {
      console.log(`[XiaozhiCloudBridge] No XIAOZHI_MCP_WS_URL set in environment. Waiting for manual connect or .env update.`);
    }
  }

  public getStatus(): XiaozhiCloudBridgeStatus {
    const envUrl = this.cleanUrl(process.env.XIAOZHI_MCP_WS_URL || '');
    const activeUrl = this.targetUrl || envUrl;

    return {
      status: this.status,
      url: activeUrl,
      sanitizedUrl: this.sanitizeUrl(activeUrl),
      configuredInEnv: Boolean(envUrl && (envUrl.startsWith('ws://') || envUrl.startsWith('wss://'))),
      connectedAt: this.connectedAt,
      lastPingMs: this.lastPingMs,
      lastError: this.lastError,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      activeToolsCount: pluginRegistry.getActiveTools().length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public connect(url?: string): void {
    if (url) {
      this.targetUrl = this.cleanUrl(url);
    } else if (!this.targetUrl) {
      const envUrl = this.cleanUrl(process.env.XIAOZHI_MCP_WS_URL || '');
      if (envUrl) {
        this.targetUrl = envUrl;
      }
    }

    if (!this.targetUrl || (!this.targetUrl.startsWith('ws://') && !this.targetUrl.startsWith('wss://'))) {
      this.status = 'error';
      this.lastError = 'Invalid WebSocket URL. Must start with wss:// or ws:// (e.g. wss://api.xiaozhi.me/mcp/?token=ey...)';
      return;
    }

    // Clean existing connection before opening new
    this.cleanup();

    this.status = 'connecting';
    this.lastError = null;
    this.autoReconnect = true;

    try {
      console.log(`[XiaozhiCloudBridge] Connecting to Xiaozhi Cloud Gateway: ${this.sanitizeUrl(this.targetUrl)}`);
      this.ws = new WebSocket(this.targetUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.connectedAt = new Date().toISOString();
        this.reconnectAttempts = 0;
        this.lastError = null;
        console.log(`[XiaozhiCloudBridge] Successfully connected to Xiaozhi Cloud MCP gateway (${this.sanitizeUrl(this.targetUrl)})!`);

        // Send MCP initialized notification
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

        // Broadcast tools list changed so Xiaozhi platform pulls all active tools immediately
        this.notifyToolListChanged();

        // Start heartbeat ping
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
        const rawMsg = err?.message || (typeof err === 'object' && Object.keys(err).length ? JSON.stringify(err) : '');
        this.lastError = rawMsg || 'WebSocket connection error. Token may be invalid or refused by server.';
        console.warn('[XiaozhiCloudBridge] WebSocket error:', this.lastError);
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[XiaozhiCloudBridge] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
        this.connectedAt = null;
        this.cleanupHeartbeat();

        if (event.code === 1000) {
          // Clean disconnection by user
          this.status = 'disconnected';
          this.lastError = null;
        } else if (event.code === 1006) {
          // Abnormal closure (token invalid/expired, HTTP 401/403 handshake rejection, or network drop)
          this.status = 'error';
          this.lastError =
            'Connection closed abnormally (code 1006). Usually caused by an invalid/expired token or server handshake rejection. Please verify your token on xiaozhi.me.';
        } else if (event.code === 1002 || event.code === 1008) {
          this.status = 'error';
          this.lastError = `Connection policy violation (code ${event.code}). Token unauthorized or invalid.`;
        } else {
          this.status = 'error';
          this.lastError = `Connection closed (code ${event.code}${event.reason ? ': ' + event.reason : ''})`;
        }

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
    this.lastError = null;
    this.reconnectAttempts = 0;
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
        this.status = 'connecting';
        this.connect();
      }
    }, delay);
  }

  public getSanitizedUrl(): string {
    return this.sanitizeUrl(this.targetUrl);
  }
}

export const xiaozhiCloudBridge = new XiaozhiCloudBridge();
