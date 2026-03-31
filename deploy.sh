#!/bin/bash
set -e

echo "=== DeepCanvas VPS Deployment ==="

cd /opt/deepcanvas

# 1. Create backend .env (only if it doesn't exist — preserves saved API keys)
if [ ! -f .env ]; then
  echo "Creating initial .env..."
  cat > .env << 'ENVEOF'
TAVILY_API_KEY=your-tavily-api-key
JINA_API_KEY=your-jina-api-key
INFOQUEST_API_KEY=your-infoquest-api-key
CORS_ORIGINS=http://localhost:3000,http://localhost:2026,http://31.97.211.149:2026
GEMINI_API_KEY=AIzaSyAEGvcl9t32q0CmfxssHqSrMHnMHpIjviA
ENVEOF
else
  echo ".env already exists — preserving saved API keys"
  # Ensure CORS_ORIGINS includes the VPS IP
  if ! grep -q '31.97.211.149' .env; then
    echo 'CORS_ORIGINS=http://localhost:3000,http://localhost:2026,http://31.97.211.149:2026' >> .env
  fi
fi

# 2. Create frontend .env
cat > frontend/.env << 'FENVEOF'
NEXT_PUBLIC_BACKEND_BASE_URL=""
DATABASE_URL="postgresql://postgres.tzoptwhisidhcwjgzxff:Mrrobot0720%24@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
BETTER_AUTH_SECRET="k8Xp2mNqR7vY4wZ9aB3cD6eF1gH5jL0"
NEXT_PUBLIC_APP_URL="http://31.97.211.149:2026"
SKIP_ENV_VALIDATION=1
FENVEOF

export NEXT_PUBLIC_APP_URL="http://31.97.211.149:2026"

# 3. Copy config.yaml from example
cp config.example.yaml config.yaml

# 4. Set Docker env vars needed by docker-compose
export DEER_FLOW_HOME=/opt/deepcanvas/backend/.deer-flow
export DEER_FLOW_CONFIG_PATH=/opt/deepcanvas/config.yaml
export DEER_FLOW_EXTENSIONS_CONFIG_PATH=/opt/deepcanvas/extensions_config.example.json
export DEER_FLOW_DOCKER_SOCKET=/var/run/docker.sock
export DEER_FLOW_REPO_ROOT=/opt/deepcanvas
export BETTER_AUTH_SECRET="k8Xp2mNqR7vY4wZ9aB3cD6eF1gH5jL0"
export HOME=/root

# 5. Create data dirs
mkdir -p /opt/deepcanvas/backend/.deer-flow
mkdir -p /opt/deepcanvas/backend/.langgraph_api
mkdir -p /root/.claude
mkdir -p /root/.codex

# 6. Create a .env file for docker compose
cat > docker/.env << 'DENVEOF'
DEER_FLOW_HOME=/opt/deepcanvas/backend/.deer-flow
DEER_FLOW_CONFIG_PATH=/opt/deepcanvas/config.yaml
DEER_FLOW_EXTENSIONS_CONFIG_PATH=/opt/deepcanvas/extensions_config.example.json
DEER_FLOW_DOCKER_SOCKET=/var/run/docker.sock
DEER_FLOW_REPO_ROOT=/opt/deepcanvas
BETTER_AUTH_SECRET=k8Xp2mNqR7vY4wZ9aB3cD6eF1gH5jL0
NEXT_PUBLIC_APP_URL=http://31.97.211.149:2026
HOME=/root
PORT=2026
DENVEOF

echo "=== Building and starting containers ==="
cd docker
docker compose up -d --build

echo "=== Done! App should be at http://31.97.211.149:2026 ==="
docker compose ps
