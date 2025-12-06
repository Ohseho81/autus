# AUTUS Configuration Guide

## Environment Setup

AUTUS uses environment variables for configuration. This guide explains all available options.

## Quick Start

```bash
# 1. Copy sample configuration
cp .env.sample .env

# 2. Add your API keys
export ANTHROPIC_API_KEY=sk-ant-your-key

# 3. Run server
python -m uvicorn main:app --reload
```

## Configuration Files

| File | Purpose | Usage |
|------|---------|-------|
| `.env.sample` | Template with all options | Copy to `.env` |
| `.env` | Local configuration | ⚠️ Never commit to git |
| `constitution.yaml` | AUTUS principles (read-only) | System constants |

## Required Settings

### API Keys

```bash
# Anthropic API for AI features
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### Server

```bash
# Port to run server on
PORT=8003

# Host binding
HOST=0.0.0.0

# Environment type
ENVIRONMENT=development  # or staging, production
```

## Optional Settings

### MQTT (IoT Devices)

```bash
MQTT_HOST=mqtt.example.com
MQTT_PORT=1883
MQTT_USERNAME=user
MQTT_PASSWORD=pass
```

### Logging

```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### CORS (Cross-Origin)

```bash
CORS_ORIGINS=http://localhost:5173,https://autus-dashboard.vercel.app
```

### External Services

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENDGRID_API_KEY=SG.your-key
SENTRY_DSN=https://your-sentry-dsn
```

### Feature Flags

```bash
ENABLE_GOD_MODE=true
ENABLE_AUTO_EVOLUTION=true
ENABLE_ANALYTICS=true
```

### Rate Limiting

```bash
RATE_LIMIT_PER_MINUTE=100
```

## Development vs Production

### Development

```bash
ENVIRONMENT=development
LOG_LEVEL=DEBUG
ENABLE_GOD_MODE=true
ENABLE_AUTO_EVOLUTION=true
```

### Production

```bash
ENVIRONMENT=production
LOG_LEVEL=WARNING
ENABLE_GOD_MODE=false
# Additional security settings
```

## Deployment Platforms

### Local Development

```bash
# Copy sample
cp .env.sample .env

# Edit with your keys
nano .env

# Run
python -m uvicorn main:app --reload
```

### Docker

```bash
# Set environment variables
docker run \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  -e PORT=8003 \
  -p 8003:8003 \
  autus-api
```

### Docker Compose

```yaml
services:
  autus-api:
    build: .
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=8003
      - ENVIRONMENT=production
```

### Railway

1. Go to Project Settings
2. Under Variables, add:
   - `ANTHROPIC_API_KEY`
   - `PORT` (usually set automatically)
   - Other required variables
3. Railway reads from environment, not `.env`

### Vercel (for Dashboard)

```bash
# Set environment variables in Vercel dashboard
VITE_API_URL=https://autus-production.up.railway.app
```

## Environment Variables Reference

### System

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8003 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `ENVIRONMENT` | development | Environment type |

### API Keys

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | **Required** Anthropic API key |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | INFO | Logging level |

### Features

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GOD_MODE` | true | Enable admin features |
| `ENABLE_AUTO_EVOLUTION` | true | Enable AI-driven development |
| `ENABLE_ANALYTICS` | true | Enable usage analytics |

### Limits

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_PER_MINUTE` | 100 | Rate limit |

## Security Best Practices

### ✅ Do's

- ✅ Use `.env.sample` as a template
- ✅ Add `.env` to `.gitignore`
- ✅ Keep API keys secret
- ✅ Use strong secrets in production
- ✅ Rotate keys regularly
- ✅ Use platform-specific secret management (Railway, Vercel, etc.)

### ❌ Don'ts

- ❌ Never commit `.env` to git
- ❌ Never share API keys
- ❌ Don't use same keys for dev and prod
- ❌ Don't leave debug mode on in production
- ❌ Don't expose secrets in logs

## Verification

Check if configuration is loaded:

```bash
# Test API key
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('API Key:', bool(os.getenv('ANTHROPIC_API_KEY')))"

# Check all env variables
python -m dotenv list
```

## Troubleshooting

### "APIError: No API key provided"

```bash
# Check if .env is in project root
ls -la .env

# Check if ANTHROPIC_API_KEY is set
echo $ANTHROPIC_API_KEY

# If empty, reload:
source .env
```

### "Connection refused" for MQTT

MQTT is optional. Leave commented out unless using IoT devices.

### "Port 8003 already in use"

```bash
# Find and kill process
lsof -i :8003 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
PORT=8004 python -m uvicorn main:app
```

### Environment variable not recognized

```bash
# Ensure .env is in project root
pwd  # Should be /path/to/autus

# Reload environment
unset ANTHROPIC_API_KEY  # Clear
source .env  # Reload
echo $ANTHROPIC_API_KEY  # Verify
```

## See Also

- `README.md` - Project overview
- `CONSTITUTION.md` - System principles
- `API_REFERENCE.md` - API endpoints
- `TESTING.md` - Testing guide

---

**Last Updated**: 2025-12-06
**Version**: 4.2.0
