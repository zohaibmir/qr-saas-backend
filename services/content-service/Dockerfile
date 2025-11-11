FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared dependencies
COPY ../../shared ./shared

# Copy service source
COPY src ./src

# Build the service
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S contentservice -u 1001

# Create uploads directory
RUN mkdir -p /app/uploads && chown contentservice:nodejs /app/uploads

USER contentservice

EXPOSE 3011

CMD ["node", "dist/index.js"]