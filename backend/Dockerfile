# ──────────────────────────────────────────────────────
# Development image – nodemon hot-reload
# Production swap: uncomment the CMD at the bottom and
# change the build target.
# ──────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install

# Copy source (will be overridden by the bind-mount in dev)
COPY . .

EXPOSE 5000

# nodemon is listed as a devDependency; it is available inside the container.
CMD ["npm", "run", "dev"]
