import { McpToolDefinition, ToolExecutionLog, XiaozhiDeviceState, AutomationRule } from './types.js';

export class PluginRegistry {
  private tools: Map<string, McpToolDefinition> = new Map();
  private logs: ToolExecutionLog[] = [];
  private automations: AutomationRule[] = [];
  public deviceState: XiaozhiDeviceState = {
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
  };

  constructor() {
    this.registerDefaultTools();
    this.registerDefaultAutomations();
  }

  private registerDefaultTools() {
    const defaults: McpToolDefinition[] = [
      {
        name: 'esp32_set_led_ring',
        description: 'Control the physical WS2812B NeoPixel RGB LED mood light ring on the ESP32-S3 Xiaozhi bot base.',
        category: 'hardware',
        enabled: true,
        isCustom: false,
        pluginId: 'esp32_hardware',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              description: 'Lighting effect mode',
              enum: ['solid', 'pulse', 'rainbow', 'off'],
            },
            color: {
              type: 'string',
              description: 'Hex color code (e.g. #FF9900 for warm amber, #00E5FF for cyan, #10B981 for emerald)',
            },
            brightness: {
              type: 'number',
              description: 'Brightness percentage from 0 to 100',
            },
          },
          required: ['mode'],
        },
      },
      {
        name: 'esp32_set_oled_expression',
        description: 'Change the facial emotion expression rendered on the Xiaozhi 0.96-inch OLED / TFT screen.',
        category: 'hardware',
        enabled: true,
        isCustom: false,
        pluginId: 'esp32_hardware',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Facial emotion display',
              enum: ['happy', 'listening', 'thinking', 'speaking', 'sleep', 'shocked', 'neutral'],
            },
            caption: {
              type: 'string',
              description: 'Optional 1-line text banner beneath eyes',
            },
          },
          required: ['expression'],
        },
      },
      {
        name: 'esp32_play_buzzer',
        description: 'Play an acoustic tone or melodic jingle through the Xiaozhi piezo buzzer or onboard DAC.',
        category: 'hardware',
        enabled: true,
        isCustom: false,
        pluginId: 'esp32_hardware',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            tone: {
              type: 'string',
              description: 'Musical sound effect or alert chime',
              enum: ['beep', 'success', 'alert', 'chime', 'mario'],
            },
            repeats: {
              type: 'number',
              description: 'Number of repetitions (1-5)',
            },
          },
          required: ['tone'],
        },
      },
      {
        name: 'esp32_get_telemetry',
        description: 'Read physical diagnostics from the ESP32-S3 microcontroller: battery %, voltage, Wi-Fi RSSI, CPU temperature, free heap memory.',
        category: 'hardware',
        enabled: true,
        isCustom: false,
        pluginId: 'esp32_hardware',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'iot_toggle_device',
        description: 'Switch smart home devices, lights, plugs, or AC units via Home Assistant or local MQTT.',
        category: 'smarthome',
        enabled: true,
        isCustom: false,
        pluginId: 'smart_home_iot',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device identifier e.g. living_room_light, air_conditioner, desk_fan',
            },
            state: {
              type: 'string',
              description: 'Target state',
              enum: ['on', 'off', 'toggle'],
            },
            brightness: {
              type: 'number',
              description: 'Optional brightness level 1-100%',
            },
          },
          required: ['device_id', 'state'],
        },
      },
      {
        name: 'iot_get_climate',
        description: 'Query room environmental sensor: current temperature, relative humidity, and air quality.',
        category: 'smarthome',
        enabled: true,
        isCustom: false,
        pluginId: 'smart_home_iot',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            room: {
              type: 'string',
              description: 'Room name e.g. bedroom, living_room, office, balcony',
            },
          },
          required: ['room'],
        },
      },
      {
        name: 'timer_set_voice_countdown',
        description: 'Schedule a voice countdown timer that will ring Xiaozhi when finished.',
        category: 'productivity',
        enabled: true,
        isCustom: false,
        pluginId: 'productivity_timers',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            minutes: {
              type: 'number',
              description: 'Duration in minutes',
            },
            label: {
              type: 'string',
              description: 'Purpose of timer e.g. Tea brewing, Pomodoro focus, Pasta boiling',
            },
          },
          required: ['minutes', 'label'],
        },
      },
      {
        name: 'notes_create_voice_memo',
        description: 'Save a quick audio transcription memo or reminder to Xiaozhi notebook.',
        category: 'productivity',
        enabled: true,
        isCustom: false,
        pluginId: 'productivity_timers',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Memo headline',
            },
            content: {
              type: 'string',
              description: 'Detailed notes transcribed from voice',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'web_search_summary',
        description: 'Search live web information, latest news, and factual queries.',
        category: 'web',
        enabled: true,
        isCustom: false,
        pluginId: 'web_intelligence',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keyword or query question',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'weather_get_forecast',
        description: 'Get current weather conditions, temperature, humidity, and forecast for a given location.',
        category: 'web',
        enabled: true,
        isCustom: false,
        pluginId: 'web_intelligence',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'City or district name (e.g. Shenzhen, Tokyo, San Francisco, London)',
            },
          },
          required: ['city'],
        },
      },
      {
        name: 'media_play_station',
        description: 'Stream music, ambient white noise, or internet radio through Xiaozhi I2S speaker.',
        category: 'media',
        enabled: true,
        isCustom: false,
        pluginId: 'media_voice_fx',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            genre_or_station: {
              type: 'string',
              description: 'Music station or soundscape name (e.g. Lofi Beats, Chillhop, Rain Sounds, Jazz Cafe)',
            },
          },
          required: ['genre_or_station'],
        },
      },
      {
        name: 'speech_broadcast_alert',
        description: 'Trigger a voice announcement message through Xiaozhi ESP32-S3 speaker with high priority.',
        category: 'media',
        enabled: true,
        isCustom: false,
        pluginId: 'media_voice_fx',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Text for Xiaozhi to speak aloud',
            },
            emotion: {
              type: 'string',
              description: 'Vocal inflection/emotion',
              enum: ['neutral', 'happy', 'urgent', 'gentle'],
            },
          },
          required: ['message'],
        },
      },
    ];

    for (const tool of defaults) {
      this.tools.set(tool.name, tool);
    }
  }

  private registerDefaultAutomations() {
    this.automations = [
      {
        id: 'auto-1',
        name: 'Front Door Motion Alert',
        description: 'When PIR motion sensor triggers, speak audio warning and flash amber LED ring',
        enabled: true,
        triggerType: 'hardware_event',
        triggerConfig: {
          hardwareEvent: 'pir_motion',
        },
        actionType: 'speak_alert',
        actionConfig: {
          voiceMessage: 'Notice: Movement detected at the front door!',
          voiceEmotion: 'urgent',
        },
        lastTriggered: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        triggerCount: 4,
      },
      {
        id: 'auto-2',
        name: 'Hourly Ergonomic Stretch Reminder',
        description: 'Every 60 minutes, display a cheerful face on OLED and play gentle chime',
        enabled: true,
        triggerType: 'schedule',
        triggerConfig: {
          scheduleIntervalMin: 60,
        },
        actionType: 'execute_tool',
        actionConfig: {
          toolName: 'esp32_set_oled_expression',
          toolArguments: { expression: 'happy', caption: 'Time to stretch!' },
        },
        lastTriggered: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        triggerCount: 18,
      },
      {
        id: 'auto-3',
        name: 'Incoming Smart Webhook',
        description: 'Receives external HTTP POST events (Home Assistant, GitHub, Zapier) and speaks announcements',
        enabled: true,
        triggerType: 'webhook',
        triggerConfig: {
          webhookEndpoint: '/api/webhook/trigger',
        },
        actionType: 'speak_alert',
        actionConfig: {
          voiceMessage: 'Deployment build completed successfully on main branch.',
          voiceEmotion: 'happy',
        },
        lastTriggered: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        triggerCount: 12,
      },
    ];
  }

  public getAllTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getActiveTools(): McpToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled);
  }

  public getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  public upsertTool(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public deleteTool(name: string): boolean {
    const existing = this.tools.get(name);
    if (!existing || !existing.isCustom) return false;
    return this.tools.delete(name);
  }

  public toggleTool(name: string, enabled?: boolean): boolean {
    const existing = this.tools.get(name);
    if (!existing) return false;
    existing.enabled = enabled !== undefined ? enabled : !existing.enabled;
    return existing.enabled;
  }

  public getLogs(): ToolExecutionLog[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getAutomations(): AutomationRule[] {
    return [...this.automations];
  }

  public upsertAutomation(rule: AutomationRule): void {
    const idx = this.automations.findIndex((a) => a.id === rule.id);
    if (idx >= 0) {
      this.automations[idx] = rule;
    } else {
      this.automations.push(rule);
    }
  }

  public deleteAutomation(id: string): boolean {
    const initialLen = this.automations.length;
    this.automations = this.automations.filter((a) => a.id !== id);
    return this.automations.length < initialLen;
  }

  public toggleAutomation(id: string): boolean {
    const rule = this.automations.find((a) => a.id === id);
    if (!rule) return false;
    rule.enabled = !rule.enabled;
    return rule.enabled;
  }

  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    caller: ToolExecutionLog['caller'] = 'mcp-client'
  ): Promise<{ result: any; isError: boolean }> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      const errLog: ToolExecutionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        toolName,
        pluginId: 'unknown',
        caller,
        arguments: args,
        result: null,
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `Tool '${toolName}' not registered in MCP Center.`,
      };
      this.logs.unshift(errLog);
      if (this.logs.length > 200) this.logs.pop();
      return { result: errLog.errorMessage, isError: true };
    }

    try {
      let output: any = null;

      // Handle custom Webhook type
      if (tool.handlerType === 'webhook' && tool.webhookConfig?.url) {
        const config = tool.webhookConfig;
        const res = await fetch(config.url, {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
          },
          body: config.method !== 'GET' ? JSON.stringify(args) : undefined,
        });
        const contentType = res.headers.get('content-type');
        output = contentType?.includes('application/json') ? await res.json() : await res.text();
      } else {
        // Built-in / Mock Handler logic
        output = await this.handleBuiltinExecution(toolName, args);
      }

      const durationMs = Date.now() - startTime;
      const successLog: ToolExecutionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        toolName,
        pluginId: tool.pluginId,
        caller,
        arguments: args,
        result: output,
        status: 'success',
        durationMs,
      };

      this.logs.unshift(successLog);
      if (this.logs.length > 200) this.logs.pop();

      return { result: output, isError: false };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || 'Tool execution failed';
      const failLog: ToolExecutionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        toolName,
        pluginId: tool.pluginId,
        caller,
        arguments: args,
        result: null,
        status: 'error',
        durationMs,
        errorMessage: errorMsg,
      };

      this.logs.unshift(failLog);
      if (this.logs.length > 200) this.logs.pop();

      return { result: errorMsg, isError: true };
    }
  }

  private async handleBuiltinExecution(toolName: string, args: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'esp32_set_led_ring': {
        const mode = args.mode || 'solid';
        const color = args.color || '#FF9900';
        const brightness = Number(args.brightness ?? 80);
        this.deviceState.ledRing = { mode, color, brightness };
        return {
          status: 'applied',
          hardware: 'ESP32-S3 WS2812B GPIO48',
          ledRing: this.deviceState.ledRing,
          message: `LED Ring updated to ${mode} mode with color ${color} at ${brightness}% brightness.`,
        };
      }

      case 'esp32_set_oled_expression': {
        const expression = args.expression || 'happy';
        const caption = args.caption || '';
        this.deviceState.currentExpression = expression;
        return {
          status: 'rendered',
          hardware: 'SSD1306 128x64 OLED I2C 0x3C',
          expression,
          caption,
          message: `Expression changed to '${expression}'${caption ? ` ("${caption}")` : ''}.`,
        };
      }

      case 'esp32_play_buzzer': {
        const tone = args.tone || 'beep';
        const repeats = Number(args.repeats || 1);
        return {
          status: 'played',
          hardware: 'ESP32-S3 PWM Timer Buzzer',
          tone,
          repeats,
          audioFrequency: tone === 'success' ? '1046Hz -> 1318Hz' : '880Hz',
          message: `Played buzzer pattern '${tone}' ${repeats} time(s).`,
        };
      }

      case 'esp32_get_telemetry': {
        // dynamic slight variation for realistic hardware telemetry
        this.deviceState.batteryLevel = Math.max(10, Math.min(100, this.deviceState.batteryLevel + (Math.random() > 0.6 ? -1 : 0)));
        this.deviceState.lastSeen = new Date().toISOString();
        return {
          deviceId: this.deviceState.deviceId,
          chip: 'ESP32-S3-WROOM-1 (Xtensa dual-core LX7 @ 240MHz)',
          batteryPercentage: `${this.deviceState.batteryLevel}%`,
          batteryVoltage: `${(3.6 + (this.deviceState.batteryLevel / 100) * 0.6).toFixed(2)}V`,
          isCharging: false,
          wifiSSID: 'Xiaozhi-Lab-5G',
          wifiRssi: `${this.deviceState.wifiRssi} dBm (Excellent)`,
          cpuTemp: '42.6°C',
          freeHeap: '284.5 KB',
          psramFree: '6.8 MB',
          uptime: '14h 28m',
          firmware: this.deviceState.firmwareVersion,
        };
      }

      case 'iot_toggle_device': {
        const device = args.device_id || 'lamp';
        const state = args.state || 'on';
        const brightness = args.brightness;
        return {
          protocol: 'Home Assistant / MQTT',
          entityId: `light.${device.toLowerCase().replace(/\s+/g, '_')}`,
          state,
          brightness: brightness ?? 100,
          updatedAt: new Date().toISOString(),
          message: `Smart device '${device}' successfully turned ${state}${brightness ? ` at ${brightness}%` : ''}.`,
        };
      }

      case 'iot_get_climate': {
        const room = args.room || 'Living Room';
        return {
          room,
          temperature: '23.4°C (74.1°F)',
          humidity: '48% RH',
          airQualityIndex: 28,
          airQualityStatus: 'Excellent',
          co2: '462 ppm',
          lastUpdated: new Date().toISOString(),
        };
      }

      case 'timer_set_voice_countdown': {
        const minutes = Number(args.minutes || 5);
        const label = args.label || 'Timer';
        const targetTime = new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString();
        return {
          timerId: `tm-${Date.now()}`,
          durationMinutes: minutes,
          label,
          targetCompletionTime: targetTime,
          message: `Timer set for ${minutes} minute(s) for "${label}". Xiaozhi will sound an alarm at ${targetTime}.`,
        };
      }

      case 'notes_create_voice_memo': {
        const title = args.title || 'Quick Voice Note';
        const content = args.content || '';
        return {
          noteId: `memo-${Date.now()}`,
          title,
          content,
          savedAt: new Date().toISOString(),
          message: `Saved voice memo: "${title}".`,
        };
      }

      case 'web_search_summary': {
        const query = args.query || 'current news';
        return {
          query,
          sources: [
            { title: 'Tech Updates 2026', snippet: 'ESP32-S3 applications in conversational physical computing continue to surge.' },
            { title: 'Xiaozhi AI Open Source Ecosystem', snippet: 'Community MCP plugins enable localized device actions, smart home triggers, and real-time streaming.' },
          ],
          summary: `Search results for "${query}": Found multiple verified citations. Active firmware support confirmed for MCP v1.0.`,
        };
      }

      case 'weather_get_forecast': {
        const city = args.city || 'Shenzhen';
        return {
          city,
          condition: 'Sunny with clear sky',
          temperature: '24°C / 75°F',
          humidity: '52%',
          wind: 'Gentle breeze 8 km/h',
          uvIndex: 4,
          forecast: 'Pleasant and mild throughout the evening.',
        };
      }

      case 'media_play_station': {
        const station = args.genre_or_station || 'Lofi Beats';
        return {
          streamUrl: 'https://streams.radiomcp.org/lofi-relax-256k.mp3',
          station,
          codec: 'OPUS / 48kHz Stereo',
          status: 'streaming',
          message: `Xiaozhi I2S speaker now streaming "${station}".`,
        };
      }

      case 'speech_broadcast_alert': {
        const message = args.message || 'Alert';
        const emotion = args.emotion || 'neutral';
        this.deviceState.currentExpression = emotion === 'urgent' ? 'shocked' : 'speaking';
        return {
          broadcastStatus: 'delivered',
          ttsEngine: 'Edge-TTS / Piper ESP32 stream',
          spokenMessage: message,
          emotion,
          timestamp: new Date().toISOString(),
        };
      }

      default: {
        const tool = this.tools.get(toolName);
        if (tool?.mockReturnValue) {
          try {
            return JSON.parse(tool.mockReturnValue);
          } catch {
            return tool.mockReturnValue;
          }
        }
        return {
          status: 'success',
          tool: toolName,
          executedWith: args,
          timestamp: new Date().toISOString(),
        };
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
