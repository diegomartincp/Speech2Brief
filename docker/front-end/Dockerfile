# Stage 1: Build the React application
FROM node:18-alpine AS build

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if present) to install dependencies
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the React app for production
RUN npm run build

# Stage 2: Serve the built app using nginx
FROM nginx:alpine

# Copy the production build files from the build stage to nginx's public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to serve the app
EXPOSE 80

# Start nginx web server in the foreground
CMD ["nginx", "-g", "daemon off;"]
