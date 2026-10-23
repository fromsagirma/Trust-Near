# 🗺️ TrustNear
### Proximity Business Discovery & Platform Trust

##  Neam : Firomsa Girma Worku 
## CTC 2559
## Room 03

TrustNear is a location-aware business discovery and trust-building platform that connects consumers with verified nearby local businesses. By integrating PostGIS spatial radius queries, transparent community reviews, structured merchant claim verification workflows, and administrative governance moderation, TrustNear establishes a reliable, secure ecosystem for local commerce.

---

> ### 📜 Provenance & Reconstruction Disclosure
> **Repository Owner & Presenter:** Firomsa Girma Worku (CTC-2559)  
> **Personal Showcase Repository:** [https://github.com/fromsagirma/Trust-Near](https://github.com/fromsagirma/Trust-Near)  
> 
> This repository represents the reconstructed, version-controlled showcase of **TrustNear**, originally developed as an academic collaborative team project. The source code was recovered from an archived snapshot. The Git history was systematically structured into 20 clean, architectural content commits and 5 non-fast-forward integration merges to illustrate professional separation of concerns (backend API foundation, spatial database schemas, web portals, Flutter mobile client, and technical documentation), rather than an artificially backdated original development timeline. Full original attribution is preserved for all five team contributors below.

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#️-key-features)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Developer Setup & Installation](#-developer-setup--installation)
  - [Prerequisites](#prerequisites)
  - [1. Backend API Service](#1-backend-api-service)
  - [2. Web Dashboard Portals](#2-web-dashboard-portals)
  - [3. Flutter Mobile Application](#3-flutter-mobile-application)
  - [4. Docker Containerized Deployment](#4-docker-containerized-deployment)
- [Database & Spatial Workflow](#️-database--spatial-workflow)
- [Quality Assurance & Verification](#-quality-assurance--verification)
- [Use Cases Index](#-use-cases-index)
- [Team & Original Attribution](#-team--original-attribution)

---

## 🌟 Project Overview

TrustNear provides a unified, location-aware experience across mobile and web interfaces:

- **For Consumers (Mobile App):** Discover nearby venues, search by category, calculate distances via PostGIS, read verified visitor feedback, bookmark favorites, and navigate via native maps.
- **For Business Owners (Web Portal):** Manage store profiles, operating hours, and photo galleries, track analytics and customer reviews, claim unowned listings with verification documentation, and sponsor listings.
- **For Platform Administrators (Web Portal):** Review and verify business ownership claims, inspect flagged reviews and moderation queues, audit system transactions, and manage category taxonomies.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   CLIENT APPLICATIONS                  │
├──────────────────────────┬─────────────────────────────┤
│  Flutter Mobile App      │  React 18 / Vite Web App    │
│  (Consumers / Discovery) │  (Merchant & Admin Portals) │
└─────────────┬────────────┴──────────────┬──────────────┘
              │                           │
              │ REST / JSON (JWT Auth)    │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                TRUSTNEAR BACKEND API                   │
│           (Node.js / Express / TypeScript)             │
├────────────────────────────────────────────────────────┤
│  • JWT Authentication & Role-Based Access Control      │
│  • Business Directory & Operating Hours Engine         │
│  • PostGIS Geospatial Radius Query Handler             │
│  • Owner Claims & Verification Document Pipeline       │
│  • Moderation Queues, Audit Trail & Activity Logging   │
│  • Cloudinary Media Upload Engine                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            PERSISTENCE & SPATIAL ENGINE                │
├────────────────────────────────────────────────────────┤
│  • PostgreSQL 15+ with PostGIS Spatial Extension       │
│  • Prisma ORM with Custom Raw Spatial SQL Adapters     │
│  • Neon Serverless Postgres / Docker Spatial Database  │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Key Features

### 👤 User Application (Mobile — Flutter)
- Dual-mode registration and JWT session management (email / phone).
- Real-time GPS radius filtering and proximity calculations.
- Category browsing (cafes, restaurants, retail, health, lodging).
- Bookmark favorite venues and browse personal visit history.
- Star ratings, detailed feedback, and verified-visit badges.
- Native external map navigation launcher.

### 🏪 Business Owner Portal (Web — React & Vite)
- Merchant analytics overview (profile views, review sentiment, engagement).
- Multi-step business information editor (hours, coordinates, amenities).
- Photo gallery management with Cloudinary cloud storage.
- Listing ownership claim workflow with verification document upload.
- Public customer review response engine.
- Listing promotions and featured visibility management.

### 🛡️ Admin Dashboard & Governance (Web — React & Vite)
- User, moderator, and merchant directory governance.
- Claim verification queue with document preview and approval controls.
- Content moderation engine for reported reviews and spam prevention.
- Immutable audit log of administrative actions.
- Platform category hierarchy management.

---

## 💻 Technology Stack

| Domain | Technology | Version / Specification | Role in System |
|---|---|---|---|
| **Mobile App** | Flutter / Dart | Dart `^3.12.2` / Flutter `3.19+` | Cross-platform mobile discovery client |
| **Web Portals** | React / Vite | React 18, Vite 5, Tailwind CSS 3 | Merchant and administrator web dashboards |
| **Backend Core** | Node.js / Express | Node 18+, TypeScript 5, Express 4 | RESTful API engine and business logic |
| **Database** | PostgreSQL + PostGIS | PostgreSQL 15+ / PostGIS 3+ | Spatial database with coordinate radius indexing |
| **ORM Layer** | Prisma | Prisma 5 (`prisma-client-js`) | Schema management, type generation, migrations |
| **Media Storage**| Cloudinary SDK | Cloudinary v2 | Cloud image processing and CDN delivery |
| **Container** | Docker & Compose | Compose v2 / multi-stage builds | Production and local containerized deployment |

---

## 📂 Repository Structure

```text
TrustNear/
├── apps/
│   ├── user-app/                      # Flutter mobile discovery application
│   │   ├── android/                   # Android native runner
│   │   ├── ios/                       # iOS native runner
│   │   ├── lib/                       # Dart source code (Riverpod state, features, core)
│   │   │   ├── core/                  # Network client, location provider, storage
│   │   │   └── features/              # Auth, discovery, reviews, claims, profile
│   │   ├── test/                      # Unit and widget test suites
│   │   └── pubspec.yaml               # Flutter package manifest
│   │
│   └── web-app/                       # React 18 merchant & admin portal
│       ├── public/                    # Web assets & favicon
│       ├── src/
│       │   ├── admin/                 # Administrator governance dashboard UI
│       │   ├── auth/                  # Shared authentication flows
│       │   ├── landing/               # Public promotional landing page
│       │   ├── owner/                 # Business owner portal & listing editor
│       │   └── shared/                # Common theme toggles and styling
│       ├── package.json               # Web package manifest
│       └── vite.config.js             # Vite bundler configuration
│
├── backend/                           # Express TypeScript backend API
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema models & spatial relations
│   │   └── seed.ts                    # Database seeder script
│   ├── src/
│   │   ├── config/                    # DB connection pool, environment config
│   │   ├── middleware/                # JWT auth, RBAC authorization, error handling
│   │   ├── modules/                   # 15 domain modules (auth, businesses, claims...)
│   │   ├── __tests__/                 # Security QA suite & rate limiting tests
│   │   ├── server.ts                  # HTTP server bootstrap
│   │   └── test-runner.ts             # Modular integration test runner
│   ├── Dockerfile                     # Multi-stage production container build
│   └── package.json                   # Backend package manifest
│
├── database/                          # Migration assets and standalone seeders
├── documentation/                     # Specifications and architectural assets
│   ├── architecture/                  # Database schema design & architecture diagrams
│   ├── requirements/                  # SRS and functional requirements specifications
│   ├── uml/                           # Class diagrams, component diagrams, workflows
│   └── use-cases/                     # 25 core use cases & PlantUML diagrams
│
├── docker-compose.yml                 # Local container orchestration
├── thunder-collection_*.json          # Thunder Client API collection
└── README.md                          # Repository documentation
```

---

## 🚀 Developer Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Flutter SDK**: v3.19.0 or higher (with Dart `^3.12.2`)
- **PostgreSQL**: v15 or higher with PostGIS extension enabled (or Docker)

---

### 1. Backend API Service

```bash
# Navigate to the backend directory
cd backend

# Install project dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL/PostGIS credentials and JWT secret

# Generate Prisma client artifacts
npm run db:generate

# Start the development server with hot-reload
npm run dev
```

The backend server starts on `http://localhost:5000` (or the configured `PORT`).

---

### 2. Web Dashboard Portals

```bash
# Navigate to the web application directory
cd apps/web-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Launch Vite development server
npm run dev
```

The web dashboard is served on `http://localhost:5173`.

---

### 3. Flutter Mobile Application

```bash
# Navigate to the mobile application directory
cd apps/user-app

# Fetch Flutter packages
flutter pub get

# Inspect connected physical devices or emulators
flutter devices

# Run the mobile app in debug mode
flutter run
```

---

### 4. Docker Containerized Deployment

Deploy the backend API alongside a configured PostgreSQL container with PostGIS enabled:

```bash
# Configure root environment variables
cp backend/.env.example .env

# Build and launch containers in background
docker compose up -d --build
```

---

## 🗄️ Database & Spatial Workflow

TrustNear relies on PostGIS for high-performance spatial radius queries (`ST_DWithin`, `ST_MakePoint`).

```bash
# Push Prisma schema to the active database
cd backend
npm run db:push

# Seed platform fixtures (categories, demo businesses, admin accounts)
npm run db:seed
```

---

## 🛡️ Quality Assurance & Verification

- **Security Audit:** 100% of the repository's 487 source and configuration files underwent automated and static inspection. All sensitive files (`.env`, local secrets, private keys) are strictly ignored via `.gitignore`.
- **Backend Test Suite:** Automated tests covering rate limiting, role-based access control, ownership verification, and security edge cases reside in `backend/src/__tests__/` and `backend/src/test-runner.ts`.
- **Mobile Test Suite:** Unit and widget test suites covering authentication role validation and discovery repository functions reside in `apps/user-app/test/`.

---

## 📋 Use Cases Index

TrustNear implements **25 core system use cases** formally modeled in `documentation/use-cases/`:

| Subsystem | Scope | Use Case Coverage |
|---|---|---|
| **Consumer Client** | `apps/user-app` | UC-001 (Register), UC-002 (Login), UC-003 (Proximity Search), UC-004 (Category Filter), UC-005 (View Details), UC-008 (Submit Review), UC-012 (Directions), UC-013 (Report Review), UC-014 (Saved Places), UC-015 (Manage Profile), UC-016 (Notifications), UC-018 (Activity History), UC-019 (Verified Visit Check), UC-020 (Support Ticket), UC-025 (Social Sharing) |
| **Merchant Portal** | `apps/web-app/src/owner` | UC-006 (Claim Business), UC-007 (Update Information), UC-009 (Respond to Reviews), UC-010 (Review Performance Analytics), UC-017 (Feature Listing / Promotion), UC-020 (Merchant Support) |
| **Governance Admin** | `apps/web-app/src/admin` | UC-010 (System Reports), UC-013 (Review Moderation), UC-017 (Promotion Approvals), UC-021 (Claim Verification Approvals), UC-022 (User & Merchant Administration), UC-023 (Audit Trail Logging) |
| **Backend REST API** | `backend/` | Serves all 25 use cases with authenticated JWT endpoints and PostGIS queries |

---


## 📄 License

This project is published for portfolio, academic demonstration, and technical evaluation purposes. All rights reserved by the original contributors.
