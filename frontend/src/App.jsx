import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import Hindrances from "./pages/Hindrances";
import Drawings from "./pages/Drawings";
import Concrete from "./pages/Concrete";
import PlanVsActual from "./pages/PlanVsActual";
import Manpower from "./pages/Manpower";
import Cashflow from "./pages/Cashflow";
import PrivateRoute from "./utils/PrivateRoute";

// New pages
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Layout from "./components/Layout"; // Your layout with Navbar

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages without Navbar */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* All other pages wrapped inside Layout (with Navbar) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          {/* Protected Dashboard Pages */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="hindrances" element={<Hindrances />} />
            <Route path="drawings" element={<Drawings />} />
            <Route path="concrete" element={<Concrete />} />
            <Route path="plan-actual" element={<PlanVsActual />} />
            <Route path="manpower" element={<Manpower />} />
            <Route path="cashflow" element={<Cashflow />} />
          </Route>
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
