import { Response } from 'express';
import { pluginRegistry } from './pluginRegistry.js';

export interface SseClient {
  id: string;
  res: Response;
  createdAt: number;
}

export class McpServerManager {
  private sseClients: Map<string, SseClient> = new Map();

  public addSseClient(id: string, res: Response) {
    this.sseClients.set(id, { id, res, createdAt: Date.now() });

    // Send the mandatory MCP 'endpoint' event with the message POST URL
    res.write(`event: endpoint\ndata: /mcp/message?sessionId=${id}\n\n`);
  }

  public removeSseClient(id: string) {
    this.sseClients.delete(id);
  }

  public broadcastToolListChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed',
      params: {},
    };
    const payload = `event: message\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const client of this.sseClients.values()) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Client might have disconnected
        this.sseClients.delete(client.id);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.sseClients.size;
  }

  public async handleJsonRpc(
    request: any,
    caller: 'xiaozhi-esp32' | 'simulator' | 'mcp-client' | 'automation' | 'api' = 'mcp-client'
  ): Promise<any> {
    const { id, method, params } = request || {};

    if (!method) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32600, message: 'Invalid Request: missing method' },
      };
    }

    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'xiaozhi-mcp-center',
              version: '1.2.0',
              description: 'Model Context Protocol Aggregator for Xiaozhi ESP32-S3 AI Bot',
            },
          },
        };
      }

      case 'notifications/initialized': {
        // Notifications do not return a response in JSON-RPC
        return null;
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };
      }

      case 'tools/list': {
        const activeTools = pluginRegistry.getActiveTools();
        const toolsPayload = activeTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: toolsPayload,
          },
        };
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: missing tool name' },
          };
        }

        const { result, isError } = await pluginRegistry.executeTool(toolName, toolArgs, caller);

        const textOutput = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: textOutput,
              },
            ],
            isError,
          },
        };
      }

      case 'resources/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'xiaozhi://hardware/telemetry',
                name: 'Xiaozhi ESP32-S3 Live Telemetry',
                mimeType: 'application/json',
                description: 'Real-time battery, CPU temperature, and Wi-Fi RSSI',
              },
            ],
          },
        };
      }

      case 'prompts/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: 'xiaozhi_morning_briefing',
                description: 'Execute weather and schedule tools to provide an audio wake-up summary',
              },
            ],
          },
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }
    }
  }
}

export const mcpServerManager = new McpServerManager();
