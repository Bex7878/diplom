import React, {useState} from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const SpotCheck = () => {
    const [text, setText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Failed to log out', err);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await currentUser.getIdToken();
            // Используем переменную окружения VITE_API_URL для динамического подключения
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/analysis/spot-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({text}),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
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
        <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-gray-600">
                        Logged in as: <span className="font-semibold">{currentUser?.email}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded transition-colors"
                    >
                        Logout
                    </button>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Intelligent NLP Contract Spot-Check
                </h1>

                {/* Input Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Paste Contract Specifications:
                    </label>
                    <textarea
                        className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="E.g., Procurement of 10 Dell Latitude 5520 laptops at $1200.00 each..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !text}
                        className={`mt-4 w-full py-2 px-4 rounded-md text-white font-semibold transition-colors ${
                            loading || !text
                                ? 'bg-blue-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Risk & Deviation'}
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-100 text-red-700 p-4 rounded-md mb-8">
                        <p>Error: {error}</p>
                    </div>
                )}

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">Analysis Results</h2>
                        {results.map((result, index) => {
                            const isHighRisk = result.isHighRisk; // deviation > 20%
                            return (
                                <div
                                    key={index}
                                    className={`p-6 rounded-lg shadow-md border-l-4 ${
                                        isHighRisk
                                            ? 'bg-red-50 border-red-500'
                                            : 'bg-green-50 border-green-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-800">
                                            {result.item?.item_name || 'Unknown Item'}
                                        </h3>
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                isHighRisk
                                                    ? 'bg-red-200 text-red-800'
                                                    : 'bg-green-200 text-green-800'
                                            }`}
                                        >
                      {isHighRisk ? 'High Risk' : 'Acceptable'}
                    </span>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Extracted Price</p>
                                            <p className="font-semibold">${result.item?.price?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Market Baseline</p>
                                            <p className="font-semibold">${result.marketPrice?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Quantity</p>
                                            <p className="font-semibold">
                                                {result.item?.qty || 0} {result.item?.unit || ''}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Deviation</p>
                                            <p
                                                className={`font-bold ${
                                                    isHighRisk ? 'text-red-600' : 'text-green-600'
                                                }`}
                                            >
                                                {result.deviationPercentage > 0 ? '+' : ''}
                                                {result.deviationPercentage?.toFixed(2) || '0.00'}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpotCheck;
