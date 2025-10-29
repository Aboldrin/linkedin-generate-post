import React, { useState, useEffect, useCallback } from 'react';
import { getLinkedInTimingAnalysis, suggestPostTypeForTimeSlot, suggestContentFromLibrary } from '../services/geminiService';
import { ClockIcon } from './icons/ClockIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { LibraryItem } from '../types';

const ANALYSIS_STORAGE_KEY = 'linkedinTimingAnalysis';

type Status = 'optimal' | 'suboptimal' | 'loading' | 'error';
type TimeSlot = { day: number; start: number; end: number };

interface SmartSchedulerProps {
    onApplySuggestion: (postType: string) => void;
    onScheduleIdentified: (postType: string) => void;
    libraryItems: LibraryItem[];
    onApplyLibrarySuggestion: (item: LibraryItem) => void;
}

const dayNameToNumber: { [key: string]: number } = {
    'domenica': 0, 'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 'giovedì': 4, 'venerdì': 5, 'sabato': 6
};

const numberToDayName: { [key: number]: string } = {
    0: 'Domenica', 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì', 4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato'
};

const parseAnalysisToTimeSlots = (analysis: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const lines = analysis.split('\n');
    const regex = /(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)[\s,]*(\d{1,2}):00\s*-\s*(\d{1,2}):00/gi;

    for (const line of lines) {
        const matches = [...line.matchAll(regex)];
        for (const match of matches) {
            const dayName = match[1].toLowerCase();
            const day = dayNameToNumber[dayName];
            const start = parseInt(match[2], 10);
            const end = parseInt(match[3], 10);
            if (day !== undefined) {
                slots.push({ day, start, end });
            }
        }
    }
    return slots;
};


export const SmartScheduler: React.FC<SmartSchedulerProps> = ({ onApplySuggestion, onScheduleIdentified, libraryItems, onApplyLibrarySuggestion }) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [nextBestTime, setNextBestTime] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [postTypeSuggestion, setPostTypeSuggestion] = useState<string | null>(null);
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [librarySuggestion, setLibrarySuggestion] = useState<string | null>(null);
    const [suggestedItemId, setSuggestedItemId] = useState<string | null>(null);
    const [isGeneratingLibrarySuggestion, setIsGeneratingLibrarySuggestion] = useState(false);

    const updateStatus = useCallback(() => {
        if (timeSlots.length === 0) return;

        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();

        const isOptimal = timeSlots.some(slot => slot.day === currentDay && currentHour >= slot.start && currentHour < slot.end);

        if (isOptimal) {
            setStatus('optimal');
            setNextBestTime('');
        } else {
            setStatus('suboptimal');
            let foundNext = false;
            let nextSlotString = '';
            // Search for next slot today
            for (const slot of timeSlots) {
                if (slot.day === currentDay && currentHour < slot.start) {
                    nextSlotString = `Oggi alle ${slot.start}:00`;
                    setNextBestTime(nextSlotString);
                    foundNext = true;
                    break;
                }
            }
            // Search for next slot in the coming days
            if (!foundNext) {
                for (let i = 1; i <= 7; i++) {
                    const nextDay = (currentDay + i) % 7;
                    const nextDaySlots = timeSlots.filter(s => s.day === nextDay).sort((a,b) => a.start - b.start);
                    if (nextDaySlots.length > 0) {
                        nextSlotString = `${numberToDayName[nextDay]} alle ${nextDaySlots[0].start}:00`;
                        setNextBestTime(nextSlotString);
                        foundNext = true;
                        break;
                    }
                }
            }
             if (!foundNext) {
                nextSlotString = 'Nessuna fascia ottimale trovata nei prossimi 7 giorni.';
                setNextBestTime(nextSlotString);
            }
        }
    }, [timeSlots]);

     // Fetch strategic suggestion
    useEffect(() => {
        const fetchSuggestion = async () => {
            if (analysis && status === 'suboptimal' && nextBestTime && !isGeneratingSuggestion && !suggestion) {
                setIsGeneratingSuggestion(true);
                try {
                    const result = await suggestPostTypeForTimeSlot(analysis, nextBestTime);
                    if (result) {
                        setSuggestion(result.suggestion);
                        setPostTypeSuggestion(result.postType);
                        onScheduleIdentified(result.postType); // Trigger proactive generation
                    }
                } catch (error) {
                    console.error("Failed to fetch post type suggestion:", error);
                } finally {
                    setIsGeneratingSuggestion(false);
                }
            }
        };

        fetchSuggestion();
    }, [analysis, status, nextBestTime, isGeneratingSuggestion, suggestion, onScheduleIdentified]);
    
     // Fetch library suggestion once post type is known
    useEffect(() => {
        const fetchLibrarySuggestion = async () => {
            if (postTypeSuggestion && libraryItems.length > 0 && !isGeneratingLibrarySuggestion && !librarySuggestion) {
                setIsGeneratingLibrarySuggestion(true);
                try {
                    const result = await suggestContentFromLibrary(postTypeSuggestion, libraryItems);
                    if (result) {
                        setLibrarySuggestion(result.suggestion);
                        setSuggestedItemId(result.itemId);
                    }
                } catch (error) {
                     console.error("Failed to fetch library suggestion:", error);
                } finally {
                    setIsGeneratingLibrarySuggestion(false);
                }
            }
        };
        fetchLibrarySuggestion();
    }, [postTypeSuggestion, libraryItems, isGeneratingLibrarySuggestion, librarySuggestion]);


    useEffect(() => {
        const fetchAndSetAnalysis = async () => {
            setStatus('loading');
            try {
                const storedAnalysis = localStorage.getItem(ANALYSIS_STORAGE_KEY);
                if (storedAnalysis) {
                    setAnalysis(storedAnalysis);
                } else {
                    const freshAnalysis = await getLinkedInTimingAnalysis();
                    setAnalysis(freshAnalysis);
                    localStorage.setItem(ANALYSIS_STORAGE_KEY, freshAnalysis);
                }
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || "Errore nel caricare l'analisi strategica.");
            }
        };
        fetchAndSetAnalysis();
    }, []);

    useEffect(() => {
        if (analysis) {
            const slots = parseAnalysisToTimeSlots(analysis);
            setTimeSlots(slots);
            
            if (slots.length === 0) {
                // If analysis is fetched but no slots are parsed, it's no longer loading.
                // It's a suboptimal state because we can't determine the best time.
                setStatus('suboptimal');
                setNextBestTime('Analisi completata, ma non sono state trovate fasce orarie specifiche.');
            }
        }
    }, [analysis]);
    
    useEffect(() => {
        if(timeSlots.length > 0) {
            updateStatus();
            const interval = setInterval(updateStatus, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [timeSlots, updateStatus]);


    const getStatusUI = () => {
        switch (status) {
            case 'loading':
                return {
                    bgGradient: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-800/50',
                    textColor: 'text-slate-800 dark:text-slate-200',
                    iconColor: 'text-slate-400',
                    title: 'Analisi in corso...',
                    subtitle: 'Consulto i dati per darti il consiglio migliore.'
                };
            case 'error':
                 return {
                    bgGradient: 'from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-900/30',
                    textColor: 'text-red-800 dark:text-red-200',
                    iconColor: 'text-red-500',
                    title: 'Errore',
                    subtitle: errorMessage || 'Non è stato possibile caricare l\'analisi.'
                };
            case 'optimal':
                return {
                    bgGradient: 'from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-900/30',
                    textColor: 'text-green-800 dark:text-green-200',
                    iconColor: 'text-green-500',
                    title: 'È un ottimo momento per postare!',
                    subtitle: 'Il traffico su LinkedIn è al massimo. Aumenta la tua visibilità ora.'
                };
            case 'suboptimal':
            default:
                return {
                    bgGradient: 'from-indigo-100 to-violet-200 dark:from-indigo-900/50 dark:to-violet-900/30',
                    textColor: 'text-indigo-800 dark:text-indigo-200',
                    iconColor: 'text-indigo-500',
                    title: 'Pianifica la tua prossima mossa',
                    subtitle: `Il prossimo momento ideale per postare è: ${nextBestTime}`
                };
        }
    };
    
    const { bgGradient, textColor, iconColor, title, subtitle } = getStatusUI();
    const suggestedItem = libraryItems.find(item => item.id === suggestedItemId);

    return (
        <>
            <div className={`p-5 rounded-xl shadow-lg flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 transition-colors bg-gradient-to-br ${bgGradient}`}>
                <div className="flex-shrink-0">
                    <ClockIcon className={`w-12 h-12 ${iconColor}`} />
                </div>
                <div className="flex-grow text-center sm:text-left">
                    <h3 className={`text-xl font-bold ${textColor}`}>{title}</h3>
                    <p className={`mt-1 text-sm ${textColor}`}>{subtitle}</p>
                </div>
                {analysis && status !== 'loading' && (
                     <div className="flex-shrink-0 w-full sm:w-auto">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-white/60 dark:bg-black/20 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-white dark:hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white/50 transition-colors"
                        >
                            Mostra l'analisi
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isGeneratingSuggestion || suggestion) && (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-start space-x-4">
                        <div className="flex-shrink-0">
                            <LightBulbIcon className="w-8 h-8 text-yellow-500" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">Consiglio dell'Esperto</h4>
                            {isGeneratingSuggestion ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Analizzo la strategia migliore...</p>
                            ) : (
                                <p className="text-sm text-slate-600 dark:text-slate-300">{suggestion}</p>
                            )}
                            {postTypeSuggestion && !isGeneratingSuggestion && (
                                <button
                                     onClick={() => onApplySuggestion(postTypeSuggestion)}
                                     className="mt-2 flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500"
                                 >
                                     Applica Suggerimento
                                 </button>
                            )}
                        </div>
                    </div>
                )}
                 {(isGeneratingLibrarySuggestion || librarySuggestion) && (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-start space-x-4">
                        <div className="flex-shrink-0">
                             <LightBulbIcon className="w-8 h-8 text-amber-500" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">Consiglio dalla Tua Libreria</h4>
                            {isGeneratingLibrarySuggestion ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Cerco il contenuto perfetto per te...</p>
                            ) : (
                                 <p className="text-sm text-slate-600 dark:text-slate-300">{librarySuggestion}</p>
                            )}
                             {suggestedItem && !isGeneratingLibrarySuggestion && (
                                <button
                                     onClick={() => onApplyLibrarySuggestion(suggestedItem)}
                                     className="mt-2 flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 dark:text-amber-300 dark:bg-amber-900/50 dark:hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800/50 focus:ring-amber-500"
                                 >
                                     Usa "{suggestedItem.name}"
                                 </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analisi Strategica LinkedIn</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-sm bg-transparent p-0">{analysis}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};