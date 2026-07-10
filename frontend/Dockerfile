FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY serve.mjs .
EXPOSE 3000
CMD ["node", "serve.mjs"]
