# Use Node 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Use production mode by default
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev) for migrations
RUN npm install

# Copy rest of the code
COPY . .

# Expose backend port
EXPOSE 5000

# Copy wait-for-db script
COPY wait-for-db.js /wait-for-db.js

# Start the app
CMD ["node", "/wait-for-db.js"]
