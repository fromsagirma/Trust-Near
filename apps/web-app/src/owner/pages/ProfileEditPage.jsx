import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Store, Loader2, AlertCircle, PlusCircle, Check } from "lucide-react";
import {
  getMyBusinesses,
  getMyBusiness,
  getSelectedBusinessId,
  setSelectedBusinessId,
} from "../api/ownerApi";
import BasicInfoSection from "../components/BusinessForm/BasicInfoSection";
import LocationSection from "../components/BusinessForm/LocationSection";
import HoursSection from "../components/BusinessForm/HoursSection";
import PhotosSection from "../components/BusinessForm/PhotosSection";

export default function ProfileEditPage() {
  const [businesses, setBusinesses] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const allBiz = await getMyBusinesses();
      setBusinesses(allBiz);

      const activeBiz = await getMyBusiness();
      setBusiness(activeBiz);
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load your business profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleBizChange = () => loadData();
    window.addEventListener("trustnear:businessChanged", handleBizChange);
    return () => window.removeEventListener("trustnear:businessChanged", handleBizChange);
  }, [loadData]);

  const handleSelectBusiness = (id) => {
    setSelectedBusinessId(id);
    const found = businesses.find((b) => b.id === id);
    if (found) setBusiness(found);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold">Loading business profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700 dark:text-rose-200">Unable to load profile</p>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="empty-box max-w-xl p-8 space-y-4">
        <Store className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
        <p className="text-base font-bold text-slate-900 dark:text-white">No Business Profile Registered</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Create your business listing to start managing your profile, landmark directions, and operating hours.
        </p>
        <div className="pt-2">
          <Link to="/owner/onboarding" className="btn-primary inline-flex">
            <PlusCircle className="w-4 h-4" />
            <span>Add Business Listing</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Business Profile
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Update listing details for <span className="text-slate-900 dark:text-white font-bold">{business.name}</span>. Each section saves independently.
        </p>
      </div>

      {/* Multi-business selector tabs if owner has more than 1 listing */}
      {businesses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {businesses.map((biz) => {
            const isSelected = biz.id === business.id;
            return (
              <button
                key={biz.id}
                type="button"
                onClick={() => handleSelectBusiness(biz.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Store className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
                <span>{biz.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
          <Link
            to="/owner/onboarding"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 border border-blue-200 dark:border-blue-800 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Another</span>
          </Link>
        </div>
      )}

      <BasicInfoSection business={business} onSaved={setBusiness} />
      <LocationSection business={business} onSaved={setBusiness} />
      <HoursSection business={business} onSaved={setBusiness} />
      <PhotosSection business={business} onSaved={setBusiness} />
    </div>
  );
}
