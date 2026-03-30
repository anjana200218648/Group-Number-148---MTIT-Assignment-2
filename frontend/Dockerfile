FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production server
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist

# Frontend runs on 8000
EXPOSE 8000

CMD ["serve", "-s", "dist", "-l", "8000"]
