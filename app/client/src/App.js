import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/dashboard";
import AssetInventory from "./pages/assetInventory";
import TTPs from "./pages/ttps";
import Mitigations from "./pages/mitigations";
import Alerts from "./pages/alerts";
import Monitoring from "./pages/monitoring";
import Settings from "./pages/settings";
import AssetRegister from "./pages/assetRegister";
import AIAssistant from "./pages/aiAssistant";
import Documentation from "./pages/documentation";
import Login from "./pages/login";
import ProtectedRoute from "./components/ProtectedRoute";

import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { EngineProvider } from "./context/EngineContext";

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <EngineProvider>
          <div className="App min-h-screen">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/AssetRegister" element={<AssetRegister />} />
                <Route path="/AssetInventory" element={<AssetInventory />} />
                <Route path="/TTPs" element={<TTPs />} />
                <Route path="/Mitigations" element={<Mitigations />} />
                <Route path="/Alerts" element={<Alerts />} />
                <Route path="/Monitoring" element={<Monitoring />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/AIAssistant" element={<AIAssistant />} />
                <Route path="/Documentation" element={<Documentation />} />
              </Route>
              <Route path="*" element={<Navigate to="/Dashboard" replace />} />
            </Routes>
          </div>
        </EngineProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
