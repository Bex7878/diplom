import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const userRole = localStorage.getItem('userRole');
    const username = localStorage.getItem('username') || 'User';

    const handleLogout = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' })
            .finally(() => {
                localStorage.removeItem('userRole');
                navigate('/login');
            });
    };

    const navItems = [
        { path: '/', label: t('nav.spotCheck'), icon: '🔍' },
        { path: '/lots', label: t('nav.historicalData'), icon: '📊' },
        { path: '/top-risks', label: t('nav.riskIntelligence'), icon: '🚩' },
    ];

    if (userRole === 'ROLE_ADMIN') {
        navItems.push({ path: '/admin', label: t('nav.systemControl'), icon: '⚙️' });
    }

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0F172A] text-white flex flex-col fixed h-full shadow-2xl z-20">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-xl font-bold">D</span>
                        </div>
                        <h2 className="text-xl font-extrabold tracking-tight">DEVIATOR<span className="text-indigo-400">.AI</span></h2>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold ml-1">{t('nav.analyticalIntelligence')}</p>
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-4 py-3.5 rounded-xl transition-all group ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <span className={`mr-3 text-lg transition-transform group-hover:scale-110 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.icon}</span>
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 m-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold mr-3 shadow-inner">
                            {username.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate text-white">{username}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-500">{userRole?.replace('ROLE_', '')}</p>
                        </div>
                    </div>
                    <div className="mb-3">
                        <LanguageSwitcher />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center py-2.5 px-4 bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-600/50"
                    >
                        {t('nav.signOut')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72">
                <div className="max-w-[1200px] mx-auto p-12">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
