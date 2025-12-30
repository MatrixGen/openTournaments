FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci

RUN npm install @lightningcss/linux-x64-musl

COPY . .
RUN npm run build

# Serve with a lightweight server (Nginx)
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
