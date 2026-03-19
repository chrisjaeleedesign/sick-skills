"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Bell,
  Search,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Customers" },
  { icon: FileText, label: "Orders" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { label: "Total Revenue", value: "$48,290", change: "+12.5%", up: true },
  { label: "Active Users", value: "2,847", change: "+8.2%", up: true },
  { label: "Conversion Rate", value: "3.24%", change: "-0.4%", up: false },
  { label: "Avg. Order Value", value: "$64.50", change: "+2.1%", up: true },
];

const RECENT_ORDERS = [
  { id: "ORD-7291", customer: "Sarah Chen", amount: "$142.00", status: "Completed", date: "Mar 18" },
  { id: "ORD-7290", customer: "James Wilson", amount: "$89.50", status: "Processing", date: "Mar 18" },
  { id: "ORD-7289", customer: "Maria Garcia", amount: "$215.00", status: "Completed", date: "Mar 17" },
  { id: "ORD-7288", customer: "Alex Kim", amount: "$67.25", status: "Shipped", date: "Mar 17" },
  { id: "ORD-7287", customer: "Emma Davis", amount: "$198.00", status: "Completed", date: "Mar 16" },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-500/10 text-green-600",
  Processing: "bg-amber-500/10 text-amber-600",
  Shipped: "bg-blue-500/10 text-blue-600",
};

export default function ExampleDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <div className="flex h-[calc(100vh-57px)] bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-surface-0">
        <div className="p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Gallery
          </Link>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-surface-2 text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20" />
            <div>
              <p className="text-sm font-medium text-text-primary">Jane Doe</p>
              <p className="text-[11px] text-text-tertiary">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-8 py-4">
          <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-1.5">
              <Search className="h-4 w-4 text-text-tertiary" />
              <span className="text-sm text-text-tertiary">Search...</span>
            </div>
            <button className="relative rounded-md p-2 hover:bg-surface-2 transition-colors">
              <Bell className="h-4 w-4 text-text-secondary" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card p-5"
              >
                <p className="text-xs font-medium text-text-tertiary">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{stat.value}</p>
                <div className="mt-2 flex items-center gap-1">
                  {stat.up ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      stat.up ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-text-tertiary">vs last month</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent orders table */}
          <div className="mt-8 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-text-primary">Recent Orders</h2>
              <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View all
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary">Order</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary">Customer</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary">Amount</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary">Date</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0 hover:bg-surface-1 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm font-mono text-text-secondary">{order.id}</td>
                    <td className="px-5 py-3 text-sm text-text-primary">{order.customer}</td>
                    <td className="px-5 py-3 text-sm font-medium text-text-primary">{order.amount}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.status] ?? "bg-surface-2 text-text-secondary"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-tertiary">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
