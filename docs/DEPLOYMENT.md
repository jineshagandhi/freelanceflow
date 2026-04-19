# Deployment Guide

FreelanceFlow is containerized with Docker and deployed on Render.com with MongoDB Atlas as the production database.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Docker Multi-Stage Build](#docker-multi-stage-build)
- [Environment Variables](#environment-variables)
- [Deploy to Render.com](#deploy-to-rendercom)
- [Configure MongoDB Atlas](#configure-mongodb-atlas)
- [Local Development Setup](#local-development-setup)
- [Verify Deployment](#verify-deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
GitHub Repository
       │
       ▼  (auto-deploy on push)
  Render.com
  Docker Build
  ┌──────────────────────────────────────────┐
  │  Stage 1: node:20-alpine                │
  │  → npm run build → dist/               │
  │                                          │
  │  Stage 2: maven:3.9-eclipse-temurin-21  │
  │  → mvn package → app.jar               │
  │  (embeds dist/ as static resources)     │
  │                                          │
  │  Stage 3: eclipse-temurin:21-jre-alpine │
  │  → java -jar app.jar (runtime only)     │
  └──────────────────────────────────────────┘
       │
       ▼  MONGODB_URI env var
  MongoDB Atlas
  (cloud-hosted replica set)
```

---

## Docker Multi-Stage Build

The `Dockerfile` at the project root uses three stages to produce a minimal, secure runtime image.

### Stage 1 — Frontend Build

```dockerfile
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build
```

- Installs npm dependencies (cached layer)
- Builds the React/Vite app into `dist/`
- Node.js and all `node_modules` are **not** present in the final image

### Stage 2 — Backend Build

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn -B -ntp clean package -DskipTests
```

- Downloads Maven dependencies offline first (Docker layer caching)
- Copies the Stage 1 `dist/` into Spring Boot's static resources
- Produces a fat JAR containing both API and bundled SPA

### Stage 3 — Runtime Image

```dockerfile
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY --from=backend-build /build/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT}"]
```

- Only the JRE + app JAR — no build tools, no source code
- `$PORT` is injected by Render at runtime

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | **Yes (production)** | `mongodb://localhost:27017/freelanceflow` | Full MongoDB connection string including credentials |
| `PORT` | Auto-injected | `8080` | HTTP port. Set automatically by Render — do **not** set this manually in Render's environment config |

These are configured in `src/main/resources/application.properties`:

```properties
spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/freelanceflow}
server.port=${PORT:8080}
```

---

## Deploy to Render.com

### Step 1 — Push to GitHub

Ensure the `Dockerfile` is committed at the project root and all source code is pushed:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2 — Create a Render Web Service

1. Log in at [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub account and select the `freelanceflow` repository
4. Select the branch to deploy (usually `main`)

### Step 3 — Configure the Service

| Setting | Value |
|---------|-------|
| **Name** | `freelanceflow` (or any name) |
| **Environment** | `Docker` |
| **Instance Type** | Free (sufficient for demo) |
| **Auto-Deploy** | Yes (optional — redeploys on every push) |

Render auto-detects the `Dockerfile` at the root. No build command needed.

### Step 4 — Set Environment Variables

In the Render dashboard under **Environment** tab:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas SRV connection string (see below) |

> **Do NOT set `PORT`** — Render injects this automatically. Setting it manually can cause the app to bind to the wrong port.

### Step 5 — Deploy

Click **Create Web Service**. Render will:
1. Clone your repository
2. Run the Docker multi-stage build (~5–8 minutes on first build, faster on subsequent builds due to layer caching)
3. Start the container

Your app will be available at `https://<service-name>.onrender.com`.

This project's live deployment: [https://freelanceflow-nf7p.onrender.com/](https://freelanceflow-nf7p.onrender.com/)

---

## Configure MongoDB Atlas

### Step 1 — Create a Free Cluster

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new project
3. Click **Build a Database** → **Free (M0 Sandbox)**
4. Choose a cloud provider and region (any region close to your Render service)

### Step 2 — Create a Database User

1. Go to **Database Access** → **Add New Database User**
2. Choose **Password** authentication
3. Set a username and strong password
4. Grant **Read and write to any database** role
5. Click **Add User**

### Step 3 — Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`)

> Render.com uses dynamic outbound IPs on the free tier, so you must allow all IPs. For production, use Render's static outbound IPs (paid plan) and whitelist only those.

### Step 4 — Get the Connection String

1. Go to **Database** → **Connect** → **Drivers**
2. Select **Java** driver
3. Copy the SRV connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Append the database name: `...mongodb.net/freelanceflow?retryWrites=true&w=majority`

Paste this as the value of `MONGODB_URI` in Render.

---

## Local Development Setup

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Java JDK | 21 | [adoptium.net](https://adoptium.net) |
| Maven | 3.9+ | bundled via `mvnw` wrapper |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| MongoDB | any | [mongodb.com/try/download](https://www.mongodb.com/try/download/community) |

### Option A — Full stack (recommended for development)

```bash
# 1. Clone
git clone https://github.com/<your-org>/freelanceflow.git
cd freelanceflow

# 2. Start MongoDB locally
mongod --dbpath /data/db

# 3. Build and run backend (serves built SPA from static/)
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run

# 4. Open http://localhost:8080
```

### Option B — Hot-reload frontend development

```bash
# Terminal 1 — Backend
./mvnw spring-boot:run

# Terminal 2 — Frontend dev server (hot reload, proxies /api/* to :8080)
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

The `vite.config.ts` proxy configuration forwards all `/api/*` requests to `http://localhost:8080` automatically.

### Option C — Docker locally

```bash
docker build -t freelanceflow .
docker run -p 8080:8080 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/freelanceflow" \
  freelanceflow
```

---

## Verify Deployment

After deployment, verify the application is working:

1. **Health check** — Open `https://freelanceflow-nf7p.onrender.com/` — the landing page should load
2. **Register** — Create a Freelancer and a Client account
3. **API check** — `GET https://freelanceflow-nf7p.onrender.com/api/marketplace` should return `[]` (empty array for a fresh database)

### Common health indicators

| Indicator | Expected |
|-----------|----------|
| Landing page loads | HTTP 200 |
| `/api/marketplace` returns JSON | HTTP 200, `[]` |
| Login returns user object | HTTP 200 with user fields |
| MongoDB connected | No `MongoSocketException` in logs |

---

## Troubleshooting

### "Cannot connect to MongoDB"

- Verify `MONGODB_URI` is set correctly in Render environment
- Check MongoDB Atlas Network Access — `0.0.0.0/0` must be in the allowlist
- Confirm the database user password has no special characters that need URL encoding (use `%40` for `@`, etc.)

### Docker build fails with "Could not resolve dependencies"

The Maven dependency download step has no internet during build on some CI environments. The Dockerfile handles this with:
```dockerfile
RUN mvn -B -ntp dependency:go-offline
```
If this still fails, ensure the Render build runner has internet access (it does by default).

### App starts but shows blank page

The frontend SPA is served from Spring Boot's `static/` directory. If it's blank:
- Confirm the React build ran (Stage 1 in Dockerfile)
- Check `src/main/resources/static/index.html` exists in the built image
- `SpaController` catches all non-API routes and returns `index.html`

### Port binding error

Never set the `PORT` environment variable manually in Render. Render injects it automatically. If you see a port conflict, remove `PORT` from your environment variables list.

### Free tier cold starts

Render's free tier spins down idle services after 15 minutes. The first request after spin-down takes ~30–60 seconds. This is a Render limitation — upgrade to a paid instance for always-on availability.
