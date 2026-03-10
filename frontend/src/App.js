import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./lib/LanguageContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Pairs } from "./pages/Pairs";
import { Birds } from "./pages/Birds";
import { Zones } from "./pages/Zones";
import { Tasks } from "./pages/Tasks";
import { CalendarPage } from "./pages/Calendar";
import { Newborn } from "./pages/Newborn";
import { Contacts } from "./pages/Contacts";
import { Settings } from "./pages/Settings";
import { Reports } from "./pages/Reports";
import { Genealogy } from "./pages/Genealogy";
import { Seasons } from "./pages/Seasons";
import { PrintCards } from "./pages/PrintCards";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Loader2 } from "lucide-react";

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFC300]" />
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to home if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFC300]" />
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      
      {/* Protected Routes */}
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/pairs" element={<PrivateRoute><Layout><Pairs /></Layout></PrivateRoute>} />
      <Route path="/birds" element={<PrivateRoute><Layout><Birds /></Layout></PrivateRoute>} />
      <Route path="/genealogy" element={<PrivateRoute><Layout><Genealogy /></Layout></PrivateRoute>} />
      <Route path="/zones" element={<PrivateRoute><Layout><Zones /></Layout></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Layout><Tasks /></Layout></PrivateRoute>} />
      <Route path="/calendar" element={<PrivateRoute><Layout><CalendarPage /></Layout></PrivateRoute>} />
      <Route path="/newborn" element={<PrivateRoute><Layout><Newborn /></Layout></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>} />
      <Route path="/seasons" element={<PrivateRoute><Layout><Seasons /></Layout></PrivateRoute>} />
      <Route path="/print-cards" element={<PrivateRoute><Layout><PrintCards /></Layout></PrivateRoute>} />
      <Route path="/contacts" element={<PrivateRoute><Layout><Contacts /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
