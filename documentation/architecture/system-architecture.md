# TrustNear — System Architecture

## Architecture Overview

TrustNear adopts a decoupled Client-Server Monorepo Architecture:

* **Client Apps Layer**:
  * `apps/user-app` (User Mobile Frontend)
  * `apps/business-owner-web` (Business Owner Web Frontend)
  * `apps/admin-web` (Admin Web Frontend)
* **API Service Layer**:
  * `backend/` (Unified Node.js / Express API supporting all clients with Role-Based Access Control)
* **Persistence Layer**:
  * `database/` (Centralized PostgreSQL Database managed via Prisma ORM)
