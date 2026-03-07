import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./lib/LanguageContext";
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

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pairs" element={<Pairs />} />
            <Route path="/birds" element={<Birds />} />
            <Route path="/genealogy" element={<Genealogy />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/newborn" element={<Newborn />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
