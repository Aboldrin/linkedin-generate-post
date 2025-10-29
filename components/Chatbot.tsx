import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { startChatSession, sendMessageToChat, generateHashtagsForMeme, editImageWithPrompt } from '../services/geminiService';
import { ChatMessage, MessageAuthor, GeneratedPost } from '../types';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface ChatbotProps {
    post: GeneratedPost | null;
    onPostUpdate: (post: GeneratedPost) => void;
    initialChatContext?: string;
    setToastMessage: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const parseJsonFromMarkdown = <T,>(markdownString: string): T | null => {
  const match = markdownString.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]) as T;
    } catch (error) {
      console.error("Failed to parse JSON from markdown:", error);
      return null;
    }
  }
  try {
      return JSON.parse(markdownString) as T;
  } catch (error) {
     // Questo è normale per i messaggi di chat regolari, quindi non è necessario registrare un errore.
     return null;
  }
};

const ChatMessageItem: React.FC<{ message: ChatMessage; onApplyUpdate: (content: string) => void }> = ({ message, onApplyUpdate }) => {
    // This is a simplified check. The new logic uses a JSON action, so a more robust check might be needed
    // if the model ever returns both a friendly message AND an update block.
    // For now, we assume the JSON action `update_post_text` is the trigger.
    const updateContent = useMemo(() => {
        if (message.author !== MessageAuthor.BOT) return null;
        const action = parseJsonFromMarkdown<{action: string; new_post_text?: string}>(message.content);
        if (action?.action === 'update_post_text' && action.new_post_text) {
            return action.new_post_text;
        }
        return null;
    }, [message]);

    const displayContent = useMemo(() => {
        if (updateContent) {
            return "Ho preparato una versione aggiornata del testo del tuo post. Puoi applicarla con il pulsante qui sotto.";
        }
        return message.content;
    }, [message.content, updateContent]);


    return (
        <div className={`flex ${message.author === MessageAuthor.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-xl flex flex-col ${
                message.author === MessageAuthor.USER ? 'bg-indigo-600 text-white' :
                message.author === MessageAuthor.BOT ? 'bg-slate-200 dark:bg-slate-700' :
                'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 w-full text-sm'
            }`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-3">
                    {displayContent}
                </div>
                {updateContent && (
                    <div className="border-t border-slate-300 dark:border-slate-600 p-2">
                        <button
                            onClick={() => onApplyUpdate(updateContent)}
                            className="w-full text-left px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900"
                        >
                            Applica questa versione
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// @ts-ignore
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;


export const Chatbot: React.FC<ChatbotProps> = ({ post, onPostUpdate, initialChatContext, setToastMessage }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [imageForEdit, setImageForEdit] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    // FIX: Cannot find name 'SpeechRecognition'. Replaced with 'any' as the type definition is not available in the project's TypeScript configuration.
    const recognitionRef = useRef<any | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, progressMessage, imageForEdit]);

    useEffect(() => {
        if (post) {
            setIsLoading(true);
            setImageForEdit(null); // Clear any pending image from previous post
            startChatSession(post, initialChatContext)
                .then(() => {
                    let initialBotMessage: string;
                    if (initialChatContext) {
                        initialBotMessage = "Ho analizzato il documento che hai caricato. Come vuoi che trasformi questo testo in un post per LinkedIn? Posso creare un riassunto, un post con domande o un'analisi approfondita.";
                    } else if (post.memeText) {
                        initialBotMessage = "Ho generato il tuo meme. Puoi chiedermi di modificare l'immagine (es. 'rimuovi lo sfondo'), di cambiare il testo del meme, o di scrivere il testo di accompagnamento.";
                    } else {
                        initialBotMessage = "Ho caricato la bozza. Sono pronto a migliorarla. Chiedimi pure di renderla più incisiva o di cambiare il tono.";
                    }
                    setMessages([
                        { author: MessageAuthor.BOT, content: initialBotMessage }
                    ]);
                })
                .catch(err => {
                    setToastMessage({ message: `Errore nell'inizializzare la chat: ${err.message}`, type: 'error' });
                })
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
        }
    }, [post?.id, initialChatContext]);
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
             if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setToastMessage({ message: "L'immagine è troppo grande (max 4MB).", type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageForEdit(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        if (event.target) {
          event.target.value = '';
        }
    };

    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || isLoading || !post) return;
        
        const userMessage: ChatMessage = { author: MessageAuthor.USER, content: userInput };
        setMessages(prev => [...prev, userMessage]);
        const userRequest = userInput;
        setUserInput('');
        setIsLoading(true);
        setProgressMessage('');

        try {
             // Prioritize editing an attached image
            if (imageForEdit) {
                 const newImageUrl = await editImageWithPrompt(imageForEdit, userRequest, setProgressMessage);
                 const updatedPost: GeneratedPost = {
                    ...post,
                    imageUrl: newImageUrl,
                    memeText: '', 
                    originalImagePrompt: `Immagine modificata con il prompt: "${userRequest}"`,
                 };
                 onPostUpdate(updatedPost);
                 setToastMessage({ message: "Ecco l'immagine modificata!", type: 'success' });
                 setImageForEdit(null);
            } else {
                 // Regular chat interaction
                const botResponseText = await sendMessageToChat(userRequest);
                const actionData = parseJsonFromMarkdown<{ action: string; instruction?: string; new_text?: string; new_post_text?: string }>(botResponseText);

                if (actionData?.action === 'edit_image' && actionData.instruction) {
                    if (!post.imageUrl) {
                        throw new Error("Non c'è un'immagine da modificare.");
                    }
                    const newImageUrl = await editImageWithPrompt(post.imageUrl, actionData.instruction, setProgressMessage);
                    const updatedPost: GeneratedPost = { ...post, imageUrl: newImageUrl, originalImagePrompt: `Modificata con: "${actionData.instruction}"` };
                    onPostUpdate(updatedPost);
                    setToastMessage({ message: "Ho modificato l'immagine come richiesto.", type: 'success' });
                
                } else if (actionData?.action === 'edit_meme_text' && actionData.new_text) {
                    const updatedPost: GeneratedPost = { ...post, memeText: actionData.new_text };
                    onPostUpdate(updatedPost);
                    setToastMessage({ message: "Testo del meme aggiornato.", type: 'success' });
                
                } else if (actionData?.action === 'update_post_text' && actionData.new_post_text) {
                    // The ChatMessageItem component will render the "Apply" button based on this JSON
                    setMessages(prev => [...prev, { author: MessageAuthor.BOT, content: botResponseText }]);

                } else if (actionData?.action === 'generate_hashtags') {
                     const newHashtags = await generateHashtagsForMeme(post, setProgressMessage);
                     onPostUpdate({ ...post, hashtags: newHashtags });
                     setToastMessage({ message: "Ho aggiunto gli hashtag al post.", type: 'success' });
                }
                else {
                    // Regular text response from bot
                    setMessages(prev => [...prev, { author: MessageAuthor.BOT, content: botResponseText }]);
                }
            }
        } catch (error: any) {
             setToastMessage({ message: `Errore: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    }, [userInput, isLoading, post, onPostUpdate, imageForEdit, setToastMessage]);

    const handleApplyUpdate = (newContent: string) => {
        if (!post) return;
        onPostUpdate({ ...post, postContent: newContent });
        setToastMessage({ message: "Post aggiornato con la versione suggerita.", type: 'success' });
    };
    
    const handleToggleListening = () => {
        if (!SpeechRecognitionAPI) {
            setToastMessage({ message: "Il riconoscimento vocale non è supportato.", type: 'error' });
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'it-IT';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                let errorMsg = "Errore nel riconoscimento vocale.";
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    errorMsg = "Accesso al microfono negato. Abilitalo nelle impostazioni del browser.";
                } else if (event.error === 'no-speech') {
                    errorMsg = "Non ho sentito nulla. Prova a parlare più forte.";
                }
                setToastMessage({ message: errorMsg, type: 'error' });
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(transcript);
            };
            
            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    return (
        <div className="w-full lg:w-1/2 p-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Perfeziona con l'AI</h2>
            <div role="log" aria-live="polite" className="flex-grow bg-slate-100 dark:bg-slate-900/70 rounded-lg p-4 mb-4 overflow-y-auto flex flex-col space-y-4">
                {messages.map((msg, index) => (
                   <ChatMessageItem key={index} message={msg} onApplyUpdate={handleApplyUpdate} />
                ))}
                 {isLoading && messages.length > 0 && (messages[messages.length - 1].author === MessageAuthor.USER || progressMessage) && (
                    <div className="flex justify-start">
                         <div className="max-w-xs p-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                           {progressMessage ? (
                                <p className="text-sm italic">{progressMessage}</p>
                           ) : (
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                           )}
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} />

            {imageForEdit && (
                <div className="mb-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg relative self-start">
                    <img src={imageForEdit} alt="Anteprima per la modifica" className="max-h-24 rounded" />
                    <button
                        onClick={() => setImageForEdit(null)}
                        className="absolute -top-2 -right-2 bg-slate-600 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Rimuovi immagine"
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
            )}

            {isLoading && !progressMessage ? (
                <div role="status" className="flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-900/70 rounded-lg min-h-[52px]">
                    <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse [animation-delay:0.4s]"></div>
                        <span>L'AI sta elaborando...</span>
                    </div>
                </div>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!post || isLoading}
                        className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500 transition-colors"
                        aria-label="Allega immagine"
                    >
                        <PaperclipIcon className="w-5 h-5" />
                    </button>
                    <label htmlFor="chat-input" className="sr-only">Messaggio per il chatbot</label>
                    <input
                        type="text"
                        id="chat-input"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder={
                            !post ? "Genera un post per iniziare" :
                            isListening ? "Sto ascoltando..." :
                            imageForEdit ? "Descrivi come modificare l'immagine..." :
                            "Chiedi una modifica..."
                        }
                        disabled={!post || isLoading}
                        className="flex-grow block w-full px-4 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-full shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                    />
                     <button
                        type="button"
                        onClick={handleToggleListening}
                        disabled={!post || isLoading}
                        className={`p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500 disabled:opacity-50 ${
                            isListening
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                        aria-label={isListening ? 'Interrompi registrazione' : 'Avvia registrazione vocale'}
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button
                        type="submit"
                        disabled={!userInput.trim() || isLoading}
                        className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500 transition-colors"
                        aria-label="Invia Messaggio"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            )}
        </div>
    );
};