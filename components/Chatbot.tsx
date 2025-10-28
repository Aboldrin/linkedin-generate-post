import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startChatSession, sendMessageToChat, analyzeWithThinking } from '../services/geminiService';
import { ChatMessage, MessageAuthor } from '../types';
import { SendIcon } from './icons/SendIcon';
import { BrainIcon } from './icons/BrainIcon';

interface ChatbotProps {
    initialPostContent: string | null;
}

export const Chatbot: React.FC<ChatbotProps> = ({ initialPostContent }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (initialPostContent) {
            setIsLoading(true);
            startChatSession(initialPostContent)
                .then(() => {
                    setMessages([
                        { author: MessageAuthor.SYSTEM, content: "Post caricato. Ora puoi chiedermi di perfezionarlo." }
                    ]);
                })
                .catch(err => {
                    setMessages([{ author: MessageAuthor.SYSTEM, content: `Errore nell'inizializzare la chat: ${err.message}` }]);
                })
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
        }
    }, [initialPostContent]);

    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || isLoading) return;
        
        const newMessages: ChatMessage[] = [...messages, { author: MessageAuthor.USER, content: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const botResponse = await sendMessageToChat(userInput);
            setMessages([...newMessages, { author: MessageAuthor.BOT, content: botResponse }]);
        } catch (error: any) {
            setMessages([...newMessages, { author: MessageAuthor.SYSTEM, content: `Errore: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [userInput, isLoading, messages]);

    const handleDeepDive = useCallback(async () => {
        if (isLoading || messages.length === 0) return;
        
        const lastUserMessage = [...messages].reverse().find(m => m.author === MessageAuthor.USER || m.author === MessageAuthor.SYSTEM);
        const query = `Basandoti sulla nostra conversazione riguardo al post di LinkedIn, fornisci un'analisi più approfondita o una prospettiva alternativa su questo argomento: "${lastUserMessage?.content || initialPostContent}". Sii approfondito e acuto. Rispondi in italiano.`;

        const newMessages: ChatMessage[] = [...messages, { author: MessageAuthor.SYSTEM, content: "Eseguo un'analisi approfondita..." }];
        setMessages(newMessages);
        setIsLoading(true);
        
        try {
            const botResponse = await analyzeWithThinking(query);
            setMessages([...newMessages, { author: MessageAuthor.BOT, content: botResponse }]);
        } catch (error: any) {
            setMessages([...newMessages, { author: MessageAuthor.SYSTEM, content: `Errore durante l'analisi: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, initialPostContent]);

    return (
        <div className="w-full lg:w-1/2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Dai una scossa al tuo post!</h2>
            <div className="flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 overflow-y-auto flex flex-col space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.author === MessageAuthor.USER ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${
                            msg.author === MessageAuthor.USER ? 'bg-indigo-500 text-white' :
                            msg.author === MessageAuthor.BOT ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                            'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 w-full text-sm'
                        }`}>
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex justify-start">
                         <div className="max-w-xs p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder={initialPostContent ? "Chiedi delle modifiche..." : "Genera un post per iniziare a chattare"}
                    disabled={!initialPostContent || isLoading}
                    className="flex-grow block w-full px-4 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800/50"
                />
                <button
                    onClick={handleDeepDive}
                    disabled={isLoading || !initialPostContent}
                    className="p-2.5 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    aria-label="Analisi Approfondita"
                >
                    <BrainIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim()}
                    className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    aria-label="Invia Messaggio"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};