import React, { useState } from "react";
import { Check } from "lucide-react";
import BasicInfoStep from "../components/BusinessForm/BasicInfoStep";
import LocationStep from "../components/BusinessForm/LocationStep";
import HoursStep from "../components/BusinessForm/HoursStep";
import PhotosStep from "../components/BusinessForm/PhotosStep";

const stepLabels = [
  { key: "basic", label: "Basic Info" },
  { key: "location", label: "Location" },
  { key: "hours", label: "Hours" },
  { key: "photos", label: "Photos" },
];

export default function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    phone: "",
    description: "",
    landmark: "",
    lat: null,
    lng: null,
    hours: {},
    photos: [],
  });

  const currentStep = stepLabels[stepIndex].key;

  const updateFormData = (fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const goNext = () => setStepIndex((i) => Math.min(i + 1, stepLabels.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Add Your Business
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          List your establishment in TrustNear to connect with nearby community members.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-sm">
        {stepLabels.map((s, idx) => {
          const isCompleted = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`hidden sm:block text-xs truncate ${
                  isCurrent
                    ? "font-bold text-slate-900 dark:text-white"
                    : isCompleted
                    ? "text-slate-700 dark:text-slate-300 font-semibold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Components */}
      {currentStep === "basic" && (
        <BasicInfoStep
          data={formData}
          onChange={updateFormData}
          onNext={goNext}
        />
      )}
      {currentStep === "location" && (
        <LocationStep
          data={formData}
          onChange={updateFormData}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === "hours" && (
        <HoursStep
          data={formData}
          onChange={updateFormData}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === "photos" && (
        <PhotosStep
          data={formData}
          onChange={updateFormData}
          onBack={goBack}
        />
      )}
    </div>
  );
}
