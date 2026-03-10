import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bird, 
  Heart,
  Grid3X3,
  ListTodo,
  Calendar,
  Baby,
  Users,
  Settings,
  Menu,
  X,
  ChevronRight,
  BarChart3,
  GitBranch,
  Globe,
  CalendarDays,
  Printer,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Toaster } from './ui/sonner';
import { useLanguage, languages } from '../lib/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import api from '../lib/api';

const getNavItems = (t, activeYear) => [
  { path: '/seasons', icon: CalendarDays, label: `${t('seasons.season') || 'Época'} ${activeYear || new Date().getFullYear()}`, key: 'seasons' },
  { path: '/', icon: LayoutDashboard, label: t('nav.dashboard'), key: 'dashboard' },
  { path: '/zones', icon: Grid3X3, label: t('nav.zones'), key: 'zones' },
  { path: '/birds', icon: Bird, label: t('nav.birds'), key: 'birds' },
  { path: '/genealogy', icon: GitBranch, label: t('nav.familyTree'), key: 'family-tree' },
  { path: '/pairs', icon: Heart, label: t('nav.pairs'), key: 'pairs' },
  { path: '/tasks', icon: ListTodo, label: t('nav.tasks'), key: 'tasks' },
  { path: '/calendar', icon: Calendar, label: t('nav.calendar'), key: 'calendar' },
  { path: '/newborn', icon: Baby, label: t('nav.newborn'), key: 'newborn' },
  { path: '/reports', icon: BarChart3, label: t('nav.reports'), key: 'reports' },
  { path: '/print-cards', icon: Printer, label: t('printCards.title'), key: 'print-cards' },
  { path: '/contacts', icon: Users, label: t('nav.contacts'), key: 'contacts' },
];

const getSettingsItem = (t) => ({ path: '/settings', icon: Settings, label: t('nav.settings'), key: 'settings' });

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langPopoverOpen, setLangPopoverOpen] = useState(false);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  
  // Fetch active season year
  useEffect(() => {
    const fetchActiveSeason = async () => {
      try {
        const response = await api.get('/seasons/active');
        if (response.data && response.data.year) {
          setActiveYear(response.data.year);
        }
      } catch (error) {
        console.error('Error fetching active season:', error);
      }
    };
    fetchActiveSeason();
  }, []);
  
  const navItems = getNavItems(t, activeYear);
  const settingsItem = getSettingsItem(t);
  const currentLang = languages.find(l => l.code === language);

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

      {/* Language Selector - Fixed top right */}
      <Popover open={langPopoverOpen} onOpenChange={setLangPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            data-testid="language-selector"
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#202940] border border-white/10 text-white hover:border-[#FFC300]/50 transition-colors"
          >
            <img 
              src={currentLang?.flag} 
              alt={currentLang?.name}
              className="w-6 h-6 rounded-full object-cover ring-2 ring-white/20"
            />
            <span className="text-sm hidden sm:inline">{currentLang?.name}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-2 bg-[#202940] border-white/10"
          align="end"
        >
          <div className="space-y-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                data-testid={`lang-${lang.code}`}
                onClick={() => {
                  changeLanguage(lang.code);
                  setLangPopoverOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  language === lang.code
                    ? "bg-[#FFC300]/15 text-[#FFC300]"
                    : "text-white hover:bg-white/5"
                )}
              >
                <img 
                  src={lang.flag} 
                  alt={lang.name}
                  className={cn(
                    "w-6 h-6 rounded-full object-cover ring-2",
                    language === lang.code ? "ring-[#FFC300]" : "ring-white/20"
                  )}
                />
                <span>{lang.name}</span>
                {language === lang.code && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

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
                {t('app.title').toUpperCase()}
              </h1>
              <p className="text-xs text-slate-400">{t('app.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex flex-col h-[calc(100vh-100px)]">
          <div className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.key}`}
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
          </div>
          
          {/* Settings at the bottom */}
          <div className="pt-4 border-t border-white/5 space-y-1">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#FFC300]/20 flex items-center justify-center">
                  <User size={16} className="text-[#FFC300]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
            
            <NavLink
              to={settingsItem.path}
              data-testid={`nav-${settingsItem.key}`}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === settingsItem.path 
                  ? "bg-[#FFC300]/15 text-[#FFC300] border-r-2 border-[#FFC300]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <settingsItem.icon size={20} />
              <span>{settingsItem.label}</span>
              {location.pathname === settingsItem.path && <ChevronRight size={16} className="ml-auto" />}
            </NavLink>
            
            {/* Logout button */}
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full"
            >
              <LogOut size={20} />
              <span>{t('auth.logout') || 'Sair'}</span>
            </button>
          </div>
        </nav>
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
