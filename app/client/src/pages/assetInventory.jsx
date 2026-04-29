import Sidebar from '../components/sidebar';
import NetworkArchitectureDiagram from '../components/NetworkArchitectureDiagram';
import React from 'react';
import AssetUpload from '../components/AssetUpload';
import { useAuth } from '../context/AuthContext';

export default function AssetInventory() {
    const { assetRegister, authReady, refreshAssetRegister } = useAuth();
    const [assetRegisterState, setAssetRegisterState] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (assetRegister) {
            setAssetRegisterState(assetRegister);
        }
    }, [assetRegister]);

    React.useEffect(() => {
        if (authReady) {
            refreshAssetRegister();
        }
    }, [authReady, refreshAssetRegister]);

    const handleFileUpload = (fileData) => {
        setIsLoading(true);
        try {
            const parsedData = JSON.parse(fileData);
            setAssetRegisterState(parsedData);
        } catch (error) {
            console.error('Error parsing asset register:', error);
            alert('Invalid JSON file. Please check the format.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!authReady || !assetRegisterState) {
        return (
            <div className="h-screen bg-slate-50 text-slate-800">
                <div className="flex h-full">
                    <Sidebar />
                    <main className="flex flex-1 items-center justify-center p-8">
                        <div className="text-center text-slate-600 text-sm">
                            {!authReady ? 'Loading session…' : 'Loading asset register…'}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 text-slate-800">
            <div className="flex h-full">
                <Sidebar />
                <main className="flex-1 flex flex-col p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Asset Inventory</h1>
                            <p className="text-sm text-slate-500">
                                Network architecture of your ICS/OT Site
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <AssetUpload onUpload={handleFileUpload} />
                        </div>
                    </div>

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
                    <footer className="bg-white border-t border-gray-200 py-4 mt-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between text-sm text-gray-500">
                            <div>
                                <span className="font-semibold">
                                    {assetRegisterState.metadata?.site_name}
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
