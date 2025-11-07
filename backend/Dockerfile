FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --no-optional

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start"]
