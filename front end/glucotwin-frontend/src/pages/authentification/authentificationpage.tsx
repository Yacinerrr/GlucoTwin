// pages/auth.tsx or components/AuthScreen.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaArrowRight,
  FaHospital,
  FaPhone,
} from "react-icons/fa";
import { useAuth } from "../../context/Authcontext";

// Define user types
type UserRole = "doctor" | "patient";

export default function AuthScreen() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [diabetesType, setDiabetesType] = useState("");
  const [doctorInviteCode, setDoctorInviteCode] = useState("");

  const { login, register } = useAuth();

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login
        await login(email, password);
        navigate("/dashboard");
      } else {
        // Register
        if (role === "doctor") {
          await register(
            {
              email,
              password,
              full_name: fullName,
              specialty,
              hospital,
              phone,
            },
            "doctor",
          );
        } else {
          await register(
            {
              email,
              password,
              full_name: fullName,
              age: age ? parseInt(age) : undefined,
              weight_kg: weightKg ? parseFloat(weightKg) : undefined,
              diabetes_type: diabetesType,
              doctor_invite_code: doctorInviteCode || undefined,
            },
            "patient",
          );
        }
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Left Side: Branding & Welcome */}
        <div className="hidden md:flex w-1/2 bg-[#0052CC] p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white opacity-5 rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white opacity-10 rounded-full"></div>

          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-2">
              Clinical Sanctuary
            </h1>
            <p className="text-blue-200 text-sm">
              Patient Portal & Nutritional Intelligence
            </p>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              {isLogin
                ? "Welcome back to your health journey."
                : "Start optimizing your nutrition today."}
            </h2>
            <p className="text-blue-100 mb-8 max-w-md">
              Access your personalized dashboard, AI-powered meal analysis, and
              real-time glycemic impact forecasting all in one place.
            </p>

            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1 text-teal-300 text-xs">
                  ★ ★ ★ ★ ★
                </div>
              </div>
              <p className="text-white text-sm italic opacity-90">
                "The AI meal recognition has completely transformed how I manage
                my daily carb allowance."
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center overflow-y-auto">
          <div className="max-w-md w-full mx-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {isLogin ? "Sign In" : "Create Account"}
              </h2>
              <p className="text-slate-500 text-sm">
                {isLogin
                  ? "Enter your credentials to access your portal."
                  : "Fill in your details to join Clinical Sanctuary."}
              </p>
            </div>

            {/* Role Selection for Sign Up */}
            {!isLogin && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  I am a:
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      role === "patient"
                        ? "bg-[#0052CC] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      role === "doctor"
                        ? "bg-[#0052CC] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    Doctor
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Name Field (Only for Sign Up) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <FaUser />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Doctor-specific fields */}
              {!isLogin && role === "doctor" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Specialty
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <FaHospital />
                      </div>
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Endocrinology"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Hospital
                    </label>
                    <input
                      type="text"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      placeholder="City Hospital"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <FaPhone />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Patient-specific fields */}
              {!isLogin && role === "patient" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="30"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="70.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Diabetes Type
                    </label>
                    <select
                      value={diabetesType}
                      onChange={(e) => setDiabetesType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all">
                      <option value="">Select type</option>
                      <option value="type1">Type 1</option>
                      <option value="type2">Type 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Doctor Invite Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={doctorInviteCode}
                      onChange={(e) => setDoctorInviteCode(e.target.value)}
                      placeholder="Enter invite code if you have one"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                    />
                  </div>
                </>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Password *
                  </label>
                  {isLogin && (
                    <a
                      href="#"
                      className="text-xs font-bold text-[#0052CC] hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC] transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0052CC] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <FaArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                {isLogin
                  ? "Don't have an account yet?"
                  : "Already have an account?"}
                <button
                  onClick={toggleAuthMode}
                  disabled={isLoading}
                  className="ml-2 font-bold text-[#0052CC] hover:underline focus:outline-none disabled:opacity-50">
                  {isLogin ? "Sign up here" : "Sign in here"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
