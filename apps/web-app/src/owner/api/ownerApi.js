const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://trust-near.onrender.com/api";

const CATEGORY_MAP = {
  restaurant: 1,
  cafe: 2,
  bar: 3,
  hotel: 4,
  services: 5,
  retail: 6,
  pharmacy: 7,
  other: 8,
};

function getCategoryId(category) {
  if (typeof category === "number") return category;
  if (typeof category === "string") {
    const lower = category.toLowerCase().trim();
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
    const parsed = parseInt(category, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (category && typeof category.id === "number") return category.id;
  return 2; // Default to cafe/restaurant
}

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.includes("/auth/")) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    const message =
      errorBody.message ||
      (Array.isArray(errorBody.errors) ? errorBody.errors[0]?.message : null) ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function uploadPhoto(file) {
  if (!file) return null;
  if (typeof file === "string") return file;

  const token = localStorage.getItem("token") || localStorage.getItem("trustnear_token");
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data?.url) return data.data.url;
      if (data.url) return data.url;
    }
  } catch (e) {
    console.warn("Upload endpoint failed, using base64 fallback", e);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function createBusiness(data) {
  const categoryId = getCategoryId(data.category);

  let photoUrls = [];
  if (Array.isArray(data.photos)) {
    const uploadPromises = data.photos.map(async (p) => {
      if (typeof p === "string" && !p.startsWith("blob:")) return p;
      if (p && p.file instanceof File) return await uploadPhoto(p.file);
      if (p && typeof p.url === "string" && !p.url.startsWith("blob:")) return p.url;
      if (p && typeof p.previewUrl === "string" && !p.previewUrl.startsWith("blob:")) return p.previewUrl;
      return null;
    });
    photoUrls = (await Promise.all(uploadPromises)).filter(Boolean);
  }

  const payload = {
    name: data.name?.trim(),
    categoryId,
    description: data.description?.trim() || undefined,
    landmarkDescription: (data.landmarkDescription || data.landmark || "").trim(),
    location: {
      lat: Number(data.lat ?? data.location?.lat ?? 9.03),
      lng: Number(data.lng ?? data.location?.lng ?? 38.74),
    },
    hours: data.hours && Object.keys(data.hours).length > 0 ? data.hours : undefined,
    phone: data.phone?.trim() || undefined,
    photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
  };

  return request("/businesses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSelectedBusinessId() {
  return localStorage.getItem("selectedBusinessId") || null;
}

export function setSelectedBusinessId(id) {
  if (id) {
    localStorage.setItem("selectedBusinessId", id);
  } else {
    localStorage.removeItem("selectedBusinessId");
  }
  window.dispatchEvent(new CustomEvent("trustnear:businessChanged", { detail: { businessId: id } }));
}

export async function getMyBusinesses() {
  try {
    const res = await request("/owner/businesses");
    const data = res.data || res;
    if (Array.isArray(data)) {
      return data.map((biz) => ({
        ...biz,
        landmark: biz.landmarkDescription || biz.landmark || "",
        lat: biz.location?.lat ?? biz.lat ?? null,
        lng: biz.location?.lng ?? biz.lng ?? null,
      }));
    }
    if (data && typeof data === "object") {
      return [
        {
          ...data,
          landmark: data.landmarkDescription || data.landmark || "",
          lat: data.location?.lat ?? data.lat ?? null,
          lng: data.location?.lng ?? data.lng ?? null,
        },
      ];
    }
    return [];
  } catch (err) {
    console.error("Failed to load business listings:", err);
    return [];
  }
}

export async function getMyBusiness(preferredId = null) {
  try {
    const list = await getMyBusinesses();
    if (!list || list.length === 0) return null;

    const targetId = preferredId || getSelectedBusinessId();
    if (targetId) {
      const match = list.find((b) => b.id === targetId);
      if (match) return match;
    }

    // Default to the first business and set as selected
    setSelectedBusinessId(list[0].id);
    return list[0];
  } catch (err) {
    console.error("Failed to load business profile:", err);
    throw err;
  }
}

export function updateBusiness(businessId, data) {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.category !== undefined) payload.categoryId = getCategoryId(data.category);
  if (data.categoryId !== undefined) payload.categoryId = Number(data.categoryId);
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.landmark !== undefined || data.landmarkDescription !== undefined) {
    payload.landmarkDescription = (data.landmarkDescription || data.landmark || "").trim();
  }
  if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
  if (data.hours !== undefined) payload.hours = data.hours;

  return request(`/owner/businesses/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateBusinessPhotos(businessId, photoUrls = []) {
  return request(`/owner/businesses/${businessId}/photos`, {
    method: "PATCH",
    body: JSON.stringify({ photoUrls }),
  });
}

export function submitClaim(businessId, claimData = {}) {
  const phone = claimData.phone || (typeof claimData === "string" ? claimData : undefined);
  return request(`/businesses/${businessId}/claim`, {
    method: "POST",
    body: JSON.stringify({
      verificationInfo: {
        phone,
        ...claimData,
      },
    }),
  });
}

export async function getClaimStatus(businessId) {
  if (!businessId) return { status: "none" };
  try {
    const res = await request(`/businesses/${businessId}/claim-status`);
    return res.data || res;
  } catch (err) {
    return { status: "none" };
  }
}

export async function getBusinessReviews(businessId, page = 1) {
  if (!businessId) return { reviews: [], total: 0, hasMore: false };
  try {
    const res = await request(`/businesses/${businessId}/reviews?page=${page}`);
    return res.data || res;
  } catch (err) {
    // If business is not published yet or has no reviews, return empty list gracefully
    return { reviews: [], total: 0, hasMore: false };
  }
}

export async function replyToReview(reviewId, replyText) {
  const res = await request(`/owner/reviews/${reviewId}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply: replyText }),
  });
  return res.data || res;
}

export async function getNotifications() {
  const res = await request("/notifications");
  return res.data || res;
}

export async function markNotificationRead(notificationId) {
  const res = await request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return res.data || res;
}

export async function markAllNotificationsRead(notificationIds = []) {
  return Promise.allSettled(
    notificationIds.map((id) => markNotificationRead(id))
  );
}

export function updateProfile(data) {
  return request("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function changePassword(currentPassword, newPassword) {
  return request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getOwnerStats() {
  return request("/owner/stats");
}
