# Use Node.js 22 Slim (Debian-based) for better compatibility with native AI libraries (ONNX)
FROM node:22-slim

# Install system dependencies needed for some native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Create the uploads directory
RUN mkdir -p uploads

# --- PRE-DOWNLOAD CLIP MODEL ---
# This ensures the model is baked into the image and ready immediately
RUN node -e "const { pipeline } = require('@xenova/transformers'); \
    pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32') \
    .then(() => console.log('✅ CLIP Model pre-downloaded successfully')) \
    .catch(err => { console.error('❌ Model download failed:', err); process.exit(1); })"

# Expose the port the app runs on
EXPOSE 3001

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3001
# Set the transformers cache path inside the container
ENV TRANSFORMERS_CACHE=/app/.cache

# Start the application
CMD ["node", "src/server.js"]
