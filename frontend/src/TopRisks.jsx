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
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopRisks();
    }, []);

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Page Header */}
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-indigo-100">
                            Anomaly Detection
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Risk Intelligence</h1>
                    <p className="text-slate-500 font-medium max-w-xl">
                        Advanced monitoring of price deviations. The system identifies anomalies based on historical market baselines.
                    </p>
                </div>
                <button 
                    onClick={fetchTopRisks}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                >
                    <span className="block group-hover:rotate-180 transition-transform duration-500">🔄</span>
                </button>
            </header>

            {loading ? (
                <div className="grid gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 premium-card animate-pulse bg-slate-100/50" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-800">
                    <span className="text-2xl">⚠️</span>
                    <p className="font-semibold">{error}</p>
                </div>
            ) : risks.length === 0 ? (
                <div className="text-center py-24 premium-card border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🛡️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No Risk Data Found</h3>
                    <p className="text-slate-400 mt-2">Historical scan is complete. No significant anomalies detected.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {risks.map((risk, index) => {
                        const item = risk.extractedItem;
                        const deviation = risk.deviationPercentage || 0;
                        const isExtreme = deviation > 100;

                        return (
                            <div key={risk.id || index} className="premium-card group">
                                <div className="flex items-center p-6 gap-8">
                                    {/* Risk Score Icon */}
                                    <div className={`flex-none w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-colors ${
                                        isExtreme ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        <span className="text-[10px] font-black uppercase">Level</span>
                                        <span className="text-xl font-bold">{isExtreme ? 'H' : 'M'}</span>
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 truncate">
                                                {item?.itemName || 'Operational Item'}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase tracking-tighter">
                                                ID: {risk.id || index}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contract Price</p>
                                                <p className="text-sm font-bold text-slate-700">{item?.price?.toLocaleString()} <span className="text-slate-400 font-medium">KZT</span></p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Quantity</p>
                                                <p className="text-sm font-bold text-slate-700">{item?.qty || 0} <span className="text-slate-400 font-medium">{item?.unit || 'unit'}</span></p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Business Unit (BIN)</p>
                                                <p className="text-sm font-bold text-indigo-600 font-mono">{item?.contract?.bin || '---'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Action */}
                                    <div className="flex-none text-right flex flex-col items-end gap-2">
                                        <div className={`px-4 py-2 rounded-xl border flex flex-col items-end ${
                                            isExtreme 
                                                ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                                : 'bg-amber-50 border-amber-100 text-amber-700'
                                        }`}>
                                            <span className="text-[10px] font-black uppercase leading-none mb-1">Deviation</span>
                                            <span className="text-2xl font-black leading-none tracking-tight">
                                                +{Number(deviation).toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold italic">Requires immediate audit</span>
                                    </div>
                                </div>
                                
                                {/* Hover Disclosure Area */}
                                <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500 border-t border-slate-50 px-6 bg-slate-50/30">
                                    <div className="py-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>System Analysis complete</span>
                                        <button className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                                            View Source Documents <span className="text-xs">→</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <footer className="p-8 bg-indigo-900 rounded-3xl text-white relative overflow-hidden shadow-xl shadow-indigo-900/20">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold">Audit Recommendation</h4>
                        <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
                            These anomalies are calculated against a multi-source market matrix. 
                            We recommend initiating a formal price verification for all items with <strong>H-Level</strong> risks.
                        </p>
                    </div>
                    <button className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-2xl shadow-lg shadow-black/10 hover:scale-105 transition-transform">
                        Generate Report
                    </button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-50%] left-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            </footer>
        </div>
    );
};

export default TopRisks;
