import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use a more robust way to set the worker for pdfjs-dist 5.x
try {
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
} catch (e) {
    console.error('Failed to set pdf.js worker:', e);
}

/* ── Sub-components (Updated with minimal Deviator style) ── */

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
    <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
        isHighRisk 
            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    }`}>
        {isHighRisk ? '🚩 High Risk' : '✅ Compliant'}
    </span>
);

const StatBox = ({ label, value }) => (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-lg font-bold text-slate-900 leading-none">{value || '—'}</p>
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
    <div className="px-8 pb-8 animate-in fade-in duration-500">
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price (KZT)</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Deviation</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(indicators || []).map((ind, i) => (
                        <tr key={i} className="group hover:bg-white transition-colors">
                            <td className="px-6 py-3 text-slate-300 font-mono text-[10px] font-black">{i + 1}</td>
                            <td className="px-6 py-3">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100">
                                    {SOURCE_LABELS[ind.source] || ind.source}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right font-black text-slate-900 text-sm">
                                {ind.price?.toLocaleString()}
                            </td>
                            <td className={`px-6 py-3 text-right font-bold text-sm ${ind.isHighRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {ind.deviation > 0 ? '+' : ''}{ind.deviation?.toFixed(1)}%
                            </td>
                            <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${ind.isHighRisk ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${
        isHighRisk 
            ? 'bg-rose-50 border-rose-100 hover:bg-rose-100/50' 
            : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50'
    }`}>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">Price Deviation</p>
        <p className={`text-2xl font-black leading-none ${isHighRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
            {(deviation || 0) > 0 ? '+' : ''}{(deviation || 0).toFixed(1)}%
        </p>
    </div>
);

const LotResultCard = ({ result }) => {
    if (!result) return null;
    const isHighRisk = result.isHighRisk;
    const sourceLabel = result.marketSource === 'market_indicator'
        ? '📊 Market Indicator'
        : '📈 Historical Average';

    return (
        <div className={`bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-5px_rgba(0,0,0,0.02)] border overflow-hidden transition-all duration-300 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.04)] ${
            isHighRisk ? 'border-rose-200' : 'border-emerald-200'
        }`}>
            <div className={`px-8 py-6 flex justify-between items-start ${isHighRisk ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{isHighRisk ? '🚩' : '✅'}</span>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{result.truName}</h3>
                    </div>
                    <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="bg-white/50 px-2 py-1 rounded-lg border border-slate-100">ID: {result.lotId}</span>
                        {result.customerBin && (
                            <span className="bg-white/50 px-2 py-1 rounded-lg border border-slate-100">BIN: {result.customerBin}</span>
                        )}
                    </div>
                </div>
                <RiskBadge isHighRisk={isHighRisk} />
            </div>

            <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white">
                <StatBox label="Lot Unit Price" value={`${Number(result.unitPrice || 0).toLocaleString()} KZT`} />
                <StatBox label="Market Baseline" value={`${(result.marketPrice || 0).toLocaleString()} KZT`} />
                <StatBox label="Quantity" value={`${Number(result.quantity || 0).toLocaleString()} ${result.unit || 'ед.'}`} />
                <DeviationBox deviation={result.deviationPercentage} isHighRisk={isHighRisk} />
            </div>

            {result.allIndicators?.length > 0 && (
                <IndicatorsTable indicators={result.allIndicators} />
            )}

            {result.totalSum != null && (
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        Total Valuation: <span className="text-indigo-600 font-black ml-2 text-base">{Number(result.totalSum).toLocaleString()} KZT</span>
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        result.marketSource === 'market_indicator'
                            ? 'bg-white text-indigo-600 border-indigo-100 shadow-sm'
                            : 'bg-white text-amber-600 border-amber-100 shadow-sm'
                    }`}>{sourceLabel}</span>
                </div>
            )}
        </div>
    );
};

/* ── Main Component ── */

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

    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadedFromHistory, setLoadedFromHistory] = useState(false);

    const textResultsRef = useRef(null);
    const lotResultRef = useRef(null);
    const fileInputRef = useRef(null);
    const [draftSaved, setDraftSaved] = useState(false);
    const [fileStatus, setFileStatus] = useState({ state: 'idle', name: '' });

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    // Load draft on mount
    useEffect(() => {
        const saved = localStorage.getItem('spotcheck_draft');
        if (saved) setText(saved);
    }, []);

    // Auto-save draft with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text && text.trim()) {
                localStorage.setItem('spotcheck_draft', text);
                setDraftSaved(true);
                setTimeout(() => setDraftSaved(false), 2000);
            } else {
                localStorage.removeItem('spotcheck_draft');
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [text]);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/analysis/contracts`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setHistory(data.sort((a, b) => (b.id || 0) - (a.id || 0)));
                }
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const loadHistoryItem = async (item) => {
        if (!item || !item.id) return;
        setLoading(true);
        setError(null);
        setResults([]);
        setLoadedFromHistory(true);
        setShowHistory(false);
        try {
            const response = await fetch(`${apiUrl}/api/analysis/contracts/${item.id}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load history details.');
            const data = await response.json();
            
            setText(item.originalText || '');
            setThreshold(item.threshold?.toString() || '20');
            if (Array.isArray(data)) {
                setResults(data);
            } else {
                setResults([]);
            }
        } catch (err) {
            setError(err.message);
            setLoadedFromHistory(false);
        } finally {
            setLoading(false);
        }
    };

    const handleThresholdChange = (e) => {
        const value = e.target.value;
        setThreshold(value);
        localStorage.setItem('userRiskThreshold', value);
    };

    const handleAnalyzeText = async () => {
        if (!text || !text.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);
        setLoadedFromHistory(false);
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
            if (Array.isArray(data)) {
                setResults(data);
            } else {
                setResults([]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeLot = async () => {
        if (!lotId || !lotId.trim()) return;
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
        if (!ref || !ref.current) return;
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
        } catch (err) {
            console.error('PDF Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    const parseFile = async (file) => {
        if (!file) return;
        const isPdf = file.type === 'application/pdf';
        const isDocx = file.name.endsWith('.docx') ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (!isPdf && !isDocx) {
            setFileStatus({ state: 'error', name: file.name, msg: 'Only PDF and DOCX files are supported.' });
            return;
        }

        setFileStatus({ state: 'parsing', name: file.name });
        try {
            const arrayBuffer = await file.arrayBuffer();
            let extracted = '';

            if (isPdf) {
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    extracted += content.items.map(item => item.str).join(' ') + '\n';
                }
            } else {
                const result = await mammoth.extractRawText({ arrayBuffer });
                extracted = result.value;
            }

            setText((extracted || '').trim());
            setFileStatus({ state: 'done', name: file.name });
        } catch (err) {
            console.error('File parsing failed:', err);
            setFileStatus({ state: 'error', name: file.name, msg: 'Failed to parse file. Try copying the text manually.' });
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) parseFile(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
        e.target.value = '';
    };

    const handleModeSwitch = (newMode) => {
        setMode(newMode);
        setError(null);
        setResults([]);
        setLotResult(null);
        setFileStatus({ state: 'idle', name: '' });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-1 bg-indigo-600 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Analytical Tool</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight text-gray-800">Intelligence Spot-Check</h1>
                </div>
                <button
                    onClick={() => { setShowHistory(true); fetchHistory(); }}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                    📜 History
                </button>
            </header>

            {/* Mode Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200 shadow-inner max-w-2xl mx-auto">
                <button
                    onClick={() => handleModeSwitch('text')}
                    className={`flex-1 py-3 px-6 rounded-[1.5rem] text-sm font-black transition-all ${
                        mode === 'text'
                            ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    📄 Text Analysis
                </button>
                <button
                    onClick={() => handleModeSwitch('lot')}
                    className={`flex-1 py-3 px-6 rounded-[1.5rem] text-sm font-black transition-all ${
                        mode === 'lot'
                            ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    🔎 Lot Lookup
                </button>
            </div>

            {/* Sensitivity Settings */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            <span className="mr-2">⚙️</span> Sensitivity Matrix:
                        </label>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase">
                            {threshold}% Threshold
                        </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={threshold}
                        onChange={handleThresholdChange}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[8px] font-black text-slate-300 mt-2 uppercase tracking-widest">
                        <span>Strict Monitoring</span>
                        <span>High Tolerance</span>
                    </div>
                </div>
            </div>

            {/* ── TEXT MODE ── */}
            {mode === 'text' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.02)] transition-all">
                    <label className="block text-slate-900 font-black text-sm uppercase tracking-widest mb-6 ml-2 flex items-center">
                        <span className="mr-3 text-indigo-500 text-xl">📄</span> Payload Specification
                    </label>

                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="group cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-[2rem] p-8 mb-6 flex items-center gap-6 transition-all select-none"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileInput}
                            className="hidden"
                        />
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${
                            fileStatus.state === 'parsing' ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                            fileStatus.state === 'done' ? 'bg-emerald-100 text-emerald-600' :
                            fileStatus.state === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400'
                        }`}>
                            {fileStatus.state === 'parsing' ? '⏳' :
                             fileStatus.state === 'done'    ? '✅' :
                             fileStatus.state === 'error'   ? '❌' : '📎'}
                        </div>
                        <div className="flex-1 min-w-0">
                            {fileStatus.state === 'idle' && (
                                <>
                                    <p className="text-sm font-black text-slate-900">Drop PDF or DOCX here</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Automatic specification extraction</p>
                                </>
                            )}
                            {fileStatus.state === 'parsing' && (
                                <p className="text-sm font-black text-indigo-600">Harvesting {fileStatus.name}…</p>
                            )}
                            {fileStatus.state === 'done' && (
                                <>
                                    <p className="text-sm font-black text-emerald-700 truncate">{fileStatus.name}</p>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Ingestion complete — Review below</p>
                                </>
                            )}
                            {fileStatus.state === 'error' && (
                                <>
                                    <p className="text-sm font-black text-rose-600 truncate">{fileStatus.name}</p>
                                    <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">{fileStatus.msg}</p>
                                </>
                            )}
                        </div>
                        {fileStatus.state !== 'idle' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setFileStatus({ state: 'idle', name: '' }); }}
                                className="w-10 h-10 rounded-full hover:bg-white transition-colors text-slate-400 font-black"
                            >×</button>
                        )}
                    </div>

                    <textarea
                        className="w-full h-48 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium leading-relaxed resize-none mb-4"
                        placeholder="Paste technical specifications or technical requirements here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <div className="flex items-center justify-between px-2 min-h-[24px]">
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity duration-300 ${draftSaved ? 'text-emerald-500 opacity-100' : 'opacity-0'}`}>
                            ✓ Auto-Draft Persistent
                        </span>
                        {text && (
                            <button
                                onClick={() => { setText(''); localStorage.removeItem('spotcheck_draft'); }}
                                className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                            >
                                Purge specification
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleAnalyzeText}
                        disabled={loading || !text}
                        className={`mt-6 w-full py-5 px-6 rounded-2xl text-white font-black text-lg shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-3 ${
                            loading || !text
                                ? 'bg-indigo-300 cursor-not-allowed shadow-none'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:scale-[1.01]'
                        }`}
                    >
                        {loading ? <LoadingSpinner label="PROCESSING NLP MATRIX..." /> : <><span>RUN INTELLIGENCE SCAN</span> 🚀</>}
                    </button>
                </div>
            )}

            {/* ── LOT ID MODE ── */}
            {mode === 'lot' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.02)] transition-all">
                    <label className="block text-slate-900 font-black text-sm uppercase tracking-widest mb-6 ml-2 flex items-center">
                        <span className="mr-3 text-indigo-500 text-xl">🆔</span> Goszakup Lot Identifier
                    </label>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold tracking-widest text-slate-800 placeholder:text-slate-300"
                            placeholder="ENTER LOT ID (e.g. 73829103)"
                            value={lotId}
                            onChange={(e) => setLotId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !loading && lotId.trim() && handleAnalyzeLot()}
                        />
                        <button
                            onClick={handleAnalyzeLot}
                            disabled={loading || !lotId.trim()}
                            className={`px-10 py-5 rounded-2xl text-white font-black shadow-lg transition-all active:scale-[0.99] ${
                                loading || !lotId.trim()
                                    ? 'bg-indigo-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                            }`}
                        >
                            {loading ? <LoadingSpinner label="" /> : 'LOOKUP'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 animate-shake">
                    <span className="text-2xl">⚠️</span>
                    <p className="font-bold">{error}</p>
                </div>
            )}

            {/* ── LOT RESULT ── */}
            {lotResult && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest text-sm">Detection Result</h2>
                        <button
                            onClick={() => handleExportPdf(lotResultRef, `lot-${lotResult.lotId || 'result'}.pdf`)}
                            disabled={exporting}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? <LoadingSpinner label="EXPORTING..." /> : <><span>SAVE AS PDF</span> 📄</>}
                        </button>
                    </div>
                    <div ref={lotResultRef}>
                        <LotResultCard result={lotResult} />
                    </div>
                </div>
            )}

            {/* ── TEXT RESULTS ── */}
            {Array.isArray(results) && results.length > 0 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Log</h2>
                            <div className="flex items-center gap-3">
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-indigo-100 tracking-widest">
                                    {results.length} Entities Found
                                </span>
                                {loadedFromHistory && (
                                    <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-100 tracking-widest animate-pulse">
                                        📜 History
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => handleExportPdf(textResultsRef, 'text-analysis-results.pdf')}
                            disabled={exporting}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? <LoadingSpinner label="EXPORTING..." /> : <><span>SAVE ALL AS PDF</span> 📄</>}
                        </button>
                    </div>

                    <div ref={textResultsRef} className="space-y-8">
                    {results.map((result, index) => {
                        const isHighRisk = result?.isHighRisk;
                        const sourceLabel = result?.marketSource === 'market_indicator'
                            ? '📊 Matrix'
                            : '📈 History';
                        return (
                            <div
                                key={index}
                                className={`bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-5px_rgba(0,0,0,0.02)] border overflow-hidden transition-all duration-300 hover:scale-[1.01] ${
                                    isHighRisk ? 'border-rose-200' : 'border-emerald-200'
                                }`}
                            >
                                <div className={`px-8 py-5 flex justify-between items-center ${isHighRisk ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
                                    <h3 className="text-lg font-black text-slate-900 flex items-center">
                                        <span className="mr-3">{isHighRisk ? '🚩' : '✅'}</span>
                                        {result?.item?.item_name || 'Unnamed Item'}
                                    </h3>
                                    <RiskBadge isHighRisk={isHighRisk} />
                                </div>
                                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-white">
                                    <StatBox label="Extracted Price" value={`${(result?.item?.price || 0).toLocaleString()} KZT`} />
                                    <StatBox label="Market Baseline" value={`${(result?.marketPrice || 0).toLocaleString()} KZT`} />
                                    <StatBox label="Quantity" value={`${result?.item?.qty || 0} ${result?.item?.unit || 'ед.'}`} />
                                    <DeviationBox deviation={result?.deviationPercentage} isHighRisk={isHighRisk} />
                                </div>
                                {result?.allIndicators?.length > 0 && (
                                    <IndicatorsTable indicators={result.allIndicators} />
                                )}
                                <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex justify-between items-center">
                                    <span className={`px-3 py-1 rounded-full border bg-white ${
                                        result?.marketSource === 'market_indicator'
                                            ? 'text-indigo-600 border-indigo-100'
                                            : 'text-amber-600 border-amber-100'
                                    }`}>{sourceLabel} Analysis</span>
                                    <span className="text-indigo-600">Scan Match: 100%</span>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {results.length === 0 && !lotResult && !loading && !error && (
                <div className="py-24 text-center space-y-4 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/30 animate-in fade-in duration-1000">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-slate-200/50">
                        <span className="text-5xl">{mode === 'lot' ? '🔎' : '📝'}</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">System Ready for Scan</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto">
                            {mode === 'lot'
                                ? 'Enter a Goszakup lot identifier to assess risk levels.'
                                : 'Paste a technical specification to begin analysis.'}
                        </p>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-xl" onClick={() => setShowHistory(false)} />
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Log</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Previous Market Scans</p>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="w-12 h-12 bg-white border border-slate-100 rounded-full hover:bg-slate-50 transition-all shadow-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {(!history || history.length === 0) ? (
                                <div className="text-center py-12">
                                    <p className="text-4xl mb-2">📭</p>
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Registry Empty</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => loadHistoryItem(item)}
                                        className="w-full text-left p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-600/30 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="px-3 py-1 bg-white text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-50 shadow-sm uppercase tracking-tighter">
                                                Scan #{item.id}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed italic pr-12">
                                            "{item.originalText || 'No text content'}"
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                                Sensitivity: {item.threshold || 20}%
                                            </span>
                                            <span className="text-indigo-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                                                Load Matrix →
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpotCheck;
