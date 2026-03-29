import { useState } from "react";
import { patientAPI } from "../../services/api";
import { Edit2, Check, X, User, Heart, AlertTriangle } from "lucide-react";
import { AxiosError } from "axios";

interface PatientData {
  id: number;
  full_name: string;
  email: string;
  age?: number;
  weight_kg?: number;
  diabetes_type?: string;
  is_ramadan_mode?: boolean;
  insulin_ratio?: number;
  sensitivity?: number;
  target_glucose?: number;
  doctor_id?: number | null;
  created_at?: string;
}

interface PatientProfileProps {
  patient: PatientData;
}

export default function PatientProfile({ patient }: PatientProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: patient.full_name || "",
    age: patient.age?.toString() || "",
    weight_kg: patient.weight_kg?.toString() || "",
    diabetes_type: patient.diabetes_type || "",
    insulin_ratio: patient.insulin_ratio?.toString() || "10.0",
    sensitivity: patient.sensitivity?.toString() || "42.0",
    target_glucose: patient.target_glucose?.toString() || "110.0",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const updateData = {
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : undefined,
        weight_kg: formData.weight_kg
          ? parseFloat(formData.weight_kg)
          : undefined,
        diabetes_type: formData.diabetes_type || undefined,
        insulin_ratio: formData.insulin_ratio
          ? parseFloat(formData.insulin_ratio)
          : undefined,
        sensitivity: formData.sensitivity
          ? parseFloat(formData.sensitivity)
          : undefined,
        target_glucose: formData.target_glucose
          ? parseFloat(formData.target_glucose)
          : undefined,
      };

      await patientAPI.updateProfile(updateData);
      setSuccess(true);
      setIsEditing(false);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      const axiosError = err as AxiosError<{ detail: string }>;
      setError(axiosError.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: patient.full_name || "",
      age: patient.age?.toString() || "",
      weight_kg: patient.weight_kg?.toString() || "",
      diabetes_type: patient.diabetes_type || "",
      insulin_ratio: patient.insulin_ratio?.toString() || "10.0",
      sensitivity: patient.sensitivity?.toString() || "42.0",
      target_glucose: patient.target_glucose?.toString() || "110.0",
    });
    setIsEditing(false);
    setError(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Profile
          </p>
          <h1 className="mt-1 font-['Sora'] text-[1.65rem] font-bold tracking-tight text-slate-800">
            Your Health Profile
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            isEditing
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}>
          <Edit2 size={14} />
          {isEditing ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle size={20} className="text-rose-600" />
          <p className="text-sm text-rose-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            ✓ Profile updated successfully
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {/* Personal Information Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Personal Information
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your basic health and contact details
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={patient.email}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Diabetes Type
              </label>
              <select
                name="diabetes_type"
                value={formData.diabetes_type}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}>
                <option value="">Select type</option>
                <option value="type1">Type 1</option>
                <option value="type2">Type 2</option>
                <option value="gestational">Gestational</option>
              </select>
            </div>
          </div>
        </article>

        {/* Medical Configuration Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Medical Configuration
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Personalized insulin and glucose settings
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Insulin Ratio
              </label>
              <input
                type="number"
                step="0.1"
                name="insulin_ratio"
                value={formData.insulin_ratio}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
              <p className="mt-1 text-[10px] text-slate-500">
                1 unit per X grams of carbs
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Sensitivity Factor
              </label>
              <input
                type="number"
                step="0.1"
                name="sensitivity"
                value={formData.sensitivity}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
              <p className="mt-1 text-[10px] text-slate-500">
                mg/dL per 1 unit
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Target Glucose
              </label>
              <input
                type="number"
                name="target_glucose"
                value={formData.target_glucose}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
              <p className="mt-1 text-[10px] text-slate-500">mg/dL</p>
            </div>
          </div>
        </article>

        {/* Status Information */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <h2 className="m-0 text-sm font-bold text-slate-800">Status</h2>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              <span className="text-sm text-slate-700">
                {patient.doctor_id ? "✓ Linked to doctor" : "Not linked to doctor"}
              </span>
            </div>
            {patient.is_ramadan_mode && (
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-rose-500" />
                <span className="text-sm text-slate-700">
                  Ramadan Mode Active
                </span>
              </div>
            )}
          </div>
        </article>

        {/* Account Information */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <h2 className="m-0 text-sm font-bold text-slate-800">Account</h2>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-500">
                ID
              </p>
              <p className="text-sm text-slate-700 font-mono">#{patient.id}</p>
            </div>
            {patient.created_at && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">
                  JOINED
                </p>
                <p className="text-sm text-slate-700">
                  {new Date(patient.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </article>
      </div>

      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-slate-200 bg-white p-4 md:relative md:border-t-0 md:bg-transparent md:p-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            <X size={16} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            <Check size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </>
  );
}
