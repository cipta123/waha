# 🌟 WAHA Plus Setup Guide

## What is WAHA Plus?

**WAHA Plus** is the premium version of WAHA with additional features:
- 🖥️ **Dashboard** - Web UI for managing sessions
- 📊 **Advanced Analytics** - Better monitoring
- 🎨 **Swagger White Label** - Customize API docs
- 🔄 **Media Conversion** - Built-in voice/video conversion
- 💾 **PostgreSQL Support** - Session & media storage
- 🔍 **Search Channels API** - Discover public channels
- 🖼️ **Set Group Picture** - Manage group images
- ⚡ **Priority Support** - Faster bug fixes

## 🔑 Getting Your WAHA Plus Key

1. Visit https://portal.devlike.pro/
2. Subscribe to WAHA Plus tier
3. Get your Docker registry key (format: `dckr_pat_xxxxx`)

## 🚀 Quick Start

### Step 1: Login to Docker Registry

```bash
docker login -u devlikeapro -p dckr_pat_xxxxx
```

Replace `dckr_pat_xxxxx` with your actual key from the portal.

### Step 2: Pull WAHA Plus Image

```bash
docker pull devlikeapro/waha-plus
```

For ARM (Apple M1/M2, Raspberry Pi):
```bash
docker pull devlikeapro/waha-plus:arm
```

### Step 3: Run WAHA Plus

```bash
docker run -it --rm -p 3000:3000/tcp --name waha devlikeapro/waha-plus
```

With persistent sessions:
```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -v $(pwd)/.sessions:/app/.sessions \
  devlikeapro/waha-plus
```

### Step 4: Logout (Security)

```bash
docker logout
```

## 🎯 Access Dashboard

Once running, open:
- **Dashboard**: http://localhost:3000/dashboard
- **API Docs**: http://localhost:3000/
- **Health Check**: http://localhost:3000/health

## 🔧 Advanced Configuration

### With PostgreSQL Session Storage

```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -e WHATSAPP_SESSIONS_POSTGRESQL_URL=postgres://user:pass@localhost:5432/waha \
  devlikeapro/waha-plus
```

### With Media Storage

```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -e WAHA_MEDIA_STORAGE=POSTGRESQL \
  -e WAHA_MEDIA_POSTGRESQL_URL=postgres://user:pass@localhost:5432/waha \
  devlikeapro/waha-plus
```

### With HTTPS

```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -v $(pwd)/.secrets:/app/.secrets \
  -e WAHA_HTTPS_ENABLED=true \
  -e WAHA_HTTPS_PATH_KEY=.secrets/privkey.pem \
  -e WAHA_HTTPS_PATH_CERT=.secrets/cert.pem \
  devlikeapro/waha-plus
```

## 📋 Environment Variables

### Core Settings
- `WHATSAPP_API_PORT` - API port (default: 3000)
- `WHATSAPP_API_HOSTNAME` - Hostname for external access
- `WHATSAPP_RESTART_ALL_SESSIONS` - Auto-restart sessions on startup

### Dashboard (WAHA Plus Only)
- `WAHA_DASHBOARD_ENABLED` - Enable/disable dashboard (default: true)
- `WAHA_DASHBOARD_USERNAME` - Dashboard username
- `WAHA_DASHBOARD_PASSWORD` - Dashboard password

### Storage (WAHA Plus Only)
- `WHATSAPP_SESSIONS_POSTGRESQL_URL` - PostgreSQL URL for sessions
- `WAHA_MEDIA_STORAGE` - Media storage type (LOCAL, POSTGRESQL, S3)
- `WAHA_MEDIA_POSTGRESQL_URL` - PostgreSQL URL for media

### White Label (WAHA Plus Only)
- `WAHA_SWAGGER_TITLE` - Custom Swagger title
- `WAHA_SWAGGER_DESCRIPTION` - Custom description
- `WAHA_SWAGGER_EXTERNAL_DOC_URL` - Custom documentation URL

## 🆚 WAHA Core vs WAHA Plus

| Feature | Core (Free) | Plus (Paid) |
|---------|------------|-------------|
| WhatsApp API | ✅ | ✅ |
| Send/Receive Messages | ✅ | ✅ |
| Media Support | ✅ | ✅ |
| Groups & Channels | ✅ | ✅ |
| **Dashboard** | ❌ | ✅ |
| **Media Conversion** | ❌ | ✅ |
| **PostgreSQL Storage** | ❌ | ✅ |
| **Search Channels** | ❌ | ✅ |
| **White Label** | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ |

## 🔄 Migrating from WAHA Core

### Update Docker Command

**Before (Core):**
```bash
docker run -it --rm -p 3000:3000 devlikeapro/waha
```

**After (Plus):**
```bash
docker login -u devlikeapro -p {YOUR_KEY}
docker run -it --rm -p 3000:3000 devlikeapro/waha-plus
docker logout
```

### Update docker-compose.yaml

**Before:**
```yaml
image: devlikeapro/waha
```

**After:**
```yaml
image: devlikeapro/waha-plus
```

Then:
```bash
docker login -u devlikeapro -p {YOUR_KEY}
docker compose pull
docker logout
docker compose up -d
```

## 🐛 Troubleshooting

### "unauthorized: authentication required"
- Make sure you've logged in: `docker login -u devlikeapro -p {YOUR_KEY}`
- Check your key is valid at https://portal.devlike.pro/

### "pull access denied"
- Your subscription might be expired
- Check your subscription status at https://portal.devlike.pro/

### Dashboard not showing
- Make sure you're using `waha-plus` image, not `waha`
- Check `WAHA_DASHBOARD_ENABLED=true` (default)
- Access http://localhost:3000/dashboard (not just /)

### Sessions not persisting
- Mount volume: `-v $(pwd)/.sessions:/app/.sessions`
- Or use PostgreSQL storage

## 📚 Documentation

- **Official Docs**: https://waha.devlike.pro/
- **Portal**: https://portal.devlike.pro/
- **GitHub**: https://github.com/devlikeapro/waha
- **Support**: waha@devlike.pro

## 💡 Tips

1. **Always logout** after pulling images for security
2. **Use volumes** to persist sessions between restarts
3. **Enable dashboard** for easier session management
4. **Use PostgreSQL** for production deployments
5. **Set up HTTPS** for secure external access

## 🎉 Enjoy WAHA Plus!

You now have access to all premium features. Check the dashboard at http://localhost:3000/dashboard to get started!
