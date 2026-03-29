import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AuthScreen from "./pages/authentification/authentificationpage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
//import { DoctorPage } from "./pages/doctor/DoctorPage";
//import { FoodPage } from "./pages/food/FoodPage";
import { TwinInsightsPage } from "./pages/insights/twin_insights";
//import { InsulinPage } from "./pages/insulin/InsulinPage";
import { RamadanPage } from "./pages/ramadan/RamadanPage";
import MealAnalysis from "./pages/mealScanner/MealAnalysis";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthScreen />} />
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/food"
          element={
            <ProtectedRoute>
              <MealAnalysis />
            </ProtectedRoute>
          }
        />
        {/*   <Route path="/insulin" element={<ProtectedRoute><InsulinPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute><DoctorPage /></ProtectedRoute>} /> */}
        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <TwinInsightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ramadan"
          element={
            <ProtectedRoute>
              <RamadanPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default App;
