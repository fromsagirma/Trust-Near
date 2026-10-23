import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Crosshair,
  Map as MapIcon,
  Edit3,
  CheckCircle2,
  Search,
  Maximize2,
  X,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Fix standard Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ADDIS_NEIGHBORHOODS = [
  { name: "Bole", lat: 9.0012, lng: 38.7845 },
  { name: "Kazanchis", lat: 9.0195, lng: 38.7692 },
  { name: "Piassa", lat: 9.0348, lng: 38.7521 },
  { name: "Sarbet", lat: 8.9954, lng: 38.7356 },
  { name: "Gerji", lat: 8.9893, lng: 38.8024 },
  { name: "Merkato", lat: 9.0302, lng: 38.7389 },
  { name: "Megenagna", lat: 9.0207, lng: 38.8016 },
  { name: "CMC / Ayat", lat: 9.0215, lng: 38.8456 },
  { name: "Mexico Square", lat: 9.0116, lng: 38.7447 },
];

export default function MapLocationPicker({ lat, lng, onChange }) {
  const [mode, setMode] = useState("map"); // "map" | "manual"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mapContainerRef = useRef(null);
  const fullscreenMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fullscreenMapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const fullscreenMarkerRef = useRef(null);

  const currentLat = lat ?? 9.025;
  const currentLng = lng ?? 38.746;

  const createPinIcon = () =>
    L.divIcon({
      className: "custom-map-pin",
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #2563eb; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 3px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });

  // Initialize Embedded Map
  useEffect(() => {
    if (mode !== "map" || !mapContainerRef.current || isFullscreen) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([currentLat, currentLng], {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);

      marker.on("dragend", (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        onChange(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)));
      });

      map.on("click", (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        marker.setLatLng([newLat, newLng]);
        onChange(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        markerRef.current?.setLatLng([currentLat, currentLng]);
      }, 50);
    }
  }, [mode, isFullscreen]);

  // Initialize Fullscreen Map Modal
  useEffect(() => {
    if (!isFullscreen || !fullscreenMapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.remove();
        fullscreenMapInstanceRef.current = null;
      }

      const map = L.map(fullscreenMapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([currentLat, currentLng], {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);

      marker.on("dragend", (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        onChange(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)));
      });

      map.on("click", (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        marker.setLatLng([newLat, newLng]);
        onChange(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)));
      });

      fullscreenMapInstanceRef.current = map;
      fullscreenMarkerRef.current = marker;
      map.invalidateSize();
    }, 100);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.remove();
        fullscreenMapInstanceRef.current = null;
      }
    };
  }, [isFullscreen]);

  // Sync positions when lat/lng change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([currentLat, currentLng]);
    }
    if (fullscreenMarkerRef.current) {
      fullscreenMarkerRef.current.setLatLng([currentLat, currentLng]);
    }
  }, [currentLat, currentLng]);

  // Auto GPS Location
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        onChange(newLat, newLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 16);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (fullscreenMapInstanceRef.current && fullscreenMarkerRef.current) {
          fullscreenMapInstanceRef.current.setView([newLat, newLng], 16);
          fullscreenMarkerRef.current.setLatLng([newLat, newLng]);
        }
        setLocating(false);
      },
      () => {
        setErrorMsg("Couldn't retrieve GPS location — please check browser permissions.");
        setLocating(false);
      }
    );
  };

  const handleSelectPreset = (presetLat, presetLng) => {
    onChange(presetLat, presetLng);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([presetLat, presetLng], 15);
      markerRef.current.setLatLng([presetLat, presetLng]);
    }
    if (fullscreenMapInstanceRef.current && fullscreenMarkerRef.current) {
      fullscreenMapInstanceRef.current.setView([presetLat, presetLng], 15);
      fullscreenMarkerRef.current.setLatLng([presetLat, presetLng]);
    }
  };

  const handleSearchPlace = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    const queryLower = searchQuery.toLowerCase().trim();
    const localMatch = ADDIS_NEIGHBORHOODS.find((p) =>
      p.name.toLowerCase().includes(queryLower)
    );
    if (localMatch) {
      handleSelectPreset(localMatch.lat, localMatch.lng);
      return;
    }

    setSearching(true);
    setErrorMsg("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery + ", Addis Ababa, Ethiopia"
      )}&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const results = await res.json();
      if (results && results.length > 0) {
        const foundLat = Number(parseFloat(results[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(results[0].lon).toFixed(6));
        onChange(foundLat, foundLng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([foundLat, foundLng], 16);
          markerRef.current.setLatLng([foundLat, foundLng]);
        }
        if (fullscreenMapInstanceRef.current && fullscreenMarkerRef.current) {
          fullscreenMapInstanceRef.current.setView([foundLat, foundLng], 16);
          fullscreenMarkerRef.current.setLatLng([foundLat, foundLng]);
        }
      } else {
        setErrorMsg(`Place "${searchQuery}" not found. Try dragging the map pin directly.`);
      }
    } catch (err) {
      setErrorMsg("Search service temporarily unreachable. Try clicking directly on the map.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Bar: Mode Switcher Tabs + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "map"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "manual"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Enter Coordinates</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseGps}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 transition-colors disabled:opacity-50 cursor-pointer"
            title="Auto-detect current location using device GPS"
          >
            {locating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>My Location</span>
              </>
            )}
          </button>

          {mode === "map" && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Open full page map view"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Full Page Map</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MODE 1: Embedded Map */}
      {mode === "map" && !isFullscreen && (
        <div className="space-y-2">
          {/* Map Search Bar */}
          <form onSubmit={handleSearchPlace} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search neighborhood, landmark, or street (e.g. "Bole Medhanealem", "Piassa")...'
              className="input w-full pl-9 pr-24 text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Find</span>}
            </button>
          </form>

          {/* Embedded Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <div
              ref={mapContainerRef}
              className="w-full h-72 sm:h-80 bg-slate-900"
              style={{ zIndex: 10 }}
            />

            {/* Bottom Tip Bar */}
            <div className="p-2.5 bg-slate-900/95 text-white text-[11px] font-medium flex items-center justify-between border-t border-slate-800">
              <span className="flex items-center gap-1.5 truncate mr-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Drag pin or click map to set location</span>
              </span>
              <span className="font-mono text-[10px] text-blue-300 font-bold bg-slate-800 px-2 py-0.5 rounded flex-shrink-0">
                {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FULL-PAGE MAP MODAL (Full screen experience) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pin Location on Map
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click anywhere on the map or drag the blue pin to set exact coordinates.
                  </p>
                </div>
              </div>

              {/* Search in Fullscreen */}
              <form onSubmit={handleSearchPlace} className="relative flex items-center w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search landmark (e.g. Bole Medhanealem)..."
                  className="input w-full pl-9 pr-20 text-xs py-2"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="submit"
                  disabled={searching}
                  className="absolute right-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Find</span>}
                </button>
              </form>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                  <span>My GPS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Done & Confirm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Map Viewport */}
            <div className="relative flex-1 w-full bg-slate-900">
              <div
                ref={fullscreenMapContainerRef}
                className="w-full h-full"
                style={{ zIndex: 10 }}
              />
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                  Quick Areas:
                </span>
                {ADDIS_NEIGHBORHOODS.slice(0, 6).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p.lat, p.lng)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Selected GPS:
                </span>
                <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                  {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Manual Coordinates Input */}
      {mode === "manual" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="form-label text-xs">Latitude (Lat) *</label>
            <input
              type="number"
              step="any"
              value={lat ?? ""}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0, lng ?? 38.746)}
              placeholder="e.g. 9.025000"
              className="input w-full text-xs font-mono"
              required
            />
          </div>
          <div>
            <label className="form-label text-xs">Longitude (Lng) *</label>
            <input
              type="number"
              step="any"
              value={lng ?? ""}
              onChange={(e) => onChange(lat ?? 9.025, parseFloat(e.target.value) || 0)}
              placeholder="e.g. 38.746000"
              className="input w-full text-xs font-mono"
              required
            />
          </div>
        </div>
      )}

      {/* Quick Neighborhood Presets (when not in fullscreen) */}
      {!isFullscreen && (
        <div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            Popular Neighborhood Shortcuts
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {ADDIS_NEIGHBORHOODS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p.lat, p.lng)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Coordinates Summary Badge */}
      {lat !== null && lng !== null && !isFullscreen && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Target Location Set:</span>
          </div>
          <span className="font-mono text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
            Lat {Number(lat).toFixed(6)}, Lng {Number(lng).toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
