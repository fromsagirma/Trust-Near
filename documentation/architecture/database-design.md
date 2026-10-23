# TrustNear — Database Design Document

## Schema Overview

The database is built on PostgreSQL and managed via Prisma ORM (`database/prisma/schema.prisma`).

### Key Entities
1. **User**: Credentials, profiles, roles (`USER`, `BUSINESS_OWNER`, `ADMIN`).
2. **Business**: Business profiles, category tags, geo-location coordinates, operating hours.
3. **Review**: Rating scores, text feedback, moderation status.
4. **Promotion**: Offers created by business owners.
5. **Connection**: User trust network relationships.
