import React, { useState } from 'react';
import {
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Cpu,
  Wifi,
  BatteryCharging,
  Loader2,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { OledFace } from './OledFace.js';
import { XiaozhiDeviceState } from '../types.js';

interface XiaozhiSimulatorProps {
  deviceState: XiaozhiDeviceState;
  onRefreshDevice: () => void;
  onDeviceStateChange: (updates: Partial<XiaozhiDeviceState>) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'xiaozhi';
  text: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result: any;
  }>;
  secretWordTriggered?: {
    aliasId?: string;
    triggerPhrase: string;
    expandedPrompt: string;
    description?: string;
  };
  timestamp: string;
}

export const XiaozhiSimulator: React.FC<XiaozhiSimulatorProps> = ({
  deviceState,
  onRefreshDevice,
  onDeviceStateChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'xiaozhi',
      text: "Hello! I am your Xiaozhi ESP32-S3 AI voice companion. All your registered MCP plugins are loaded and ready. Speak or send a command!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);

  const samplePrompts = [
    'How my bus for school',
    '返學巴士',
    'i am at taipo market MTR and want to taipo center, how the next 2 eta in minutes for 71A',
    'What is the latest technology news today?',
    '今日香港有咩重點新聞？',
    'Get top world news from BBC',
    'Check KMB 1A bus arrival time',
    'Set LED ring to cyan pulse',
    'Show a happy face on OLED',
    'Check battery telemetry',
    'Set a 15-minute tea timer',
  ];

  const handleSpeakText = (text: string) => {
    if (!voiceAudioEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.onstart = () => setIsSpeakingAudio(true);
      utterance.onend = () => setIsSpeakingAudio(false);
      utterance.onerror = () => setIsSpeakingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeakingAudio(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isProcessing) return;

    setInput('');
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    // Set face to thinking state immediately
    onDeviceStateChange({ currentExpression: 'thinking' });

    try {
      const res = await fetch('/api/xiaozhi/simulate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: `xz-${Date.now()}`,
        sender: 'xiaozhi',
        text: data.replyText,
        toolCalls: data.toolCallsExecuted,
        secretWordTriggered: data.secretWordTriggered,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.deviceState) {
        onDeviceStateChange(data.deviceState);
      } else if (data.expression) {
        onDeviceStateChange({ currentExpression: data.expression });
      }

      handleSpeakText(data.replyText);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'xiaozhi',
          text: 'Encountered a communication issue processing the command.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      onDeviceStateChange({ currentExpression: 'neutral' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick manual expression trigger
  const setExpression = async (expression: XiaozhiDeviceState['currentExpression']) => {
    await fetch('/api/xiaozhi/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    });
    onDeviceStateChange({ currentExpression: expression });
  };

  // Quick manual LED trigger
  const setLedColor = async (color: string, mode: XiaozhiDeviceState['ledRing']['mode']) => {
    await fetch('/api/xiaozhi/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ledRing: { color, mode, brightness: 85 } }),
    });
    onDeviceStateChange({ ledRing: { color, mode, brightness: 85 } });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Column 1: Hardware Device Twin (ESP32-S3 Enclosure & Screen) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                ESP32-S3 Hardware Twin
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </div>
          </div>

          {/* Physical Device Shell */}
          <div className="relative mx-auto w-full max-w-[320px] bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col items-center">
            {/* Top Microphones */}
            <div className="flex items-center gap-12 mb-3">
              <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
              <span className="text-[9px] font-mono tracking-widest text-slate-600 uppercase">
                XIAOZHI
              </span>
              <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
            </div>

            {/* Embedded OLED Display */}
            <div className="w-full my-2">
              <OledFace
                expression={deviceState.currentExpression}
                isAudioPlaying={isSpeakingAudio}
              />
            </div>

            {/* Glowing Base LED Ring Indicator */}
            <div className="w-full mt-4 pt-3 flex flex-col items-center">
              <div
                className={`w-4/5 h-2 rounded-full transition-all duration-500 shadow-lg ${
                  deviceState.ledRing.mode === 'pulse'
                    ? 'animate-pulse'
                    : deviceState.ledRing.mode === 'rainbow'
                    ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500'
                    : ''
                }`}
                style={{
                  backgroundColor:
                    deviceState.ledRing.mode !== 'rainbow' && deviceState.ledRing.mode !== 'off'
                      ? deviceState.ledRing.color
                      : undefined,
                  boxShadow:
                    deviceState.ledRing.mode !== 'off'
                      ? `0 0 16px ${deviceState.ledRing.color}`
                      : 'none',
                }}
              />
              <span className="text-[10px] font-mono text-slate-500 mt-1.5">
                Base Ring: {deviceState.ledRing.mode} ({deviceState.ledRing.color})
              </span>
            </div>
          </div>

          {/* Telemetry Strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-800/80 font-mono text-xs">
            <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">Battery</div>
              <div className="text-slate-200 font-semibold tabular-nums mt-0.5">
                {deviceState.batteryLevel}%
              </div>
            </div>
            <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">Wi-Fi RSSI</div>
              <div className="text-slate-200 font-semibold tabular-nums mt-0.5">
                {deviceState.wifiRssi} dBm
              </div>
            </div>
            <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">Firmware</div>
              <div className="text-slate-200 font-semibold truncate mt-0.5">
                v2.4.2
              </div>
            </div>
          </div>

          {/* Quick Hardware Controls */}
          <div className="mt-4 space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Manual Face Test:</span>
              <div className="flex items-center gap-1">
                {(['happy', 'listening', 'thinking', 'sleep', 'shocked'] as const).map((exp) => (
                  <button
                    key={exp}
                    onClick={() => setExpression(exp)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      deviceState.currentExpression === exp
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>LED Mood Ring:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLedColor('#FF9900', 'solid')}
                  className="w-4 h-4 rounded-full bg-amber-500 border border-white/20"
                  title="Warm Amber"
                />
                <button
                  onClick={() => setLedColor('#00E5FF', 'pulse')}
                  className="w-4 h-4 rounded-full bg-cyan-400 border border-white/20"
                  title="Cyan Pulse"
                />
                <button
                  onClick={() => setLedColor('#10B981', 'solid')}
                  className="w-4 h-4 rounded-full bg-emerald-500 border border-white/20"
                  title="Emerald Green"
                />
                <button
                  onClick={() => setLedColor('#A855F7', 'pulse')}
                  className="w-4 h-4 rounded-full bg-purple-500 border border-white/20"
                  title="Purple Pulse"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real Hardware Reference Banner */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
          <img
            src="/src/assets/images/xiaozhi_esp32_device_1793668671415.jpg"
            alt="Xiaozhi AI Companion Robot"
            className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-700"
          />
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-200 truncate">
              Xiaozhi AI Desktop Bot (ESP32-S3)
            </h4>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
              Dual-core 240MHz Xtensa LX7, I2S microphone array, ES8311 audio DAC, and WS2812B NeoPixel ring.
            </p>
          </div>
        </div>
      </div>

      {/* Column 2: Dialogue & MCP Tool Execution Console */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[680px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Interactive Dialogue & MCP Tool Sandbox
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates spoken voice interactions with live tool dispatch
            </p>
          </div>

          <button
            onClick={() => setVoiceAudioEnabled(!voiceAudioEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              voiceAudioEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Toggle Text-to-Speech playback"
          >
            {voiceAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Voice Audio: {voiceAudioEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-amber-400 text-slate-950 font-medium'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                {/* Render Secret Word banner if voice alias was triggered */}
                {m.secretWordTriggered && (
                  <div className="mb-2.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 font-mono text-[11px] flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-sans font-semibold text-amber-400">
                        <span>Secret Word Alias Triggered</span>
                        {m.secretWordTriggered.description && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({m.secretWordTriggered.description})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300 flex items-center gap-1 flex-wrap">
                        <span className="text-amber-300 font-medium">"{m.secretWordTriggered.triggerPhrase}"</span>
                        <span className="text-slate-500">➔</span>
                        <span className="text-white italic">"{m.secretWordTriggered.expandedPrompt}"</span>
                      </div>
                    </div>
                  </div>
                )}

                <p>{m.text}</p>

                {/* Render executed tool calls if present */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>MCP Tools Executed:</span>
                    </div>

                    {m.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-[11px]"
                      >
                        <div className="text-amber-400 font-semibold">{tc.name}</div>
                        <div className="text-slate-400 mt-1 truncate">
                          args: {JSON.stringify(tc.arguments)}
                        </div>
                        <div className="text-slate-300 mt-0.5 truncate text-[10px]">
                          result: {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono tabular-nums">
                {m.timestamp}
              </span>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 max-w-[60%] text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Xiaozhi is reasoning and calling MCP tools...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestions Strip */}
        <div className="pt-2 pb-3 shrink-0 flex items-center gap-1.5 overflow-x-auto">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              disabled={isProcessing}
              className="px-2.5 py-1 text-[11px] rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap shrink-0 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder="Type a voice command for Xiaozhi AI bot..."
            className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="p-2 text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
