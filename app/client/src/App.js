import "./App.css";
import Dashboard from "./pages/dashboard";
import AssetInventory from "./pages/assetInventory";
import TTPs from "./pages/ttps";
import Mitigations from "./pages/mitigations";
import Alerts from "./pages/alerts";
import { Routes, Route } from "react-router-dom";
import Monitoring from "./pages/monitoring";
import Settings from "./pages/settings";
import AssetRegister from "./pages/assetRegister";
import AIAssistant from "./pages/aiAssistant";

function App() {
  return (
    <div className="App min-h-screen">
      <Routes>
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
      </Routes>
    </div>
  );
}

export default App;