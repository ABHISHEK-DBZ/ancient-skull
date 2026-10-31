# Azure Deployment Guide - Exit Capsule Generator

This guide walks you through deploying the Exit Capsule Generator to Microsoft Azure.

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Azure subscription
- Docker installed (for container deployment) OR just Azure CLI (for App Service zip deploy)

---

## Option 1: Azure App Service (Linux) - Recommended

### Step 1: Login and create resource group

```bash
az login
az group create --name exit-capsule-rg --location eastus
```

### Step 2: Create App Service Plan

```bash
az appservice plan create \
  --name exit-capsule-plan \
  --resource-group exit-capsule-rg \
  --sku B1 \
  --is-linux
```

### Step 3: Create Web App

```bash
az webapp create \
  --resource-group exit-capsule-rg \
  --plan exit-capsule-plan \
  --name exit-capsule-generator \
  --runtime "PYTHON|3.12"
```

### Step 4: Configure Application Settings (Secrets)

```bash
az webapp config appsettings set \
  --resource-group exit-capsule-rg \
  --name exit-capsule-generator \
  --settings \
    GEMMA_API_KEY="your-gemini-api-key" \
    GEMMA_API_BASE_URL="https://generativelanguage.googleapis.com/v1beta" \
    GEMMA_MODEL="gemma-4-26b-a4b-it" \
    ENABLE_REMOTE_INFERENCE="true" \
    GITHUB_CLIENT_ID="your-github-oauth-client-id" \
    GITHUB_CLIENT_SECRET="your-github-oauth-client-secret" \
    GITHUB_REDIRECT_URI="https://exit-capsule-generator.azurewebsites.net/auth/callback" \
    SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" \
    SESSION_COOKIE_SECURE="true" \
    REQUIRE_AUTH="false" \
    CORS_ORIGINS="https://exit-capsule-generator.azurewebsites.net" \
    ALLOWED_SCAN_ROOTS="" \
    PORT="8000"
```

### Step 5: Deploy the code

**Using Azure CLI zip deploy:**

```bash
# Create deployment zip (excluding node_modules, .git, etc.)
cd "C:\Users\Abhishek\Downloads\H26_Lexacore_Exit-Capsule-Generator"
Compress-Archive -Path "*" -DestinationPath "deploy.zip" -Force

az webapp deploy \
  --resource-group exit-capsule-rg \
  --name exit-capsule-generator \
  --src-path deploy.zip \
  --type zip
```

**Using GitHub Actions (CI/CD):**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: exit-capsule-generator
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

### Step 6: Startup Command

In Azure Portal → App Service → Configuration → General settings:
- **Startup command**: `sh startup.sh` (or leave default, startup.sh is auto-detected)
- Or set `SCM_DO_BUILD_DURING_DEPLOYMENT=false` in app settings

---

## Option 2: Azure Container Apps (Docker)

### Step 1: Create Azure Container Registry

```bash
az acr create \
  --resource-group exit-capsule-rg \
  --name exitcacr \
  --sku Basic
```

### Step 2: Build and push image

```bash
az acr login --name exitcacr

docker build -t exitcacr.azurecr.io/exit-capsule-generator:latest .
docker push exitcacr.azurecr.io/exit-capsule-generator:latest
```

### Step 3: Create Container Apps environment

```bash
az env create \
  --name exit-capsule-env \
  --resource-group exit-capsule-rg \
  --location eastus
```

### Step 4: Deploy container app

```bash
az containerapp create \
  --name exit-capsule-generator \
  --resource-group exit-capsule-rg \
  --environment exit-capsule-env \
  --image exitcacr.azurecr.io/exit-capsule-generator:latest \
  --target-port 8000 \
  --ingress external \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env GEMMA_API_KEY="<your-key>" \
  --env SESSION_COOKIE_SECURE="true" \
  --env CORS_ORIGINS="https://exit-capsule-generator.<region>.azurecontainerapps.io"
```

---

## Option 3: Azure App Service with Docker Compose

Create `docker-compose.yml` for multi-container if needed.

---

## Security Checklist Before Production

| Setting | Value | Why |
|---------|-------|-----|
| `SESSION_COOKIE_SECURE` | `true` | Ensures cookies only sent over HTTPS |
| `REQUIRE_AUTH` | `true` | Requires GitHub OAuth for API access (public deployments) |
| `CORS_ORIGINS` | Your domain | Restricts cross-origin requests |
| `ALLOWED_SCAN_ROOTS` | Specific paths | Limits which directories can be scanned |
| `GEMMA_API_KEY` | Azure App Setting | Never commit to git |
| `SECRET_KEY` | Azure App Setting | Encryption key for GitHub tokens |

### Generate SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## Verify Deployment

1. Open `https://exit-capsule-generator.azurewebsites.net/api/health`
2. Expected response: `{"status": "healthy", "service": "Exit Capsule Generator API", "version": "1.0.0"}`
3. Open `https://exit-capsule-generator.azurewebsites.net/` for the UI

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend not loading | Ensure `frontend/dist/` exists or npm is available in runtime |
| Database locked | SQLite WAL mode handles concurrent reads; ensure only one writer |
| CORS errors | Set `CORS_ORIGINS` to your Azure domain |
| Gemma AI not working | Verify `GEMMA_API_KEY` and `ENABLE_REMOTE_INFERENCE=true` |
| GitHub OAuth fails | Set `GITHUB_REDIRECT_URI` to match your Azure domain exactly |

---

## Real-Time Feature Status

The application currently uses **polling-based real-time updates** (every 750ms) for scan progress via `GET /api/scans/{id}/progress`. WebSocket/SSE support is not implemented but can be added if needed for true real-time streaming.
