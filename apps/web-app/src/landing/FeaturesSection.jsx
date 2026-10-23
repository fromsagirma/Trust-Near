import React from "react";
import { MapPin, Star, Users, Store, ArrowUpRight } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      id: "landmark-routing",
      icon: MapPin,
      title: "Landmark Routing",
      description:
        "Describe and find places using recognized neighborhood reference points where formal street numbers do not exist.",
      iconBg: "bg-blue-50 text-trust-blue",
    },
    {
      id: "community-reviews",
      icon: Star,
      title: "Community Reviews",
      description:
        "Independent 1–5 star ratings and genuine user comments owned entirely within TrustNear, not scraped from third parties.",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      id: "social-trust-network",
      icon: Users,
      title: "Social Trust Network",
      description:
        "Surface ratings from friends and connections first, and share favorite local spots directly with rich previews.",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      id: "owner-dashboard",
      icon: Store,
      title: "Owner Dashboard",
      description:
        "Claim or register your listing, update photos and landmark directions, and respond publicly to customer reviews.",
      iconBg: "bg-indigo-50 text-indigo-600",
    },
  ];

  const categories = [
    "Restaurants",
    "Cafes",
    "Bars & Lounges",
    "Hotels",
    "Guesthouses",
    "Services",
    "Retail",
  ];

  return (
    <section id="features" className="py-16 sm:py-20 bg-slate-50/60 border-y border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-trust-blue">
            Core Pillars
          </span>
          <h2 className="text-3xl font-extrabold text-slate-navy mt-2 tracking-tight">
            How TrustNear Works
          </h2>
          <p className="text-sm sm:text-base text-cool-grey mt-2">
            Everything you need to discover and reach local spots with complete clarity.
          </p>
        </div>

        {/* 4-Card Minimalist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${feature.iconBg}`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <h3 className="text-base font-bold text-slate-navy">
                    {feature.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-cool-grey mt-2 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <a
                    href="#about"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-trust-blue hover:text-blue-800 transition-colors"
                  >
                    <span>Learn more</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimalist Categories Strip */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
