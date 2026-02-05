// AssetUpload.jsx - File upload component
import React, { useCallback } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

const AssetUpload = ({ onUpload }) => {
    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            onUpload(e.target.result);
        };
        reader.readAsText(file);
    }, [onUpload]);

    return (
        <div className="relative">
            <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="asset-upload"
            />
            <label
                htmlFor="asset-upload"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
                <CloudArrowUpIcon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">Upload Asset Register</span>
            </label>
        </div>
    );
};

export default AssetUpload;