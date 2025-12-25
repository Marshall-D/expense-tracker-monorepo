// src/layouts/DashboardLayout.tsx
import React from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import ROUTES from "@/utils/routes";
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  Tags,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", to: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: "Expenses", to: ROUTES.EXPENSES, icon: ReceiptText },
  { name: "Categories", to: ROUTES.CATEGORIES, icon: Tags },
  { name: "Budgets", to: ROUTES.BUDGETS, icon: Wallet },
  { name: "Reports", to: ROUTES.REPORTS, icon: BarChart3 },
];

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 hidden md:flex flex-col sticky top-0 h-screen bg-card/30 backdrop-blur-md">
        <div className="p-6">
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight text-xl">LuxeSpend</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            asChild
          >
            <Link to={ROUTES.LOGIN}>
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-8 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
          <h2 className="text-lg font-semibold md:hidden flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            LuxeSpend
          </h2>
          <div className="md:block hidden">
            <p className="text-sm text-muted-foreground">
              Welcome back, John Doe
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" className="rounded-full px-4">
              Add Expense
            </Button>
          </div>
        </header>

        <main className="p-8 overflow-y-auto">
          {/* Outlet will render the active dashboard page */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
