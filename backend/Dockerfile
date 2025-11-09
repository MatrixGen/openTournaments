# Use Node 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Set timezone
#ENV TZ=UTC
#RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Use production mode
ENV NODE_ENV=production

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy rest of the code
COPY . .

# Expose backend port
EXPOSE 5000

# Copy wait-for-db script
COPY wait-for-db.js /wait-for-db.js

# Start the app
CMD ["node", "/wait-for-db.js",]
