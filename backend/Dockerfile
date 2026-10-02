FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
USER node
EXPOSE 3333
CMD ["sh", "-c", "npm run db:setup && npm run db:seed && npm start"]
