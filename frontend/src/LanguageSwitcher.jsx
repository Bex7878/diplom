import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'ru', label: 'РУС' },
    { code: 'kz', label: 'ҚАЗ' },
    { code: 'en', label: 'ENG' },
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);

    const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleSelect = (code) => {
        i18n.changeLanguage(code);
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all"
            >
                🌐 {current.label}
            </button>
            {open && (
                <div className="absolute bottom-full mb-2 left-0 bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[80px]">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
                                lang.code === i18n.language
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
