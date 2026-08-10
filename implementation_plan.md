# Transparency Chain - Implementation Plan

We will build the "Transparency Chain" full-stack web application as requested. The project tracks CSR/SDG funding with AI-powered proof-of-spend and blockchain verification.

## Proposed Stack
- **Backend:** Java 17, Spring Boot 3.x, MySQL 8, Spring Security (JWT)
- **Frontend:** React 18 (Vite), TailwindCSS, shadcn/ui, Recharts, Mapbox GL JS, Framer Motion
- **Blockchain:** Polygon Amoy Testnet, Web3j
- **Storage:** IPFS via Pinata (Hashes stored in DB)
- **AI/OCR:** Google Document AI / Tess4J, AI Forensics

## User Review Required
> [!IMPORTANT]
> The project will be built across 7 iterative layers as detailed below. Please review the layered approach. To get started, I will set up the monorepo structure (Spring Boot backend, React frontend) and then proceed to Layer 0.

## Open Questions
- Do you have an existing Polygon Amoy Testnet wallet/private key and RPC URL we can use for deployment and testing in Layer 5?
- We will be using Google Document AI for OCR. Are there credentials ready, or should we default to a basic Tess4J fallback for the initial build?
- For SMS/WhatsApp simulation, should I implement the Twilio webhook logic but with mock console logs for the actual sending, or do you have Twilio credentials to use?

## Proposed Changes

### Setup
#### [NEW] [backend/](file:///c:/Users/kabit/OneDrive/Attachments/Desktop/New folder/HACKATHONS/SRCAS/backend/)
Spring Boot 3 + Maven scaffold with Spring Web, JPA, Security, MySQL dependencies.

#### [NEW] [frontend/](file:///c:/Users/kabit/OneDrive/Attachments/Desktop/New folder/HACKATHONS/SRCAS/frontend/)
React 18 + Vite scaffold with Tailwind, shadcn, routing configured.

### Layer 0 - Identity & Trust Layer
Backend: User, NgoProfile, FunderProfile entities. JWT Authentication. Trust Score Engine service.
Frontend: Landing page, Multi-step Registration, Dashboard with Trust Score gauge.

### Layer 1 - Fund Origination
Backend: Project, EscrowAccount entities. API endpoints for creating projects and locking escrow. Hash-chaining AuditLogService.
Frontend: Funder dashboard, Project creation map/flow.

### Layer 2 - Matching Layer
Backend: NeedPosting, MatchRequest entities. API for listing and matching needs to projects.
Frontend: Public marketplace UI for browsing and matching.

### Layer 3 - Milestone Engine
Backend: Milestone entity, Bulk creation endpoints.
Frontend: Definition flow and vertical timeline UI for milestones.

### Layer 4 - Proof-of-Spend Engine
Backend: ProofSubmission, FraudCheck entities. Services for OCR, Anomaly scoring, Image forensics, Geo/time matching. Async verification pipeline.
Frontend: Verification Trail UI with WebSocket updates.

### Layer 5 - Blockchain Integrity Layer
Backend: Solidity Contract, Web3j integration. IPFS upload, Merkle Root computation, Tx insertion.
Frontend: PolygonScan explorer links on dashboard.

### Layer 6 - Public Transparency Dashboard
Backend: Impact metrics, Beneficiary SMS/WhatsApp logic, PDF Generation.
Frontend: Public hero screen, fund flow visualization, counters.

## Verification Plan

### Automated Tests
- We will set up JUnit tests for key backend logic like TrustScore engine and Fraud calculations.

### Manual Verification
- We will test each layer by spinning up the backend and frontend locally, and verifying the expected behavior in the UI.
