# TrustNear — Use Case Specifications

Derived from *TrustNear Full Product & Technical Documentation (Rev. 2)*. Each use case maps to one functional requirement (FR) from Section 6 of that document. Phase (MVP / Post-MVP) is carried over unchanged so this document stays consistent with the FR table.

---

## 6.1 Authentication & Profile

### UC-001: Register and log in
- **Actors:** Guest, Registered User
- **Related requirement:** FR-001 · Priority: High · Phase: MVP
- **Preconditions:** The user has a valid email address or phone number.
- **Main flow:**
  1. Guest opens the registration screen and enters email/phone, password, and display name.
  2. System validates the email/phone is not already registered.
  3. System creates the account and issues a JWT access token and refresh token.
  4. User is logged in and redirected to the discovery screen.
- **Alternate/exception flows:**
  - 2a. Email/phone already registered → system rejects with a clear error and offers to log in instead.
  - Existing user selects "log in" → system validates credentials and issues tokens.
  - User selects "forgot password" → system sends a time-limited email/SMS OTP or reset link; user sets a new password.
- **Postconditions:** A verified session exists (JWT access + refresh token); user is authenticated as a Registered User.

### UC-002: Manage profile and delete account
- **Actors:** Registered User
- **Related requirement:** FR-002 · Priority: High · Phase: MVP
- **Preconditions:** User is logged in.
- **Main flow:**
  1. User opens profile settings.
  2. User edits display name, profile photo, and/or phone number.
  3. System saves changes immediately.
- **Alternate/exception flows:**
  - User selects "delete account" → system confirms intent, then removes/anonymizes personal data within the defined retention window and invalidates all sessions.
- **Postconditions:** Profile reflects the edited fields, or the account and its personal data are deleted/anonymized and can no longer be used to log in.

---

## 6.2 Business Discovery

### UC-003: Search for nearby businesses
- **Actors:** Guest, Registered User
- **Related requirement:** FR-003 · Priority: High · Phase: MVP
- **Preconditions:** Device location is available or the user supplies a location manually.
- **Main flow:**
  1. User opens the discovery screen; app detects or accepts current location.
  2. User selects a search radius (1, 2, or 5 km).
  3. System runs a PostGIS geospatial query and returns businesses within that radius, sorted nearest-first with distance shown.
  4. User may re-sort results by rating.
- **Alternate/exception flows:**
  - Location unavailable → system prompts the user to enter a location manually.
  - No results in radius → system shows a clear empty state rather than an error.
- **Postconditions:** User sees a distance-sorted list of businesses within the chosen radius.

### UC-004: Search by name or filter by category
- **Actors:** Guest, Registered User
- **Related requirement:** FR-004 · Priority: High · Phase: MVP
- **Preconditions:** None beyond app access.
- **Main flow:**
  1. User enters free-text in the search bar and/or selects a category (restaurant, cafe, bar, hotel, guesthouse) and a minimum rating.
  2. System matches on business name (including partial matches) and applies the selected filters, combinable with the nearby-search radius.
  3. System returns the filtered result list.
- **Alternate/exception flows:**
  - No matches → system shows a clear "no results" message, not an error.
- **Postconditions:** User sees results matching the text query and/or filters applied.

### UC-005: Save and remove favorites
- **Actors:** Registered User
- **Related requirement:** FR-005 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** User is logged in and viewing a business.
- **Main flow:**
  1. User taps "save" on a business.
  2. System adds it to the user's private favorites list, reflected immediately.
  3. User may later open favorites and remove any entry, which is also reflected immediately.
- **Postconditions:** The business appears (or no longer appears) in the user's private favorites list.

---

## 6.3 Business Listings

### UC-006: Create a business listing
- **Actors:** Registered User, Business Owner
- **Related requirement:** FR-006 · Priority: High · Phase: MVP
- **Preconditions:** User is logged in.
- **Main flow:**
  1. User opens "add a business" and enters name, category, description, at least one photo, GPS pin, and a landmark description.
  2. System validates that name, category, and location are present.
  3. System saves the listing in a "pending" state, records the creator as original submitter, and routes it to the admin approval queue (see UC-022).
- **Alternate/exception flows:**
  - Required field missing → system blocks submission until name, category, and location are provided.
  - Listing submitted by the TrustNear seed admin role → system auto-publishes immediately via the seeding fast-path instead of entering the pending queue (see UC-022).
- **Postconditions:** A new listing exists, in "pending" state (public listings) or "published" state (seed fast-path); a nullable `google_place_id` column exists on the record for future Phase 2 import matching.

### UC-007: Describe a location by landmark
- **Actors:** Registered User, Business Owner
- **Related requirement:** FR-007 · Priority: High · Phase: MVP
- **Preconditions:** User is creating or editing a listing (UC-006 or UC-009).
- **Main flow:**
  1. Alongside the GPS pin, user enters a free-text landmark description (e.g. "behind St. Gabriel church, blue gate").
  2. System stores the landmark text and displays it prominently on the business detail view in place of a formal address.
  3. Landmark text is indexed so it is matched by name/category search (UC-004).
- **Postconditions:** The listing can be discovered and understood using landmark text alone, with no formal street address required.

### UC-008: View business details
- **Actors:** Guest, Registered User
- **Related requirement:** FR-008 · Priority: High · Phase: MVP
- **Preconditions:** A published listing exists.
- **Main flow:**
  1. User selects a business from search results.
  2. System displays name, category, landmark description, GPS map, operating hours, phone number, photos, aggregate star rating, and review count.
- **Alternate/exception flows:**
  - Optional fields (phone, hours) missing → system renders the remaining fields correctly without breaking layout.
- **Postconditions:** User has viewed the full business profile; aggregate rating reflects the latest submitted reviews.

### UC-009: Manage listing from owner dashboard
- **Actors:** Business Owner
- **Related requirement:** FR-009 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** User is a verified owner of the listing.
- **Main flow:**
  1. Owner opens the dashboard for their listing.
  2. Owner views the listing as customers see it, and views all ratings/reviews received.
  3. Owner edits basic fields (hours, phone, photos) and/or posts a single public reply to a review.
  4. System displays the reply publicly beneath the corresponding review.
- **Alternate/exception flows:**
  - Non-owner attempts access → system denies access to the dashboard.
- **Postconditions:** Listing fields and/or a public owner reply are updated and visible to customers.

### UC-010: Claim an existing business listing
- **Actors:** Business Owner, Admin
- **Related requirement:** FR-010 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** An unclaimed listing exists.
- **Main flow:**
  1. Business Owner submits a claim request with verification info (e.g. matching phone number or proof-of-association photo).
  2. System logs the request with a timestamp.
  3. Admin reviews the claim and approves or rejects it.
  4. System transfers ownership on approval, or leaves the listing unclaimed on rejection, and notifies the claimant either way.
- **Postconditions:** The claimant becomes the verified owner (approved) or remains unassociated with the listing (rejected).

### UC-011: Discover Google-sourced listings (Phase 2)
- **Actors:** System (automated), Guest, Registered User
- **Related requirement:** FR-011 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** Phase 2 import is live; Google Places API is reachable.
- **Main flow:**
  1. System queries Google Places for businesses in a search radius not already present (matched by `google_place_id`).
  2. System displays them as unclaimed, "Imported — be the first to review" listings, fetching name/address/details live at display time (only `place_id` is cached long-term, per Google's terms).
  3. A user submits the first TrustNear rating, converting the listing into a normally-rated entry.
- **Alternate/exception flows:**
  - A Business Owner claims a Google-sourced listing through the same flow as UC-010.
- **Postconditions:** Google-sourced businesses are discoverable in TrustNear even before receiving a TrustNear review, without violating Google's caching terms.

---

## 6.4 Ratings, Reviews & Trust

### UC-012: Rate and review a business
- **Actors:** Registered User
- **Related requirement:** FR-012 · Priority: High · Phase: MVP
- **Preconditions:** User is logged in and viewing a business.
- **Main flow:**
  1. User submits a 1–5 star rating, optionally with an open-ended comment (UI nudges for a comment but does not require one).
  2. System records the review and updates the business's aggregate rating.
- **Alternate/exception flows:**
  - User already has an active review for this business → system updates the existing review instead of creating a duplicate.
  - User deletes their review → system removes it and recalculates the aggregate rating.
- **Postconditions:** The user holds at most one active review per business; the business's aggregate rating reflects the change.

### UC-013: Report and moderate a review
- **Actors:** Registered User, Admin
- **Related requirement:** FR-013 · Priority: High (core) / Post-MVP (automation)
- **Preconditions:** A published review exists.
- **Main flow:**
  1. Any user reports a review as fake, abusive, or spam.
  2. System places the review in the admin moderation queue.
  3. Admin reviews it and either dismisses the report or removes the review, with the action logged.
- **Alternate/exception flows (Post-MVP):**
  - Automated heuristics (rate limits per user/IP, duplicate/near-duplicate text detection) auto-flag suspicious reviews for admin attention before manual action, and can trigger removal directly only in high-confidence abuse cases.
- **Postconditions:** The review remains published (dismissed) or is removed, with a logged moderation action either way.

### UC-014: Earn a verified visit badge
- **Actors:** Registered User
- **Related requirement:** FR-014 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** User is submitting a review (UC-012) and has granted location permission.
- **Main flow:**
  1. At submission, system checks whether the reviewer's device location matched the business's location at a plausible time.
  2. If matched, system marks the review as "verified" and displays a visible badge.
- **Alternate/exception flows:**
  - Location permission unavailable → review still submits successfully but without the verified badge.
- **Postconditions:** The review displays a verified badge if location signals supported it; review submission is never blocked by lack of location data.

---

## 6.5 Social Trust Layer

### UC-015: Build a connection network
- **Actors:** Registered User
- **Related requirement:** FR-015 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** Both users are registered.
- **Main flow:**
  1. User sends a connection request to another user.
  2. Recipient accepts (or declines) the request.
  3. Once mutually accepted, the connection's reviews are surfaced above unconnected users' reviews on business review lists, visually labeled as such.
- **Alternate/exception flows:**
  - Either user removes the connection → that user's reviews stop being prioritized going forward.
- **Postconditions:** Reviews from accepted connections are prioritized and visually distinguished on shared businesses' review lists.

### UC-016: Share a place via in-app chat
- **Actors:** Registered User
- **Related requirement:** FR-016 · Priority: Low · Phase: Post-MVP
- **Preconditions:** User is logged in, viewing a business, and has at least one connection.
- **Main flow:**
  1. User selects "share" on a business and chooses one or more connections.
  2. System sends a rich preview card (name, photo, rating) via in-app chat.
  3. Recipient taps the card to open the business detail view (UC-008).
- **Postconditions:** The recipient has received a tappable preview card linking to the shared business.

---

## 6.6 Monetization & Platform

### UC-017: Purchase promoted placement
- **Actors:** Business Owner, Admin
- **Related requirement:** FR-017 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** Business Owner has a claimed, published listing.
- **Main flow:**
  1. Owner purchases featured placement with a defined start/end date.
  2. System displays the listing in a clearly labeled "Promoted" slot within relevant search results, without altering its organic rating or ranking.
  3. System automatically expires the promotion at the end date.
- **Postconditions:** The listing appears as visibly promoted for the paid window only; its organic rating/content is unaffected.

### UC-018: Switch interface language
- **Actors:** Guest, Registered User
- **Related requirement:** FR-018 · Priority: Medium · Phase: Post-MVP
- **Preconditions:** None.
- **Main flow:**
  1. User opens account settings and selects Amharic or English (Oromiffa planned for a later release).
  2. System applies the selected language to all static UI text immediately, without requiring re-login or reinstall.
- **Alternate/exception flows:**
  - User-generated content (reviews) continues to display in its original language regardless of UI language.
- **Postconditions:** UI is displayed in the selected language.

### UC-019: Browse on a low-bandwidth connection
- **Actors:** Guest, Registered User
- **Related requirement:** FR-019 · Priority: High · Phase: MVP
- **Preconditions:** User is on a slow (e.g. 3G) or limited-data connection.
- **Main flow:**
  1. User browses search results and business detail views.
  2. System serves compressed, appropriately sized images (e.g. WebP), paginates list/search responses, and defers non-essential assets.
  3. Core content (name, rating, landmark) renders before images finish loading.
- **Postconditions:** The app remains usable within the data-usage and performance targets defined in the Non-Functional Requirements (Section 7).

### UC-020: Receive notifications
- **Actors:** Registered User, Business Owner
- **Related requirement:** FR-020 · Priority: Low · Phase: Post-MVP
- **Preconditions:** User has an active account with notification preferences configured.
- **Main flow:**
  1. A triggering event occurs (owner reply to a review, claim approved/rejected, connection request received).
  2. System delivers an in-app and/or push notification within a reasonable delay.
  3. User views notification history in-app.
- **Alternate/exception flows:**
  - User disables a notification category in preferences → that category is no longer delivered.
- **Postconditions:** The user is informed of the triggering event via their enabled channels.

---

## 6.7 Administration

### UC-021: Moderate flagged content
- **Actors:** Admin
- **Related requirement:** FR-021 · Priority: High · Phase: MVP
- **Preconditions:** At least one review, image, or listing has been flagged by a user or automated heuristic.
- **Main flow:**
  1. Admin opens the moderation queue, sorted by report volume or recency.
  2. Admin reviews a flagged item and approves, edits, or removes it.
  3. System logs the admin, action taken, and timestamp; removed content is soft-deleted (recoverable), not immediately purged.
- **Postconditions:** The flagged item is resolved with a permanent, attributable audit record.

### UC-022: Approve business listings and ownership claims
- **Actors:** Admin
- **Related requirement:** FR-022 · Priority: High · Phase: MVP
- **Preconditions:** A listing (UC-006) or claim (UC-010) is pending, submitted by a non-seed user.
- **Main flow:**
  1. Admin opens the pending queue of listings/claims from public submitters.
  2. Admin approves (listing goes public / claim transfers ownership) or rejects (submitter is notified, with an optional reason).
- **Alternate/exception flows:**
  - Listing is created by the TrustNear team via the seed admin role → it auto-publishes immediately and never enters this queue (the seeding fast-path), keeping approval effort focused on public submissions where fraud/spam risk exists.
- **Postconditions:** Every non-seed listing/claim passes through this approval gate before going live; seed-role listings are live immediately.

### UC-023: View platform analytics
- **Actors:** Admin
- **Related requirement:** FR-023 · Priority: Low · Phase: Post-MVP
- **Preconditions:** Admin is logged in.
- **Main flow:**
  1. Admin opens the analytics dashboard.
  2. System displays summary counts (total users, businesses, reviews) and lists of top-rated and most-viewed businesses.
  3. Admin filters top-rated/most-viewed lists by category and city.
- **Postconditions:** Admin has an up-to-date (within an acceptable refresh interval) view of platform growth and content quality.

---

## 6.8 AI Layer (Future Phase)

### UC-024: Compute review sentiment
- **Actors:** System (automated)
- **Related requirement:** FR-024 · Priority: Low · Phase: Post-MVP
- **Preconditions:** A review has been submitted (UC-012).
- **Main flow:**
  1. System analyzes the review text asynchronously to derive a positive/neutral/negative sentiment signal, without blocking submission.
  2. System feeds the sentiment signal into the business's overall trust score as one input among several (alongside the star rating), not the sole determinant.
- **Postconditions:** The business's trust score reflects sentiment as well as star rating.

### UC-025: Receive personalized recommendations
- **Actors:** Registered User
- **Related requirement:** FR-025 · Priority: Low · Phase: Post-MVP
- **Preconditions:** User is logged in.
- **Main flow:**
  1. User opens the discovery screen.
  2. System analyzes the user's past ratings, favorites, and category browsing behavior.
  3. System surfaces a "recommended for you" section, clearly labeled as personalized and distinct from organic nearby/search results.
- **Alternate/exception flows:**
  - User has no history → system falls back to a sensible default (e.g. popular nearby) rather than an empty section.
- **Postconditions:** The user sees a personalized recommendation section alongside organic results.

---

*Traceability: every use case above corresponds 1:1 to an FR in Section 6 of the TrustNear Full Documentation (Rev. 2). Actors, Priority, and Phase tags are carried over unchanged from that source so the two documents stay in sync as requirements evolve.*
