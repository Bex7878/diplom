import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const LotSearch = () => {
    const [query, setQuery] = useState('');
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const { t } = useTranslation();

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    const fetchLots = async (currentPage, currentSize, currentQuery) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: currentSize,
                ...(currentQuery?.trim() ? { query: currentQuery.trim() } : {}),
            });
            const response = await fetch(`${apiUrl}/api/lots/search?${params}`, {
                credentials: 'include',
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) throw new Error(t('lotSearch.failedFetch'));

            const data = await response.json();
            setLots(data.content || []);
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLots(page, pageSize, query);
    }, [page, pageSize]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (page === 0) {
            fetchLots(0, pageSize, query);
        } else {
            setPage(0);
        }
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage(0);
    };

    const from = totalElements === 0 ? 0 : page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, totalElements);

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-1 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('lotSearch.repository')}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('lotSearch.title')}</h1>
                </div>

                {totalElements > 0 && (
                    <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1 text-xs">{t('lotSearch.totalRecords')}</p>
                            <p className="text-xl font-black text-emerald-600 leading-none">{totalElements.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl border border-emerald-50">
                            📊
                        </div>
                    </div>
                )}
            </header>

            {/* Search Box */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                <form onSubmit={handleSearch} className="relative z-10 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors text-xl">🔍</span>
                        <input
                            type="text"
                            className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all font-bold"
                            placeholder={t('lotSearch.searchPlaceholder')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2rem] shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><span>{t('lotSearch.queryRecords')}</span> 🚀</>
                        )}
                    </button>
                </form>
                <div className="mt-6 flex items-center justify-between px-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {t('lotSearch.showingResults')} <span className="text-slate-900">{from}–{to}</span>
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('lotSearch.rowsPerPage')}</span>
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => handlePageSizeChange(opt)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                        pageSize === opt ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 animate-in shake duration-500">
                    <span className="text-2xl">⚠️</span>
                    <p className="font-bold">{error}</p>
                </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden animate-in slide-in-from-bottom-8 duration-1000">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.identifier')}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.consumer')}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.itemSpec')}</th>
                                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.quantity')}</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.unitPrice')}</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lotSearch.totalValuation')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {lots.map((lot, index) => (
                                <tr key={lot.id || index} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-6 text-center text-[10px] font-black text-slate-300 font-mono italic">
                                        {page * pageSize + index + 1}
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            {lot.lotId}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 font-mono tracking-tight">{lot.customerBin || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 max-w-xs">
                                        <p className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {lot.truName || t('lotSearch.unnamedEntity')}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold line-clamp-1 mt-1 italic uppercase tracking-tighter">
                                            {lot.description || t('lotSearch.noSpecData')}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black text-slate-800 leading-none">{lot.quantity || 0}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{lot.unit || 'units'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right">
                                        <span className="text-sm font-black text-slate-900">{Number(lot.unitPrice || 0).toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">KZT</span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right">
                                        <div className="text-sm font-black text-indigo-600 bg-white border border-slate-100 px-4 py-2 rounded-xl inline-block shadow-sm group-hover:shadow-indigo-500/10 group-hover:border-indigo-100 transition-all">
                                            {Number(lot.totalSum || 0).toLocaleString()} <span className="text-[9px] text-slate-300 font-bold ml-1">KZT</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {lots.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-32 text-center animate-in fade-in duration-1000">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <span className="text-4xl opacity-50">📁</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight italic">{t('lotSearch.registryEmpty')}</h3>
                                        <p className="text-slate-400 text-sm font-medium mt-2 max-w-xs mx-auto">{t('lotSearch.noRecords')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalElements > 0 && (
                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5 order-2 md:order-1">
                            <button
                                onClick={() => setPage(0)}
                                disabled={page === 0}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-5 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest shadow-sm"
                            >
                                {t('lotSearch.prev')}
                            </button>

                            <div className="flex items-center gap-1.5 mx-3">
                                <PageNumbers page={page} totalPages={totalPages} onPageChange={setPage} />
                            </div>

                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-5 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest shadow-sm"
                            >
                                {t('lotSearch.next')}
                            </button>
                            <button
                                onClick={() => setPage(totalPages - 1)}
                                disabled={page >= totalPages - 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                »
                            </button>
                        </div>

                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] order-1 md:order-2 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                            {t('lotSearch.page')} <span className="text-slate-900">{page + 1}</span> {t('lotSearch.of')} <span className="text-slate-900">{totalPages}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PageNumbers = ({ page, totalPages, onPageChange }) => {
    const pages = [];
    const delta = 1;
    const left = Math.max(0, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    if (left > 0) {
        pages.push(0);
        if (left > 1) pages.push('...');
    }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) {
        if (right < totalPages - 2) pages.push('...');
        pages.push(totalPages - 1);
    }

    return (
        <>
            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-300 font-black">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`min-w-[40px] h-10 px-3 rounded-xl text-xs font-black transition-all ${
                            p === page
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110 border border-indigo-500'
                                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 shadow-sm'
                        }`}
                    >
                        {p + 1}
                    </button>
                )
            )}
        </>
    );
};

export default LotSearch;
