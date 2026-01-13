import Sidebar from '../components/sidebar';

export default function AssetInventory() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <div className="flex">
                <Sidebar activeIndex={1}/>
                <main className="flex-1 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Asset Inventory</h1>
                            <p className="text-sm text-slate-500">Network architecture of your ICS/OT Site</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-500 mr-4">Log out</div>
                            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg">ICS Site name</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
