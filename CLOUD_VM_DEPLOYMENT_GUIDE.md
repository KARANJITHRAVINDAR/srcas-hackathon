# 🌐 Complete Step-by-Step Cloud VM Deployment Guide (AWS EC2 / DigitalOcean / Hetzner)

This document provides an end-to-end guide to deploy **Transparency-Chain** on a single cloud virtual machine (AWS EC2, DigitalOcean Droplet, Hetzner, or Linode) running Ubuntu 22.04 LTS, complete with Docker, custom Domain DNS, and free HTTPS/SSL certificates via Certbot.

---

## 📋 Prerequisites Summary

- A Domain Name (e.g. `transparencychain.org`) pointing to your Cloud VM IP.
- Cloud account (AWS, DigitalOcean, or Hetzner).
- SSH access to your server (`ssh ubuntu@YOUR_SERVER_IP`).

---

## 🛠️ STEP 1: Provision Cloud Server & Configure Firewall

### 1.1 Server Sizing
Provision an Ubuntu 22.04 LTS instance with at least:
- **CPU**: 2 vCPUs
- **RAM**: 4 GB RAM (Recommended for Tesseract OCR + Spring Boot JVM + MySQL)
- **Storage**: 25 GB SSD

### 1.2 Inbound Firewall / Security Group Rules
Allow the following inbound ports in your cloud provider's firewall settings:

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| `22` | TCP | `0.0.0.0/0` (or your IP) | SSH Remote Server Access |
| `80` | TCP | `0.0.0.0/0` | HTTP Web Traffic & Let's Encrypt Verification |
| `443` | TCP | `0.0.0.0/0` | HTTPS Encrypted Web Traffic |
| `8081` | TCP | `0.0.0.0/0` | (Optional) Direct Backend API Access |

---

## 💻 STEP 2: Server Initialization & Docker Installation

Connect to your server via SSH:
```bash
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP
```

### 2.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Docker Engine & Docker Compose
```bash
sudo apt install -y docker.io docker-compose-v2 git curl
sudo systemctl enable --now docker
```

### 2.3 Grant User Docker Permissions
```bash
sudo usermod -aG docker $USER
newgrp docker
```
Verify Docker installation:
```bash
docker --version
docker compose version
```

---

## 📁 STEP 3: Clone Repository & Configure Environment

### 3.1 Clone the Codebase
```bash
git clone https://github.com/KARANJITHRAVINDAR/srcas-hackathon.git
cd srcas-hackathon
```

### 3.2 Create Production Environment File
Copy the environment template:
```bash
cp .env.production.example .env
nano .env
```

Set your production credentials in `.env`:
```env
# Database Settings
MYSQL_ROOT_PASSWORD=YourSecurePassword123!
MYSQL_DATABASE=transparency_chain

# Polygon Amoy / Mainnet Blockchain Credentials
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
BLOCKCHAIN_PRIVATE_KEY=your_private_key_without_0x_prefix
BLOCKCHAIN_WALLET_ADDRESS=0xYourPublicWalletAddress
BLOCKCHAIN_CHAIN_ID=80002
BLOCKCHAIN_CONTRACT_ADDRESS=0xb0f1b1e8805f7a90da89a4476c741b95de201d4e

# AI Providers
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
SECOND_AI_PROVIDER_API_KEY=sk-or-v1-your-fallback-key

# JWT Auth Secret
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 🚀 STEP 4: Build & Launch Containerized Stack

Run Docker Compose to build and start the MySQL, Backend (with Tesseract OCR), and Frontend (Nginx) containers:
```bash
docker compose up --build -d
```

### Verify Container Status:
```bash
docker compose ps
```
*Expected Output:*
```
NAME                    IMAGE                  COMMAND                  SERVICE     CREATED         STATUS                 PORTS
transparency_backend    srcas-hackathon-backend  "java -jar app.jar"      backend     10 seconds ago  Up 10 seconds          0.0.0.0:8081->8081/tcp
transparency_db         mysql:8.0              "docker-entrypoint.s…"   mysql       10 seconds ago  Up 10 seconds (healthy) 0.0.0.0:3306->3306/tcp
transparency_frontend  srcas-hackathon-frontend "nginx -g 'daemon of…"   frontend    10 seconds ago  Up 10 seconds          0.0.0.0:80->80/tcp
```

Test HTTP access by opening `http://YOUR_SERVER_IP` in your browser.

---

## 🔒 STEP 5: Set Up Domain DNS & Free SSL Certificate (Certbot + HTTPS)

### 5.1 Point Domain DNS to VM IP Address
In your domain registrar (GoDaddy, Namecheap, Cloudflare):
- Create an **A Record**:
  - **Host**: `@` (or `app`)
  - **Value**: `YOUR_SERVER_IP` (e.g. `54.210.12.34`)

Wait 1–2 minutes for DNS propagation.

### 5.2 Install Certbot & Let's Encrypt Nginx Plugin
On your server terminal:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.3 Obtain & Install SSL Certificate Automatically
Run Certbot against the host machine's Nginx or standalone validator:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the interactive prompts:
1. Enter your email address for urgent renewal notices.
2. Accept the terms of service (`Y`).
3. Certbot will automatically issue a 90-day Let's Encrypt SSL certificate and modify Nginx to handle HTTPS traffic.

### 5.4 Test Automatic SSL Renewal
Let's Encrypt certificates renew automatically every 60 days via systemd timer. Test renewal logic:
```bash
sudo certbot renew --dry-run
```

---

## 🔧 STEP 6: Useful Operations & Troubleshooting

### View Container Logs in Real-Time
```bash
docker compose logs -f
```

### Restart Specific Service
```bash
docker compose restart backend
```

### Execute Database Backup
```bash
docker exec transparency_db mysqldump -u root -pKs@kbd23777 transparency_chain > backup_$(date +%Y%m%d).sql
```

### Stop All Services
```bash
docker compose down
```

---

🎉 **Congratulations!** Your **Transparency-Chain** platform is now live in production with full Blockchain, Tesseract OCR, MySQL, and HTTPS encryption!
