import React, { useState, useEffect } from 'react';

const MARKET_SOURCES = [
    { value: 'IMPORT',  label: 'File Import (общий импорт)' },
    { value: 'MANUAL',  label: 'Manual (ручной ввод)' },
    { value: 'KASPI',   label: 'Kaspi Market' },
    { value: 'AMAZON',  label: 'Amazon Market' },
    { value: 'API',     label: 'External API' },
    { value: 'SYSTEM',  label: 'System Generated' },
];

const AdminPanel = () => {
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [threshold, setThreshold] = useState(localStorage.getItem('userRiskThreshold') || '20');

    // User management state
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Excel import state
    const [excelFile, setExcelFile] = useState(null);
    const [excelSource, setExcelSource] = useState('IMPORT');
    const [excelLoading, setExcelLoading] = useState(false);
    const [excelResult, setExcelResult] = useState(null);
    const [excelError, setExcelError] = useState(null);

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
                fetchUsers(); // Refresh list
            }
        } catch (err) {
            alert('Failed to update role');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            const response = await fetch(`${apiUrl}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                fetchUsers(); // Refresh list
            }
        } catch (err) {
            alert('Failed to delete user');
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cookie }),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied. Admin only.');
                }
                throw new Error('Failed to trigger scraper');
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
        if (!excelFile) { setExcelError('Выберите файл'); return; }
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
                throw new Error(text || `Ошибка сервера: ${response.status}`);
            }
            const data = await response.json();
            setExcelResult(data);
        } catch (err) {
            setExcelError(err.message);
        } finally {
            setExcelLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-gray-800">Admin Control Panel</h1>
                <p className="text-gray-600">Manage data ingestion and system settings</p>
            </header>

            {/* 1. Risk Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">⚙️</span> Personal Risk Settings
                    </h2>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700">
                            High Risk Threshold (Deviation %)
                        </label>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full">
                            {threshold}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={threshold}
                        onChange={handleThresholdChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Sensitive (1%)</span>
                        <span>Lenient (100%)</span>
                    </div>
                </div>
            </div>

            {/* 2. User Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">👥</span> User Management
                    </h2>
                    <button 
                        onClick={fetchUsers}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Refresh List
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors text-sm">
                                    <td className="px-6 py-4 text-gray-400">{user.id}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            user.role === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => handleRoleChange(user.id, user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN')}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                                        >
                                            Switch Role
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {usersLoading && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">
                                        Loading users...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Excel Import */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">📊</span> Импорт Market Indicators из Excel
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Загрузите .xlsx или .xls файл с данными о рыночных ценах. Ожидаемые колонки:
                        <span className="ml-1 font-mono text-xs bg-gray-100 px-1 rounded">наименование / name</span>,{' '}
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">цена / price</span>.
                        Поддерживаются RU/KK/EN варианты.
                    </p>
                </div>
                <div className="p-6">
                    <form onSubmit={handleExcelImport} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Excel файл <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => { setExcelFile(e.target.files[0]); setExcelResult(null); setExcelError(null); }}
                                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-2"
                                />
                                {excelFile && (
                                    <p className="text-xs text-gray-500 mt-1">{excelFile.name} — {(excelFile.size / 1024).toFixed(1)} KB</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Источник данных (MarketSource)
                                </label>
                                <select
                                    value={excelSource}
                                    onChange={(e) => setExcelSource(e.target.value)}
                                    className="w-full p-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {MARKET_SOURCES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={excelLoading || !excelFile}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all ${
                                excelLoading || !excelFile
                                    ? 'bg-green-300 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 active:transform active:scale-[0.98] shadow-green-500/20'
                            }`}
                        >
                            {excelLoading ? 'Импортируем данные...' : '📥 Загрузить и импортировать'}
                        </button>
                    </form>

                    {excelError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <p className="font-bold">Ошибка импорта</p>
                            <p>{excelError}</p>
                        </div>
                    )}

                    {excelResult && (
                        <div className="mt-4 space-y-3">
                            <div className={`p-4 rounded-lg border text-sm ${
                                excelResult.skipped === 0
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                            }`}>
                                <p className="font-bold mb-1">
                                    {excelResult.skipped === 0 ? 'Импорт завершён успешно' : 'Импорт завершён с предупреждениями'}
                                </p>
                                <div className="flex gap-4">
                                    <span>Всего строк: <strong>{excelResult.total}</strong></span>
                                    <span className="text-green-700">Сохранено: <strong>{excelResult.saved}</strong></span>
                                    {excelResult.skipped > 0 && (
                                        <span className="text-yellow-700">Пропущено: <strong>{excelResult.skipped}</strong></span>
                                    )}
                                </div>
                            </div>
                            {excelResult.errors && excelResult.errors.length > 0 && (
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                                        Показать предупреждения ({excelResult.errors.length})
                                    </summary>
                                    <ul className="mt-2 space-y-1 bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                                        {excelResult.errors.map((err, i) => (
                                            <li key={i} className="text-yellow-700">{err}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}
                </div>

                {/* Expected format hint */}
                <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
                        <p className="font-semibold mb-2 text-gray-700">Поддерживаемые форматы заголовков колонок:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                                <span className="font-medium">Наименование (RU):</span>{' '}
                                наименование, название_ру, item_name_ru, name_ru
                            </div>
                            <div>
                                <span className="font-medium">Наименование (KK):</span>{' '}
                                атауы, наименование_қаз, item_name_kk, name_kk
                            </div>
                            <div>
                                <span className="font-medium">Наименование (EN):</span>{' '}
                                name, product, item_name_en, name_en
                            </div>
                            <div>
                                <span className="font-medium">Цена:</span>{' '}
                                цена, стоимость, price, baseline_price, unit_price
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Scraper Trigger */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <span className="mr-2">🕷️</span> Goszakup Scraper Trigger
                    </h2>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleTriggerScraper}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Goszakup Session Cookie (Optional)
                            </label>
                            <textarea
                                className="w-full h-32 p-3 text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="ci_session=... (Paste your session cookie here to bypass bot protection)"
                                value={cookie}
                                onChange={(e) => setCookie(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg shadow-blue-500/20 transition-all ${
                                loading 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98]'
                            }`}
                        >
                            {loading ? 'Running Scraper Tasks...' : '🚀 Start Data Ingestion'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <p className="font-bold">Error Occurred</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className={`mt-6 p-4 rounded-lg text-sm ${
                            result.status === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        }`}>
                            <p className="font-bold">{result.status === 'success' ? 'Scraper Completed' : 'Scraper Warning'}</p>
                            <p>{result.status === 'success' ? `Successfully parsed and saved ${result.count} lots.` : result.message}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Footer info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2">Instructions</h3>
                    <ul className="text-sm text-gray-600 space-y-2 list-disc ml-4">
                        <li>Go to goszakup.gov.kz and solve the captcha.</li>
                        <li>Open DevTools (F12) → Application → Cookies.</li>
                        <li>Copy the value of <code>ci_session</code>.</li>
                        <li>Paste it above to ensure the scraper can access protected pages.</li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2">System Status</h3>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-600">PostgreSQL</span>
                        <span className="text-green-600 font-bold">Online</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-gray-600">NLP Service</span>
                        <span className="text-green-600 font-bold">Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
