import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SpotCheck = () => {
    const [mode, setMode] = useState('text'); // 'text' | 'lot'

    // Text analysis state
    const [text, setText] = useState('');
    const [results, setResults] = useState([]);

    // Lot analysis state
    const [lotId, setLotId] = useState('');
    const [lotResult, setLotResult] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [threshold, setThreshold] = useState(localStorage.getItem('userRiskThreshold') || '20');
    const [exporting, setExporting] = useState(false);

    const textResultsRef = useRef(null);
    const lotResultRef = useRef(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    const handleThresholdChange = (e) => {
        const value = e.target.value;
        setThreshold(value);
        localStorage.setItem('userRiskThreshold', value);
    };

    const handleAnalyzeText = async () => {
        setLoading(true);
        setError(null);
        setResults([]);
        try {
            const response = await fetch(`${apiUrl}/api/analysis/spot-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, threshold: parseFloat(threshold) }),
                credentials: 'include',
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) throw new Error('Analysis failed. Please check the contract text.');

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeLot = async () => {
        if (!lotId.trim()) return;
        setLoading(true);
        setError(null);
        setLotResult(null);
        try {
            const params = new URLSearchParams({ lotId: lotId.trim(), threshold: parseFloat(threshold) });
            const response = await fetch(`${apiUrl}/api/analysis/analyze-lot?${params}`, {
                credentials: 'include',
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Lot analysis failed.');

            setLotResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async (ref, filename) => {
        if (!ref.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(ref.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const scaledHeight = (canvas.height * pageWidth) / canvas.width;

            let heightLeft = scaledHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight);
            heightLeft -= pageHeight;
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(filename);
        } finally {
            setExporting(false);
        }
    };

    const handleModeSwitch = (newMode) => {
        setMode(newMode);
        setError(null);
        setResults([]);
        setLotResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Contract Spot-Check</h1>
                <p className="text-gray-600 italic">Analyze procurement data for price deviations</p>
            </header>

            {/* Mode Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button
                    onClick={() => handleModeSwitch('text')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                        mode === 'text'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📄 Text Analysis (NLP)
                </button>
                <button
                    onClick={() => handleModeSwitch('lot')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                        mode === 'lot'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    🔎 Lot ID Lookup (Goszakup)
                </button>
            </div>

            {/* Sensitivity Settings */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-blue-800 flex items-center">
                        <span className="mr-2">⚙️</span> Risk Threshold:
                    </label>
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black rounded-md">
                        {threshold}% Deviation
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={threshold}
                    onChange={handleThresholdChange}
                    className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-blue-400 mt-1 uppercase font-bold tracking-tighter">
                    <span>Strict (1%)</span>
                    <span>Lenient (100%)</span>
                </div>
            </div>

            {/* ── TEXT MODE ── */}
            {mode === 'text' && (
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
                        onClick={handleAnalyzeText}
                        disabled={loading || !text}
                        className={`mt-4 w-full py-3 px-6 rounded-lg text-white font-bold text-lg shadow-lg transition-all active:scale-[0.99] ${
                            loading || !text
                                ? 'bg-blue-300 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                        }`}
                    >
                        {loading ? <LoadingSpinner label="Analyzing with NLP..." /> : '🔍 Analyze Risk & Deviation'}
                    </button>
                </div>
            )}

            {/* ── LOT ID MODE ── */}
            {mode === 'lot' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all hover:shadow-md">
                    <label className="block text-gray-700 font-bold mb-3 flex items-center">
                        <span className="mr-2 text-blue-500">🆔</span> Goszakup Lot ID:
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                            placeholder="e.g. 123456789"
                            value={lotId}
                            onChange={(e) => setLotId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !loading && lotId.trim() && handleAnalyzeLot()}
                        />
                        <button
                            onClick={handleAnalyzeLot}
                            disabled={loading || !lotId.trim()}
                            className={`px-6 py-3 rounded-lg text-white font-bold shadow-lg transition-all active:scale-[0.99] ${
                                loading || !lotId.trim()
                                    ? 'bg-blue-300 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                            }`}
                        >
                            {loading ? <LoadingSpinner label="" /> : '🔍 Analyze'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Retrieves the parsed lot from the database and compares its unit price with market indicators.
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-8 flex items-center">
                    <span className="mr-3 text-xl">⚠️</span>
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* ── LOT RESULT ── */}
            {lotResult && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800">Analysis Result</h2>
                        <button
                            onClick={() => handleExportPdf(lotResultRef, `lot-${lotResult.lotId || 'result'}.pdf`)}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-lg shadow transition-all active:scale-95"
                        >
                            {exporting ? <LoadingSpinner label="Exporting..." /> : '⬇️ Export PDF'}
                        </button>
                    </div>
                    <div ref={lotResultRef}>
                        <LotResultCard result={lotResult} threshold={parseFloat(threshold)} />
                    </div>
                </div>
            )}

            {/* ── TEXT RESULTS ── */}
            {results.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {results.length} item(s) found
                            </span>
                        </div>
                        <button
                            onClick={() => handleExportPdf(textResultsRef, 'text-analysis-results.pdf')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-lg shadow transition-all active:scale-95"
                        >
                            {exporting ? <LoadingSpinner label="Exporting..." /> : '⬇️ Export PDF'}
                        </button>
                    </div>

                    <div ref={textResultsRef} className="space-y-6">
                    {results.map((result, index) => {
                        const isHighRisk = result.isHighRisk;
                        const sourceLabel = result.marketSource === 'market_indicator'
                            ? '📊 Market Indicator'
                            : '📈 Historical Average';
                        return (
                            <div
                                key={index}
                                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                                    isHighRisk ? 'border-red-200' : 'border-green-200'
                                }`}
                            >
                                <div className={`px-6 py-3 flex justify-between items-center ${isHighRisk ? 'bg-red-50' : 'bg-green-50'}`}>
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                        <span className="mr-2">{isHighRisk ? '🚩' : '✅'}</span>
                                        {result.item?.item_name || 'Unnamed Item'}
                                    </h3>
                                    <RiskBadge isHighRisk={isHighRisk} />
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-white">
                                    <StatBox label="Extracted Price" value={`${result.item?.price?.toLocaleString()} KZT`} />
                                    <StatBox label="Market Baseline" value={`${result.marketPrice?.toLocaleString()} KZT`} />
                                    <StatBox label="Quantity" value={`${result.item?.qty || 0} ${result.item?.unit || 'ед.'}`} />
                                    <DeviationBox deviation={result.deviationPercentage} isHighRisk={isHighRisk} />
                                </div>
                                {result.allIndicators?.length > 0 && (
                                    <IndicatorsTable indicators={result.allIndicators} />
                                )}
                                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                        result.marketSource === 'market_indicator'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>{sourceLabel}</span>
                                    <span>Confidence Score: 100%</span>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {results.length === 0 && !lotResult && !loading && !error && (
                <div className="mt-12 text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-5xl mb-4">{mode === 'lot' ? '🔎' : '📝'}</p>
                    <h3 className="text-xl font-bold text-gray-400">No data analyzed yet</h3>
                    <p className="text-gray-400">
                        {mode === 'lot'
                            ? 'Enter a Goszakup lot ID above to start the risk assessment.'
                            : 'Paste your contract specification text above to start the risk assessment.'}
                    </p>
                </div>
            )}
        </div>
    );
};

/* ── Sub-components ── */

const LoadingSpinner = ({ label }) => (
    <span className="flex items-center justify-center">
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {label}
    </span>
);

const RiskBadge = ({ isHighRisk }) => (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
        isHighRisk ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`}>
        {isHighRisk ? 'High Risk' : 'Acceptable'}
    </span>
);

const StatBox = ({ label, value }) => (
    <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
);

const SOURCE_LABELS = {
    MANUAL: 'Manual Input',
    API: 'External API',
    IMPORT: 'File Import',
    SYSTEM: 'System',
    AMAZON: 'Amazon',
    KASPI: 'Kaspi',
};

const IndicatorsTable = ({ indicators }) => (
    <div className="px-6 pb-4 bg-white">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            All Market Indicators ({indicators.length})
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase font-bold">
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Source</th>
                        <th className="px-4 py-2 text-right">Price (KZT)</th>
                        <th className="px-4 py-2 text-right">Deviation</th>
                        <th className="px-4 py-2 text-center">Risk</th>
                    </tr>
                </thead>
                <tbody>
                    {indicators.map((ind, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-2">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                                    {SOURCE_LABELS[ind.source] || ind.source}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-gray-800">
                                {ind.price?.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right font-bold ${ind.isHighRisk ? 'text-red-600' : 'text-green-600'}`}>
                                {ind.deviation > 0 ? '+' : ''}{ind.deviation?.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ind.isHighRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {ind.isHighRisk ? 'High' : 'OK'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const DeviationBox = ({ deviation, isHighRisk }) => (
    <div className={`p-3 rounded-lg border-2 ${isHighRisk ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
        <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Price Deviation</p>
        <p className={`text-2xl font-black ${isHighRisk ? 'text-red-600' : 'text-green-600'}`}>
            {deviation > 0 ? '+' : ''}{deviation?.toFixed(1)}%
        </p>
    </div>
);

const LotResultCard = ({ result }) => {
    const isHighRisk = result.isHighRisk;
    const sourceLabel = result.marketSource === 'market_indicator'
        ? '📊 Market Indicator'
        : '📈 Historical Average';

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 ${
            isHighRisk ? 'border-red-200' : 'border-green-200'
        }`}>
            {/* Header */}
            <div className={`px-6 py-4 flex justify-between items-start ${isHighRisk ? 'bg-red-50' : 'bg-green-50'}`}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{isHighRisk ? '🚩' : '✅'}</span>
                        <h3 className="text-lg font-bold text-gray-800">{result.truName}</h3>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">ID: {result.lotId}</span>
                        {result.customerBin && (
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">BIN: {result.customerBin}</span>
                        )}
                    </div>
                </div>
                <RiskBadge isHighRisk={isHighRisk} />
            </div>

            {/* Stats grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white">
                <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Lot Unit Price</p>
                    <p className="text-xl font-bold text-gray-900">
                        {Number(result.unitPrice)?.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">KZT</span>
                    </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Market Baseline</p>
                    <p className="text-xl font-bold text-gray-900">
                        {result.marketPrice?.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">KZT</span>
                    </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Quantity</p>
                    <p className="text-xl font-bold text-gray-900">
                        {Number(result.quantity)?.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">{result.unit || 'ед.'}</span>
                    </p>
                </div>
                <DeviationBox deviation={result.deviationPercentage} isHighRisk={isHighRisk} />
            </div>

            {result.allIndicators?.length > 0 && (
                <IndicatorsTable indicators={result.allIndicators} />
            )}

            {/* Total sum row */}
            {result.totalSum != null && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-semibold">
                        Total Sum: <span className="text-gray-800 font-bold">{Number(result.totalSum)?.toLocaleString()} KZT</span>
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        result.marketSource === 'market_indicator'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}>
                        {sourceLabel}
                    </span>
                </div>
            )}
        </div>
    );
};

export default SpotCheck;
