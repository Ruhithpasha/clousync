# ☁️ CloudSync Pro

**CloudSync Pro** is a minimal, high-performance, AI-powered image management platform designed for precision and minimalist aesthetics. It combines secure cloud storage with advanced neural search capabilities, allowing users to synchronize, organize, and explore their digital memories with ease.

---

## ✨ Key Features

### 🧠 AI-Powered Intelligence

- **Neural Semantic Search**: Search for photos using natural language (e.g., "sunset at the beach" or "golden retriever") powered by local CLIP (Contrastive Language-Image Pre-training) models.
- **Auto-Tagging**: Images are automatically categorized and tagged upon upload using AI analysis.
- **Smart Memories**: Automatically generates stunning visual stories and collages by matching similar moments.

### 🔒 Security & Privacy

- **Secure Cloud Vault**: Enterprise-grade protection for your memories.
- **Self-Destructing Share Links**: Generate secure, time-limited (24h) sharing links for your photos.
- **Protected Routes**: Multi-factor authentication support and secure session management via Supabase.

### 🎨 Premium Experience

- **Minimalist Dashboard**: A clutter-free, high-performance UI built with Framer Motion and Lucide icons.
- **Dark Mode**: Fully responsive dark and light themes.
- **PWA Ready**: Installable application with offline thumbnail support.
- **Batch Operations**: Upload and organize multiple images into albums simultaneously.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, Multer.
- **Database & Auth**: Supabase (PostgreSQL).
- **Storage**: Cloudinary (Cloud) + Local Storage (Metadata).
- **AI Engine**: `@xenova/transformers` (Local CLIP Model) + Google Gemini AI.

---

## 🚀 Local Setup Guide

### 1. Prerequisites

- **Node.js** (v18 or higher)
- **Git**
- **Supabase Account** (for Auth & Database)
- **Cloudinary Account** (for Image Hosting)

### 2. Clone the Repository

```bash
git clone https://github.com/ruhithpasha/cloudsync.git
cd cloudsync
```

### 2.5 Database Setup (Supabase)

CloudSync Pro uses a high-performance vector database for AI image embeddings.

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Copy the contents of `supabase_schema.sql` from the root of this repository.
4. Run the script. This will create the necessary tables (`profiles`, `albums`, `images`, `memories`) and enable Row Level Security (RLS).
5. Ensure the `pgvector` extension is enabled (handled automatically by the script).

### 3. Backend Configuration

Navigate to the backend directory and install dependencies:

```bash
cd cloudapp-backend
npm install
```

Create a `.env` file in `cloudapp-backend/` with the following:

```env
PORT=3001
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_random_secret
```

### 4. Frontend Configuration

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

Create a `.env` file in `frontend/` with the following:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 5. Run the Project

To run both simultaneously, open two terminals:

**Terminal 1 (Backend):**

```bash
cd cloudapp-backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🧊 Docker Deployment (DigitalOcean)

The project is fully containerized. To deploy to production:

```bash
docker compose up --build -d
```

The app will be accessible on port 3000 (Frontend) and 3001 (Backend).

---

## 🛣 API Reference

| Endpoint                | Method   | Description                             |
| :---------------------- | :------- | :-------------------------------------- |
| `/api/auth`             | -        | Managed by Supabase Client              |
| `/api/upload`           | POST     | Upload an image (Multer + Cloudinary)   |
| `/api/images`           | GET      | List all images for the logged-in user  |
| `/api/search-images`    | GET      | Semantic search via CLIP (`?query=...`) |
| `/api/albums`           | GET/POST | Manage user albums/folders              |
| `/api/memories`         | GET      | Fetch AI-generated memory stories       |
| `/api/images/:id/share` | POST     | Generate a 24h temporary share link     |

---

## 👨‍💻 Developed By

**Ruhith Pasha**

- GitHub: [@ruhithpasha](https://github.com/ruhithpasha)
- LinkedIn: [Ruhith Pasha](https://www.linkedin.com/in/ruhith-pasha-8a3625245/)

© 2026 CloudSync Pro. All Rights Reserved.
