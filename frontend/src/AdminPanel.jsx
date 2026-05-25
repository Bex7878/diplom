import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const MARKET_SOURCES = [
    { value: 'IMPORT',  labelKey: 'spotCheck.sourceLabels.IMPORT' },
    { value: 'MANUAL',  labelKey: 'spotCheck.sourceLabels.MANUAL' },
    { value: 'KASPI',   labelKey: 'spotCheck.sourceLabels.KASPI' },
    { value: 'AMAZON',  labelKey: 'spotCheck.sourceLabels.AMAZON' },
    { value: 'API',     labelKey: 'spotCheck.sourceLabels.API' },
    { value: 'SYSTEM',  labelKey: 'spotCheck.sourceLabels.SYSTEM' },
];

const AdminPanel = () => {
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [threshold, setThreshold] = useState(localStorage.getItem('userRiskThreshold') || '20');
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [excelSource, setExcelSource] = useState('IMPORT');
    const [excelLoading, setExcelLoading] = useState(false);
    const [excelResult, setExcelResult] = useState(null);
    const [excelError, setExcelError] = useState(null);
    const { t } = useTranslation();

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/admin/users`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`${apiUrl}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
                credentials: 'include',
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (err) {
            alert(t('admin.failedUpdateRole'));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm(t('admin.deleteConfirm'))) return;
        try {
            const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (err) {
            alert(t('admin.failedDeleteUser'));
        }
    };

    const handleThresholdChange = (e) => {
        const value = e.target.value;
        setThreshold(value);
        localStorage.setItem('userRiskThreshold', value);
    };

    const handleTriggerScraper = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${apiUrl}/api/admin/trigger-scraper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookie }),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error(t('admin.accessDenied'));
                }
                throw new Error(t('admin.failedTrigger'));
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExcelImport = async (e) => {
        e.preventDefault();
        if (!excelFile) { setExcelError(t('admin.selectFile')); return; }
        setExcelLoading(true);
        setExcelError(null);
        setExcelResult(null);
        try {
            const formData = new FormData();
            formData.append('file', excelFile);
            formData.append('source', excelSource);
            const response = await fetch(`${apiUrl}/api/admin/import-excel`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || t('admin.serverError', { status: response.status }));
            }
            const data = await response.json();
            setExcelResult(data);
        } catch (err) {
            setExcelError(err.message);
        } finally {
            setExcelLoading(false);
        }
    };

    const scraperSteps = t('admin.scraperSteps', { returnObjects: true });

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-1 bg-indigo-600 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('admin.suite')}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('admin.title')}</h1>
                </div>

                <div className="px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.mainframeActive')}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Side Controls */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Risk Matrix Config */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                    <span className="text-xl">⚙️</span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('admin.riskMatrix')}</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.globalThreshold')}</label>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 font-black rounded-lg border border-indigo-100">{threshold}%</span>
                                </div>
                                <input
                                    type="range" min="1" max="100"
                                    value={threshold}
                                    onChange={handleThresholdChange}
                                    className="w-full accent-indigo-600 cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                                    {t('admin.thresholdDescription')}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Environment Diagnostics */}
                    <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20">
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mb-24 -mr-24" />
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{t('admin.envDiagnostics')}</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'PostgreSQL Master', status: 'STABLE' },
                                    { label: 'Python NLP Engine', status: 'READY' },
                                    { label: 'System Cache', status: 'ACTIVE' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-sm font-bold text-slate-400">{item.label}</span>
                                        <span className="text-xs font-black text-emerald-400 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Main Content: User Identity */}
                <div className="lg:col-span-2">
                    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
                                    👥
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin.identityManagement')}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('admin.authorizedOperators')}</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchUsers}
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                            >
                                {t('admin.reloadDirectory')}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.operator')}</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.accessLevel')}</th>
                                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.operations')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 border-2 border-white shadow-sm uppercase">
                                                        {user.username.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{user.username}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">UUID: {user.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                                                    user.role === 'ROLE_ADMIN'
                                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {user.role?.replace('ROLE_', '')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleRoleChange(user.id, user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN')}
                                                        className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                                                    >
                                                        {t('admin.elevate')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                                    >
                                                        {t('admin.purge')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {usersLoading && (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-12 text-center animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                {t('admin.queryingIdentity')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            {/* Excel Data Ingestion */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-emerald-50/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center text-2xl">
                            📥
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin.dataIngestion')}</h2>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">{t('admin.importViaExcel')}</p>
                        </div>
                    </div>
                    <div className="bg-emerald-100/50 px-4 py-2 rounded-xl border border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('admin.formatsSupported')}</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleExcelImport} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('admin.payloadSelection')}</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => { setExcelFile(e.target.files[0]); setExcelResult(null); setExcelError(null); }}
                                    className="hidden"
                                    id="excel-upload"
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className="flex items-center justify-center gap-4 w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                                >
                                    <span className="text-3xl transition-transform group-hover:scale-125">📂</span>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-slate-900">{excelFile ? excelFile.name : t('admin.chooseDataFile')}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{excelFile ? `${(excelFile.size / 1024).toFixed(1)} KB` : t('admin.browseMainframe')}</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('admin.marketOrigin')}</label>
                                <select
                                    value={excelSource}
                                    onChange={(e) => setExcelSource(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {MARKET_SOURCES.map(s => (
                                        <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={excelLoading || !excelFile}
                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                            >
                                {excelLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>{t('admin.executeImport')}</span> <span className="text-xl">📥</span></>}
                            </button>
                        </div>
                    </form>

                    {excelError && (
                        <div className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 animate-shake">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="font-black uppercase text-[10px] tracking-widest mb-1 text-rose-400">{t('admin.ingestionFailure')}</p>
                                <p className="font-bold text-sm">{excelError}</p>
                            </div>
                        </div>
                    )}

                    {excelResult && (
                        <div className="mt-8 animate-in slide-in-from-top-4">
                            <div className={`p-8 rounded-[2rem] border grid grid-cols-1 md:grid-cols-3 gap-8 ${
                                excelResult.skipped === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                            }`}>
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.processed')}</p>
                                    <p className="text-3xl font-black text-slate-900">{excelResult.total}</p>
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('admin.saved')}</p>
                                    <p className="text-3xl font-black text-emerald-600">{excelResult.saved}</p>
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{t('admin.excluded')}</p>
                                    <p className="text-3xl font-black text-rose-400">{excelResult.skipped}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 pb-8">
                    <div className="bg-slate-50 rounded-[2rem] p-6 text-[10px] text-slate-500 border border-slate-100">
                        <p className="font-black mb-3 text-slate-700 uppercase tracking-widest">{t('admin.supportedHeaders')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Наименование (RU)', content: 'наименование, название_ру, item_name_ru, name_ru' },
                                { label: 'Наименование (KK)', content: 'атауы, наименование_қаз, item_name_kk, name_kk' },
                                { label: 'Наименование (EN)', content: 'name, product, item_name_en, name_en' },
                                { label: 'Цена / Price / Баға', content: 'цена, стоимость, price, baseline_price, unit_price' }
                            ].map((item, i) => (
                                <div key={i}>
                                    <span className="font-black text-slate-400 uppercase tracking-tighter">{item.label}:</span><br/>
                                    <span className="font-mono text-indigo-400">{item.content}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Scraper Control Engine */}
            <section className="bg-slate-900 rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-indigo-900/40">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_0%,rgba(79,70,229,0.1)_0%,transparent_50%)]" />

                <div className="p-10 relative z-10 flex flex-col lg:flex-row gap-12">
                    <div className="lg:w-1/3 space-y-6">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center text-3xl">
                            🕷️
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white tracking-tight">{t('admin.scraperEngine')}</h2>
                            <p className="text-indigo-300/80 text-sm font-medium leading-relaxed">
                                {t('admin.scraperDescription')}
                            </p>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('admin.operationalProtocol')}</h4>
                            <ul className="space-y-3">
                                {Array.isArray(scraperSteps) && scraperSteps.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                        <span className="text-emerald-400 text-base">✔</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="lg:w-2/3">
                        <form onSubmit={handleTriggerScraper} className="space-y-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">{t('admin.cookiePayload')}</label>
                                <textarea
                                    className="w-full h-40 p-6 bg-white/5 border border-white/10 rounded-[2rem] text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                                    placeholder={t('admin.cookiePlaceholder')}
                                    value={cookie}
                                    onChange={(e) => setCookie(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 bg-white text-indigo-900 font-black rounded-[2rem] shadow-2xl shadow-white/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-4 text-lg"
                            >
                                {loading ? <div className="w-6 h-6 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin" /> : <><span>{t('admin.initializeHarvest')}</span> 🚀</>}
                            </button>
                        </form>

                        {result && (
                            <div className={`mt-8 p-8 rounded-[2rem] border animate-in slide-in-from-bottom-4 ${
                                result.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                                <p className="font-black text-lg mb-2 uppercase tracking-tight">
                                    {result.status === 'success' ? t('admin.engineComplete') : t('admin.engineAlert')}
                                </p>
                                <p className="font-bold text-sm leading-relaxed">
                                    {result.status === 'success'
                                        ? t('admin.extractionSuccess', { count: result.count })
                                        : result.message}
                                </p>
                            </div>
                        )}
                        {error && (
                            <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] text-rose-400 animate-shake">
                                <p className="font-black text-[10px] uppercase tracking-widest mb-1">{t('admin.systemError')}</p>
                                <p className="font-bold text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminPanel;
