import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthPage } from "./pages/auth/AuthPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { DoctorPage } from "./pages/doctor/DoctorPage";
import { FoodPage } from "./pages/food/FoodPage";
import { InsightsPage } from "./pages/insights/InsightsPage";
import { InsulinPage } from "./pages/insulin/InsulinPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        {/* <Route path="/auth" element={<AuthPage />} /> */}
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* <Route path="/food" element={<FoodPage />} />
        <Route path="/insulin" element={<InsulinPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/doctor" element={<DoctorPage />} /> */}
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
