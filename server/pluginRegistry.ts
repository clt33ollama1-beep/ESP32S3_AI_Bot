import { McpToolDefinition, ToolExecutionLog, XiaozhiDeviceState, AutomationRule, SecretWordAlias } from './types.js';
import { resolveRouteStop } from './kmbService.js';
import { getLatestNews } from './newsService.js';

export class PluginRegistry {
  private tools: Map<string, McpToolDefinition> = new Map();
  private logs: ToolExecutionLog[] = [];
  private automations: AutomationRule[] = [];
  private secretWords: SecretWordAlias[] = [];
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
    this.registerDefaultSecretWords();
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
        name: 'news_get_latest_headlines',
        description: 'Fetch real-time top news headlines from the internet (BBC Technology, BBC World, RTHK Hong Kong News, Hacker News) and format a concise spoken voice briefing for Xiaozhi.',
        category: 'web',
        enabled: true,
        isCustom: false,
        pluginId: 'web_intelligence',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['tech', 'world', 'local_hk', 'business', 'hackernews'],
              description: 'Topic category: tech (BBC Tech), world (BBC World News), local_hk (RTHK 香港即時新聞), business (BBC Business), hackernews (Hacker News top stories). Default is tech.',
            },
            limit: {
              type: 'number',
              description: 'Number of headlines to retrieve (default: 3, max: 10)',
            },
          },
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
        name: 'kmb_bus_get_eta',
        description: 'Query real-time bus arrival time (ETA) for Kowloon Motor Bus (KMB) and Long Win Bus (LWB) in Hong Kong via official data.gov.hk open API. Returns next arriving buses with countdown minutes, destination, and status remarks.',
        category: 'web',
        enabled: true,
        isCustom: false,
        pluginId: 'hk_transport',
        handlerType: 'mock',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'string',
              description: 'KMB bus route number (e.g. 1A, 960, 68X, 238X, 104, B1, 260X, 3M, 30X)',
            },
            origin: {
              type: 'string',
              description: 'Boarding stop name or landmark e.g. "Tai Po Market MTR", "Tai Po Market Station", "大埔墟站"',
            },
            destination: {
              type: 'string',
              description: 'Destination stop or landmark e.g. "Tai Po Center", "大埔中心", "Fu Heng"',
            },
            limit: {
              type: 'number',
              description: 'Number of upcoming arrival times to return (e.g. 2 for next 2 ETAs, default: 3)',
            },
            direction: {
              type: 'string',
              description: 'Direction bound: "O" for Outbound, "I" for Inbound. If omitted, automatically resolved.',
              enum: ['O', 'I'],
            },
            stop_id: {
              type: 'string',
              description: 'Optional 16-character bus stop ID (e.g. AA97FFC49AE957A5) to filter ETAs for a specific stop',
            },
            service_type: {
              type: 'number',
              description: 'Service variant type (default: 1 for regular service)',
            },
          },
          required: ['route'],
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
      {
        id: 'auto-4',
        name: 'Morning Commute KMB 1A ETA Tracker',
        description: 'Queries Hong Kong KMB 1A bus arrival time via data.gov.hk and announces next departure on Xiaozhi',
        enabled: true,
        triggerType: 'schedule',
        triggerConfig: {
          scheduleIntervalMin: 15,
        },
        actionType: 'execute_tool',
        actionConfig: {
          toolName: 'kmb_bus_get_eta',
          toolArguments: { route: '1A' },
        },
        lastTriggered: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        triggerCount: 6,
      },
      {
        id: 'auto-5',
        name: 'Daily Internet News Voice Briefing',
        description: 'Fetches real-time technology & global news from BBC / Hacker News and broadcasts spoken summary to Xiaozhi',
        enabled: true,
        triggerType: 'schedule',
        triggerConfig: {
          scheduleIntervalMin: 120,
        },
        actionType: 'execute_tool',
        actionConfig: {
          toolName: 'news_get_latest_headlines',
          toolArguments: { category: 'tech', limit: 3 },
        },
        lastTriggered: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        triggerCount: 14,
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

  private registerDefaultSecretWords() {
    this.secretWords = [
      {
        id: 'sw-1',
        triggerPhrase: 'How my bus for school',
        expandedPrompt: 'I am in TaiPo market MTR station, what is the coming two eta for 71A in minutes',
        description: 'Translates school commute question into precise KMB 71A arrival query at Tai Po Market MTR',
        matchMode: 'contains',
        enabled: true,
        triggerCount: 3,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        id: 'sw-2',
        triggerPhrase: '返學巴士',
        expandedPrompt: '我喺大埔墟站想去大埔中心，71A 下2班車幾多分鐘到？',
        description: 'Cantonese school bus shortcut for 71A at Tai Po Market',
        matchMode: 'contains',
        enabled: true,
        triggerCount: 2,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        id: 'sw-3',
        triggerPhrase: 'Heading home',
        expandedPrompt: 'When is the next 960 bus arriving from Exhibition Centre towards Tuen Mun',
        description: 'Evening commute shortcut for KMB 960 to Tuen Mun',
        matchMode: 'contains',
        enabled: true,
        triggerCount: 6,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: 'sw-4',
        triggerPhrase: 'Morning briefing',
        expandedPrompt: 'Set LED ring to warm gold, play success chime, and tell me the latest tech news',
        description: 'Wake-up routine: lights up gold LED, chimes, and reads top tech headlines',
        matchMode: 'contains',
        enabled: true,
        triggerCount: 14,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      },
      {
        id: 'sw-5',
        triggerPhrase: 'Goodnight Xiaozhi',
        expandedPrompt: 'Turn off LED ring, show sleep face on OLED, and turn off living room light',
        description: 'Bedtime routine: switches off lights and displays sleepy expression',
        matchMode: 'contains',
        enabled: true,
        triggerCount: 9,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      },
    ];
  }

  public getSecretWords(): SecretWordAlias[] {
    return this.secretWords;
  }

  public upsertSecretWord(alias: SecretWordAlias): void {
    const idx = this.secretWords.findIndex((s) => s.id === alias.id);
    if (idx >= 0) {
      this.secretWords[idx] = alias;
    } else {
      this.secretWords.unshift(alias);
    }
  }

  public deleteSecretWord(id: string): boolean {
    const initialLen = this.secretWords.length;
    this.secretWords = this.secretWords.filter((s) => s.id !== id);
    return this.secretWords.length < initialLen;
  }

  public toggleSecretWord(id: string): boolean {
    const sw = this.secretWords.find((s) => s.id === id);
    if (!sw) return false;
    sw.enabled = !sw.enabled;
    return sw.enabled;
  }

  public resolveSecretWord(inputPrompt: string): {
    matched: boolean;
    alias?: SecretWordAlias;
    originalPrompt: string;
    resolvedPrompt: string;
  } {
    const normInput = inputPrompt.trim().toLowerCase();
    if (!normInput) {
      return { matched: false, originalPrompt: inputPrompt, resolvedPrompt: inputPrompt };
    }

    for (const sw of this.secretWords) {
      if (!sw.enabled) continue;
      const normTrigger = sw.triggerPhrase.trim().toLowerCase();

      let isMatch = false;
      if (sw.matchMode === 'exact') {
        isMatch = normInput === normTrigger;
      } else {
        isMatch =
          normInput.includes(normTrigger) ||
          normTrigger.includes(normInput) ||
          normInput.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '').includes(normTrigger.replace(/[^a-z0-9\u4e00-\u9fa5]/g, ''));
      }

      if (isMatch) {
        sw.triggerCount = (sw.triggerCount || 0) + 1;
        sw.lastTriggered = new Date().toISOString();
        return {
          matched: true,
          alias: sw,
          originalPrompt: inputPrompt,
          resolvedPrompt: sw.expandedPrompt,
        };
      }
    }

    return { matched: false, originalPrompt: inputPrompt, resolvedPrompt: inputPrompt };
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

      case 'news_get_latest_headlines': {
        const category = (args.category || 'tech') as any;
        const limit = Math.max(1, Math.min(10, Number(args.limit || 3)));
        const news = await getLatestNews(category, limit);
        return {
          status: 'success',
          category: news.category,
          source: news.sourceName,
          articleCount: news.articles.length,
          headlines: news.articles,
          summary: news.spokenSummary,
          timestamp: news.fetchedAt,
        };
      }

      case 'web_search_summary': {
        const query = (args.query || 'current news').toLowerCase();
        let cat: any = 'tech';
        if (query.includes('world') || query.includes('global') || query.includes('international')) cat = 'world';
        else if (query.includes('hk') || query.includes('hong kong') || query.includes('香港')) cat = 'local_hk';
        else if (query.includes('business') || query.includes('market') || query.includes('finance') || query.includes('經濟')) cat = 'business';
        else if (query.includes('hacker') || query.includes('code') || query.includes('dev')) cat = 'hackernews';

        const news = await getLatestNews(cat, 3);
        return {
          query: args.query || 'latest news',
          category: cat,
          sources: news.articles.map((a) => ({
            title: a.title,
            snippet: a.summary,
            url: a.link,
            pubDate: a.pubDate,
            source: a.source,
          })),
          summary: news.spokenSummary,
          timestamp: news.fetchedAt,
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

      case 'kmb_bus_get_eta': {
        const route = (args.route || '1A').trim().toUpperCase();
        const serviceType = Number(args.service_type || 1);
        const origin = args.origin ? String(args.origin).trim() : (args.boarding_stop ? String(args.boarding_stop).trim() : undefined);
        const destination = args.destination ? String(args.destination).trim() : undefined;
        const limit = args.limit ? Math.max(1, Math.min(10, Number(args.limit))) : undefined;
        let direction = args.direction ? String(args.direction).trim().toUpperCase() : undefined;
        let stopId = args.stop_id ? String(args.stop_id).trim().toUpperCase() : undefined;

        try {
          // If origin or destination is provided, resolve the exact boarding stop & direction
          let matchedStop: any = null;
          if ((origin || destination) && !stopId) {
            matchedStop = await resolveRouteStop(route, serviceType, origin, destination);
            if (matchedStop) {
              direction = matchedStop.bound;
            }
          }

          const endpoint = stopId
            ? `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${encodeURIComponent(stopId)}`
            : `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${encodeURIComponent(route)}/${serviceType}`;

          const res = await fetch(endpoint, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Xiaozhi-AI-MCP-Center/1.0',
            },
          });

          if (!res.ok) {
            throw new Error(`KMB Open Data API HTTP ${res.status}`);
          }

          const json = await res.json();
          const generatedTime = json.generated_timestamp ? new Date(json.generated_timestamp).getTime() : Date.now();
          const rawList: any[] = json.data || [];
          let upcoming: any[] = [];

          if (matchedStop) {
            // Filter by the matched boarding stop sequence and direction
            const stopItems = rawList
              .filter(
                (item) =>
                  item.dir === matchedStop.bound &&
                  item.seq === matchedStop.boardingSeq &&
                  item.eta &&
                  item.eta.trim() !== ''
              )
              .sort((a, b) => (a.eta_seq || 1) - (b.eta_seq || 1));

            for (const item of stopItems) {
              const etaMs = new Date(item.eta).getTime();
              const diffSec = Math.round((etaMs - generatedTime) / 1000);
              const diffMin = Math.round(diffSec / 60);

              if (diffSec < -60) continue; // Skip departed trips

              upcoming.push({
                route: item.route,
                destinationTc: item.dest_tc || item.dest_en,
                destinationEn: item.dest_en,
                direction: item.dir === 'O' ? 'Outbound' : 'Inbound',
                seq: item.seq,
                etaSeq: item.eta_seq,
                etaTime: new Date(item.eta).toLocaleTimeString('en-GB', {
                  timeZone: 'Asia/Hong_Kong',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }),
                minutesRemaining: Math.max(0, diffMin),
                countdownText: diffMin <= 0 ? 'Arriving now' : `${diffMin} min`,
                remark: item.rmk_tc || item.rmk_en || 'Scheduled Bus',
                company: item.co,
                boardingStopTc: matchedStop.boardingStop?.nameTc,
                boardingStopEn: matchedStop.boardingStop?.nameEn,
              });
            }

            if (limit && limit > 0) {
              upcoming = upcoming.slice(0, limit);
            }

            if (upcoming.length === 0) {
              return {
                status: 'no_eta',
                route,
                origin: matchedStop.boardingStop?.nameTc,
                destination: matchedStop.destinationStop?.nameTc,
                message: `No active departures found for KMB ${route} at ${matchedStop.boardingStop?.nameTc || 'this stop'}.`,
              };
            }

            const boardingTc = matchedStop.boardingStop?.nameTc?.replace(/\s*\([^)]*\)/, '') || '大埔墟站';
            const destTc = matchedStop.destinationStop?.nameTc?.replace(/\s*\([^)]*\)/, '') || upcoming[0].destinationTc;
            const arrivalsSummary = upcoming.map((u) => `${u.countdownText} (${u.etaTime})`).join(' and ');
            const summary = `At ${boardingTc} heading towards ${destTc}: Next ${upcoming.length} KMB ${route} buses arrive in ${arrivalsSummary}.`;

            return {
              status: 'success',
              provider: 'data.gov.hk / KMB Open Data (hk-td-tis_21-etakmb)',
              route,
              origin: matchedStop.boardingStop?.nameTc,
              originEn: matchedStop.boardingStop?.nameEn,
              destination: matchedStop.destinationStop?.nameTc || upcoming[0].destinationTc,
              destinationEn: matchedStop.destinationStop?.nameEn || upcoming[0].destinationEn,
              direction: matchedStop.bound === 'O' ? 'Outbound' : 'Inbound',
              limit: limit || upcoming.length,
              summary,
              nextBus: upcoming[0],
              upcomingDepartures: upcoming,
              timestamp: new Date().toISOString(),
            };
          } else if (stopId) {
            // Specific stop query
            const stopItems = rawList
              .filter((item) => item.route?.toUpperCase() === route && item.eta && item.eta.trim() !== '')
              .sort((a, b) => (a.eta_seq || 1) - (b.eta_seq || 1));

            for (const item of stopItems) {
              const etaMs = new Date(item.eta).getTime();
              const diffSec = Math.round((etaMs - generatedTime) / 1000);
              const diffMin = Math.round(diffSec / 60);

              if (diffSec < -60) continue; // Skip departures past 1 minute ago

              upcoming.push({
                route: item.route,
                destinationTc: item.dest_tc || item.dest_en,
                destinationEn: item.dest_en,
                direction: item.dir === 'O' ? 'Outbound' : 'Inbound',
                seq: item.seq,
                etaSeq: item.eta_seq,
                etaTime: new Date(item.eta).toLocaleTimeString('en-GB', {
                  timeZone: 'Asia/Hong_Kong',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }),
                minutesRemaining: Math.max(0, diffMin),
                countdownText: diffMin <= 0 ? 'Arriving now' : `${diffMin} min`,
                remark: item.rmk_tc || item.rmk_en || 'Scheduled Bus',
                company: item.co,
              });
            }

            if (limit && limit > 0) {
              upcoming = upcoming.slice(0, limit);
            }
          } else {
            // Route query across directions (O and/or I)
            const dirsToQuery = direction ? [direction] : ['O', 'I'];

            for (const d of dirsToQuery) {
              const dirItems = rawList.filter(
                (item) => item.dir === d && item.eta && item.eta.trim() !== ''
              );
              if (!dirItems.length) continue;

              // For route query without specific stop, group by terminus/origin (seq 1)
              let targetStops = dirItems.filter((i) => i.seq === 1);
              if (!targetStops.length) {
                const minSeq = Math.min(...dirItems.map((i) => i.seq));
                targetStops = dirItems.filter((i) => i.seq === minSeq);
              }

              // Sort by eta_seq ascending (1st, 2nd, 3rd upcoming bus)
              targetStops.sort((a, b) => (a.eta_seq || 1) - (b.eta_seq || 1));

              for (const item of targetStops) {
                const etaMs = new Date(item.eta).getTime();
                const diffSec = Math.round((etaMs - generatedTime) / 1000);
                const diffMin = Math.round(diffSec / 60);

                if (diffSec < -60) continue; // Skip departed buses

                upcoming.push({
                  route: item.route,
                  destinationTc: item.dest_tc || item.dest_en,
                  destinationEn: item.dest_en,
                  direction: item.dir === 'O' ? 'Outbound' : 'Inbound',
                  seq: item.seq,
                  etaSeq: item.eta_seq,
                  etaTime: new Date(item.eta).toLocaleTimeString('en-GB', {
                    timeZone: 'Asia/Hong_Kong',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }),
                  minutesRemaining: Math.max(0, diffMin),
                  countdownText: diffMin <= 0 ? 'Arriving now' : `${diffMin} min`,
                  remark: item.rmk_tc || item.rmk_en || 'Scheduled Bus',
                  company: item.co,
                });
              }
            }

            if (limit && limit > 0) {
              upcoming = upcoming.slice(0, limit);
            }
          }

          if (upcoming.length === 0) {
            return {
              status: 'no_eta',
              route,
              message: `No active departures found for KMB route ${route} at this moment.`,
            };
          }

          const next = upcoming[0];
          const subsequent = upcoming.filter(
            (u) => u.destinationTc === next.destinationTc && u.etaSeq > next.etaSeq
          );
          const nextSameDir = subsequent[0];

          let summary = `KMB ${route} to ${next.destinationTc} (${next.destinationEn}): Next bus ${next.countdownText} (${next.etaTime})`;
          if (nextSameDir) {
            summary += `, followed by ${nextSameDir.countdownText} (${nextSameDir.etaTime})`;
          }

          const opposite = upcoming.find((u) => u.destinationTc !== next.destinationTc);
          if (opposite && !direction) {
            summary += `. Towards ${opposite.destinationTc}: ${opposite.countdownText} (${opposite.etaTime}).`;
          } else {
            summary += '.';
          }

          return {
            status: 'success',
            provider: 'data.gov.hk / KMB Open Data (hk-td-tis_21-etakmb)',
            route,
            summary,
            nextBus: next,
            upcomingDepartures: upcoming,
            timestamp: new Date().toISOString(),
          };
        } catch (err: any) {
          return {
            status: 'fallback',
            route,
            message: `Could not retrieve live ETA for KMB ${route}: ${err?.message || 'Network error'}.`,
            sampleHint: 'Verify the route number exists in Hong Kong KMB network (e.g. 71A, 1A, 960, 68X, 238X, 104, B1).',
          };
        }
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
