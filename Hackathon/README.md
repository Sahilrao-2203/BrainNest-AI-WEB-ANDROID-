# StudyFlow AI — Production Setup & Deployment Guide

StudyFlow AI is an AI-powered study companion, daily planner, and learning management platform designed for engineering students.

## Production Setup & Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`:
   - `PORT`: Node Express server port (default: 5000)
   - `FRONTEND_ORIGIN`: Allowed origin for production CORS (e.g. `https://studyflow.vercel.app`)
   - `MONGODB_URI`: MongoDB Atlas connection URI
   - `MONGODB_DB_NAME`: Database name (`studyflow`)
   - `JWT_SECRET`: Production secret key for signing JWT auth tokens
   - `GEMINI_API_KEY`: Server-side Google Gemini API key for AI companion proxying

3. **Start Node Backend Server**
   ```bash
   npm run start
   ```

4. **Build Frontend Bundle**
   ```bash
   npm run build
   ```

5. **Preview Production App**
   ```bash
   npm run preview
   ```

## Production Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Helmet + Rate Limiter + Cookie Parser
- **Database**: MongoDB Atlas (`studyflow`)
- **Authentication**: JWT + HTTP-only cookies + `bcryptjs` password hashing
- **AI Integration**: Server-side Gemini API proxy (`POST /api/ai/chat`)
