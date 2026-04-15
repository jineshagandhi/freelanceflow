# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React/Vite frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Cache-friendly: copy package files first, install, then copy source.
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

# Copy the rest of the frontend source and build
COPY frontend/ ./
RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build the Spring Boot jar (bundles the SPA bundle from Stage 1)
# ─────────────────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build

# Cache dependencies
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline

# Copy backend source
COPY src ./src

# Copy the built SPA into Spring Boot's static resources folder
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static

# Build the fat jar (skip tests for speed on cloud builders)
RUN mvn -B -ntp clean package -DskipTests


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime image (small, only the JRE + jar)
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Copy the packaged jar from the build stage
COPY --from=backend-build /build/target/*.jar app.jar

# Default port (Render/Railway override via $PORT at runtime)
ENV PORT=8080
EXPOSE 8080

# Use $PORT so the same image works on any host that injects one
ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT}"]