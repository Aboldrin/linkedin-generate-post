import React, { useState, useMemo } from 'react';
import { PlannedPost } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { EditIcon } from './icons/EditIcon';

interface ContentCalendarProps {
  plannedPosts: PlannedPost[];
  onGeneratePlan: (month: number, year: number) => void;
  onLoadDraft: (post: PlannedPost) => void;
  isLoading: boolean;
  error: string | null;
}

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
const MONTH_NAMES = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const postTypeStyles: { [key: string]: string } = {
    "Domanda": "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
    "Punto di Vista": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
    "Ultim'ora Tech": "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
    "Consiglio Rapido": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    "Mito da Sfatare": "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    "Sondaggio": "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
    "Meme": "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
    "Default": "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
};

const PostPill: React.FC<{ post: PlannedPost; onClick: () => void }> = ({ post, onClick }) => (
    <button onClick={onClick} className={`w-full text-left p-1.5 rounded-md text-xs font-semibold truncate transition-all hover:ring-2 hover:ring-indigo-500 ${postTypeStyles[post.postType] || postTypeStyles["Default"]}`}>
        {post.topic}
    </button>
);

const PostDetailModal: React.FC<{ post: PlannedPost; onClose: () => void; onLoad: () => void }> = ({ post, onClose, onLoad }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-900 dark:text-white">{post.topic}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(post.date + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{post.generatedPost.postContent}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onLoad} className="flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        <EditIcon className="w-4 h-4 mr-2" />
                        Modifica e Perfeziona
                    </button>
                </div>
            </div>
        </div>
    );
};


export const ContentCalendar: React.FC<ContentCalendarProps> = ({ plannedPosts, onGeneratePlan, onLoadDraft, isLoading, error }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedPost, setSelectedPost] = useState<PlannedPost | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // FIX: All hooks and logic must be at the top level, before any conditional returns.
    // This prevents violating the Rules of Hooks, which caused the application to crash.
    const postsByDate = useMemo(() => {
        const map = new Map<string, PlannedPost>();
        plannedPosts.forEach(post => map.set(post.date, post));
        return map;
    }, [plannedPosts]);
    
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay });

    const toggleExpansion = () => setIsExpanded(prev => !prev);
    
    const handleGenerate = () => {
        onGeneratePlan(month + 1, year);
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    if (!isExpanded) {
        const postsThisMonth = plannedPosts.filter(p => {
            const postDate = new Date(p.date + 'T12:00:00Z');
            return postDate.getMonth() === month && postDate.getFullYear() === year;
        }).length;

        return (
            <div
                onClick={toggleExpansion}
                className="p-4 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all"
                role="button"
                aria-expanded="false"
                aria-label="Espandi calendario editoriale"
            >
                <div className="flex items-center">
                    <CalendarIcon className="w-8 h-8 text-indigo-500 mr-4" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Calendario Editoriale</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {postsThisMonth > 0
                                ? `${postsThisMonth} post pianificati per ${MONTH_NAMES[month]}`
                                : 'Nessun piano generato. Clicca per iniziare.'
                            }
                        </p>
                    </div>
                </div>
                <ChevronDownIcon className="w-6 h-6 text-slate-400 dark:text-slate-500 transition-transform" />
            </div>
        );
    }
    
    return (
        <div className="p-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
            {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} onLoad={() => { onLoadDraft(selectedPost); setSelectedPost(null); }} />}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                    <CalendarIcon className="w-8 h-8 text-indigo-500 mr-3" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calendario Editoriale</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleGenerate} disabled={isLoading} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {isLoading ? 'Generazione in corso...' : `Genera Piano di ${MONTH_NAMES[month]}`}
                    </button>
                     <button 
                        onClick={toggleExpansion}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                        aria-label="Comprimi calendario"
                    >
                        <ChevronDownIcon className="w-6 h-6 rotate-180 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            {error && <div role="alert" className="mb-4 text-red-700 dark:text-red-400 text-sm p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</div>}

            <div className="flex items-center justify-between mb-4">
                 <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronDownIcon className="w-5 h-5 rotate-90 text-slate-500 dark:text-slate-400" />
                </button>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{MONTH_NAMES[month]} {year}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronDownIcon className="w-5 h-5 -rotate-90 text-slate-500 dark:text-slate-400" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {DAY_NAMES.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {emptyDays.map((_, index) => <div key={`empty-${index}`} className="border border-transparent rounded-lg"></div>)}
                {calendarDays.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const post = postsByDate.get(dateStr);
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    return (
                        <div key={day} className={`p-2 border rounded-lg h-24 flex flex-col ${isToday ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700/50'}`}>
                            <span className={`font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                            {post && (
                                <div className="mt-1 flex-grow">
                                    <PostPill post={post} onClick={() => setSelectedPost(post)} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};