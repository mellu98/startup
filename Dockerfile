FROM node:20-bookworm AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    python3 \
    python3-setuptools \
    pkg-config \
    git \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_GYP_FORCE_PYTHON=/usr/bin/python3
COPY package.json ./
RUN npm install --no-audit --no-fund 2>&1 | tee npm-install.log || true
RUN mkdir -p /app/node_modules

FROM node:20-bookworm AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/npm-install.log ./npm-install.log
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=384
RUN npm run build 2>&1 | tee build.log || true
RUN mkdir -p /app/.next/standalone /app/.next/static /app/public

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN mkdir -p /app/data
COPY --from=builder /app/npm-install.log ./npm-install.log
COPY --from=builder /app/build.log ./build.log
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else echo '=== NPM INSTALL LOG ==='; cat npm-install.log; echo '=== BUILD LOG ==='; cat build.log; fi"]
