import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateLinkedInPost, suggestHotTopics } from '../services/geminiService';
import { GeneratedPost, ContentToLoad } from '../types';
import { ShareIcon } from './icons/ShareIcon';
import { StarIcon } from './icons/StarIcon';
import { LinkedInIcon } from './icons/LinkedInIcon';
import { BrainIcon } from './icons/BrainIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { FeedIcon } from './icons/FeedIcon';
import { MessageIcon } from './icons/MessageIcon';


const TOPICS = [
    "Nessuna Selezione",
    "Sicurezza Informatica", 
    "Cloud Computing", 
    "Trend di Sviluppo Software", 
    "IA nel Recruiting", 
    "Cultura DevOps", 
    "Lavoro da Remoto nel Tech",
    "Digital Transformation",
    "Big Data & Analytics",
    "L'importanza delle Soft Skills",
    "Diversity & Inclusion in IT",
    "User Experience (UX) Design",
    "Blockchain",
    "Sviluppo Low-Code/No-Code",
    "Internet of Things (IoT)",
    "Consigli di Carriera per Sviluppatori",
    "Metaverso e Web3",
    "Edge Computing",
    "Altro"
];
const STYLES = [
    "Nessuna Selezione",
    "Domanda", 
    "Punto di Vista", 
    "Ultim'ora Tech",
    "Consiglio Rapido",
    "Case Study di Successo",
    "Mito da Sfatare",
    "Previsione Futura",
    "Guida Step-by-Step",
    "Sondaggio"
];
const TONES = [
    "Nessuna Selezione",
    "Professionale ma accessibile",
    "Amichevole e coinvolgente",
    "Formale e istituzionale",
    "Tecnico e dettagliato",
    "Stile 'I Simpson' (umoristico)"
];

const MEDIA_TYPES = [
    { value: 'none', label: 'Nessuno' },
    { value: 'image', label: 'Immagine' },
    { value: 'meme', label: 'Immagine con Testo (Meme)' }
];

const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 (Orizzontale)' },
    { value: '1:1', label: '1:1 (Quadrato)' },
    { value: '9:16', label: '9:16 (Verticale)' }
];


const DRAFT_STORAGE_KEY = 'linkedinPostGeneratorDraft';

interface PostGeneratorProps {
    onPostGenerated: (post: GeneratedPost | null, initialChatContext?: string) => void;
    setIsLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    setToastMessage: (toast: { message: string; type: 'success' | 'error' } | null) => void;
    post: GeneratedPost | null;
    addFavorite: (post: GeneratedPost) => void;
    removeFavorite: (postId: string) => void;
    isFavorite: (postId: string) => boolean;
    suggestedPostType: string | null;
    onSuggestionApplied: () => void;
    contentToLoad: ContentToLoad | null;
    onContentLoaded: () => void;
}

interface ShareModalProps {
    post: GeneratedPost | null;
    finalImageUrl?: string;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ post, finalImageUrl, onClose }) => {
    if (!post) return null;

    const [copySuccess, setCopySuccess] = useState('');

    const formatPostForClipboard = useCallback(() => {
        if (!post) return '';
        if (post.poll) {
            const pollOptions = post.poll.options.map(opt => `- ${opt}`).join('\n');
            const hashtags = post.hashtags.map(h => `#${h}`).join(' ');
            return `--- TESTO INTRODUTTIVO ---\n${post.postContent}\n\n--- DOMANDA SONDAGGIO ---\n${post.poll.question}\n\n--- OPZIONI ---\n${pollOptions}\n\n--- HASHTAGS ---\n${hashtags}`;
        } else {
            const postText = post.postContent || '';
            const hashtagsText = post.hashtags.map(h => `#${h}`).join(' ');
            return `${postText}${postText && hashtagsText ? '\n\n' : ''}${hashtagsText}`;
        }
    }, [post]);

    const formattedText = formatPostForClipboard();

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedText).then(() => {
            setCopySuccess('Testo copiato!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Copia fallita.');
        });
    };
    
    const downloadImage = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleDownload = () => {
        if (finalImageUrl) {
            downloadImage(finalImageUrl, 'linkedin-post-image.jpg');
        }
    };

    const handleOpenFeed = () => {
        window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
    };
    
    const handleOpenMessaging = () => {
        window.open('https://www.linkedin.com/messaging/', '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Condividi Post</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">1. Copia il testo del post</label>
                        <div className="relative">
                            <textarea
                                readOnly
                                value={formattedText}
                                className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/50 resize-none"
                            />
                            <button onClick={handleCopy} className="absolute top-2 right-2 px-3 py-1 text-sm font-semibold rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900">
                                {copySuccess || 'Copia'}
                            </button>
                        </div>
                    </div>
                    {finalImageUrl && (
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">2. Scarica l'immagine (se necessario)</label>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <img src={finalImageUrl} alt="Anteprima immagine" className="rounded-lg w-32 h-32 object-cover border dark:border-slate-700" />
                                <button onClick={handleDownload} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                    Scarica Immagine
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">3. Pubblica su LinkedIn</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleOpenFeed}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-800"
                            >
                                <FeedIcon className="w-5 h-5 mr-2" />
                                Pubblica sul Feed
                            </button>
                             <button
                                onClick={handleOpenMessaging}
                                className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 dark:border-blue-800 text-sm font-medium rounded-lg text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                            >
                                <MessageIcon className="w-5 h-5 mr-2" />
                                Invia Messaggio Privato
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to convert data URL to File object for Web Share API
const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
};

// Helper component for auto-resizing textarea
const EditableTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;

        if(props.onChange) {
            props.onChange(e);
        }
    }

    return <textarea ref={textareaRef} {...props} onChange={handleChange} />;
}

const PostPreviewSkeleton: React.FC = () => (
    <div aria-label="Caricamento contenuto post" className="animate-pulse space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow-md">
        <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
        </div>
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
    </div>
);


export const PostGenerator: React.FC<PostGeneratorProps> = ({ 
    onPostGenerated, 
    isLoading, 
    setIsLoading, 
    setToastMessage,
    post, 
    addFavorite, 
    removeFavorite, 
    isFavorite,
    suggestedPostType,
    onSuggestionApplied,
    contentToLoad,
    onContentLoaded
}) => {
    const [topic, setTopic] = useState(TOPICS[0]);
    const [customTopic, setCustomTopic] = useState('');
    const [topicError, setTopicError] = useState('');
    const [style, setStyle] = useState(STYLES[0]);
    const [tone, setTone] = useState(TONES[0]);
    const [mediaType, setMediaType] = useState<'none' | 'image' | 'meme'>('none');
    const [customImagePrompt, setCustomImagePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [memeLanguage, setMemeLanguage] = useState('it');
    const [imageSource, setImageSource] = useState<'ai' | 'upload'>('ai');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState('');
    
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSuggestingTopic, setIsSuggestingTopic] = useState(false);
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [finalImageUrl, setFinalImageUrl] = useState<string | undefined>(undefined);


    // Apply suggestion from SmartScheduler
    useEffect(() => {
        if (suggestedPostType) {
            if (suggestedPostType.toLowerCase() === 'meme') {
                setMediaType('meme');
                setStyle(STYLES[0]); // Reset style if meme is selected
            } else {
                 if (suggestedPostType.toLowerCase() === 'image') {
                    setMediaType('image');
                }
                const styleExists = STYLES.find(s => s === suggestedPostType);
                if (styleExists) {
                    setStyle(styleExists);
                }
            }
            onSuggestionApplied(); // Notify parent to clear the suggestion
        }
    }, [suggestedPostType, onSuggestionApplied]);

    // Load content from library
    useEffect(() => {
        if (contentToLoad) {
            resetFormAndPost();
            if (contentToLoad.type === 'image') {
                setImageSource('upload');
                setUploadedImage(contentToLoad.data);
                setMediaType('image');
                 // Create a placeholder post to show the image immediately
                const placeholderPost: GeneratedPost = {
                    id: `loaded_${Date.now()}`,
                    postContent: '',
                    hashtags: [],
                    sources: [],
                    imageUrl: contentToLoad.data,
                    originalImagePrompt: `Immagine caricata: ${contentToLoad.name}`,
                };
                onPostGenerated(placeholderPost);
            } else if (contentToLoad.type === 'text') {
                setTopic('Altro');
                setCustomTopic(`Basato sul documento: ${contentToLoad.name}`);
                // Create a placeholder post and pass the text as initial context for the chatbot
                 const placeholderPost: GeneratedPost = {
                    id: `loaded_${Date.now()}`,
                    postContent: `*Contenuto caricato da "${contentToLoad.name}". Usa la chat per trasformarlo in un post...*`,
                    hashtags: [],
                    sources: []
                };
                onPostGenerated(placeholderPost, contentToLoad.data);
            }
            onContentLoaded();
        }
    }, [contentToLoad, onContentLoaded, onPostGenerated]);


    // Load draft on initial mount
    useEffect(() => {
        if (!post) { // Only load if there isn't a post already
            try {
                const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
                if (savedDraft) {
                    const parsedDraft: GeneratedPost = JSON.parse(savedDraft);
                    onPostGenerated(parsedDraft);
                }
            } catch (err) {
                console.error("Failed to load draft from localStorage", err);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        }
    }, []); // Runs only once on mount

    // Save draft whenever the post changes
    useEffect(() => {
        try {
            if (post) {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(post));
            } else {
                 localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        } catch (err) {
            console.error("Failed to save draft to localStorage", err);
        }
    }, [post]);

    const drawMemeOnCanvas = useCallback((imageUrl: string, memeText: string, textColor: string, strokeColor: string) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const aspectRatio = img.width / img.height;
            canvas.width = 1024;
            canvas.height = 1024 / aspectRatio;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Text styling - Modern meme look
            const fontSize = canvas.width / 18;
            ctx.font = `900 ${fontSize}px 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = textColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = fontSize / 8;


            const x = canvas.width / 2;
            const maxWidth = canvas.width * 0.9;
            
            // Text wrapping logic
            const words = memeText.toUpperCase().split(' ');
            let line = '';
            const lines = [];
            const lineHeight = fontSize * 1.1;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Calculate vertical position to anchor text at the bottom
            const totalTextHeight = (lines.length -1) * lineHeight;
            let startY = canvas.height - totalTextHeight - (canvas.height * 0.05); // 5% margin from bottom

            lines.forEach((currentLine, index) => {
                const lineY = startY + (index * lineHeight);
                ctx.strokeText(currentLine.trim(), x, lineY);
                ctx.fillText(currentLine.trim(), x, lineY);
            });
            
            setFinalImageUrl(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => {
             // Fallback to original image if there's an error loading it on canvas
            setFinalImageUrl(imageUrl);
        }
    }, []);

    useEffect(() => {
        if (post?.imageUrl && post?.memeText) {
            drawMemeOnCanvas(post.imageUrl, post.memeText, post.memeTextColor || '#FFFFFF', post.memeStrokeColor || '#000000');
        } else if (post?.imageUrl) {
            setFinalImageUrl(post.imageUrl);
        } else {
            setFinalImageUrl(undefined);
        }
    }, [post, drawMemeOnCanvas]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
             if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setUploadError('L\'immagine è troppo grande. Il limite è 4MB.');
                setUploadedImage(null);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setUploadError('');
            };
            reader.readAsDataURL(file);
        }
    }
    
    const resetFormAndPost = useCallback(() => {
        // Reset local form state
        setTopic(TOPICS[0]);
        setCustomTopic('');
        setStyle(STYLES[0]);
        setTone(TONES[0]);
        setMediaType('none');
        setCustomImagePrompt('');
        setAspectRatio('1:1');
        setMemeLanguage('it');
        setImageSource('ai');
        setUploadedImage(null);
        setTopicError('');
        setUploadError('');
        setSuggestedTopics([]);

        // Clear the generated post in the parent component
        onPostGenerated(null);
    }, [onPostGenerated]);


    const handleGeneratePost = useCallback(async () => {
        const finalTopicValue = topic === 'Altro' ? customTopic : topic;
        if (topic === 'Altro' && !customTopic.trim()) {
            setTopicError('Per favore, inserisci un argomento personalizzato.');
            return;
        }

        if (mediaType !== 'none' && imageSource === 'upload' && !uploadedImage) {
            setUploadError('Per favore, carica un\'immagine prima di generare il post.');
            return;
        }
        
        setToastMessage(null);
        
        // Don't reset if we are building upon an uploaded image
        if (!uploadedImage) {
            resetFormAndPost();
        }
        
        setIsLoading(true);
        setLoadingMessage('Inizio della generazione...');
        setFinalImageUrl(undefined);

        try {
            const finalMediaType = style === 'Sondaggio' ? 'none' : mediaType;
            const uploadedImageData = (finalMediaType !== 'none' && imageSource === 'upload' && uploadedImage)
                ? { dataUrl: uploadedImage }
                : null;

            const generatedPost = await generateLinkedInPost(finalTopicValue, style, tone, finalMediaType, customImagePrompt, aspectRatio, memeLanguage, uploadedImageData, setLoadingMessage);
            onPostGenerated(generatedPost);
            setToastMessage({ message: 'Post generato con successo!', type: 'success' });
        } catch (err: any) {
            console.error(err);
            setToastMessage({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [topic, customTopic, style, tone, mediaType, customImagePrompt, aspectRatio, memeLanguage, imageSource, uploadedImage, setIsLoading, onPostGenerated, setToastMessage, resetFormAndPost]);
    
    const handleSuggestTopic = useCallback(async () => {
        setIsSuggestingTopic(true);
        setSuggestionError(null);
        setSuggestedTopics([]);
        try {
            const topics = await suggestHotTopics();
            setSuggestedTopics(topics);
        } catch (err: any) {
            setSuggestionError(err.message || "Si è verificato un errore durante il suggerimento degli argomenti.");
        } finally {
            setIsSuggestingTopic(false);
        }
    }, []);
    
    const formatPostForSharing = useCallback(() => {
        if (!post) return '';
        if (post.poll) {
            const pollOptions = post.poll.options.map(opt => `- ${opt}`).join('\n');
            const hashtags = post.hashtags.map(h => `#${h}`).join(' ');
            return `${post.postContent}\n\nDomanda: ${post.poll.question}\n${pollOptions}\n\n${hashtags}`;
        } else {
            const postText = post.postContent || '';
            const hashtagsText = post.hashtags.map(h => `#${h}`).join(' ');
            return `${postText}${postText && hashtagsText ? '\n\n' : ''}${hashtagsText}`;
        }
    }, [post]);

    const handleShare = async () => {
        if (!post) return;

        const shareText = formatPostForSharing();
        
        // Use Web Share API if available (modern browsers, mobile)
        if (navigator.share) {
            try {
                const shareData: ShareData = {
                    text: shareText,
                };

                if (finalImageUrl) {
                    const imageFile = await dataUrlToFile(finalImageUrl, 'linkedin-post-image.jpg');
                    if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                         shareData.files = [imageFile];
                    } else {
                        // Fallback for when file sharing isn't supported, but text is.
                        shareData.text += `\n\n(Immagine disponibile per il download nell'app)`;
                    }
                }
                
                await navigator.share(shareData);

            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback to modal for older browsers
            setIsShareModalOpen(true);
        }
    };


    const handleSelectSuggestedTopic = (selectedTopic: string) => {
        setTopic('Altro');
        setCustomTopic(selectedTopic);
        setSuggestedTopics([]);
    };
    
    const handleToggleFavorite = () => {
        if (!post) return;
        
        if (isFavorite(post.id)) {
            removeFavorite(post.id);
        } else {
            addFavorite(post);
        }
    }
    
    const handleMemeColorChange = (type: 'text' | 'stroke', color: string) => {
        if (!post) return;
        const updatedPost = { ...post };
        if (type === 'text') {
            updatedPost.memeTextColor = color;
        } else {
            updatedPost.memeStrokeColor = color;
        }
        onPostGenerated(updatedPost);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!post) return;
        onPostGenerated({ ...post, postContent: e.target.value });
    };

    const handlePollQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!post?.poll) return;
        onPostGenerated({
            ...post,
            poll: { ...post.poll, question: e.target.value }
        });
    };

    const handlePollOptionChange = (index: number, value: string) => {
        if (!post?.poll) return;
        const newOptions = [...post.poll.options];
        newOptions[index] = value;
        onPostGenerated({
            ...post,
            poll: { ...post.poll, options: newOptions }
        });
    };


    const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
        <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    {number}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            </div>
            <div className="pl-11">
                {children}
            </div>
        </div>
    );

    const editableInputClasses = "w-full bg-transparent border-0 rounded-md focus:ring-1 focus:ring-inset focus:ring-indigo-500 p-1 -m-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 focus:bg-slate-100 dark:focus:bg-slate-700/50 transition-colors";
    const editableTextareaClasses = `${editableInputClasses} resize-none`;

    return (
        <div className="w-full lg:w-1/2 p-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Crea il tuo Post</h2>
             
            {suggestionError && <div role="alert" className="text-red-700 dark:text-red-400 text-sm p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">{suggestionError}</div>}
            
            <form onSubmit={(e) => { e.preventDefault(); handleGeneratePost(); }} className="flex flex-col space-y-6">
                
                <div className="space-y-4">
                   <Step number={1} title="Definisci il Contenuto">
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="topic-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Argomento</label>
                                <select id="topic-select" value={topic} onChange={e => setTopic(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                                </select>
                                 {topic === 'Altro' && (
                                    <div className="mt-2">
                                        <label htmlFor="custom-topic-input" className="sr-only">Argomento personalizzato</label>
                                        <input
                                            type="text"
                                            id="custom-topic-input"
                                            value={customTopic}
                                            onChange={e => {
                                                setCustomTopic(e.target.value);
                                                if (topicError) setTopicError('');
                                            }}
                                            placeholder="Inserisci il tuo argomento"
                                            aria-invalid={!!topicError}
                                            aria-describedby="topic-error"
                                            className={`block w-full text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${topicError ? 'border-red-500 ring-red-500' : ''}`}
                                        />
                                        {topicError && <p id="topic-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{topicError}</p>}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleSuggestTopic}
                                disabled={isSuggestingTopic || isLoading}
                                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-200 dark:border-indigo-800 text-sm font-semibold rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 transition-colors"
                            >
                                <BrainIcon className="w-5 h-5 mr-2" />
                                {isSuggestingTopic ? 'Cerco i trend...' : 'Non sai cosa scrivere? Suggerisci un trend'}
                            </button>
                             {suggestedTopics.length > 0 && (
                                <div className="p-3 bg-indigo-50 dark:bg-slate-700/50 rounded-lg">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Ecco 3 argomenti caldi:</h3>
                                    <div className="flex flex-col space-y-2">
                                        {suggestedTopics.map((topic, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleSelectSuggestedTopic(topic)}
                                                className="w-full text-left px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-700 rounded-md hover:bg-indigo-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors"
                                            >
                                                {topic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="style-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stile</label>
                                    <select id="style-select" value={style} onChange={e => setStyle(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                        {STYLES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tone-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tono</label>
                                    <select id="tone-select" value={tone} onChange={e => setTone(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                        {TONES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                   </Step>
                   <Step number={2} title="Aggiungi un Tocco Visual">
                         <div className="space-y-4">
                            <div>
                                <label htmlFor="media-type-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo di Media</label>
                                <select
                                    id="media-type-select"
                                    value={style === 'Sondaggio' ? 'none' : mediaType}
                                    disabled={style === 'Sondaggio'}
                                    onChange={(e) => setMediaType(e.target.value as 'none' | 'image' | 'meme')}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-700/50 disabled:text-slate-500"
                                >
                                    {MEDIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            
                            {mediaType !== 'none' && style !== 'Sondaggio' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg space-y-4 border dark:border-slate-700">
                                    <h4 className="text-md font-semibold text-slate-800 dark:text-white">Opzioni Immagine</h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sorgente</label>
                                        <fieldset className="mt-2">
                                            <legend className="sr-only">Scegli la sorgente dell'immagine</legend>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center">
                                                    <input id="source-ai" name="image-source" type="radio" value="ai" checked={imageSource === 'ai'} onChange={(e) => setImageSource(e.target.value as 'ai' | 'upload')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:checked:bg-indigo-500" />
                                                    <label htmlFor="source-ai" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Genera con AI</label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input id="source-upload" name="image-source" type="radio" value="upload" checked={imageSource === 'upload'} onChange={(e) => setImageSource(e.target.value as 'ai' | 'upload')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:checked:bg-indigo-500" />
                                                    <label htmlFor="source-upload" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Carica</label>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                    
                                    {imageSource === 'ai' ? (
                                        <>
                                            <div>
                                                <label htmlFor="custom-image-prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione (Prompt)</label>
                                                <input
                                                    id="custom-image-prompt"
                                                    type="text"
                                                    value={customImagePrompt}
                                                    onChange={e => setCustomImagePrompt(e.target.value)}
                                                    placeholder="Es: Un robot che stringe la mano a un umano"
                                                    className="block w-full text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lascia vuoto per un'immagine generata automaticamente.</p>
                                            </div>
                                            <div>
                                                <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato</label>
                                                <select
                                                    id="aspect-ratio-select"
                                                    value={aspectRatio}
                                                    onChange={(e) => setAspectRatio(e.target.value)}
                                                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                         <div>
                                            <label htmlFor="image-upload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Il tuo file</label>
                                            <input 
                                                id="image-upload" 
                                                type="file" 
                                                onChange={handleImageUpload} 
                                                accept="image/png, image/jpeg, image/webp" 
                                                className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                  file:mr-4 file:py-2 file:px-4
                                                  file:rounded-lg file:border-0
                                                  file:text-sm file:font-semibold
                                                  file:bg-indigo-50 dark:file:bg-indigo-900/50
                                                  file:text-indigo-700 dark:file:text-indigo-300
                                                  hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
                                            />
                                            {uploadError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
                                            {uploadedImage && (
                                                <div className="mt-4">
                                                    <img src={uploadedImage} alt="Anteprima immagine caricata" className="rounded-lg max-h-48 w-auto border dark:border-slate-600" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {mediaType === 'meme' && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                            <label htmlFor="meme-language-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lingua del Meme</label>
                                            <select
                                                id="meme-language-select"
                                                value={memeLanguage}
                                                onChange={(e) => setMemeLanguage(e.target.value)}
                                                className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="it">Italiano (Corretto)</option>
                                                <option value="en">Inglese</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                   </Step>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <span role="img" aria-label="razzo" className="mr-2 text-xl">🚀</span>
                    {isLoading ? (loadingMessage || 'Generazione in corso...') : 'Genera Post'}
                </button>
            </form>
            
            { isLoading && loadingMessage && (
                <div className="sr-only" role="status" aria-live="polite">
                    {loadingMessage}
                </div>
            )}
            
            <div className="mt-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Anteprima Post</h3>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                
                {isShareModalOpen && <ShareModal post={post} finalImageUrl={finalImageUrl} onClose={() => setIsShareModalOpen(false)} />}
                
                {isLoading && !post && <PostPreviewSkeleton />}

                {post && (
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 relative flex flex-col space-y-4 shadow-md">
                         
                        <div className="absolute top-3 right-3 flex items-center space-x-1 z-10">
                            <button onClick={handleToggleFavorite} aria-label={isFavorite(post.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500">
                                <StarIcon className={`w-5 h-5 ${isFavorite(post.id) ? 'text-yellow-400' : ''}`} solid={isFavorite(post.id)} />
                            </button>
                        </div>

                        <div className="flex items-center space-x-3 pr-20">
                            <UserCircleIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">Tu</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Recruiter IT • Content Creator</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {post.poll ? (
                                <div>
                                    <EditableTextarea
                                        value={post.postContent}
                                        onChange={handleContentChange}
                                        className={`${editableTextareaClasses} dark:text-slate-300 text-slate-700 text-sm mb-4`}
                                        placeholder="Testo introduttivo del sondaggio..."
                                        rows={2}
                                        aria-label="Testo introduttivo del sondaggio, modificabile"
                                    />
                                    <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                        <input
                                            type="text"
                                            value={post.poll.question}
                                            onChange={handlePollQuestionChange}
                                            className={`${editableInputClasses} font-bold text-slate-800 dark:text-white`}
                                            placeholder="Domanda del sondaggio"
                                            aria-label="Domanda del sondaggio, modificabile"
                                        />
                                        <div className="mt-3 space-y-2">
                                            {post.poll.options.map((option, index) => (
                                                <div key={index} className="flex items-center p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                                                        className={`${editableInputClasses} text-sm text-slate-700 dark:text-slate-300`}
                                                        placeholder={`Opzione ${index + 1}`}
                                                        aria-label={`Opzione ${index + 1} del sondaggio, modificabile`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {post.postContent !== undefined && (
                                        <EditableTextarea
                                            value={post.postContent}
                                            onChange={handleContentChange}
                                            className={`${editableTextareaClasses} text-sm dark:text-slate-200 text-slate-800`}
                                            placeholder="Il testo del tuo post apparirà qui..."
                                            rows={4}
                                            aria-label="Contenuto del post, modificabile"
                                        />
                                    )}
                                    {finalImageUrl && (
                                        <div className="mt-2 relative">
                                            <img src={finalImageUrl} alt="Immagine generata per il post" className="rounded-lg w-full object-contain border dark:border-slate-700" />
                                            {post.memeText && (
                                                <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-lg">
                                                    <div className="flex items-center gap-1">
                                                        <label htmlFor="meme-text-color" className="text-white text-xs font-semibold">Testo</label>
                                                        <input id="meme-text-color" type="color" value={post.memeTextColor || '#FFFFFF'} onChange={(e) => handleMemeColorChange('text', e.target.value)} className="w-6 h-6 bg-transparent border-none rounded cursor-pointer" />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                         <label htmlFor="meme-stroke-color" className="text-white text-xs font-semibold">Bordo</label>
                                                         <input id="meme-stroke-color" type="color" value={post.memeStrokeColor || '#000000'} onChange={(e) => handleMemeColorChange('stroke', e.target.value)} className="w-6 h-6 bg-transparent border-none rounded cursor-pointer" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <div className="pt-2 flex flex-wrap gap-2">
                                {post.hashtags.map(h => <span key={h} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">#{h}</span>)}
                            </div>
                            
                            {post.sources.length > 0 && (
                                <div className="mt-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fonti</h4>
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {post.sources.map((source, index) => source.web && source.web.uri && (
                                            <li key={index}>
                                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate block">
                                                    {source.web.title || source.web.uri}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        
                        <button
                            onClick={handleShare}
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500"
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            Condividi
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};