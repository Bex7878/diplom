import React, { useState, useEffect } from 'react';

const AdminPanel = () => {
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [threshold, setThreshold] = useState(localStorage.getItem('userRiskThreshold') || '20');
    
    // User management state
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

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

            {/* 3. Scraper Trigger */}
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
