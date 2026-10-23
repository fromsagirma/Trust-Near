import React from "react";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import AboutContactSection from "./AboutContactSection";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-white text-slate-navy font-sans antialiased flex flex-col selection:bg-amber-gold selection:text-white">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <AboutContactSection />
      </main>
      <Footer />
    </div>
  );
}
