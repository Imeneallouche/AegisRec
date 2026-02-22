import { Link } from "react-router-dom";
import { IconDashboard } from "../data/icons";

export default function Sidebar({ activeIndex = 0 }) {
    const nav = [
        { title: "Dashboard", Path: "/Dashboard" },
        { title: "Asset Register", Path: "/AssetRegister" },
        { title: "Asset Inventory", Path: "/AssetInventory" },
        { title: "Possible TTPs", Path: "/TTPs" },
        { title: "Mitigations", Path: "/Mitigations" },
        { title: "Alerts", Path: "/Alerts" },
        { title: "Log Monitoring", Path: "/Monitoring" },
        { title: "Settings", Path: "/Settings" },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-100 h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">
                        G
                    </div>
                    <div>
                        <div className="font-semibold">ICS Security</div>
                        <div className="text-xs text-slate-400">Admin Portal</div>
                    </div>
                </div>

                <nav className="space-y-2">
                    {nav.map((n, i) => (
                        <Link
                            to={n.Path}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${i === activeIndex ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                            <div className="p-2 rounded bg-white shadow-sm">
                                <IconDashboard />
                            </div>
                            <div className="text-sm">{n.title}</div>
                        </Link>
                    ))}
                </nav>

                <div className="mt-8 p-4 bg-slate-50 rounded-xl text-sm">
                    <div className="font-semibold mb-2">Do you need help?</div>
                    <div className="text-xs text-slate-500 mb-3">
                        You can contact us or refer to the attached documentation.
                    </div>
                    <button className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm">
                        View Documentation
                    </button>
                </div>
            </div>
        </aside>
    );
}
