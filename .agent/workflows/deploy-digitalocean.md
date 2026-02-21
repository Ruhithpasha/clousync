---
description: Deploy CloudSync to DigitalOcean using a Droplet and Docker Compose
---

This workflow guides you through deploying the CloudSync application to a DigitalOcean Ubuntu Droplet.

## 1. Create and Connect to your Droplet

1. Create a new Droplet on DigitalOcean.
   - **OS**: Ubuntu 22.04 (LTS) or newer.
   - **Plan**: Basic (2GB RAM / 1 CPU is recommended for initial build).
2. Connect to your Droplet via SSH:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

## 2. Install Docker and Docker Compose

// turbo

1. Run the official Docker installation script:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```
2. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

## 3. Clone and Setup Project

1. Clone your repository:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   cd cloudsync
   ```
2. Create environment files:
   - Create `cloudapp-backend/.env` and paste your backend credentials.
   - Create `frontend/.env` and paste your frontend credentials.
   - Create a root `.env` for the build arguments (referenced in docker-compose.yml).

## 4. Deploy with Docker Compose

1. Build and start the containers in detached mode:
   ```bash
   docker compose up -d --build
   ```
2. Verify the containers are running:
   ```bash
   docker compose ps
   ```

## 5. Configure Nginx (Reverse Proxy & SSL)

1. Install Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```
2. Create an Nginx configuration for your domain:
   ```bash
   sudo nano /etc/nginx/sites-available/cloudsync
   ```
3. Add the following configuration (replace `yourdomain.com`):

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the config and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/cloudsync /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 6. Secure with SSL (Certbot)

1. Install Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```
