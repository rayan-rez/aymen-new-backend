# ============================================
# BASE STAGE - Common dependencies
# ============================================
FROM node:22.16.0-alpine3.22 AS base

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================
# DEPENDENCIES STAGE - Install production dependencies
# ============================================
FROM base AS dependencies

RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# BUILD STAGE - Build the application
# ============================================
FROM base AS build

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Type check
RUN npm run type-check

# Build with Babel
RUN npm run build

# ============================================
# PRODUCTION STAGE - Final optimized image
# ============================================
FROM node:22.16.0-alpine3.22 AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy necessary config files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs knexfile.js ./

# Copy .env.docker as .env inside container
COPY --chown=nodejs:nodejs .env.docker ./.env

# Create uploads directory
RUN mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]