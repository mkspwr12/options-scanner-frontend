# Frontend Deployment Guide

## GitHub Actions Setup

This repository uses GitHub Actions for automated deployment to Azure App Service.

### Required GitHub Secrets

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

#### 1. AZURE_CREDENTIALS

Service principal credentials for Azure authentication. Create using:

```bash
az ad sp create-for-rbac \
  --name "options-scanner-frontend-deploy" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/options-scanner-rg \
  --sdk-auth
```

Copy the entire JSON output to this secret.

#### 2. NEXT_PUBLIC_API_BASE

Backend API base URL:

```
https://options-scanner-backend-2exk6s.azurewebsites.net
```

This environment variable is embedded at build time and exposed to the browser.

### Deployment Process

1. **Automatic Deployment**: Push to `main` branch triggers automatic deployment
2. **Manual Deployment**: Use "Run workflow" button in Actions tab

### Build Process

The workflow performs the following steps:
1. Checks out code
2. Sets up Node.js 20
3. Installs dependencies with `npm ci`
4. Builds Next.js app with `NEXT_PUBLIC_API_BASE` set
5. Deploys standalone output to Azure App Service

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Access at: http://localhost:3000

### Azure App Service Configuration

The frontend is configured to use:
- **Node Version**: 20.x
- **Startup Command**: `node server.js` (Next.js standalone mode)
- **Output Mode**: Standalone (configured in next.config.mjs)

### Environment Variables

**NEXT_PUBLIC_API_BASE:**
- Must be set at build time (not runtime)
- Exposed to browser (public)
- Should point to backend App Service URL
- No trailing slash

### Troubleshooting

**Blank Screen:**
- Check browser console for API errors
- Verify `NEXT_PUBLIC_API_BASE` is set correctly
- Ensure backend is accessible and returning data

**Build Failures:**
- Check GitHub Actions logs
- Verify all dependencies in package.json
- Ensure TypeScript errors are resolved

**Deployment Issues:**
- Verify Azure credentials have not expired
- Check App Service logs for startup errors
- Ensure Node.js version matches workflow configuration
