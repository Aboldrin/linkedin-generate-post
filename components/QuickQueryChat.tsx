import React, { useState, useRef, useEffect } from 'react';
import { RobotIcon } from './icons/RobotIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SendIcon } from './icons/SendIcon';
import { QuickQueryMessage, ProactiveSuggestion, GeneratedPost } from '../types';
import { generateLinkedInPost } from '../services/geminiService';
import { CalendarIcon } from './icons/CalendarIcon';
import { StarIcon } from './icons/StarIcon';


interface QuickQueryChatProps {
  onQuery: (query: string) => Promise<string | ProactiveSuggestion>;
  onAddFavorite: (post: GeneratedPost) => void;
  onAddToCalendar: (post: GeneratedPost, details: ProactiveSuggestion) => void;
}

const SuggestedPostCard: React.FC<{
    post: GeneratedPost;
    details: ProactiveSuggestion;
    onSchedule: () => void;
    onSave: () => void;
}> = ({ post, details, onSchedule, onSave }) => {
    const [actionTaken, setActionTaken] = useState<'scheduled' | 'saved' | null>(null);

    const handleSchedule = () => {
        onSchedule();
        setActionTaken('scheduled');
    };

    const handleSave = () => {
        onSave();
        setActionTaken('saved');
    };
    
    const formattedDate = new Date(details.date + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="bg-slate-200 dark:bg-slate-700 rounded-xl p-3 max-w-xs">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="font-semibold">Ecco una bozza per te!</p>
                <p className="line-clamp-3">{post.postContent}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                {actionTaken ? (
                     <p className="text-sm font-semibold text-center text-green-600 dark:text-green-400">
                        {actionTaken === 'scheduled' ? `Pianificato per ${formattedDate}!` : 'Salvato nei preferiti!'}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleSchedule}
                            className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900"
                        >
                            <CalendarIcon className="w-4 h-4 mr-1.5" />
                            Pianifica per {formattedDate.split(' ')[1]}
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-300 text-slate-800 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                        >
                            <StarIcon className="w-4 h-4 mr-1.5" />
                            Salva per Dopo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


export const QuickQueryChat: React.FC<QuickQueryChatProps> = ({ onQuery, onAddFavorite, onAddToCalendar }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<QuickQueryMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isGeneratingDraft]);
    
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                { author: 'bot', text: "Ciao! Sono il tuo assistente di pianificazione. Chiedimi pure una preview dei contenuti della settimana o cosa postare domani." }
            ]);
        }
    }, [isOpen, messages.length]);


    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const userMsg: QuickQueryMessage = { author: 'user', text: userInput };
        setMessages(prev => [...prev, userMsg]);
        const queryText = userInput;
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await onQuery(queryText);
            
            if (typeof response === 'object' && response.date && response.postType && response.topic) {
                // It's a proactive suggestion, now generate the full post
                setIsGeneratingDraft(true);
                const generatedDraft = await generateLinkedInPost(
                    response.topic,
                    response.postType,
                    "Professionale ma accessibile",
                     Math.random() > 0.3 ? 'image' : 'none', // 70% chance of having an image
                    '', '1:1', 'it', null, () => {}
                );
                const botMsg: QuickQueryMessage = {
                    author: 'bot',
                    text: '', // Text is replaced by the card
                    suggestedPost: generatedDraft,
                    suggestionDetails: response
                };
                setMessages(prev => [...prev, botMsg]);

            } else {
                 // It's a regular text response
                const botMsg: QuickQueryMessage = { author: 'bot', text: response as string };
                setMessages(prev => [...prev, botMsg]);
            }
        } catch (error: any) {
            const errorMsg: QuickQueryMessage = { author: 'bot', text: `Si è verificato un errore: ${error.message}` };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setIsGeneratingDraft(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-indigo-500 z-50 transition-transform hover:scale-110"
                aria-label="Apri assistente di pianificazione"
            >
                <RobotIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200 dark:border-slate-700">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-t-2xl border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white">Assistente di Pianificazione</h3>
                        <button onClick={() => setIsOpen(false)} aria-label="Chiudi chat">
                            <XCircleIcon className="w-7 h-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.suggestedPost && msg.suggestionDetails ? (
                                    <SuggestedPostCard
                                        post={msg.suggestedPost}
                                        details={msg.suggestionDetails}
                                        onSchedule={() => onAddToCalendar(msg.suggestedPost!, msg.suggestionDetails!)}
                                        onSave={() => onAddFavorite(msg.suggestedPost!)}
                                    />
                                ) : (
                                    <div className={`max-w-xs rounded-xl p-3 ${
                                        msg.author === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                         { (isLoading || isGeneratingDraft) && (
                            <div className="flex justify-start">
                                 <div className="max-w-xs p-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.4s]"></div>
                                        <span>{isGeneratingDraft ? 'Preparo la bozza...' : 'Ci penso...'}</span>
                                    </div>
                                 </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Chiedi al tuo piano..."
                            disabled={isLoading}
                            className="flex-grow block w-full px-4 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-full shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <button type="submit" disabled={!userInput.trim() || isLoading} className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};