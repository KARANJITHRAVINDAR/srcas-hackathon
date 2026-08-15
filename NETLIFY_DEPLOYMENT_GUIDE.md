# 🌐 100% FREE Deployment Guide: Netlify + Render + Free Managed Database

This guide explains how to deploy your full-stack **Transparency-Chain** application without AWS, completely **100% FREE**.

---

## 🏗️ Architectural Breakdown

| Layer | Recommended Free Platform | Why? |
|---|---|---|
| **Frontend** | **Netlify** | Free automatic deploys from GitHub, global CDN, free custom domain SSL. |
| **Backend** | **Render.com** | Free Docker Web Service (Runs your Spring Boot 3 + Tesseract OCR container). |
| **Database** | **Aiven.io** or **Render** | Free managed MySQL 8.0 database. |

---

## ⚡ STEP 1: Deploy Free MySQL Database (Aiven / Render)

1. Sign up at [Aiven.io](https://aiven.io) or [Render.com](https://render.com).
2. Create a **Free MySQL Database**:
   - **Database Name**: `transparency_chain`
3. Copy your connection details:
   - Host, Port (`3306`), Username (`root` or `user`), Password.

---

## 🐳 STEP 2: Deploy Backend Docker Container to Render.com (100% Free)

1. Sign up at [Render.com](https://render.com) using your GitHub account.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `KARANJITHRAVINDAR/srcas-hackathon`.
4. Configure service settings:
   - **Name**: `transparency-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Docker` (Render automatically uses `backend/Dockerfile`)
   - **Instance Type**: **Free**
5. Add Environment Variables on Render:
   - `SPRING_DATASOURCE_URL` = `jdbc:mysql://YOUR_AIVEN_HOST:3306/transparency_chain?useSSL=false`
   - `SPRING_DATASOURCE_USERNAME` = `your_db_username`
   - `SPRING_DATASOURCE_PASSWORD` = `your_db_password`
   - `POLYGON_RPC_URL` = `https://polygon-amoy.g.alchemy.com/v2/alch_xkq1H9kClPmrO7XVGVWrC`
   - `BLOCKCHAIN_PRIVATE_KEY` = `45c181d5ededa7e65c215f5ab629fcd7d93f669a36c94bb8d77f6047050892f1`
   - `OPENROUTER_API_KEY` = `sk-or-v1-your-openrouter-key`
6. Click **Create Web Service**.
   - Render will output your live backend URL (e.g. `https://transparency-backend.onrender.com`).

---

## 🚀 STEP 3: Deploy Frontend to Netlify (100% Free)

1. Log into [Netlify.com](https://netlify.com) using your GitHub account.
2. Click **Add new site** $\rightarrow$ **Import from an existing project**.
3. Select **GitHub** and pick `KARANJITHRAVINDAR/srcas-hackathon`.
4. Set the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add Environment Variable in Netlify (**Site configuration** $\rightarrow$ **Environment variables**):
   - **Key**: `VITE_API_URL`
   - **Value**: `https://transparency-backend.onrender.com` (Your live Render backend URL)
6. Click **Deploy Site**!

Netlify will build your site and give you a live URL (e.g. `https://transparency-chain.netlify.app`) with free SSL HTTPS enabled!
