FROM node:20-alpine AS builder
WORKDIR /app
ARG ALLOWED_HOSTS=localhost,127.0.0.1
ENV ALLOWED_HOSTS=$ALLOWED_HOSTS
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /app/data /app/uploads/images /app/uploads/videos
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
