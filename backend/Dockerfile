FROM node:20

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies exactly as in package-lock.json
RUN npm ci

# Copy the rest of the code
COPY . .

# Expose backend port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
