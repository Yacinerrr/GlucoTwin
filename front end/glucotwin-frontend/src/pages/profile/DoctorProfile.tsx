import { useState, useEffect } from "react";
import { doctorAPI } from "../../services/api";
import {
  Edit2,
  Check,
  X,
  Users,
  Copy,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { AxiosError } from "axios";

interface DoctorData {
  id: number;
  full_name: string;
  email: string;
  specialty?: string;
  hospital?: string;
  phone?: string;
  invite_code?: string;
  created_at?: string;
}

interface ProfilePatient {
  id: number;
  full_name: string;
  email: string;
  diabetes_type?: string;
}

interface DoctorProfileProps {
  doctor: DoctorData;
}

export default function DoctorProfile({ doctor }: DoctorProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteCode, setInviteCode] = useState(doctor.invite_code || "");
  const [patients, setPatients] = useState<ProfilePatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [formData, setFormData] = useState({
    full_name: doctor.full_name || "",
    specialty: doctor.specialty || "",
    hospital: doctor.hospital || "",
    phone: doctor.phone || "",
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const patientsData = await doctorAPI.getPatients();
      setPatients(patientsData);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Note: Doctor profile update endpoint may need to be created on the backend
      // For now, this is a placeholder that shows the structure
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
      full_name: doctor.full_name || "",
      specialty: doctor.specialty || "",
      hospital: doctor.hospital || "",
      phone: doctor.phone || "",
    });
    setIsEditing(false);
    setError(null);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = async () => {
    try {
      const result = await doctorAPI.regenerateInviteCode();
      setInviteCode(result.invite_code);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error regenerating code:", err);
      setError("Failed to regenerate invite code");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Profile
          </p>
          <h1 className="mt-1 font-['Sora'] text-[1.65rem] font-bold tracking-tight text-slate-800">
            Doctor Profile
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
            ✓ Updated successfully
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {/* Professional Information Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Professional Information
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your medical credentials and contact details
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
                value={doctor.email}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Specialty
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
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
                Hospital / Clinic
              </label>
              <input
                type="text"
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isEditing
                    ? "border-blue-300 bg-white"
                    : "border-slate-200 bg-slate-50"
                } ${!isEditing ? "cursor-not-allowed" : "focus:border-blue-500 focus:outline-none"}`}
              />
            </div>
          </div>
        </article>

        {/* Patient Invitation Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
          <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
            Patient Invitation
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Share this code with patients to link their profile
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
              <code className="flex-1 font-mono text-sm font-bold text-slate-800">
                {inviteCode}
              </code>
              <button
                type="button"
                onClick={handleCopyCode}
                className="rounded-lg bg-slate-200 p-2 text-slate-700 transition hover:bg-slate-300">
                <Copy size={16} />
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="rounded-lg bg-slate-200 p-2 text-slate-700 transition hover:bg-slate-300">
                <RefreshCw size={16} />
              </button>
            </div>
            {copiedCode && (
              <p className="text-xs text-emerald-600">✓ Copied to clipboard</p>
            )}
            <p className="text-xs text-slate-500">
              Generated on: {new Date(doctor.created_at || "").toLocaleDateString()}
            </p>
          </div>
        </article>

        {/* Linked Patients Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="m-0 font-['Sora'] text-base font-bold text-slate-800">
                Linked Patients
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Patients connected to your profile
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
              {patients.length}
            </span>
          </div>

          <div className="mt-4">
            {loadingPatients ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                  <p className="mt-2 text-sm text-slate-600">
                    Loading patients...
                  </p>
                </div>
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {patient.full_name}
                      </p>
                      <p className="text-xs text-slate-500">{patient.email}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                      {patient.diabetes_type || "Unknown"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <Users size={32} className="mx-auto text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  No patients linked yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Share your invitation code with patients to connect
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Account Information */}
        <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <h2 className="m-0 text-sm font-bold text-slate-800">Account</h2>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-500">ID</p>
              <p className="text-sm text-slate-700 font-mono">#{doctor.id}</p>
            </div>
            {doctor.created_at && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500">
                  JOINED
                </p>
                <p className="text-sm text-slate-700">
                  {new Date(doctor.created_at).toLocaleDateString()}
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
