import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useTranslation } from 'react-i18next';

const TopRisks = () => {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef(null);
    const { t } = useTranslation();

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

    const handleExportPdf = async () => {
        if (!reportRef || !reportRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#F8FAFC',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.querySelector('[data-report-container]');
                    if (clonedEl) {
                        clonedEl.style.width = '1024px';
                        clonedEl.style.padding = '40px';
                        clonedEl.style.backgroundColor = '#F8FAFC';
                    }
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        * {
                            animation: none !important;
                            transition: none !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .premium-card {
                            background-color: #ffffff !important;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                            margin-bottom: 20px !important;
                        }
                        .bg-rose-50 { background-color: #fff1f2 !important; }
                        .bg-amber-50 { background-color: #fffbeb !important; }
                        .text-slate-900 { color: #0f172a !important; }
                        .text-slate-400 { color: #94a3b8 !important; }
                        footer { background-color: #312e81 !important; color: white !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });
            const imgData = canvas.toDataURL('image/png', 1.0);
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
            pdf.save(`risk-intelligence-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out" ref={reportRef} data-report-container>
            {/* Page Header */}
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-indigo-100">
                            {t('topRisks.anomalyDetection')}
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{t('topRisks.title')}</h1>
                    <p className="text-slate-500 font-medium max-w-xl">
                        {t('topRisks.description')}
                    </p>
                </div>
                <button
                    onClick={fetchTopRisks}
                    disabled={loading}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group active:scale-95 disabled:opacity-50"
                >
                    <span className={`block transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`}>🔄</span>
                </button>
            </header>

            {loading ? (
                <div className="grid gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 premium-card animate-pulse bg-slate-100/50" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-800 animate-in shake duration-500">
                    <span className="text-2xl">⚠️</span>
                    <p className="font-semibold">{error}</p>
                </div>
            ) : risks.length === 0 ? (
                <div className="text-center py-24 premium-card border-dashed animate-in fade-in duration-1000">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🛡️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{t('topRisks.noRiskData')}</h3>
                    <p className="text-slate-400 mt-2">{t('topRisks.noAnomalies')}</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {risks.map((risk, index) => {
                        const item = risk.extractedItem;
                        const deviation = risk.deviationPercentage || 0;
                        const isExtreme = deviation > 100;

                        return (
                            <div
                                key={risk.id || index}
                                className="premium-card group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 animate-in fade-in slide-in-from-right-4"
                                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex items-center p-6 gap-8">
                                    <div className={`flex-none w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 group-hover:scale-110 ${
                                        isExtreme ? 'bg-rose-50 text-rose-600 shadow-lg shadow-rose-200/50' : 'bg-amber-50 text-amber-600 shadow-lg shadow-amber-200/50'
                                    }`}>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{t('topRisks.level')}</span>
                                        <span className="text-xl font-bold">{isExtreme ? 'H' : 'M'}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                {item?.itemName || t('topRisks.operationalItem')}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase tracking-tighter transition-colors group-hover:bg-white">
                                                ID: {risk.id || index}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="transition-transform duration-500 group-hover:translate-x-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('topRisks.contractPrice')}</p>
                                                <p className="text-sm font-bold text-slate-700">{item?.price?.toLocaleString()} <span className="text-slate-400 font-medium">KZT</span></p>
                                            </div>
                                            <div className="transition-transform duration-500 group-hover:translate-x-1" style={{ transitionDelay: '50ms' }}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('topRisks.quantity')}</p>
                                                <p className="text-sm font-bold text-slate-700">{item?.qty || 0} <span className="text-slate-400 font-medium">{item?.unit || 'unit'}</span></p>
                                            </div>
                                            <div className="transition-transform duration-500 group-hover:translate-x-1" style={{ transitionDelay: '100ms' }}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('topRisks.businessUnit')}</p>
                                                <p className="text-sm font-bold text-indigo-600 font-mono">{item?.contract?.bin || '---'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-none text-right flex flex-col items-end gap-2">
                                        <div className={`px-4 py-2 rounded-xl border flex flex-col items-end transition-all duration-500 group-hover:scale-105 ${
                                            isExtreme
                                                ? 'bg-rose-50 border-rose-100 text-rose-700 shadow-inner'
                                                : 'bg-amber-50 border-amber-100 text-amber-700 shadow-inner'
                                        }`}>
                                            <span className="text-[10px] font-black uppercase leading-none mb-1">{t('topRisks.deviation')}</span>
                                            <span className="text-2xl font-black leading-none tracking-tight">
                                                +{Number(deviation).toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold italic opacity-0 group-hover:opacity-100 transition-opacity duration-500">{t('topRisks.requiresAudit')}</span>
                                    </div>
                                </div>

                                <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-700 ease-in-out border-t border-slate-50 px-6 bg-slate-50/50">
                                    <div className="py-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>{t('topRisks.analysisComplete')}</span>
                                        </div>
                                        <button className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 group/btn">
                                            {t('topRisks.viewDocuments')} <span className="text-xs transition-transform group-hover/btn:translate-x-1">→</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <footer className="p-10 bg-indigo-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40 mt-12 animate-in fade-in zoom-in duration-1000 ease-out">
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-1 bg-indigo-400 rounded-full" />
                            <h4 className="text-2xl font-black tracking-tight">{t('topRisks.auditRecommendation')}</h4>
                        </div>
                        <p className="text-indigo-200 text-sm max-w-lg leading-relaxed font-medium"
                            dangerouslySetInnerHTML={{ __html: t('topRisks.auditDescription') }}
                        />
                    </div>
                    <button
                        onClick={handleExportPdf}
                        disabled={exporting || loading || risks.length === 0}
                        className="px-8 py-4 bg-white text-indigo-900 font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        {exporting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin" />
                                <span>{t('topRisks.generating')}</span>
                            </>
                        ) : (
                            <>
                                <span>{t('topRisks.generateReport')}</span>
                                <span className="text-xl">📄</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-50%] left-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
            </footer>
        </div>
    );
};

export default TopRisks;
