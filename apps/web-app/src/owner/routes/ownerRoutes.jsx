import { Routes, Route } from "react-router-dom";
import RequireOwnerAuth from "./RequireOwnerAuth";
import OwnerLayout from "../components/OwnerLayout";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";
import OnboardingPage from "../pages/OnboardingPage";
import ProfileEditPage from "../pages/ProfileEditPage";
import VerificationPage from "../pages/VerificationPage";
import ReviewsPage from "../pages/ReviewsPage";
import NotificationsPage from "../pages/NotificationsPage";
import StatisticsPage from "../pages/StatisticsPage";
import SettingsPage from "../pages/SettingsPage";

export default function OwnerRoutes() {
  return (
    <Routes>
      <Route element={<RequireOwnerAuth />}>
        <Route element={<OwnerLayout />}>
          <Route index element={<OwnerDashboardPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="profile" element={<ProfileEditPage />} />
          <Route path="verification" element={<VerificationPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
