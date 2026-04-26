import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');

    const handleLogout = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' })
            .finally(() => {
                localStorage.removeItem('userRole');
                navigate('/login');
            });
    };

    const navItems = [
        { path: '/', label: 'Spot-Check', icon: '🔍' },
        { path: '/lots', label: 'Historical Lots', icon: '📊' },
    ];

    if (userRole === 'ROLE_ADMIN') {
        navItems.push({ path: '/admin', label: 'Admin Panel', icon: '⚙️' });
    }

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 text-white flex flex-col shadow-xl">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-blue-400">Diplom Project</h2>
                    <p className="text-xs text-gray-400 mt-1">Intelligent Contract Analysis</p>
                </div>
                
                <nav className="flex-1 mt-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-6 py-4 transition-colors ${
                                location.pathname === item.path
                                    ? 'bg-slate-700 text-blue-300 border-r-4 border-blue-400'
                                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            <span className="mr-3 text-lg">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-700">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold mr-2">
                            {localStorage.getItem('username')?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate">{localStorage.getItem('username')}</p>
                            <p className="text-xs text-gray-400 truncate">{userRole?.replace('ROLE_', '')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center py-2 px-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500 hover:text-white transition-all"
                    >
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
