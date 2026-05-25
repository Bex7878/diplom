import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError(t('auth.passwordsMismatch'));
            return;
        }

        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await axios.post(`${apiUrl}/api/auth/register`, {
                username,
                password,
                role: 'ROLE_USER'
            });

            if (response.status === 200) {
                setSuccess(t('auth.registrationSuccess'));
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            setError(err.response?.data || t('auth.registrationFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />

            <div className="absolute top-4 right-4 z-20">
                <LanguageSwitcher />
            </div>

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/30 mb-6 group transition-transform hover:scale-110">
                            <span className="text-2xl font-black text-white">D</span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-2">{t('auth.createAccount')}</h2>
                        <p className="text-slate-400 text-sm font-medium">{t('auth.joinCommunity')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1" htmlFor="username">
                                {t('auth.username')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    id="username"
                                    placeholder={t('auth.chooseUsername')}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all group-hover:border-white/20"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors">👤</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                {t('auth.password')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    placeholder={t('auth.createPassword')}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all group-hover:border-white/20"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors">🔒</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                {t('auth.confirmPassword')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    placeholder={t('auth.confirmYourPassword')}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all group-hover:border-white/20"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors">✔️</span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span>⚠️</span>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span>🎉</span>
                                {success}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{t('auth.createAccount')}</span>
                                    <span className="text-lg">→</span>
                                </>
                            )}
                        </button>

                        <div className="pt-6 text-center border-t border-white/5">
                            <p className="text-slate-500 text-sm">
                                {t('auth.alreadyHaveAccount')}
                                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold ml-2 transition-colors">
                                    {t('auth.signInInstead')}
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
                <p className="text-center mt-8 text-slate-600 text-xs font-bold uppercase tracking-widest">
                    {t('common.copyright')}
                </p>
            </div>
        </div>
    );
};

export default Register;
