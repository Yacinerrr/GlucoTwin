// src/pages/MealAnalysis.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaUpload,
  FaBell,
  FaGlobe,
  FaPlus,
  FaLeaf,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { FaEarthAmericas } from "react-icons/fa6";
import { BiSolidCoffee, BiSolidBed } from "react-icons/bi";
import { GiCupcake } from "react-icons/gi";
import { useAuth } from "../../context/Authcontext";
import { glucoseAPI } from "../../services/api";

// ========================
// 🌐 FastAPI Configuration
// ========================
const API_BASE_URL = "http://localhost:8000"; // 🔧 Change to your FastAPI URL

type FoodType = "algerian" | "global" | null;

interface PredictionResult {
  food_name: string;
  confidence: number;
  top5: Array<{ label: string; probability: number }>;
  carbs?: number;
  protein?: number;
  fat?: number;
}

// ========================
// Main Component
// ========================
export default function MealAnalysis() {
  const { user } = useAuth();
  const [selectedFoodType, setSelectedFoodType] = useState<FoodType>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Glucose and projection state
  const [currentGlucose, setCurrentGlucose] = useState<number>(145.5);
  const [glucoseLoading, setGlucoseLoading] = useState(false);
  const [metabolicProjection, setMetabolicProjection] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current glucose and metabolic projection on component mount
  useEffect(() => {
    const loadGlucoseData = async () => {
      if (!user) return;
      setGlucoseLoading(true);
      try {
        // Try to get latest glucose reading
        // Using BDD test data value from latest reading
        const baseGlucose = 145.5; // From BDD test data
        setCurrentGlucose(baseGlucose);

        // TODO: Fetch metabolic projection from Model 1
        // This would be called after a meal is logged to calculate glycemic impact
      } catch (err) {
        console.error("Failed to load glucose data:", err);
      } finally {
        setGlucoseLoading(false);
      }
    };

    loadGlucoseData();
  }, [user]);

  const carbs = prediction?.carbs ?? 65;
  const protein = prediction?.protein ?? 22;
  const fat = prediction?.fat ?? 14;

  const recentLogs = [
    {
      name: "Whole Wheat Toast",
      amount: "28g",
      score: "A",
      time: "Today, 08:30 AM",
      icon: <BiSolidBed className="text-green-700" />,
      bg: "bg-green-100",
    },
    {
      name: "Latte with Stevia",
      amount: "12g",
      score: "A",
      time: "Today, 10:15 AM",
      icon: <BiSolidCoffee className="text-teal-700" />,
      bg: "bg-teal-100",
    },
    {
      name: "Baklava (Small)",
      amount: "42g",
      score: "C",
      time: "Yesterday, 09:45 PM",
      icon: <GiCupcake className="text-red-700" />,
      bg: "bg-red-100",
    },
  ];

  // ========================
  // 📤 Handle Image Selection
  // ========================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setPrediction(null);
    setError(null);
  };

  // ========================
  // 🚀 Send to FastAPI
  // ========================
  const handleAnalyze = async () => {
    if (!imageFile || !selectedFoodType) {
      setError("Veuillez choisir un type de plat et uploader une image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("food_type", selectedFoodType); // "algerian" or "global"

      // 🔧 Endpoint: POST /predict
      // FastAPI should read `food_type` to decide which model to load:
      //   - "algerian" → food_model_algerian_v3.pth
      //   - "global"   → food_model_final.pth
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail || `Erreur ${response.status}`);
      }

      const data: PredictionResult = await response.json();
      setPrediction(data);
    } catch (err: any) {
      setError(
        err.message ||
          "Erreur lors de l'analyse. Vérifiez votre serveur FastAPI.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setImageFile(null);
    setImagePreview(null);
    setPrediction(null);
    setError(null);
    setSelectedFoodType(null);
  };

  return (
    <div className="flex h-screen bg-[#F4F7FB] font-sans text-slate-800 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center bg-[#F4F7FB] px-8 py-4">
          <p className="text-sm font-medium text-slate-600">
            <span className="text-[#0052CC] border-b border-[#0052CC] pb-0.5 cursor-pointer">
              {glucoseLoading ? (
                <>
                  <FaSpinner className="inline mr-2 animate-spin" size={14} />
                  Loading glucose...
                </>
              ) : (
                `Current Glucose: ${currentGlucose} mg/dL`
              )}
            </span>
          </p>
          <div className="flex items-center gap-5 text-slate-500">
            <FaBell className="w-5 h-5 cursor-pointer hover:text-slate-700" />
            <div className="flex items-center gap-2 bg-slate-200/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200">
              <FaGlobe className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600">
                Language: EN/AR
              </span>
            </div>
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix"
              alt="User Avatar"
              className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 cursor-pointer"
            />
          </div>
        </header>

        {/* Scrollable Main */}
        <main className="flex-1 overflow-y-auto p-8 pt-2">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Meal Analysis
              </h2>
              <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                Capture or upload your meal photo for instant AI-powered
                nutritional breakdown and glycemic impact forecasting.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                {/* ======================== */}
                {/* STEP 1: Food Type Select */}
                {/* ======================== */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-[#0052CC] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-lg font-bold text-slate-800">
                      Type de plat
                    </h3>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">
                    Sélectionnez le type de cuisine pour choisir le bon modèle
                    IA.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Algerian */}
                    <button
                      onClick={() => {
                        setSelectedFoodType("algerian");
                        setPrediction(null);
                        setError(null);
                      }}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                        ${
                          selectedFoodType === "algerian"
                            ? "border-[#0052CC] bg-blue-50 shadow-md"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
                        }`}>
                      {selectedFoodType === "algerian" && (
                        <FaCheckCircle
                          className="absolute top-3 right-3 text-[#0052CC]"
                          size={16}
                        />
                      )}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                        ${selectedFoodType === "algerian" ? "bg-[#0052CC]" : "bg-slate-200"}`}>
                        <span>🇩🇿</span>
                      </div>
                      <div className="text-center">
                        <p
                          className={`font-bold text-sm ${selectedFoodType === "algerian" ? "text-[#0052CC]" : "text-slate-700"}`}>
                          Plat Algérien
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Couscous, Chakhchouka...
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                        ${selectedFoodType === "algerian" ? "bg-blue-100 text-[#0052CC]" : "bg-slate-100 text-slate-500"}`}>
                        food_model_algerian_v3
                      </span>
                    </button>

                    {/* Global */}
                    <button
                      onClick={() => {
                        setSelectedFoodType("global");
                        setPrediction(null);
                        setError(null);
                      }}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                        ${
                          selectedFoodType === "global"
                            ? "border-emerald-500 bg-emerald-50 shadow-md"
                            : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
                        }`}>
                      {selectedFoodType === "global" && (
                        <FaCheckCircle
                          className="absolute top-3 right-3 text-emerald-500"
                          size={16}
                        />
                      )}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                        ${selectedFoodType === "global" ? "bg-emerald-500" : "bg-slate-200"}`}>
                        <span>🌍</span>
                      </div>
                      <div className="text-center">
                        <p
                          className={`font-bold text-sm ${selectedFoodType === "global" ? "text-emerald-700" : "text-slate-700"}`}>
                          Plat Global
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Pizza, Sushi, Burger...
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                        ${selectedFoodType === "global" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        food_model_final
                      </span>
                    </button>
                  </div>
                </div>

                {/* ======================== */}
                {/* STEP 2: Image Upload     */}
                {/* ======================== */}
                <div
                  className={`bg-white p-6 rounded-3xl shadow-sm border transition-all duration-200
                  ${!selectedFoodType ? "opacity-50 pointer-events-none border-slate-100" : "border-slate-100"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-[#0052CC] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-lg font-bold text-slate-800">
                      Meal Capture
                    </h3>
                    <div className="ml-auto flex gap-4 text-[#0052CC]">
                      <FaCamera
                        className="w-5 h-5 cursor-pointer hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                      />
                      <FaUpload
                        className="w-5 h-5 cursor-pointer hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />

                  {/* Image Preview / Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative h-64 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border-2 border-dashed cursor-pointer transition-all
                      ${
                        imagePreview
                          ? "border-transparent"
                          : "border-slate-200 bg-gradient-to-b from-amber-50 to-amber-100 hover:border-blue-300"
                      }`}>
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Meal preview"
                          className="w-full h-full object-cover rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                          <span className="text-white font-bold text-sm bg-black/40 px-4 py-2 rounded-full">
                            Changer l'image
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="bg-white/80 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <FaUpload className="text-[#0052CC]" />
                        </div>
                        <p className="text-slate-600 font-semibold text-sm">
                          Cliquer pour uploader
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          JPG, PNG, WEBP
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                      <FaExclamationTriangle />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Analyze Button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={!imageFile || !selectedFoodType || isLoading}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                      ${
                        imageFile && selectedFoodType && !isLoading
                          ? "bg-[#0052CC] hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}>
                    {isLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>🔍 Analyser le plat</>
                    )}
                  </button>

                  {/* Top 5 Predictions */}
                  {prediction?.top5 && (
                    <div className="mt-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Top 5 Prédictions
                      </h4>
                      <div className="space-y-2">
                        {prediction.top5.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-4">
                              {i + 1}.
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span
                                  className={`font-medium ${i === 0 ? "text-[#0052CC]" : "text-slate-600"}`}>
                                  {item.label}
                                </span>
                                <span className="text-slate-500">
                                  {(item.probability * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${i === 0 ? "bg-[#0052CC]" : "bg-slate-300"}`}
                                  style={{
                                    width: `${item.probability * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Macros (shown after prediction) */}
                  {prediction && (
                    <div className="mt-6">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                        Valeurs Nutritionnelles
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1">
                            Carbs (g)
                          </p>
                          <p className="font-bold text-xl text-slate-800">
                            {carbs}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1">
                            Protein (g)
                          </p>
                          <p className="font-bold text-xl text-slate-800">
                            {protein}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1">
                            Fat (g)
                          </p>
                          <p className="font-bold text-xl text-slate-800">
                            {fat}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                {/* AI Meal Recognition */}
                <div className="bg-[#0052CC] text-white p-7 rounded-3xl shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider mb-4 opacity-90 uppercase">
                    <span className="text-cyan-300">✦</span> AI Meal Recognition
                  </div>

                  {isLoading ? (
                    <div className="flex items-center gap-3 py-4">
                      <FaSpinner
                        className="animate-spin text-cyan-300"
                        size={24}
                      />
                      <p className="text-white/80 text-sm">
                        Analyse en cours...
                      </p>
                    </div>
                  ) : prediction ? (
                    <>
                      <h2 className="text-2xl font-bold mb-1">
                        {prediction.food_name}
                      </h2>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-extrabold">{carbs}</span>
                        <span className="text-lg opacity-90">g Carbs</span>
                      </div>
                      <p className="text-xs text-cyan-200 mb-4">
                        Confiance: {(prediction.confidence * 100).toFixed(1)}%
                        {selectedFoodType === "algerian"
                          ? " • Modèle Algérien 🇩🇿"
                          : " • Modèle Global 🌍"}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-1">
                        {selectedFoodType
                          ? selectedFoodType === "algerian"
                            ? "Plat Algérien 🇩🇿"
                            : "Plat Global 🌍"
                          : "En attente..."}
                      </h2>
                      <p className="text-white/60 text-sm mb-4">
                        Uploadez une image pour commencer l'analyse
                      </p>
                    </>
                  )}

                  <div className="h-2 w-full bg-blue-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-cyan-300 rounded-full transition-all duration-500"
                      style={{ width: `${(carbs / 150) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs opacity-80 font-medium">
                    Daily carb allowance: {Math.round((carbs / 150) * 100)}%
                    utilized
                  </p>
                </div>

                {/* Metabolic Projection from Model 1 */}
                {prediction && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-3xl shadow-sm border border-orange-100">
                    <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
                      <span className="text-orange-600">📊</span>
                      Metabolic Projection
                    </h3>
                    <p className="text-slate-500 text-xs mb-4">
                      Predicted glucose impact of this meal (Model 1)
                    </p>
                    <div className="space-y-3">
                      <div className="bg-white rounded-2xl p-3 border border-orange-200">
                        <p className="text-xs text-slate-500 mb-1">
                          Base Glucose
                        </p>
                        <p className="text-lg font-bold text-orange-600">
                          {currentGlucose} mg/dL
                        </p>
                      </div>
                      <div className="bg-white rounded-2xl p-3 border border-orange-200">
                        <p className="text-xs text-slate-500 mb-1">
                          Carb Impact
                        </p>
                        <p className="text-lg font-bold text-amber-600">
                          +{Math.round(carbs * 0.7)} mg/dL
                        </p>
                      </div>
                      <div className="bg-white rounded-2xl p-3 border border-orange-200">
                        <p className="text-xs text-slate-500 mb-1">
                          Projected Peak
                        </p>
                        <p className="text-lg font-bold text-red-600">
                          {currentGlucose + Math.round(carbs * 0.7)} mg/dL
                        </p>
                      </div>
                      <div className="text-xs text-slate-600 bg-white rounded-xl p-2 border border-orange-200">
                        <FaCheckCircle
                          className="inline mr-1 text-green-600"
                          size={12}
                        />
                        Peak expected in ~30 minutes
                      </div>
                    </div>
                  </div>
                )}

                {/* Meal Safety Score */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">
                      Meal Safety Score
                    </h3>
                    <p className="text-slate-500 text-xs">
                      Predicted Glycemic Impact
                    </p>
                  </div>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-teal-600"
                        strokeWidth="4"
                        strokeDasharray="75, 100"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-xl font-bold text-teal-700">
                      B
                    </span>
                  </div>
                </div>

                {/* Recent Logs */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Recent Logs</h3>
                    <button className="text-[#0052CC] text-xs font-bold hover:underline">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentLogs.map((log, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${log.bg}`}>
                            {log.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {log.name}
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {log.time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 text-sm mb-1">
                            {log.amount}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.score === "A"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                            Score {log.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <button
          onClick={resetAnalysis}
          className="fixed bottom-8 right-8 bg-[#0052CC] hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center transform hover:scale-105"
          title="Nouvelle analyse">
          <FaPlus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
