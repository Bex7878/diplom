import React, { useState } from 'react';

const AdminPanel = () => {
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleTriggerScraper = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
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
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Control Panel</h1>
                <p className="text-gray-600">Manage data ingestion and system settings</p>
            </header>

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
                            <p className="mt-2 text-xs text-gray-500">
                                If empty, the system will use the default hardcoded cookie in the NLP service.
                            </p>
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
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Running Scraper Tasks...
                                </span>
                            ) : '🚀 Start Data Ingestion'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
                            <span className="mr-2">❌</span>
                            <div>
                                <p className="font-bold">Error Occurred</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className={`mt-6 p-4 rounded-lg text-sm flex items-start ${
                            result.status === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        }`}>
                            <span className="mr-2">{result.status === 'success' ? '✅' : '⚠️'}</span>
                            <div>
                                <p className="font-bold">{result.status === 'success' ? 'Scraper Completed' : 'Scraper Warning'}</p>
                                <p>{result.status === 'success' ? `Successfully parsed and saved ${result.count} lots.` : result.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-600">NLP Service</span>
                        <span className="text-green-600 font-bold">Online</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-gray-600">Scraper Status</span>
                        <span className="text-gray-500">Idle</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
