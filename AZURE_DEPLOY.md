# Deploying Network Navigator to Azure App Service

This guide covers deploying the app as a single Azure App Service (Linux, Node.js).
Express serves both the API and the built React frontend.

---

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) installed and signed in (`az login`)
- [pnpm](https://pnpm.io/installation) installed
- A [Clerk](https://clerk.com) account with a **production** application created
- A PostgreSQL database (Supabase or Azure Database for PostgreSQL)

---

## 1. Clone and build locally

```bash
git clone <your-repo-url>
cd network-navigator

# Install all workspace dependencies
pnpm install

# Build the frontend (outputs to artifacts/network-navigator/dist/public)
# and the backend (outputs to artifacts/api-server/dist)
pnpm run build:azure
```

---

## 2. Create the Azure App Service

```bash
# Create a resource group
az group create --name rg-network-navigator --location eastus

# Create an App Service plan (Linux, B1 = basic tier)
az appservice plan create \
  --name plan-network-navigator \
  --resource-group rg-network-navigator \
  --sku B1 \
  --is-linux

# Create the web app (Node 22 LTS)
az webapp create \
  --name network-navigator \
  --resource-group rg-network-navigator \
  --plan plan-network-navigator \
  --runtime "NODE:22-lts"
```

---

## 3. Configure environment variables

Go to **Azure Portal → App Service → Configuration → Application Settings** and add:

| Setting name | Value |
|---|---|
| `CONNECTION_STRING` | Your PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk production secret key (`sk_live_...`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key (`pk_live_...`) |
| `VITE_CLERK_PROXY_URL` | `https://network-navigator.azurewebsites.net/api/__clerk` |
| `ALLOWED_ORIGIN` | `https://network-navigator.azurewebsites.net` |
| `NODE_ENV` | `production` |

> **Note:** `PORT` is set automatically by Azure — do not override it.

Or use the CLI:

```bash
az webapp config appsettings set \
  --name network-navigator \
  --resource-group rg-network-navigator \
  --settings \
    CONNECTION_STRING="postgresql://..." \
    CLERK_SECRET_KEY="sk_live_..." \
    VITE_CLERK_PUBLISHABLE_KEY="pk_live_..." \
    VITE_CLERK_PROXY_URL="https://network-navigator.azurewebsites.net/api/__clerk" \
    ALLOWED_ORIGIN="https://network-navigator.azurewebsites.net" \
    NODE_ENV="production"
```

---

## 4. Set the startup command

In **Azure Portal → Configuration → General Settings → Startup Command**, enter:

```
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Or via CLI:

```bash
az webapp config set \
  --name network-navigator \
  --resource-group rg-network-navigator \
  --startup-file "node --enable-source-maps artifacts/api-server/dist/index.mjs"
```

---

## 5. Deploy

### Option A: Zip deploy (recommended for first deploy)

```bash
# From the repo root
zip -r deploy.zip . \
  --exclude "*.git*" \
  --exclude "node_modules/*" \
  --exclude ".local/*" \
  --exclude "attached_assets/*"

az webapp deployment source config-zip \
  --name network-navigator \
  --resource-group rg-network-navigator \
  --src deploy.zip
```

### Option B: GitHub Actions (for CI/CD)

Use the **Deployment Center** in the Azure Portal to connect your GitHub repo.
Set the build command to `pnpm install && pnpm run build:azure`.

---

## 6. Configure Clerk for your Azure domain

In the Clerk dashboard, add `https://network-navigator.azurewebsites.net` to:
- **Allowed origins** (under API Keys)
- **Redirect URLs** (under User & Authentication → Email, Phone, Username)

---

## Environment variable reference

See `.env.example` for all supported variables with descriptions.

---

## Troubleshooting

- **App won't start**: Check **App Service → Monitoring → Log Stream** for startup errors. The most common issue is a missing environment variable.
- **Login loop / Clerk errors**: Verify `VITE_CLERK_PUBLISHABLE_KEY` uses production keys (`pk_live_`) not dev keys (`pk_test_`). Also confirm the proxy URL is correct.
- **CORS errors**: Make sure `ALLOWED_ORIGIN` matches your exact Azure URL (no trailing slash).
- **Database connection errors**: Ensure your Supabase/PostgreSQL connection string includes `?sslmode=require` and that Azure's outbound IPs are allowlisted in your DB firewall.
