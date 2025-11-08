FROM node:20

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies exactly as in package-lock.json
RUN npm ci

# Copy the rest of the code
COPY . .

COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh


# Expose backend port
EXPOSE 5000

# Start the app
CMD ["/wait-for-it.sh", "db:3306", "--", "npm", "start"]
