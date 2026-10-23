import React from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Star,
  ArrowRight,
  ShieldCheck,
  Navigation2,
} from "lucide-react";

export default function HeroSection() {
  const handleExploreGuest = () => {
    const targetSection = document.getElementById("features");
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="pt-12 pb-16 lg:pt-20 lg:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 self-center lg:self-start px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-gold" />
              <span>Discover. Trust. Connect.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-navy tracking-tight leading-tight">
              Find Local Spots Using Real Landmarks
            </h1>

            <p className="text-base sm:text-lg text-cool-grey leading-relaxed max-w-xl mx-auto lg:mx-0">
              Discover verified restaurants, cafes, bars, and hotels within 5 km. TrustNear pairs GPS with everyday neighborhood landmarks so you never get lost.
            </p>

            {/* Minimalist CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={handleExploreGuest}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-sm"
                style={{ backgroundColor: '#1E40AF', color: '#ffffff' }}
              >
                <span>Explore Nearby</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all duration-150"
              >
                List Your Business
              </Link>
            </div>

            {/* Subtle Highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-cool-grey font-medium">
              <span>• 1, 2, or 5 km Radius Search</span>
              <span>• Landmark-First Directions</span>
            </div>
          </div>

          {/* Right Column: Minimalist Business Mockup Card */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-cool-grey">
                    Cafe &amp; Bakery
                  </span>
                  <h3 className="text-lg font-bold text-slate-navy mt-0.5">
                    St. Gabriel Artisan Cafe
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200/60">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Rating & Distance */}
              <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-gold text-amber-gold" />
                  <span className="font-bold text-slate-navy">4.8</span>
                  <span className="text-cool-grey">(142 reviews)</span>
                </div>

                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <Navigation2 className="w-3.5 h-3.5 text-trust-blue" />
                  <span>300m away</span>
                </div>
              </div>

              {/* Landmark Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cool-grey block">
                  Landmark Directions
                </span>
                <p className="text-xs font-semibold text-slate-navy mt-1">
                  📍 Behind St. Gabriel Church, Blue Gate
                </p>
                <p className="text-[11px] text-cool-grey mt-0.5">
                  2nd building on the right with the wooden sign.
                </p>
              </div>

              {/* Card Footer Link */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-cool-grey">Open Now • Closes 10 PM</span>
                <a
                  href="#features"
                  className="font-semibold text-trust-blue hover:underline"
                >
                  View Details →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
