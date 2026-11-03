# Xiaozhi AI MCP Center (小智 AI 插件集成与自动化中心)

A Model Context Protocol (MCP) server, custom plugin aggregator, and automation runtime designed for the **Xiaozhi ESP32-S3 AI voice companion bot** (小智 AI).

This center bridges physical ESP32-S3 hardware controls (OLED facial expressions, WS2812B NeoPixel ring, buzzer, telemetry), smart home IoT integrations, web intelligence, and external webhooks into a unified MCP gateway accessible by the ESP32 bot, local gateway servers, and desktop LLM clients (Claude Desktop, Cursor).

---

## Features

- **Standard MCP Protocol Gateway**:
  - Implements **JSON-RPC 2.0** over **Server-Sent Events (SSE)** at `/mcp/sse` and `/mcp/message`.
  - Provides a direct HTTP JSON-RPC endpoint at `/api/mcp/rpc` for low-latency embedded firmware calls.
  - Active tool list change notifications broadcast to connected MCP clients.
- **Pre-Configured & Custom Plugins**:
  - **ESP32 Hardware**: WS2812B LED ring controls (`solid`, `pulse`, `rainbow`), OLED screen pixel emotions (`happy`, `listening`, `thinking`, `speaking`, `sleep`, `shocked`), buzzer melodies, battery & Wi-Fi telemetry probe.
  - **Smart Home & IoT**: Home Assistant / MQTT device toggles, room climate & air quality monitoring.
  - **Productivity & Voice Timers**: Voice countdown timers and audio memo notebook.
  - **Web Intelligence**: Search synthesis and localized weather forecasting.
  - **Audio & Media**: Lofi radio streaming and priority voice announcements.
- **Visual Plugin Builder**:
  - Define custom tools with dynamic parameter schemas (string, number, boolean, enums).
  - Select execution handlers: **Simulated JSON output**, **External HTTP Webhook** (to Home Assistant, n8n, or local REST services), or **Gemini AI Prompt**.
  - Built-in interactive test sandbox with live latency readout in milliseconds.
- **ESP32-S3 Hardware Digital Twin**:
  - High-res simulated 128×64 OLED screen with authentic pixel expressions, natural blinking, and speech waveforms.
  - Glowing ambient LED base ring synchronized to tool execution states.
  - Interactive speech dialogue console with optional browser voice synthesis (TTS).
- **Automation Rules & Webhook Gateway**:
  - Trigger actions from physical hardware events (PIR motion, button press, low battery), recurring intervals, or incoming HTTP webhooks (`/api/webhook/trigger`).
  - Broadcast emergency audio alerts directly through Xiaozhi's speaker.
- **Real-Time Telemetry & Log Stream**:
  - Tracks timestamp, caller source, execution duration (ms), input arguments, and result payloads with one-click JSON export.

---

## Architecture Overview

```text
+-----------------------------------------------------------+
|               Xiaozhi ESP32-S3 Companion Bot              |
|   (Microphone Array, ES8311 DAC, OLED 128x64, NeoPixels)   |
+-----------------------------+-----------------------------+
                              |
                     WebSocket / HTTP / SSE
                              |
                              v
+-----------------------------------------------------------+
|                  Xiaozhi AI MCP Center                    |
|                                                           |
|  +---------------------+        +----------------------+  |
|  |   MCP SSE Server    |        |  Direct HTTP RPC     |  |
|  |    (/mcp/sse)       |        |   (/api/mcp/rpc)     |  |
|  +----------+----------+        +----------+-----------+  |
|             |                              |              |
|             +--------------+---------------+              |
|                            |                              |
|                            v                              |
|             +------------------------------+              |
|             |   Plugin Registry & Engine   |              |
|             +--------------+---------------+              |
|                            |                              |
|         +------------------+------------------+           |
|         |                  |                  |           |
|         v                  v                  v           |
|  [ESP32 Hardware]   [Smart Home IoT]   [External Webhook] |
|  - LED NeoPixel     - Home Assistant   - n8n / Zapier     |
|  - OLED Emotions    - MQTT Toggles     - REST APIs        |
|  - Piezo Buzzer     - Climate Probe    - Gemini AI Models |
+-----------------------------------------------------------+
```

---

## Quick Start (Local Development)

### 1. Prerequisites

- **Node.js**: v20 LTS or v22+
- **npm**: v10+

### 2. Installation

Clone this repository and install dependencies:

```bash
git clone <repository-url>
cd xiaozhi-mcp-center
npm install --legacy-peer-deps
```

### 3. Environment Setup

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Edit `.env` (optional):
```ini
# Optional: Used for AI-driven conversational tool reasoning and prompts
GEMINI_API_KEY="your_gemini_api_key_here"

# URL where the MCP server is hosted (default: http://localhost:3000)
APP_URL="http://localhost:3000"

# Server Port
PORT=3000

# Environment mode
NODE_ENV=development
```

> **Note**: If `GEMINI_API_KEY` is not set, the center automatically runs in local deterministic intent mode, allowing full tool execution and hardware simulation without external API dependencies.

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at:
- **Web UI & Simulator**: `http://localhost:3000`
- **MCP SSE Stream**: `http://localhost:3000/mcp/sse`
- **MCP JSON-RPC Endpoint**: `http://localhost:3000/api/mcp/rpc`

---

## Docker Deployment

This project includes a multi-stage `Dockerfile` and `docker-compose.yml` for production deployments.

### Option A: Using Docker Compose (Recommended)

1. **Start the container**:
   ```bash
   docker compose up -d
   ```

2. **Check container logs**:
   ```bash
   docker compose logs -f
   ```

3. **Check container health**:
   ```bash
   docker compose ps
   ```

4. **Stop the container**:
   ```bash
   docker compose down
   ```

### Option B: Building and Running the Docker Image Manually

1. **Build the image**:
   ```bash
   docker build -t xiaozhi-mcp-center:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name xiaozhi-mcp-center \
     -p 3000:3000 \
     -e PORT=3000 \
     -e NODE_ENV=production \
     -e GEMINI_API_KEY="your_api_key_if_any" \
     -e APP_URL="http://your-server-ip:3000" \
     --restart unless-stopped \
     xiaozhi-mcp-center:latest
   ```

### Option C: Multi-Architecture Build (AMD64 & ARM64 / Raspberry Pi)

To deploy on a Raspberry Pi 4/5 or ARM64 home server:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t xiaozhi-mcp-center:latest .
```

### Option D: Containerized Development with Hot Reload

If you want to develop inside Docker with live volume mounting:

```bash
docker compose -f docker-compose.dev.yml up
```

---

## Xiaozhi ESP32-S3 Configuration Guide

### 1. Direct ESP32-S3 Firmware Configuration (`config.json`)

Upload this configuration to your Xiaozhi ESP32-S3 SPIFFS/LittleFS storage under `/config.json`:

```json
{
  "mcp_enabled": true,
  "mcp_transport": "sse",
  "mcp_server_url": "http://<YOUR_SERVER_IP>:3000/mcp/sse",
  "mcp_direct_rpc_url": "http://<YOUR_SERVER_IP>:3000/api/mcp/rpc",
  "device_id": "esp32s3-xz-8a4b2c",
  "heartbeat_interval_sec": 30,
  "auto_reconnect": true
}
```

### 2. Xiaozhi Gateway / Server (`config.yaml`)

If using the official `xiaozhi-server` Python or Docker gateway:

```yaml
mcp:
  enabled: true
  transport: sse
  url: "http://<YOUR_SERVER_IP>:3000/mcp/sse"
  rpc_endpoint: "http://<YOUR_SERVER_IP>:3000/api/mcp/rpc"
  auto_reconnect: true
  timeout_ms: 8000
```

### 3. Claude Desktop / Cursor Integration

You can use the same MCP tools in Claude Desktop or Cursor by adding this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xiaozhi-center": {
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
```

---

## Webhook Gateway & Automation Triggers

### Trigger an Instant Voice Announcement on Xiaozhi

You can send an HTTP POST request from Home Assistant, curl, or any webhook source to trigger Xiaozhi to speak an alert:

```bash
curl -X POST "http://<YOUR_SERVER_IP>:3000/api/webhook/trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Notice: Movement detected at the front porch camera.",
    "emotion": "urgent"
  }'
```

### Home Assistant Automation Example

Add to your `automations.yaml`:

```yaml
alias: "Xiaozhi Front Door Alert"
trigger:
  - platform: state
    entity_id: binary_sensor.front_door_motion
    to: "on"
action:
  - service: rest_command.xiaozhi_alert
    data:
      message: "Someone is approaching the front door."
      emotion: "urgent"
```

With `rest_command` in `configuration.yaml`:

```yaml
rest_command:
  xiaozhi_alert:
    url: "http://<YOUR_SERVER_IP>:3000/api/webhook/trigger"
    method: POST
    headers:
      Content-Type: "application/json"
    payload: '{"message": "{{ message }}", "emotion": "{{ emotion }}"}'
```

---

## Production Deployment & Reverse Proxy Setup

When deploying to a remote VPS or home server with SSL/HTTPS:

### Nginx Configuration

> **Important**: Model Context Protocol (MCP) SSE connections require disabling proxy buffering and setting the connection header to empty to keep the HTTP event stream open.

```nginx
server {
    listen 80;
    server_name mcp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Mandatory for SSE and WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for live Server-Sent Events (SSE)
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
    }
}
```

### Caddyfile Configuration

```caddy
mcp.yourdomain.com {
    reverse_proxy 127.0.0.1:3000 {
        # SSE stream optimizations
        flush_interval -1
    }
}
```

---

## API & Protocol Reference

| Endpoint | Method | Protocol | Description |
| :--- | :--- | :--- | :--- |
| `/mcp/sse` | `GET` | SSE | MCP Server-Sent Events connection endpoint |
| `/mcp/message` | `POST` | JSON-RPC 2.0 | MCP message receiver for active SSE sessions |
| `/api/mcp/rpc` | `POST` | JSON-RPC 2.0 | Direct HTTP RPC for embedded firmware clients |
| `/api/mcp/config` | `GET` | REST | Pre-generated configuration snippets |
| `/api/plugins` | `GET`, `POST` | REST | List tools or register a custom plugin |
| `/api/plugins/:name/toggle` | `POST` | REST | Enable or disable a tool in MCP registry |
| `/api/plugins/execute` | `POST` | REST | Test execute a tool with custom arguments |
| `/api/xiaozhi/simulate-chat`| `POST` | REST | Conversational sandbox with tool calling |
| `/api/xiaozhi/device` | `GET`, `POST` | REST | Read or update ESP32-S3 hardware twin state |
| `/api/automations` | `GET`, `POST` | REST | Manage automation rules |
| `/api/webhook/trigger` | `POST` | REST | Trigger voice broadcast from external sensor |
| `/api/logs` | `GET`, `DELETE` | REST | Query or clear tool execution logs |

### Sample JSON-RPC Tool Call Request

```bash
curl -X POST "http://localhost:3000/api/mcp/rpc" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "esp32_set_led_ring",
      "arguments": {
        "color": "#00E5FF",
        "mode": "pulse",
        "brightness": 90
      }
    }
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"status\": \"applied\",\n  \"hardware\": \"ESP32-S3 WS2812B GPIO48\",\n  \"ledRing\": {\n    \"mode\": \"pulse\",\n    \"color\": \"#00E5FF\",\n    \"brightness\": 90\n  },\n  \"message\": \"LED Ring updated to pulse mode with color #00E5FF at 90% brightness.\"\n}"
      }
    ],
    "isError": false
  }
}
```

---

## Development Scripts

```bash
npm run dev        # Starts full-stack development server on port 3000
npm run build      # Compiles the production Vite frontend bundle into /dist
npm run start      # Runs production server serving API + static bundle
npm run lint       # Validates TypeScript types (tsc --noEmit)
npm run clean      # Removes build artifacts
```

---

## License

Apache-2.0
