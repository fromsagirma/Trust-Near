import React, { useState } from "react";
import {
  Mail,
  Send,
  CheckCircle2,
  Zap,
  Globe2,
  ShieldCheck,
} from "lucide-react";

export default function AboutContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 4000);
  };

  return (
    <section id="about" className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Column 1: About TrustNear */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-trust-blue">
                About Us
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-navy mt-1 tracking-tight">
                Built for Real-World Discovery
              </h2>
            </div>

            <p className="text-sm sm:text-base text-cool-grey leading-relaxed">
              TrustNear addresses the realities of Ethiopian and Sub-Saharan African cities. Where formal street numbering is incomplete and map platforms have thin data on small businesses, TrustNear layers a human trust network on top of GPS: real landmark directions, independent community ratings, and trusted recommendations.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-blue-50 text-trust-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700">
                  <strong className="text-slate-navy">Landmark-First Routing:</strong> Describe places the way people give directions locally (e.g. &quot;behind St. Gabriel church, blue gate&quot;).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700">
                  <strong className="text-slate-navy">Low-Bandwidth Optimized:</strong> Compressed images and lightweight responses tailored for 3G networks.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700">
                  <strong className="text-slate-navy">Independent Ratings:</strong> 1–5 star community reviews with verified visit confirmation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-lg font-bold text-trust-blue">5 km</span>
                <span className="block text-[11px] text-cool-grey">Radius Search</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-lg font-bold text-amber-gold">&lt; 200KB</span>
                <span className="block text-[11px] text-cool-grey">Low Data View</span>
              </div>
            </div>
          </div>

          {/* Column 2: Get in Touch Form & Channels */}
          <div
            id="contact"
            className="lg:col-span-6 bg-slate-50/70 rounded-2xl p-6 sm:p-8 border border-slate-200/80"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Support
              </span>
              <h2 className="text-2xl font-extrabold text-slate-navy mt-1 tracking-tight">
                Get in Touch
              </h2>
              <p className="text-xs sm:text-sm text-cool-grey mt-1">
                Have questions or feedback? Drop a message below or contact us directly.
              </p>
            </div>

            {/* Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-5">
              <a
                href="mailto:support@trustnear.com"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-trust-blue transition text-left"
              >
                <Mail className="w-4 h-4 text-trust-blue" />
                <span className="text-xs font-medium text-slate-800 truncate">
                  support@trustnear.com
                </span>
              </a>

              <a
                href="https://t.me/TrustNearSupport"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-amber-gold transition text-left"
              >
                <Send className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-slate-800 truncate">
                  @TrustNearSupport
                </span>
              </a>
            </div>

            {/* Clean Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white text-slate-navy placeholder:text-cool-grey focus:outline-none focus:ring-1 focus:ring-trust-blue"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white text-slate-navy placeholder:text-cool-grey focus:outline-none focus:ring-1 focus:ring-trust-blue"
                  />
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  required
                  placeholder="How can we help?"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white text-slate-navy placeholder:text-cool-grey focus:outline-none focus:ring-1 focus:ring-trust-blue resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-semibold text-white shadow-sm text-xs sm:text-sm"
                style={{ backgroundColor: '#1E40AF', color: '#ffffff' }}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Message</span>
              </button>
            </form>

            {submitted && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Thank you! Your message has been sent.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
