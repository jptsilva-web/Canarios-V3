import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bird, 
  Heart,
  Grid3X3,
  ListTodo,
  Calendar,
  Users,
  Settings,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Toaster } from './ui/sonner';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/zones', icon: Grid3X3, label: 'Zones & Cages' },
  { path: '/birds', icon: Bird, label: 'Birds' },
  { path: '/pairs', icon: Heart, label: 'Pairs' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
];

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#1A2035] flex">
      {/* Mobile Menu Button */}
      <button
        data-testid="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#202940] border border-white/10 text-white hover:border-[#FFC300]/50 transition-colors"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#202940] border-r border-white/5 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFC300] flex items-center justify-center">
              <Bird className="w-6 h-6 text-[#1A2035]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-['Barlow_Condensed'] tracking-wide">
                CANARY CONTROL
              </h1>
              <p className="text-xs text-slate-400">Breeding Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#FFC300]/15 text-[#FFC300] border-r-2 border-[#FFC300]" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
              location.pathname === '/settings'
                ? "text-[#FFC300] bg-[#FFC300]/15"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
            data-testid="nav-settings"
          >
            <Settings size={20} />
            <span className="text-sm">Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="p-4 lg:p-8 lg:pl-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#202940',
            color: '#E2E8F0',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  );
};
