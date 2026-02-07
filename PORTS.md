# Port Configuration Guide

This guide explains how to configure ports for Services Dashboard when deploying with Docker Compose.

## Overview

Services Dashboard uses environment variables to configure all service ports, making it easy to avoid port conflicts and customize your deployment.

## Environment Variables

### Backend (API) Ports

- **`BACKEND_PORT`** (default: `5050`)
  - The port exposed on your host machine for the backend API
  - Example: Set to `8080` if you want to access the API at `http://localhost:8080`

- **`BACKEND_INTERNAL_PORT`** (default: `8080` for production, `5050` for development)
  - The port the backend listens on inside the Docker container
  - **Recommendation:** Keep the default unless you have a specific reason to change it

### Frontend (Web App) Ports

- **`FRONTEND_PORT`** (default: `5173`)
  - The port exposed on your host machine for the frontend web application
  - Example: Set to `3000` if you want to access the web app at `http://localhost:3000`

- **`FRONTEND_INTERNAL_PORT`** (default: `80` for production, `5173` for development)
  - The port the frontend listens on inside the Docker container
  - **Recommendation:** Keep the default unless you have a specific reason to change it

### Database Port

- **`DB_PORT`** (default: `5432`)
  - The port exposed on your host machine for PostgreSQL
  - Example: Set to `5433` if you already have PostgreSQL running on port 5432

## Configuration Methods

### Method 1: Using a .env File (Recommended)

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.production.example .env

# Edit with your preferred ports
nano .env
```

Example `.env` file:

```env
# Backend API on port 8080
BACKEND_PORT=8080
BACKEND_INTERNAL_PORT=8080

# Frontend web app on port 3000
FRONTEND_PORT=3000
FRONTEND_INTERNAL_PORT=80

# Database on default port
DB_PORT=5432
```

### Method 2: Inline Environment Variables

Set environment variables before running docker-compose:

```bash
# Linux/macOS
export BACKEND_PORT=8080
export FRONTEND_PORT=3000
docker-compose -f compose.prod.yaml up -d

# Windows PowerShell
$env:BACKEND_PORT=8080
$env:FRONTEND_PORT=3000
docker-compose -f compose.prod.yaml up -d
```

### Method 3: Command Line Arguments

Pass environment variables directly in the command:

```bash
BACKEND_PORT=8080 FRONTEND_PORT=3000 docker-compose -f compose.prod.yaml up -d
```

## Common Scenarios

### Scenario 1: Default Configuration

No configuration needed. Simply run:

```bash
docker-compose -f compose.prod.yaml up -d
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5050
- Database: localhost:5432

### Scenario 2: Avoid Port Conflicts

If ports 5050 or 5173 are already in use:

```bash
# Create .env file
cat > .env << EOF
BACKEND_PORT=8080
FRONTEND_PORT=3000
DB_PORT=5433
EOF

# Start services
docker-compose -f compose.prod.yaml up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Database: localhost:5433

### Scenario 3: Standard Web Ports (80/443)

For production with reverse proxy (e.g., nginx, Caddy):

```env
# Frontend on standard HTTP port
FRONTEND_PORT=80
FRONTEND_INTERNAL_PORT=80

# Backend on standard port
BACKEND_PORT=5050
BACKEND_INTERNAL_PORT=8080

# Database not exposed externally (remove DB_PORT from compose file)
```

Then configure your reverse proxy to forward to these ports.

### Scenario 4: Multiple Instances

Run multiple instances of Services Dashboard on the same host:

**Instance 1:**
```env
BACKEND_PORT=5050
FRONTEND_PORT=5173
DB_PORT=5432
```

**Instance 2:**
```env
BACKEND_PORT=5051
FRONTEND_PORT=5174
DB_PORT=5433
```

Start each instance in a separate directory with its own `.env` file.

## Port Mapping Explained

Docker port mapping format: `HOST_PORT:CONTAINER_PORT`

Example from `compose.prod.yaml`:
```yaml
ports:
  - "${BACKEND_PORT:-5050}:${BACKEND_INTERNAL_PORT:-8080}"
```

This means:
- `${BACKEND_PORT:-5050}` = Host port (what you access from your machine)
- `${BACKEND_INTERNAL_PORT:-8080}` = Container port (where the app listens inside Docker)
- `:-5050` = Default value if environment variable is not set

## Troubleshooting

### Port Already in Use

**Error:** `Bind for 0.0.0.0:5050 failed: port is already allocated`

**Solution:**
1. Check what's using the port:
   ```bash
   # Linux/macOS
   sudo lsof -i :5050

   # Windows
   netstat -ano | findstr :5050
   ```

2. Either stop the conflicting service or change the port in your `.env` file

### Cannot Access Services

**Problem:** Services start but can't be accessed from browser

**Checklist:**
1. Verify services are running:
   ```bash
   docker-compose -f compose.prod.yaml ps
   ```

2. Check if ports are exposed:
   ```bash
   docker-compose -f compose.prod.yaml port frontend 80
   docker-compose -f compose.prod.yaml port servicesdashboard 8080
   ```

3. Check firewall settings:
   ```bash
   # Linux
   sudo ufw status
   sudo ufw allow 5050/tcp
   sudo ufw allow 5173/tcp
   ```

4. Verify environment variables are loaded:
   ```bash
   docker-compose -f compose.prod.yaml config
   ```

### Internal Port Conflicts

If you change `BACKEND_INTERNAL_PORT` or `FRONTEND_INTERNAL_PORT`, ensure:

1. The Dockerfile's EXPOSE directive matches (for documentation)
2. Health checks use the correct internal port
3. The application configuration matches the internal port

## Development vs Production

### Development (`compose.yaml`)
- Default ports: Backend 5050, Frontend 5173
- Hot reload enabled
- Source code mounted as volumes

### Production (`compose.prod.yaml`)
- Default ports: Backend 5050, Frontend 5173
- Optimized production builds
- Uses Docker images from Docker Hub

Both support the same environment variables for port configuration!

## Best Practices

1. **Use .env files** for persistent configuration
2. **Keep internal ports at defaults** unless necessary to change
3. **Document custom ports** in your deployment notes
4. **Use reverse proxy** for production with SSL/TLS
5. **Don't expose database port** in production (remove DB_PORT mapping)
6. **Test port changes** in development before deploying to production

## Need Help?

- Check logs: `docker-compose -f compose.prod.yaml logs`
- View configuration: `docker-compose -f compose.prod.yaml config`
- Restart services: `docker-compose -f compose.prod.yaml restart`
- Full reset: `docker-compose -f compose.prod.yaml down && docker-compose -f compose.prod.yaml up -d`
