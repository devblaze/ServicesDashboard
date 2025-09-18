# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Services Dashboard is a modern full-stack monitoring application for containerized services with AI-powered analysis and network discovery:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: .NET 9 ASP.NET Core Web API + Entity Framework Core  
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose
- **AI Integration**: Ollama for log analysis and service recognition

## Development Commands

### Full Stack Development (Docker Compose)
```bash
# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Frontend Development (Local)
```bash
cd services-dashboard-frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Backend Development (Local)
```bash
cd ServicesDashboard

# Restore packages
dotnet restore

# Run with hot reload
dotnet watch run

# Run without hot reload
dotnet run --launch-profile "Development"

# Build
dotnet build
```

### Testing
```bash
# Run backend tests with coverage
./coverage.sh

# Run backend tests only
dotnet test ServicesDashboard.Tests/ServicesDashboard.Tests.csproj
```

## Architecture Overview

### Full-Stack Communication
- Frontend runs on port 5173 (development) communicating with backend via API calls
- Backend runs on port 5000/5432 exposing REST API endpoints with Swagger documentation
- Database runs on port 5432 with auto-migration on startup
- Services communicate via Docker networking (servicesdashboard.orb.local domain in development)

### Key Backend Services Structure
- `Controllers/` - Web API endpoints for services, network discovery, logs, settings
- `Services/` - Business logic including Docker integration, network scanning, AI analysis
- `Models/` - Data models and DTOs
- `Data/` - Entity Framework context and database entities

### Key Frontend Structure  
- `src/components/` - Reusable React components
- `src/services/` - API service layer using axios and React Query
- `src/types/` - TypeScript type definitions matching backend models
- `src/hooks/` - Custom React hooks
- `src/providers/` - React context providers for global state

### Key Features Architecture
- **Service Monitoring**: Health check system with configurable intervals and Docker container integration
- **Network Discovery**: CIDR range scanning and banner analysis for service recognition  
- **AI Integration**: Ollama-based log analysis and service type detection from network banners
- **Real-time Updates**: React Query for caching and live data updates

## Configuration

### Environment Setup
- Development uses `compose.yaml` with live code mounting and hot reload
- Backend configuration in `appsettings.Development.json` 
- Frontend environment variables via VITE_ prefixed variables
- Database credentials: admin/admin123 (development only)

### Key Backend Configuration
- ConnectionStrings: PostgreSQL connection configured via environment variables
- AppSettings: Ollama integration, network scan timeouts, concurrency limits
- CORS configured for frontend domain communication

### Key Frontend Configuration
- API base URL configured via VITE_API_BASE_URL environment variable
- Uses OrbStack domain routing in development: http://servicesdashboard.servicesdashboard.orb.local

## Development Workflow

### Making Changes
1. For backend changes, use `dotnet watch run` or Docker Compose for live reload
2. For frontend changes, use `npm run dev` for hot module replacement
3. Database changes auto-migrate via Entity Framework on startup

### API Development
- Swagger UI available at backend URL + `/swagger` for API testing
- API follows RESTful patterns with standard HTTP methods
- All endpoints return JSON with consistent error handling

### Docker Development
- Use Docker Compose for full-stack development to match production environment
- Backend and frontend have separate Dockerfile.dev for development with volume mounting
- Database data persists via named Docker volumes