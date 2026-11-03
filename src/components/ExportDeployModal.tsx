import React, { useState } from 'react';
import {
  X,
  Download,
  Terminal,
  Cloud,
  Server,
  Copy,
  Check,
  FolderArchive,
  ExternalLink,
} from 'lucide-react';

interface ExportDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDeployModal: React.FC<ExportDeployModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeDeployTab, setActiveDeployTab] = useState<'download' | 'local' | 'cloud' | 'vps'>('download');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const localDockerCode = `# 1. Extract the downloaded source package
tar -xzf xiaozhi-mcp-center-*.tar.gz
cd xiaozhi-mcp-center

# 2. (Optional) Configure environment variables
cp .env.example .env

# 3. Start production container in background
docker compose up -d

# Check status and logs
docker compose ps
docker compose logs -f`;

  const localNodeCode = `# 1. Extract and enter directory
tar -xzf xiaozhi-mcp-center-*.tar.gz
cd xiaozhi-mcp-center

# 2. Install dependencies
npm install

# 3. Run development mode
npm run dev

# Or build and run production mode:
npm run build
npm run start`;

  const cloudRunCode = `# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project <YOUR_GCP_PROJECT_ID>

# 2. Deploy directly from source to Cloud Run
gcloud run deploy xiaozhi-mcp-center \\
  --source . \\
  --region us-central1 \\
  --port 3000 \\
  --allow-unauthenticated \\
  --set-env-vars NODE_ENV=production`;

  const flyIoCode = `# Deploy to Fly.io using the built-in Dockerfile
fly launch
fly deploy`;

  const vpsDockerCode = `# On your VPS (Ubuntu/Debian):
# 1. Copy files to server
scp xiaozhi-mcp-center-*.tar.gz user@your-vps-ip:/opt/

# 2. SSH into your server
ssh user@your-vps-ip
cd /opt && tar -xzf xiaozhi-mcp-center-*.tar.gz && cd xiaozhi-mcp-center

# 3. Start container with automatic restart
docker compose up -d`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Download & Cloud Deployment Guide
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Export source code to your computer or deploy the MCP Center to Cloud / VPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveDeployTab('download')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeDeployTab === 'download'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Download Source</span>
          </button>
          <button
            onClick={() => setActiveDeployTab('local')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeDeployTab === 'local'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Run Locally (Docker/Node)</span>
          </button>
          <button
            onClick={() => setActiveDeployTab('cloud')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeDeployTab === 'cloud'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Serverless (Cloud Run / Fly)</span>
          </button>
          <button
            onClick={() => setActiveDeployTab('vps')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeDeployTab === 'vps'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>VPS / Self-Hosted</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeDeployTab === 'download' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Direct Source Archive (.tar.gz)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Includes Dockerfile, docker-compose.yml, README.md, backend server, and frontend components.
                  </p>
                </div>

                <a
                  href="/api/project/download"
                  download
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Archive (.tar.gz)</span>
                </a>
              </div>

              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-semibold text-slate-300">
                  Google AI Studio Export Options:
                </h5>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong className="text-slate-200">Export to GitHub:</strong> In the upper-right corner of Google AI Studio, click the project menu or export icon to push this codebase directly to your GitHub repository.
                  </li>
                  <li>
                    <strong className="text-slate-200">Direct Download:</strong> Use the button above to receive an unadulterated source package containing your configured plugins, simulator, and documentation.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeDeployTab === 'local' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Method 1: Run with Docker Compose (Recommended)
                  </span>
                  <button
                    onClick={() => copyCode(localDockerCode, 'local-docker')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'local-docker' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                  {localDockerCode}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Method 2: Run with Node.js
                  </span>
                  <button
                    onClick={() => copyCode(localNodeCode, 'local-node')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'local-node' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                  {localNodeCode}
                </pre>
              </div>
            </div>
          )}

          {activeDeployTab === 'cloud' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Google Cloud Run (Serverless Container)
                  </span>
                  <button
                    onClick={() => copyCode(cloudRunCode, 'cloud-run')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'cloud-run' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                  {cloudRunCode}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Fly.io / Railway / Render
                  </span>
                  <button
                    onClick={() => copyCode(flyIoCode, 'fly-io')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'fly-io' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                  {flyIoCode}
                </pre>
                <p className="text-[11px] text-slate-400">
                  Railway & Render will automatically detect the root <code className="text-amber-400">Dockerfile</code> when connected to your GitHub repository.
                </p>
              </div>
            </div>
          )}

          {activeDeployTab === 'vps' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Deploy to VPS / Home Server with Docker
                </span>
                <button
                  onClick={() => copyCode(vpsDockerCode, 'vps-docker')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedId === 'vps-docker' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                {vpsDockerCode}
              </pre>
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-medium">💡 Nginx / Reverse Proxy Reminder for MCP:</p>
                <p>
                  To keep the Server-Sent Events stream alive for your Xiaozhi ESP32-S3, make sure your Nginx config has <code className="text-cyan-400">proxy_buffering off;</code> and <code className="text-cyan-400">chunked_transfer_encoding off;</code> (detailed example in README.md).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
