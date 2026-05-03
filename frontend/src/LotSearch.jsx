import React, { useState, useEffect } from 'react';

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
            if (!response.ok) throw new Error('Failed to fetch historical lots');

            const data = await response.json();
            setLots(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
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
            setPage(0); // triggers useEffect
        }
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage(0);
    };

    const from = totalElements === 0 ? 0 : page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, totalElements);

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Historical Lots Database</h1>
                <p className="text-gray-600">Search and browse previously parsed procurement lots from Goszakup</p>
            </header>

            {/* Search Box */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Search by Lot ID, Customer BIN, or Item Name..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:bg-blue-300"
                    >
                        {loading ? 'Searching...' : 'Search Records'}
                    </button>
                </form>
                {totalElements > 0 && (
                    <p className="mt-3 text-sm text-gray-500 font-medium">
                        Showing <span className="text-blue-600 font-bold">{from}–{to}</span> of{' '}
                        <span className="text-blue-600 font-bold">{totalElements.toLocaleString()}</span> results
                    </p>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-8 flex items-center">
                    <span className="mr-3 text-xl">⚠️</span>
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lot ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name / Specification</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Quantity</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price/Unit</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sum</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {lots.map((lot, index) => (
                                <tr key={lot.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-4 text-center text-xs font-mono text-gray-400">{page * pageSize + index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{lot.lotId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{lot.customerBin}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{lot.truName}</p>
                                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{lot.description || 'No additional description'}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                        <span className="font-bold text-gray-800">{lot.quantity}</span>{' '}
                                        <span className="text-xs">{lot.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{lot.unitPrice?.toLocaleString()} KZT</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="text-sm font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-md inline-block">
                                            {lot.totalSum?.toLocaleString()} KZT
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {lots.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-gray-400">
                                        <div className="text-4xl mb-2">📁</div>
                                        <p className="text-lg font-bold italic">No records found</p>
                                        <p className="text-sm">Try searching with different keywords or check the admin panel to trigger a new scrape.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalElements > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Page size selector */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Rows per page:</span>
                            <div className="flex gap-1">
                                {PAGE_SIZE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handlePageSizeChange(opt)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            pageSize === opt
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(0)}
                                disabled={page === 0}
                                className="px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 0}
                                className="px-3 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ‹ Prev
                            </button>

                            <PageNumbers page={page} totalPages={totalPages} onPageChange={setPage} />

                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next ›
                            </button>
                            <button
                                onClick={() => setPage(totalPages - 1)}
                                disabled={page >= totalPages - 1}
                                className="px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                »
                            </button>
                        </div>

                        <span className="text-xs text-gray-500 font-medium">
                            Page <span className="font-bold text-gray-700">{page + 1}</span> of{' '}
                            <span className="font-bold text-gray-700">{totalPages}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const PageNumbers = ({ page, totalPages, onPageChange }) => {
    const pages = [];
    const delta = 2;
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
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`min-w-[28px] px-2 py-1 text-xs rounded border transition-all ${
                            p === page
                                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
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
