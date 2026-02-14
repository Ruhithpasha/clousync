# Use Node.js 22 LTS
FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Add build arguments for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set them as environment variables so the Build process sees them
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the react app
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the preview server
# --host 0.0.0.0 is mandatory for Docker to expose the service
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
