# 🚀 Transparency-Chain: Real-World Production Docker Deployment Guide

This guide provides step-by-step instructions to containerize and deploy the entire **Transparency-Chain** application (Frontend, Backend with Tesseract OCR, MySQL Database, Polygon Blockchain anchors, and AI Fallback Services) to production.

---

## 🏗️ Architecture Overview

| Component | Technology | Container | Port |
|---|---|---|---|
| **Frontend** | React + Vite + Tailwind CSS | Nginx SPA Server | `80` (HTTP) / `443` (HTTPS) |
| **Backend** | Spring Boot 3 + Web3j + Tesseract OCR | Eclipse Temurin Java 17 + Tesseract Native | `8081` |
| **Database** | MySQL 8.0 | Official MySQL Container | `3306` |
| **Blockchain** | Polygon Amoy / Mainnet Web3j | Live RPC (`eth_call` / On-Chain TX) | External RPC |

---

## 🐳 Quick Start (Local Production Simulation)

### Step 1: Clone Repository
```bash
git clone https://github.com/KARANJITHRAVINDAR/srcas-hackathon.git
cd srcas-hackathon
```

### Step 2: Configure Environment Variables
Copy `.env.production.example` to `.env`:
```bash
cp .env.production.example .env
```
Edit `.env` to include your production database password, Alchemy/Polygon RPC URL, private key, and AI keys.

### Step 3: Build & Launch with Docker Compose
```bash
docker compose up --build -d
```

### Step 4: Verify Deployment
- **Frontend App**: `http://localhost`
- **Backend API**: `http://localhost:8081/api/projects`
- **Container Health**: `docker compose ps`

---

## ☁️ Cloud Deployment Options

### Option 1: Single Cloud VM (AWS EC2 / DigitalOcean Droplet / Hetzner)
This is the simplest and most cost-effective option for production hosting.

1. Provision an Ubuntu 22.04 LTS instance (t3.medium or 4GB RAM minimum).
2. Install Docker and Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo systemctl enable --now docker
   ```
3. Clone your repository:
   ```bash
   git clone https://github.com/KARANJITHRAVINDAR/srcas-hackathon.git
   cd srcas-hackathon
   ```
4. Start the stack:
   ```bash
   docker compose up --build -d
   ```
5. Set up free SSL certificate via Certbot (Nginx):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

### Option 2: Render / Railway (PaaS - Managed Hosting)

- **Database**: Create a Managed MySQL instance on Render/Railway and copy `MYSQL_URL`, `MYSQL_USER`, `MYSQL_PASSWORD`.
- **Backend**:
  - Deploy from `backend/Dockerfile`.
  - Add environment variables: `SPRING_DATASOURCE_URL`, `POLYGON_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, etc.
- **Frontend**:
  - Deploy from `frontend/Dockerfile`.
  - Point API routing to backend service URL.

---

### Option 3: AWS ECS / Azure Container Apps / GCP Cloud Run

- Build and push Docker images to Amazon ECR / Docker Hub / GitHub Container Registry (GHCR):
  ```bash
  docker build -t yourusername/transparency-backend:latest ./backend
  docker build -t yourusername/transparency-frontend:latest ./frontend
  docker push yourusername/transparency-backend:latest
  docker push yourusername/transparency-frontend:latest
  ```
- Deploy services using AWS ECS Task Definitions or GCP Cloud Run services.

---

## 🔒 Production Hardening & Best Practices

1. **OCR Native Libraries**: `backend/Dockerfile` automatically installs `tesseract-ocr` and `tesseract-ocr-eng` binaries inside the container, eliminating native OS dependency issues.
2. **Persistent Uploads**: Evidence PDFs and geotagged photos are stored in the Docker volume `backend_uploads`.
3. **Database Backups**: Schedule automated dumps of the `mysql_data` volume or use cloud-managed database services (AWS RDS / GCP Cloud SQL).
4. **Gas Wallet Funding**: Ensure the Polygon wallet (`BLOCKCHAIN_WALLET_ADDRESS`) holds a small MATIC balance (~0.1 MATIC) on Polygon Amoy/Mainnet for on-chain disbursement and audit report anchoring.

---

## 🛠️ Management Commands

- View live container logs:
  ```bash
  docker compose logs -f
  ```
- Restart backend service:
  ```bash
  docker compose restart backend
  ```
- Stop application stack:
  ```bash
  docker compose down
  ```
