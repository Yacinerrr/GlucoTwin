import { User } from "lucide-react";
import { useAuth } from "../../context/Authcontext";
import { useCurrentPatient } from "../../context/CurrentPatientContext";

/**
 * Displays a banner showing the current patient being viewed.
 * Only displays for doctors when a patient is selected.
 * Can be added to any page to show context.
 */
export function PatientDataContextBanner() {
  const { user } = useAuth();
  const { currentPatient } = useCurrentPatient();

  if (user?.role !== "doctor" || !currentPatient) {
    return null;
  }

  return (
    <div className="mb-3.5 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
      <User size={14} className="text-blue-600" />
      <span className="text-xs font-semibold text-blue-900">
        Viewing: <span className="font-bold text-blue-700">{currentPatient.full_name}</span>
        {currentPatient.age && <span className="text-blue-600"> • Age {currentPatient.age}</span>}
      </span>
    </div>
  );
}
