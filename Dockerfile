# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files and install dependencies (including AWS SDK)
COPY package.json ./
RUN npm install --ignore-scripts && npm install --save-dev @types/pg

# Copy source and compile
COPY src/worker.ts ./src/
COPY tsconfig.json ./

RUN npx tsc --noEmit false --outDir dist --module commonjs --moduleResolution node src/worker.ts

# Stage 2: Runtime (The "Light" Image)
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy compiled output and runtime dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

CMD ["node", "dist/worker.js"]
