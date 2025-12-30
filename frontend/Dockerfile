# Build stage - Use Node 20 with Alpine but handle lightningcss specially
FROM node:20-alpine AS builder

WORKDIR /app

# Install python3, make, g++ for native module compilation
RUN apk add --no-cache python3 make g++

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Rebuild lightningcss for Alpine
RUN npm rebuild lightningcss --target_platform=linux --target_arch=x64 --target_libc=musl

# Copy source code
COPY frontend/ .

# Build the app
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]