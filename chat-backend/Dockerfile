# Use Node 18 as base image
FROM node:18-alpine

# Install dependencies for sequelize-cli
RUN apk add --no-cache bash

# Create app directory
WORKDIR /app

# Copy package files
COPY chat-backend/package*.json ./

# Install dependencies
# Install all dependencies (not just production)
RUN npm install --legacy-peer-deps


# Copy the rest of the application code
COPY chat-backend/ ./

# Create non-root user
RUN adduser -D -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if(r.statusCode !== 200) throw new Error()})" || exit 1

# Run migrations and start
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node index.js"]