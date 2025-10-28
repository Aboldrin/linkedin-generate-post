import React, { useState, useCallback } from 'react';
import { generateLinkedInPost } from '../services/geminiService';
import { GeneratedPost } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { CopyIcon } from './icons/CopyIcon';
import { StarIcon } from './icons/StarIcon';

const TOPICS = [
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
    "Blockchain"
];
const STYLES = [
    "Domanda", 
    "Punto di Vista", 
    "Notizia del Settore", 
    "Consiglio Rapido",
    "Case Study di Successo",
    "Mito da Sfatare",
    "Previsione Futura",
    "Guida Step-by-Step"
];

interface PostGeneratorProps {
    onPostGenerated: (post: GeneratedPost) => void;
    setIsLoading: (isLoading: boolean) => void;
    isLoading: boolean;
    error: string | null;
    post: GeneratedPost | null;
    addFavorite: (post: GeneratedPost) => void;
    removeFavorite: (postId: string) => void;
    isFavorite: (postId: string) => boolean;
}

export const PostGenerator: React.FC<PostGeneratorProps> = ({ onPostGenerated, isLoading, setIsLoading, error, post, addFavorite, removeFavorite, isFavorite }) => {
    const [topic, setTopic] = useState(TOPICS[0]);
    const [style, setStyle] = useState(STYLES[0]);
    const [shouldGenerateImage, setShouldGenerateImage] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');

    const handleGeneratePost = useCallback(async () => {
        setIsLoading(true);
        try {
            const generatedPost = await generateLinkedInPost(topic, style, shouldGenerateImage);
            onPostGenerated(generatedPost);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [topic, style, shouldGenerateImage, setIsLoading, onPostGenerated]);
    
    const handleCopyToClipboard = () => {
        if (!post) return;
        const fullPostText = `${post.postContent}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`;
        navigator.clipboard.writeText(fullPostText).then(() => {
            setCopySuccess('Copiato!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            setCopySuccess('Copia fallita!');
            console.error('Could not copy text: ', err);
        });
    };
    
    const handleToggleFavorite = () => {
        if (!post) return;
        if (isFavorite(post.id)) {
            removeFavorite(post.id);
        } else {
            addFavorite(post);
        }
    }

    return (
        <div className="w-full lg:w-1/2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Generatore di Post</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Argomento</label>
                    <select id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {TOPICS.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stile</label>
                    <select id="style" value={style} onChange={e => setStyle(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {STYLES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex items-center">
                <input
                    id="generate-image"
                    name="generate-image"
                    type="checkbox"
                    checked={shouldGenerateImage}
                    onChange={(e) => setShouldGenerateImage(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-900"
                />
                <label htmlFor="generate-image" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Aggiungi un'immagine (sperimentale)
                </label>
            </div>


            <button
                onClick={handleGeneratePost}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                <SparklesIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Generazione in corso...' : 'Genera Post'}
            </button>

            {error && <div className="text-red-500 text-sm p-3 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}

            <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2 space-y-4">
                {isLoading && !post && (
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                )}
                {post && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 relative">
                        {post.imageUrl && (
                            <div className="mb-4">
                                <img src={post.imageUrl} alt="Immagine generata per il post" className="rounded-lg w-full aspect-[16/9] object-cover border dark:border-gray-700" />
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex items-center space-x-1">
                             <button onClick={handleToggleFavorite} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900/50 focus:ring-indigo-500">
                                <StarIcon className={`w-5 h-5 ${isFavorite(post.id) ? 'text-yellow-400' : ''}`} solid={isFavorite(post.id)} />
                            </button>
                            <button onClick={handleCopyToClipboard} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900/50 focus:ring-indigo-500">
                                {copySuccess ? <span className="text-sm text-indigo-600 dark:text-indigo-400">{copySuccess}</span> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{post.postContent}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {post.hashtags.map(h => <span key={h} className="text-sm text-indigo-600 dark:text-indigo-400">#{h}</span>)}
                        </div>
                        {post.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fonti</h4>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {/* FIX: Add check for source.web.uri to ensure href is not undefined. This became necessary after making the 'uri' property optional in the GroundingChunk type. */}
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
                )}
            </div>
        </div>
    );
};