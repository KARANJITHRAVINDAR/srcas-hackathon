# 🛡️ Transparency-Chain: Verifiable Development Funding & AI-Powered CSR Impact Governance Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://srcas-main.netlify.app/login)
[![Blockchain](https://img.shields.io/badge/Polygon-Amoy_Testnet-8247E5?style=for-the-badge&logo=polygon&logoColor=white)](https://amoy.polygonscan.com/)
[![Backend](https://img.shields.io/badge/Spring_Boot-3.2.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Frontend](https://img.shields.io/badge/React-Vite_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> **Transparency-Chain** is an end-to-end decentralized CSR funding governance platform built to solve fund leakage, fake invoice submissions, and unverified impact reporting in non-profit grants. By combining **Native Tesseract 5 OCR**, **Llama 3.3 70B AI Fallback Intelligence**, and **Polygon Blockchain Merkle-Tree Commitments**, the system enforces zero-trust compliance gates before grant money is disbursed.

---

## 🌐 Live Production Application & Demo Credentials

- 🔗 **Production App URL**: [https://srcas-main.netlify.app/login](https://srcas-main.netlify.app/login)

### 🔑 Demo Accounts for Evaluation

| Role | Email Address | Password | Functionality |
|---|---|---|---|
| **NGO Partner** | `727724eucy040@skcet.ac.in` | `demo` | Fast-track onboarding, legal document upload, milestone evidence submissions, geotagged proofing, & expense logging. |
| **Funder / CSR Org** | `727724eucy037@skcet.ac.in` | `demo` | Grant commitment creation, milestone lock approvals, escrow releases, compliance gates, & PDF audit generation. |

---

## 🎯 Key System Architecture & Core Capabilities

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND APP                                      |
|            Vite + React 18 + Tailwind CSS + Lucide Icons (Netlify CDN)           |
+------------------------------------------+----------------------------------------+
                                           | HTTPS REST API
                                           v
+-----------------------------------------------------------------------------------+
|                               SPRING BOOT BACKEND                                 |
|            Java 17 + Web3j + PDFBox + Tesseract 5 OCR (Render Web Service)        |
|                                                                                   |
|  +-------------------------+  +--------------------------+  +------------------+  |
|  |  Native Tesseract 5 OCR |  |  AI Fallback Provider    |  | Web3j Polygon    |  |
|  |  - Form 10AC & PAN      |  |  - Llama 3.3 70B         |  |  - Smart Contract|  |
|  |  - Tax Line Items       |  |  - Dual Provider Chain   |  |  - On-Chain Root |  |
|  +-------------------------+  +--------------------------+  +------------------+  |
+--------------------+------------------------------------+-------------------------+
                     |                                    |
                     v                                    v
          +----------------------+             +-----------------------+
          |  Railway MySQL 8.0   |             |  Polygon Amoy Testnet |
          |  Persistent Database |             |  Immutable Ledger     |
          +----------------------+             +-----------------------+
```

### 1️⃣ Automated Legal Entity Onboarding (OCR + AI Scoring)
- Parses uploaded legal registration forms (**Form 10AC**, **PAN Cards**, **Trust Deeds**, and **NGO Darpan ID**) using native **Tesseract 5 OCR**.
- Cross-evaluates extracted Tax IDs, Entity Names, Pin Codes, and Registration Dates against multi-field consistency algorithms.
- Enforces a strict **$\ge$45% Legal Authenticity Hard Gate** before enabling grant application privileges.

### 2️⃣ Dual AI Intelligence Fallback Chain
- Implements an automated **AI Fallback Chain** (`AiFallbackChainService`) leveraging **OpenRouter Llama 3.3 70B** as primary provider and secondary fallback options.
- Analyzes uploaded proof images, receipt line items, and beneficiary attendance lists with automated confidence scoring.

### 3️⃣ Geotagged Geofencing & Evidence Authenticity Checks
- Verifies uploaded milestone evidence photos using embedded GPS metadata against registered project geographic coordinates.
- Calculates Haversine distance and flags evidence uploaded beyond allowed project radius thresholds.

### 4️⃣ Immutable Polygon Web3 Blockchain Ledger
- Calculates cryptographic SHA-256 Merkle roots for all project milestone commitments and evidence proofs.
- Commits state anchors directly to **Polygon Amoy Testnet** (`0xb0f1b1e8805f7a90da89a4476c741b95de201d4e`) via Web3j.

### 5️⃣ Escrow Fund Protection & Automated PDF Audit Reports
- Funds remain locked in milestone escrows and are released exclusively upon successful resolution of compliance verification gates.
- Generates downloadable, watermarked PDF Audit Reports incorporating on-chain Polygon transaction hashes and verification timestamps.

---

## 🛠️ Technology Stack

| Domain | Framework / Technology |
|---|---|
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion |
| **Backend API** | Spring Boot 3.2.5, Java 17, Spring Data JPA, Spring Security, JWT |
| **OCR & PDF** | Native Tesseract 5 OCR Engine, Apache PDFBox, Ghostscript |
| **Blockchain** | Polygon Amoy Testnet, Web3j, Solidity Smart Contracts |
| **AI Processing** | OpenRouter AI API (Llama 3.3 70B / DeepSeek Fallback) |
| **Database** | MySQL 8.0 (Railway Managed Service) |
| **Containerization** | Docker, Docker Compose, Nginx 1.25 |
| **Hosting Stack** | Netlify (Frontend) + Render.com (Backend Docker) + Railway (MySQL) |

---

## 🚀 Local Quickstart Guide (Using Docker)

### Step 1: Clone Repository
```bash
git clone https://github.com/KARANJITHRAVINDAR/srcas-hackathon.git
cd srcas-hackathon
```

### Step 2: Configure Environment Variables
```bash
cp .env.production.example .env
```

### Step 3: Launch Full-Stack with Docker Compose
```bash
docker compose up --build -d
```

### Step 4: Access Local Stack
- **Frontend SPA**: `http://localhost`
- **Backend REST API**: `http://localhost:8081/api`

---

## 📄 License & Attribution

Developed for SRCAS Hackathon. Distributed under the MIT License.
