"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FileText, 
  Stethoscope,
  LogOut 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function SideBar() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  const navItems = [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: LayoutDashboard, 
      roles: ["admin", "receptionist"] 
    },
    { 
      name: "Patients", 
      href: "/patients", 
      icon: Users, 
      roles: ["admin", "receptionist"] 
    },
     {
      name: "Therapists",
      href: "/therapists",
      icon: Stethoscope,
      roles: ["admin"]
    },

    { 
      name: "Schedule", 
      href: "/schedule", 
      icon: CalendarDays, 
      roles: ["admin", "receptionist"] 
    },
    { 
      name: "Billing", 
      href: "/billing", 
      icon: FileText, 
      roles: ["admin"] 
    },
  ];

  
  const allowedItems = navItems.filter((item) => 
    currentUser?.role ? item.roles.includes(currentUser.role.toLowerCase()) : false
  );

  return (
    <aside className="w-64 bg-secondary flex flex-col h-screen sticky top-0 border-r border-secondary-light">
      
      <div className="p-6 border-b border-secondary-light">
        <h1 className="font-display text-2xl font-bold text-surface tracking-tight">
          Physio<span className="text-primary">Desk</span>
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 font-body">
        {allowedItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-surface shadow-sm" 
                  : "text-surface/80 hover:bg-secondary-light hover:text-surface" 
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      
      <div className="p-4 border-t border-secondary-light font-body">
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold text-surface truncate">
            {currentUser?.full_name || "Clinic Staff"}
          </p>
          <p className="text-xs text-surface/60 capitalize mt-0.5">
            {currentUser?.role || "User"}
          </p>
        </div>
        
        <button 
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-surface/80 hover:bg-secondary-light hover:text-surface transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
