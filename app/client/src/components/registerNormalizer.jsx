import React, { useState } from "react";

// AssetNormalizerUploader.jsx
// Single-file React component (Tailwind CSS assumed in the project).
// Usage: import AssetNormalizerUploader from './AssetNormalizerUploader'
// and render <AssetNormalizerUploader /> in your App.

export default function AssetNormalizerUploader() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [apiBase, setApiBase] = useState("http://localhost:8000");

    function handleFileChange(e) {
        setError(null);
        setResult(null);
        const f = e.target.files[0];
        setFile(f || null);
    }

    async function handleUpload(e) {
        e.preventDefault();
        setError(null);
        setResult(null);
        if (!file) {
            setError("Please choose a .xlsx or .csv file first.");
            return;
        }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);

            const resp = await fetch(`${apiBase.replace(/\/$/, "")}/normalize`, {
                method: "POST",
                body: fd,
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`Server error ${resp.status}: ${text}`);
            }

            const data = await resp.json();
            setResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }

    function downloadJSON() {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "normalized_assets.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-2">ICS Asset Register Uploader</h2>
                <p className="text-sm text-gray-500 mb-4">Upload an Excel (.xlsx/.xls) or CSV file exported from NetBox (or similar). This will be sent to the backend normalizer at <code className="bg-gray-100 px-1 rounded">{apiBase}/normalize</code>.</p>

                <label className="block mb-2 text-sm font-medium text-gray-700">Backend base URL</label>
                <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} className="w-full mb-4 border rounded px-3 py-2" />

                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Choose file</label>
                        <input accept=".xlsx,.xls,.csv" type="file" onChange={handleFileChange} className="mt-1" />
                    </div>

                    <div className="flex items-center gap-3">
                        <button type="submit" disabled={loading} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60">
                            {loading ? 'Uploading...' : 'Upload & Normalize'}
                        </button>

                        <button type="button" onClick={() => { setFile(null); setResult(null); setError(null); }} className="px-3 py-2 border rounded">
                            Reset
                        </button>

                        {result && (
                            <button type="button" onClick={downloadJSON} className="px-3 py-2 border rounded">
                                Download JSON
                            </button>
                        )}
                    </div>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">Error: {error}</div>
                )}

                {result && (
                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Normalized Result</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded shadow-sm">
                                <h4 className="font-semibold">Mappings ({result.mappings?.length || 0})</h4>
                                <div className="mt-2 max-h-72 overflow-auto text-xs">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.mappings || [], null, 2)}</pre>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded shadow-sm">
                                <h4 className="font-semibold">Topology edges ({result.topology_edges?.length || 0})</h4>
                                <div className="mt-2 max-h-72 overflow-auto text-xs">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.topology_edges || [], null, 2)}</pre>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 bg-white p-3 rounded shadow-sm">
                            <h4 className="font-semibold mb-2">Normalized Assets ({result.normalized_assets?.length || 0})</h4>
                            <div className="max-h-96 overflow-auto text-sm">
                                {result.normalized_assets && result.normalized_assets.length > 0 ? (
                                    <table className="min-w-full table-auto text-left text-xs">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-2 py-1">Name</th>
                                                <th className="px-2 py-1">Type</th>
                                                <th className="px-2 py-1">IP(s)</th>
                                                <th className="px-2 py-1">Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.normalized_assets.map((a) => (
                                                <tr key={a.asset_id} className="border-t">
                                                    <td className="px-2 py-1">{a.name}</td>
                                                    <td className="px-2 py-1">{a.type || '-'}</td>
                                                    <td className="px-2 py-1">{(a.ip_addresses || []).join(', ') || '-'}</td>
                                                    <td className="px-2 py-1">{a.confidence}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-gray-500">No assets found in normalized result.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <div className="mt-6 text-sm text-gray-500">
                <p>Tip: run your backend locally with <code className="bg-gray-100 px-1 rounded">uvicorn ics_normalizer_agent:app --reload --port 8000</code> and set the Backend base URL accordingly.</p>
            </div>
        </div>
    );
}
