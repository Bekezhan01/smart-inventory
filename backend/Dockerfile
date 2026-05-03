FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["node", "src/server.js"]
