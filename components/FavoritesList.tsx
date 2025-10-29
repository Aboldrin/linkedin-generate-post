import React, { useState, useEffect, useRef } from 'react';
import { GeneratedPost } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface FavoritesListProps {
  favorites: GeneratedPost[];
  removeFavorite: (postId: string) => void;
}

const FavoriteItem: React.FC<{ post: GeneratedPost; onRemove: (id: string) => void; }> = ({ post, onRemove }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [finalImageUrl, setFinalImageUrl] = useState<string | undefined>(undefined);

    // This effect handles rendering the final image, combining base image and meme text if necessary
    useEffect(() => {
        if (post?.imageUrl && post?.memeText) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = post.imageUrl;
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                canvas.width = 1024;
                canvas.height = 1024 / aspectRatio;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Replicated Text styling from PostGenerator
                const fontSize = canvas.width / 18;
                ctx.font = `900 ${fontSize}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = post.memeTextColor || '#FFFFFF';
                ctx.strokeStyle = post.memeStrokeColor || '#000000';
                ctx.lineWidth = fontSize / 8;

                const x = canvas.width / 2;
                const maxWidth = canvas.width * 0.9;
                
                const words = (post.memeText || '').toUpperCase().split(' ');
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
                
                const totalTextHeight = (lines.length - 1) * lineHeight;
                let startY = canvas.height - totalTextHeight - (canvas.height * 0.05);

                lines.forEach((currentLine, index) => {
                    const lineY = startY + (index * lineHeight);
                    ctx.strokeText(currentLine.trim(), x, lineY);
                    ctx.fillText(currentLine.trim(), x, lineY);
                });
                
                setFinalImageUrl(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = () => {
                setFinalImageUrl(post.imageUrl);
            };
        } else if (post?.imageUrl) {
            setFinalImageUrl(post.imageUrl);
        } else {
            setFinalImageUrl(undefined);
        }
    }, [post]);


    const formatPostForClipboard = () => {
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
    };

    const handleCopyToClipboard = () => {
        const fullPostText = formatPostForClipboard();
        if (!fullPostText) return;

        navigator.clipboard.writeText(fullPostText).then(() => {
            setCopySuccess('Copiato!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            setCopySuccess('Errore!');
            console.error('Could not copy text: ', err);
        });
    };
    
    return (
         <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl shadow-md relative border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all hover:shadow-lg hover:border-indigo-500/50">
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="absolute top-3 right-3 flex items-center space-x-1 z-10">
                 <button onClick={() => onRemove(post.id)} aria-label="Rimuovi dai preferiti" className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500">
                    <TrashIcon className="w-5 h-5" />
                </button>
                <button onClick={handleCopyToClipboard} aria-label="Copia testo del post" className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800/50 focus:ring-indigo-500">
                    {copySuccess ? <span className="text-sm text-indigo-600 dark:text-indigo-400">{copySuccess}</span> : <CopyIcon className="w-5 h-5" />}
                </button>
            </div>
             <div className="flex items-center space-x-3 pr-20 mb-4">
                <UserCircleIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Tu</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Post Salvato</p>
                </div>
            </div>
            <div className="flex-grow space-y-4">
                 {post.poll ? (
                    <div>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap mb-4">{post.postContent}</div>
                        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                            <p className="font-bold text-slate-800 dark:text-white">{post.poll.question}</p>
                            <div className="mt-3 space-y-2">
                                {post.poll.options.map((option, index) => (
                                    <div key={index} className="flex items-center p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                        <span className="text-slate-700 dark:text-slate-300">{option}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.postContent && (
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{post.postContent}</div>
                        )}
                        {finalImageUrl && (
                            <div className="mt-2">
                                <img src={finalImageUrl} alt="Immagine del post salvato" className="rounded-lg w-full object-contain border dark:border-slate-700" />
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {post.hashtags.map(h => <span key={h} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">#{h}</span>)}
            </div>
        </div>
    );
};


export const FavoritesList: React.FC<FavoritesListProps> = ({ favorites, removeFavorite }) => {
  return (
    <div className="mt-16">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">
            I tuoi Preferiti
        </h2>
        
        {favorites.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map(post => (
                    <FavoriteItem key={post.id} post={post} onRemove={removeFavorite} />
                ))}
            </div>
        ) : (
            <div className="text-center py-12 px-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">Non hai ancora salvato nessun post. Clicca sull'icona a stella per aggiungerne uno!</p>
            </div>
        )}
    </div>
  );
};