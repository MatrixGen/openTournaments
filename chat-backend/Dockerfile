# Use Node 20 base image
FROM node:20

# Set working directory

WORKDIR /app

# Use production mode by default
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev) 
# Note: This is necessary if your migrations/seeders use dev dependencies.
RUN npm install

# Install Sequelize CLI globally (so npx can find it)
# Note: You only need this if you plan to run Sequelize migrations/seeders 
# inside this container. If chat-backend uses a different ORM or shares 
# the DB with the existing backend which handles migrations, you can remove this.
RUN npm install -g sequelize-cli

# Copy rest of the code
COPY . .

# Expose backend port (This must match the port in your Node.js code: 3000)
EXPOSE 3000

# Copy wait-for-db script
# Note: Assuming you copy this script from your original backend repo, 
# or it is part of the cloned chat-backend repository.
COPY wait-for-db.js /wait-for-db.js

# Start the app (wait-for-db will run migrations + start server)
# The startup script should execute the migrations/seeders and then run 
# the main server file (likely server.js or index.js).
CMD ["node", "/wait-for-db.js"]