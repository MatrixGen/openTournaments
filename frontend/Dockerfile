FROM node:20 AS build
WORKDIR /app

# 1. Copy only package files
COPY package*.json ./

# 2. Clean install and force the correct binary for Tailwind v4
RUN npm ci
RUN npm install @lightningcss/linux-x64-linux-x64-gnu

# 3. Copy the rest of the files (now .dockerignore will skip node_modules)
COPY . .

# 4. Run build
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]