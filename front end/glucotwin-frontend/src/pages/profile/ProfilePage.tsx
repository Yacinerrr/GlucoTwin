import { useEffect, useState } from "react";
import { useAuth } from "../../context/Authcontext";
import { patientAPI, doctorAPI } from "../../services/api";
import PatientProfile from "./PatientProfile";
import DoctorProfile from "./DoctorProfile";
import { AlertTriangle } from "lucide-react";
import { AxiosError } from "axios";

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  role?: string;
}

export function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!user) {
          setError("User not found");
          return;
        }

        let data;
        if (user.role === "doctor") {
          data = await doctorAPI.getProfile();
        } else {
          data = await patientAPI.getProfile();
        }

        setProfileData(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        const axiosError = err as AxiosError<{ detail: string }>;
        setError(
          axiosError.response?.data?.detail || "Failed to load profile data",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProfileData();
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <section className="grid gap-3.5">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
            <p className="mt-3 text-sm text-slate-600">Loading profile...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="grid gap-3.5">
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle size={20} className="text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">Error loading profile</p>
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="grid gap-3.5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Please log in to view your profile.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3.5">
      {user.role === "doctor" && profileData ? (
        <DoctorProfile doctor={profileData} />
      ) : profileData ? (
        <PatientProfile patient={profileData} />
      ) : null}
    </section>
  );
}
