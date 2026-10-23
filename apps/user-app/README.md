# TrustNear — User Mobile App (Flutter)

**Developer 1** → User Mobile Frontend (Flutter / Dart)

The User Mobile App is built with **Flutter** for guest users and registered users to discover nearby businesses, view detailed business profiles & locations on interactive maps, read/submit reviews, manage favorites, and interact with the local trust network.

---

## Technical Stack (Developer 1)

* **Framework**: Flutter (Dart)
* **Target Platforms**: Android & iOS
* **State Management**: BLoC / Riverpod / Provider
* **Maps & Geolocation**: `google_maps_flutter` & `geolocator`
* **HTTP Client**: `dio` / `http` (Communicates with `backend/`)
* **Local Storage**: `shared_preferences` / `hive`

---

## Setup & Execution Guide

```bash
cd apps/user-app
flutter pub get
flutter run
```

---

## Primary Use Cases

* **UC-001**: User Registration & Authentication
* **UC-002**: User Profile Management
* **UC-003**: Location-based Business Discovery
* **UC-004**: Search & Category Filtering
* **UC-005**: View Business Details & Interactive Map
* **UC-008**: View Ratings & Customer Reviews
* **UC-012**: Write & Submit Reviews / Ratings
* **UC-013**: Report Incorrect or Inappropriate Business Info
* **UC-014**: Manage Favorites & Saved Businesses
* **UC-015**: Trust Network & User Connections
* **UC-016**: View & Claim Active Promotions
* **UC-018**: User Push & In-App Notifications
* **UC-019**: AI-powered Business Recommendations
* **UC-020**: In-App Messaging / Inquiry to Business Owners
* **UC-025**: Guest User Browsing & Limited Feature Discovery
