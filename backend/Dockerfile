# Use Node 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Use production mode by default
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev) for migrations + seeders
RUN npm install

# Install Sequelize CLI globally (so npx can find it)
RUN npm install -g sequelize-cli

# Copy rest of the code
COPY . .

# Expose backend port
EXPOSE 5000

# Copy wait-for-db script
COPY wait-for-db.js /wait-for-db.js

# Start the app (wait-for-db will run migrations + start server)
CMD ["node", "/wait-for-db.js"]
