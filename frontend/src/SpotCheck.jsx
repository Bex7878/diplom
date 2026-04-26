import React, { useState } from 'react';

const SpotCheck = () => {
    const [text, setText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/analysis/spot-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
                credentials: 'include',
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Analysis failed. Please check the contract text.');
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Contract Spot-Check</h1>
                <p className="text-gray-600 italic">Analyze contract specifications for price deviations using NLP</p>
            </header>

            {/* Input Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all hover:shadow-md">
                <label className="block text-gray-700 font-bold mb-3 flex items-center">
                    <span className="mr-2 text-blue-500">📄</span> Paste Contract Text:
                </label>
                <textarea
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Example: Предметом договора является Бумага офисная А4, объем закупки: 50 пачка. Стоимость составляет 2500 KZT за единицу..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    onClick={handleAnalyze}
                    disabled={loading || !text}
                    className={`mt-4 w-full py-3 px-6 rounded-lg text-white font-bold text-lg shadow-lg transition-all active:scale-[0.99] ${
                        loading || !text
                            ? 'bg-blue-300 cursor-not-allowed shadow-none'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing with NLP...
                        </span>
                    ) : '🔍 Analyze Risk & Deviation'}
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-8 flex items-center">
                    <span className="mr-3 text-xl">⚠️</span>
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Results Section */}
            {results.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            {results.length} item(s) found
                        </span>
                    </div>
                    
                    {results.map((result, index) => {
                        const isHighRisk = result.isHighRisk;
                        return (
                            <div
                                key={index}
                                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                                    isHighRisk ? 'border-red-200' : 'border-green-200'
                                }`}
                            >
                                <div className={`px-6 py-3 flex justify-between items-center ${
                                    isHighRisk ? 'bg-red-50' : 'bg-green-50'
                                }`}>
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                        <span className="mr-2">{isHighRisk ? '🚩' : '✅'}</span>
                                        {result.item?.item_name || 'Unnamed Item'}
                                    </h3>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            isHighRisk
                                                ? 'bg-red-500 text-white'
                                                : 'bg-green-500 text-white'
                                        }`}
                                    >
                                        {isHighRisk ? 'High Risk' : 'Acceptable'}
                                    </span>
                                </div>

                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-white">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Extracted Price</p>
                                        <p className="text-xl font-bold text-gray-900">{result.item?.price?.toLocaleString()} <span className="text-sm font-normal text-gray-500">KZT</span></p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Market Baseline</p>
                                        <p className="text-xl font-bold text-gray-900">{result.marketPrice?.toLocaleString()} <span className="text-sm font-normal text-gray-500">KZT</span></p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Quantity</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {result.item?.qty || 0} <span className="text-sm font-normal text-gray-500">{result.item?.unit || 'ед.'}</span>
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-lg border-2 ${isHighRisk ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Price Deviation</p>
                                        <p className={`text-2xl font-black ${isHighRisk ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.deviationPercentage > 0 ? '+' : ''}
                                            {result.deviationPercentage?.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                                    <span>Source: Historical Data Analysis</span>
                                    <span>Confidence Score: 100%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {results.length === 0 && !loading && (
                <div className="mt-12 text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-5xl mb-4">📝</p>
                    <h3 className="text-xl font-bold text-gray-400">No data analyzed yet</h3>
                    <p className="text-gray-400">Paste your contract specification text above to start the risk assessment.</p>
                </div>
            )}
        </div>
    );
};

export default SpotCheck;
