# Use Node 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Ensure all processes use UTC
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone


# Copy package files
COPY package.json package-lock.json ./

# Install dependencies exactly as in package-lock.json
RUN npm ci

# Copy the rest of the code
COPY . .

# Expose backend port
EXPOSE 5000

# Copy wait-for-db script
COPY wait-for-db.js /wait-for-db.js

# Start the app using Node.js wait-for-db script
CMD ["node", "/wait-for-db.js"]
