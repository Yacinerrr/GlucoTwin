import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import  AuthScreen from "./pages/authentification/authentificationpage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
//import { DoctorPage } from "./pages/doctor/DoctorPage";
//import { FoodPage } from "./pages/food/FoodPage";
import { TwinInsightsPage } from "./pages/insights/twin_insights";
//import { InsulinPage } from "./pages/insulin/InsulinPage";
import { RamadanPage } from "./pages/ramadan/RamadanPage";
import MealAnalysis from "./pages/mealScanner/MealAnalysis";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
         <Route path="/auth" element={<AuthScreen />} /> 
        <Route path="/dashboard" element={<DashboardPage />} />
       < Route path="/food" element={<MealAnalysis />} />
     {/*   <Route path="/insulin" element={<InsulinPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/doctor" element={<DoctorPage />} /> */}
        <Route path="/insights" element={<TwinInsightsPage />} />
        <Route path="/ramadan" element={<RamadanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
