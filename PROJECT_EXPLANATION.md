# Transparency Chain — Complete Project Guide & Overview

Welcome to **Transparency Chain**, an AI and Blockchain-powered platform designed to make Corporate Social Responsibility (CSR) and NGO grant funding completely transparent, verifiable, and fraud-resistant.

---

## 💡 What Problem Does This Project Solve?

In traditional philanthropy and CSR funding:
1. **Lack of Visibility**: Funders transfer money to NGOs, but lose track of exactly when and how every rupee is spent.
2. **Manual & Easily Forged Invoices**: Fraudulent paper bills, duplicate receipts, or fake photos often bypass manual review.
3. **Delayed Payouts & Disputes**: NGOs face funding delays, while funders worry about misuse of funds.

**Transparency Chain solves this by introducing:**
- **Milestone-Based Escrow**: Money is locked in a smart contract and released **only when work is verified**.
- **AI Fraud Verification**: Invoices and photos undergo automated OCR, geo-tag, and anomaly detection.
- **Collaborative Negotiation Loop**: Funders and NGOs co-negotiate project budgets before money is committed.
- **100% Immutable Public Audit Trail**: Cryptographic SHA-256 and Ethereum Sepolia transaction logging.

---

## 🏗️ System Architecture & Workflow (How It Works)

```
 [1. NGO Creates Project]  --->  [2. Funder Browses Marketplace]
                                           |
 [4. Escrow Created & Funded] <--- [3. Co-Negotiate Milestones & Lock]
            |
            v
 [5. NGO Executes & Uploads Proof]  --->  [6. AI Fraud Check & Risk Engine]
                                                     |
 [8. Funds Disbursed & Audit Anchored] <--- [7. Funder / Auditor Accepts Ticket]
```

---

## 🚀 Summary of What Has Been Implemented (Phases 1 to 6)

### Phase 1 — Project Discovery & Multi-Dimensional Trust Engine
- **Funder Marketplace**: Funders browse projects with filters for SDG goals, location, and requested budget (`/marketplace`).
- **NGO Trust Profile**: Evaluates NGO trustworthiness through registration age, compliance flags (80G/12A), and past milestone completion rates.

### Phase 2 — Collaborative Milestone Negotiation (PR-Style Review)
- **Non-destructive Versioning**: Organisations can propose budget, date, or scope adjustments without overwriting original data.
- **Negotiation Loop**: NGO receives a notification inbox to **Accept**, **Counter-Propose**, or **Reject** modifications.
- **Milestone Locking**: Funding is only enabled once every milestone has a mutually accepted, locked version.

### Phase 3 — Funding Commitment & Simulated Escrow Ledger
- **Budget Conservation Guard**: Validates that the sum of milestone allocations matches total grant budget.
- **Simulated Smart Contract Escrow**: Automatically allocates funds to a project escrow ledger upon commitment.

### Phase 4 — Verification Engine & Ticket Lifecycle
- **AI Fraud Inspection**: Proof submissions (invoices/photos) undergo OCR analysis and risk scoring (LOW, MEDIUM, HIGH, CRITICAL).
- **Ticket Workflow**: NGO raises a fund-release ticket for completed milestones; funders inspect evidence, risk explainability cards, and accept or request clarification.
- **Multi-Reviewer Guard**: High-risk tickets require dual reviewer or auditor sign-off before funds can be released.

### Phase 5 — Automated Disbursement Engine
- **Instant Escrow Release**: Accepting a milestone ticket automatically triggers the Disbursement Engine to execute payouts.
- **Escrow Accounting**: Updates remaining escrow balance, tracks project completion status, and triggers simulated blockchain release events.

### Phase 6 — Public Transparency Dashboard & Audit Anchor
- **Public Audit Explorer (`/audit`)**: Unauthenticated page allowing public citizens, donors, and auditors to inspect live platform stats and verified projects.
- **Cryptographic Audit Stream**: Real-time ticker displaying SHA-256 parent-child transaction hashes for every disbursement.
- **Evidence & Beneficiary Verification**: Public proof gallery and shareable QR code survey links for on-ground beneficiary verification.

---

## 🛠️ Technology Stack

- **Backend**: Java 17, Spring Boot 3, Spring Security (JWT), Hibernate ORM, MariaDB SQL Database.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion animations.
- **AI & Blockchain Engine**: Tesseract OCR / Anomaly Detection, Simulated Ethereum Sepolia Smart Contract Payouts, SHA-256 Merkle Audit Chains.

---

## 🔑 Demo Accounts for Testing

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Funder / Corporate** | `dummyfunder@demo.com` | `demo` | Browse projects, negotiate milestones, commit funding, approve tickets. |
| **NGO Implementer** | `727724eucy040@skcet.ac.in` | `password` | Create projects, upload evidence, respond to change requests, raise tickets. |
| **Public Visitor** | *(No login required)* | *(None)* | View public audit ledger at `http://localhost:5173/audit`. |

---

## ⚡ Command Cheat Sheet

```bash
# Start all background services (Backend 8081 + Frontend 5173)
bash start.sh

# Run full system verification test suite (89 automated tests)
bash verify.sh

# Stop all background services
bash stop.sh
```
