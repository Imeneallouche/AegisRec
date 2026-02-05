import Sidebar from '../components/sidebar';
import NetworkArchitectureDiagram from '../components/NetworkArchitectureDiagram';
import React from 'react';
import AssetUpload from '../components/AssetUpload';
import assetRegister from '../data/assetRegister';

const sampleAssetRegister = { ...assetRegister };
export default function AssetInventory() {
    const [assetRegisterState, setAssetRegister] = React.useState(sampleAssetRegister);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleFileUpload = (fileData) => {
        setIsLoading(true);
        try {
            // Parse JSON file
            const parsedData = JSON.parse(fileData);
            setAssetRegister(parsedData);
        } catch (error) {
            console.error('Error parsing asset register:', error);
            alert('Invalid JSON file. Please check the format.');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="h-screen bg-slate-50 text-slate-800">
            <div className="flex h-full">
                <Sidebar activeIndex={1} />

                <main className="flex-1 flex flex-col p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Asset Inventory</h1>
                            <p className="text-sm text-slate-500">
                                Network architecture of your ICS/OT Site
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-500 mr-4">Log out</div>
                            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg">
                                ICS Site name
                            </button>
                        </div>
                    </div>

                    {/* ✨ Growable Content */}
                    <div className="flex-1 flex flex-col bg-gray-50 rounded-lg p-4 overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">
                                        Loading asset register...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <NetworkArchitectureDiagram assetRegister={assetRegisterState} />
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="bg-white border-t border-gray-200 py-4 mt-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between text-sm text-gray-500">
                            <div>
                                <span className="font-semibold">
                                    {assetRegisterState.metadata.site_name}
                                </span>
                                • ICS Security Platform • Purdue Model Visualization
                            </div>
                            <div>
                                Last updated: {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>

    );
}
