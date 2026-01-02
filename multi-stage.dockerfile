FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --only=production

COPY . .

FROM node:18-alpine AS run

WORKDIR /app

COPY --from=build /app .

EXPOSE 3000

CMD ["node", "index.js"]


