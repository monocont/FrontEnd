# Build Stage
FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and build Angular production bundle
COPY . .
RUN npm run build -- --configuration production

# Runtime Stage (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copy built Angular files
COPY --from=build /app/dist/angular-temp/browser .

# Copy custom Nginx configuration for Angular routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port for Cloud Run
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
