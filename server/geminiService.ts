import { GoogleGenAI, Type } from '@google/genai';
import { pluginRegistry } from './pluginRegistry.js';

export interface ChatSimulationResult {
  replyText: string;
  expression: 'happy' | 'listening' | 'thinking' | 'speaking' | 'sleep' | 'shocked' | 'neutral';
  toolCallsExecuted: Array<{
    name: string;
    arguments: Record<string, any>;
    result: any;
  }>;
}

export async function simulateXiaozhiInteraction(prompt: string): Promise<ChatSimulationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const activeTools = pluginRegistry.getActiveTools();

  // If Gemini API Key is available, use real Gemini 2.5 Flash with function declarations
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({});

      // Format tools for Gemini function calling
      const functionDeclarations = activeTools.map((t) => {
        // Map simple types
        const properties: Record<string, any> = {};
        for (const [key, val] of Object.entries(t.inputSchema.properties || {})) {
          properties[key] = {
            type: val.type === 'number' ? Type.NUMBER : val.type === 'boolean' ? Type.BOOLEAN : Type.STRING,
            description: val.description,
          };
          if (val.enum) {
            properties[key].enum = val.enum;
          }
        }

        return {
          name: t.name,
          description: t.description,
          parameters: {
            type: Type.OBJECT,
            properties,
            required: t.inputSchema.required || [],
          },
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          systemInstruction: `You are Xiaozhi (小智), a helpful, cute, and witty AI companion running on an ESP32-S3 microcontroller robot.
You have access to physical ESP32-S3 hardware controls (LED ring, OLED facial expressions, buzzer, telemetry) and smart home / automation tools via Model Context Protocol (MCP).
When asked to perform actions, ALWAYS call the appropriate tool.
After calling tools or answering, provide a concise, friendly spoken response suitable for voice output (1-2 sentences).`,
          tools: [{ functionDeclarations }],
        },
      });

      const toolCallsExecuted: Array<{ name: string; arguments: any; result: any }> = [];
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        for (const fc of functionCalls) {
          if (!fc.name) continue;
          const { result } = await pluginRegistry.executeTool(fc.name, (fc.args as any) || {}, 'simulator');
          toolCallsExecuted.push({
            name: fc.name,
            arguments: (fc.args as any) || {},
            result,
          });
        }

        // Generate follow-up final speech synthesis with tool output context
        const followUp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: prompt }] },
            {
              role: 'model',
              parts: functionCalls.map((fc) => ({
                functionCall: { name: fc.name, args: fc.args },
              })),
            },
            {
              role: 'user',
              parts: toolCallsExecuted.map((tc) => ({
                functionResponse: {
                  name: tc.name,
                  response: { result: tc.result },
                },
              })),
            },
          ],
        });

        const replyText = followUp.text || 'I have completed that for you!';
        return {
          replyText,
          expression: determineExpression(prompt, replyText),
          toolCallsExecuted,
        };
      }

      return {
        replyText: response.text || 'Hello! Xiaozhi is ready to help.',
        expression: determineExpression(prompt, response.text || ''),
        toolCallsExecuted: [],
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local intent parser:', err);
    }
  }

  // High-fidelity local intent parser & dispatcher for ESP32-S3 Xiaozhi
  return localIntentExecution(prompt);
}

function determineExpression(
  prompt: string,
  reply: string
): 'happy' | 'listening' | 'thinking' | 'speaking' | 'sleep' | 'shocked' | 'neutral' {
  const text = (prompt + ' ' + reply).toLowerCase();
  if (text.includes('sleep') || text.includes('goodnight') || text.includes('tired')) return 'sleep';
  if (text.includes('danger') || text.includes('alert') || text.includes('warning') || text.includes('intruder') || text.includes('shock'))
    return 'shocked';
  if (text.includes('happy') || text.includes('smile') || text.includes('yay') || text.includes('thanks') || text.includes('great'))
    return 'happy';
  if (text.includes('think') || text.includes('calculate') || text.includes('search')) return 'thinking';
  return 'speaking';
}

async function localIntentExecution(prompt: string): Promise<ChatSimulationResult> {
  const p = prompt.toLowerCase();
  const toolCallsExecuted: Array<{ name: string; arguments: any; result: any }> = [];

  // 1. LED Ring command
  if (p.includes('light') || p.includes('led') || p.includes('glow') || p.includes('ring') || p.includes('color') || p.includes('灯')) {
    let color = '#FF9900';
    let mode = 'solid';
    if (p.includes('cyan') || p.includes('blue') || p.includes('青')) color = '#00E5FF';
    else if (p.includes('green') || p.includes('emerald') || p.includes('绿')) color = '#10B981';
    else if (p.includes('purple') || p.includes('violet') || p.includes('紫')) color = '#A855F7';
    else if (p.includes('red') || p.includes('红')) color = '#EF4444';
    else if (p.includes('orange') || p.includes('amber') || p.includes('橙')) color = '#F59E0B';

    if (p.includes('pulse') || p.includes('breath') || p.includes('呼吸')) mode = 'pulse';
    else if (p.includes('rainbow') || p.includes('彩虹')) mode = 'rainbow';
    else if (p.includes('off') || p.includes('关')) mode = 'off';

    const { result } = await pluginRegistry.executeTool(
      'esp32_set_led_ring',
      { mode, color, brightness: 85 },
      'simulator'
    );
    toolCallsExecuted.push({ name: 'esp32_set_led_ring', arguments: { mode, color, brightness: 85 }, result });
    return {
      replyText: `I have updated my base LED ring to ${color} in ${mode} mode. Looking cozy!`,
      expression: 'happy',
      toolCallsExecuted,
    };
  }

  // 2. Facial Expression command
  if (p.includes('face') || p.includes('expression') || p.includes('screen') || p.includes('look') || p.includes('表情')) {
    let expression: 'happy' | 'listening' | 'thinking' | 'speaking' | 'sleep' | 'shocked' | 'neutral' = 'happy';
    if (p.includes('sleep') || p.includes('sleepy') || p.includes('困') || p.includes('睡觉')) expression = 'sleep';
    else if (p.includes('shock') || p.includes('surprised') || p.includes('惊')) expression = 'shocked';
    else if (p.includes('think') || p.includes('ponder') || p.includes('思考')) expression = 'thinking';
    else if (p.includes('listen') || p.includes('hear') || p.includes('听')) expression = 'listening';

    const { result } = await pluginRegistry.executeTool(
      'esp32_set_oled_expression',
      { expression, caption: 'Xiaozhi AI' },
      'simulator'
    );
    toolCallsExecuted.push({
      name: 'esp32_set_oled_expression',
      arguments: { expression, caption: 'Xiaozhi AI' },
      result,
    });
    return {
      replyText: `OLED display updated! Now showing my '${expression}' face.`,
      expression,
      toolCallsExecuted,
    };
  }

  // 3. Buzzer / sound effect
  if (p.includes('buzzer') || p.includes('beep') || p.includes('jingle') || p.includes('mario') || p.includes('sound') || p.includes('声音') || p.includes('蜂鸣器')) {
    const tone = p.includes('mario') ? 'mario' : p.includes('alert') ? 'alert' : p.includes('success') ? 'success' : 'chime';
    const { result } = await pluginRegistry.executeTool('esp32_play_buzzer', { tone, repeats: 1 }, 'simulator');
    toolCallsExecuted.push({ name: 'esp32_play_buzzer', arguments: { tone, repeats: 1 }, result });
    return {
      replyText: `Playing '${tone}' melodic chime through the ESP32 buzzer!`,
      expression: 'happy',
      toolCallsExecuted,
    };
  }

  // 4. Telemetry / battery check
  if (p.includes('battery') || p.includes('telemetry') || p.includes('status') || p.includes('wifi') || p.includes('temp') || p.includes('电量')) {
    const { result } = await pluginRegistry.executeTool('esp32_get_telemetry', {}, 'simulator');
    toolCallsExecuted.push({ name: 'esp32_get_telemetry', arguments: {}, result });
    return {
      replyText: `My battery is at ${result.batteryPercentage} (${result.batteryVoltage}), Wi-Fi signal is ${result.wifiRssi}, and CPU core is running cool at ${result.cpuTemp}.`,
      expression: 'happy',
      toolCallsExecuted,
    };
  }

  // 5. Timer
  if (p.includes('timer') || p.includes('pomodoro') || p.includes('minute') || p.includes('倒计时')) {
    const match = p.match(/(\d+)/);
    const minutes = match ? parseInt(match[1], 10) : 10;
    const { result } = await pluginRegistry.executeTool(
      'timer_set_voice_countdown',
      { minutes, label: 'Voice Focus Session' },
      'simulator'
    );
    toolCallsExecuted.push({
      name: 'timer_set_voice_countdown',
      arguments: { minutes, label: 'Voice Focus Session' },
      result,
    });
    return {
      replyText: `Timer set for ${minutes} minutes! I'll sound the chime right on time.`,
      expression: 'listening',
      toolCallsExecuted,
    };
  }

  // 6. Weather
  if (p.includes('weather') || p.includes('forecast') || p.includes('rain') || p.includes('temperature') || p.includes('天气')) {
    const city = p.includes('tokyo') ? 'Tokyo' : p.includes('san francisco') ? 'San Francisco' : p.includes('london') ? 'London' : 'Shenzhen';
    const { result } = await pluginRegistry.executeTool('weather_get_forecast', { city }, 'simulator');
    toolCallsExecuted.push({ name: 'weather_get_forecast', arguments: { city }, result });
    return {
      replyText: `In ${city}, it's currently ${result.temperature} with ${result.condition}. ${result.forecast}`,
      expression: 'happy',
      toolCallsExecuted,
    };
  }

  // 7. Smart home
  if (p.includes('turn on') || p.includes('turn off') || p.includes('fan') || p.includes('lamp') || p.includes('socket') || p.includes('switch')) {
    const state = p.includes('off') ? 'off' : 'on';
    const device_id = p.includes('fan') ? 'desk_fan' : p.includes('ac') ? 'air_conditioner' : 'living_room_light';
    const { result } = await pluginRegistry.executeTool('iot_toggle_device', { device_id, state }, 'simulator');
    toolCallsExecuted.push({ name: 'iot_toggle_device', arguments: { device_id, state }, result });
    return {
      replyText: `I turned ${state} the ${device_id.replace('_', ' ')} via the Smart Home MCP bridge.`,
      expression: 'speaking',
      toolCallsExecuted,
    };
  }

  // Default conversational response
  return {
    replyText: `Xiaozhi heard: "${prompt}". I'm ready to run MCP plugins for physical ESP32-S3 controls, smart home devices, and web tasks.`,
    expression: 'happy',
    toolCallsExecuted: [],
  };
}
