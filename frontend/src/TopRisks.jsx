import React, { useState, useEffect } from 'react';

const TopRisks = () => {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    const fetchTopRisks = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiUrl}/api/analysis/top-risks`, {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setRisks(data);
            } else {
                setRisks([]);
                console.error('Expected array but got:', data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopRisks();
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Top 10 High-Risk Deviations</h1>
                    <p className="text-gray-600">The most significant price anomalies detected across all contracts</p>
                </div>
                <button 
                    onClick={fetchTopRisks}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    🔄
                </button>
            </header>

            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <p className="text-red-700 font-medium">Error: {error}</p>
                </div>
            )}

            {!loading && !error && risks.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-4xl mb-4">🛡️</p>
                    <h3 className="text-xl font-bold text-gray-400">No risks detected yet</h3>
                </div>
            )}

            {!loading && Array.isArray(risks) && risks.length > 0 && (
                <div className="grid gap-4">
                    {risks.map((risk, index) => {
                        if (!risk) return null;
                        const item = risk.extractedItem;
                        const deviation = risk.deviationPercentage || 0;
                        const isExtreme = deviation > 100;

                        return (
                            <div 
                                key={risk.id || index}
                                className={`bg-white rounded-xl border-l-8 shadow-sm overflow-hidden flex items-center p-6 border-gray-200 ${
                                    isExtreme ? 'border-l-red-600' : 'border-l-orange-500'
                                }`}
                            >
                                <div className="flex-none w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 mr-6">
                                    #{index + 1}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                                        {item?.itemName || 'Unknown Product'}
                                    </h3>
                                    <div className="flex gap-4 text-xs text-gray-500 font-medium">
                                        <span>Price: <span className="text-gray-900">{item?.price ? item.price.toLocaleString() : 0} KZT</span></span>
                                        <span>Qty: <span className="text-gray-900">{item?.qty || 0} {item?.unit || ''}</span></span>
                                        {item?.contract?.bin && (
                                            <span>BIN: <span className="text-gray-900 font-mono">{item.contract.bin}</span></span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-none text-right ml-6">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Deviation</p>
                                    <p className={`text-3xl font-black ${isExtreme ? 'text-red-600' : 'text-orange-600'}`}>
                                        +{Number(deviation).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TopRisks;
