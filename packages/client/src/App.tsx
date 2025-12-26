import React from "react";
import { Routes, Route } from "react-router-dom";
import ROUTES from "@/utils/routes";

// import LandingPage from "@/pages/LandingPage";    // new file above
import LoginPage from "@/pages/auth/login"; // you already have this file
import RegisterPage from "@/pages/auth/register"; // if exists
import LandingPage from "./pages/landingPage";
import DashboardPage from "./pages/dashboard";
import ExpensesPage from "./pages/expenses";
import BudgetsPage from "./pages/budgets";
import CategoriesPage from "./pages/categories";
import DashboardLayout from "./layouts/dashboardLayout";
import ReportsPage from "./pages/reports";
// import Dashboard from "@/pages/dashboard";       // if exists

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      <Route path={ROUTES.DASHBOARD} element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} /> {/* /dashboard */}
        <Route path="expenses" element={<ExpensesPage />} />{" "}
        {/* /dashboard/expenses */}
        <Route path="budgets" element={<BudgetsPage />} />{" "}
        {/* /dashboard/budgets */}
        <Route path="categories" element={<CategoriesPage />} />
        {/* /dashboard/categories */}
        <Route path="reports" element={<ReportsPage />} /> /dashboard/reports
      </Route>

      {/* fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
