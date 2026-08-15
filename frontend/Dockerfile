# Build Stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Runtime Stage (Nginx)
FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built production static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing & API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
