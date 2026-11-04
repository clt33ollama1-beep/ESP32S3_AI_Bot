export interface McpToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  default?: any;
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolParameter>;
  required?: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  category: 'hardware' | 'smarthome' | 'productivity' | 'web' | 'media' | 'custom';
  enabled: boolean;
  isCustom?: boolean;
  pluginId: string;
  handlerType: 'mock' | 'webhook' | 'ai';
  webhookConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };
  mockReturnValue?: string;
  aiPromptTemplate?: string;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ToolExecutionLog {
  id: string;
  timestamp: string;
  toolName: string;
  pluginId: string;
  caller: 'xiaozhi-esp32' | 'simulator' | 'mcp-client' | 'automation' | 'api';
  arguments: Record<string, any>;
  result: any;
  status: 'success' | 'error';
  durationMs: number;
  errorMessage?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerType: 'webhook' | 'schedule' | 'hardware_event';
  triggerConfig: {
    webhookEndpoint?: string;
    cronExpression?: string;
    scheduleIntervalMin?: number;
    hardwareEvent?: 'button_press' | 'pir_motion' | 'low_battery' | 'voice_wakeword';
  };
  actionType: 'execute_tool' | 'speak_alert' | 'webhook_forward';
  actionConfig: {
    toolName?: string;
    toolArguments?: Record<string, any>;
    voiceMessage?: string;
    voiceEmotion?: string;
    targetWebhookUrl?: string;
  };
  lastTriggered?: string;
  triggerCount: number;
}

export interface XiaozhiDeviceState {
  deviceId: string;
  deviceName: string;
  status: 'online' | 'idle' | 'busy' | 'offline';
  firmwareVersion: string;
  ipAddress: string;
  batteryLevel: number;
  wifiRssi: number;
  currentExpression: 'happy' | 'listening' | 'thinking' | 'speaking' | 'sleep' | 'shocked' | 'neutral';
  ledRing: {
    mode: 'solid' | 'pulse' | 'rainbow' | 'off';
    color: string;
    brightness: number;
  };
  lastSeen: string;
}

export interface SecretWordAlias {
  id: string;
  triggerPhrase: string;
  expandedPrompt: string;
  description?: string;
  matchMode: 'contains' | 'exact' | 'fuzzy';
  enabled: boolean;
  triggerCount: number;
  lastTriggered?: string;
  createdAt: string;
}
