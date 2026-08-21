FROM node:20-bookworm-slim

# Install necessary build tools for native SQLite bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
