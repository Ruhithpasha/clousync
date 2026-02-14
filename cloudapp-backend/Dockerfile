# Use Node.js 20 LTS as base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
# Using 'npm ci' would be better in production, but 'npm install' is fine here
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Create the uploads directory if it doesn't exist
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 3001

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "src/server.js"]
