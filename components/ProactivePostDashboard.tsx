import React, { useRef, useEffect, useState } from 'react';
import { GeneratedPost } from '../types';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ProactivePostDashboardProps {
    drafts: GeneratedPost[];
    isLoading: boolean;
    error: string | null;
    onEdit: (postId: string) => void;
    onDelete: (postId: string) => void;
}

const DraftCard: React.FC<{ post: GeneratedPost; onEdit: () => void; onDelete: () => void; }> = ({ post, onEdit, onDelete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [finalImageUrl, setFinalImageUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (post.imageUrl && post.memeText) {
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
            img.onerror = () => setFinalImageUrl(post.imageUrl);
        } else if (post.imageUrl) {
            setFinalImageUrl(post.imageUrl);
        } else {
            setFinalImageUrl(undefined);
        }
    }, [post]);

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all hover:shadow-lg hover:border-indigo-500/50">
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="p-4 flex-grow">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap line-clamp-4 mb-2">
                    {post.postContent || "Questo post contiene solo un'immagine o un meme."}
                </div>
                {finalImageUrl && (
                    <img src={finalImageUrl} alt="Anteprima immagine bozza" className="rounded-lg w-full object-contain border dark:border-slate-700 max-h-40" />
                )}
                 <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                    {post.hashtags.slice(0, 3).map(h => <span key={h} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">#{h}</span>)}
                </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                <button 
                    onClick={onDelete}
                    className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                    <TrashIcon className="w-4 h-4 mr-1.5" />
                    Elimina
                </button>
                 <button
                    onClick={onEdit}
                    className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <EditIcon className="w-4 h-4 mr-1.5" />
                    Modifica e Perfeziona
                </button>
            </div>
        </div>
    );
};


export const ProactivePostDashboard: React.FC<ProactivePostDashboardProps> = ({ drafts, isLoading, error, onEdit, onDelete }) => {
    if (!isLoading && drafts.length === 0 && !error) {
        return null; // Don't render anything if there's nothing to show
    }

    return (
        <div className="mt-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                Post Pronti per Te
            </h2>

            {isLoading && (
                <div className="text-center py-12 px-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse">L'AI sta preparando le bozze per il tuo prossimo slot di pubblicazione...</p>
                </div>
            )}

            {error && (
                 <div role="alert" className="text-red-700 dark:text-red-400 text-sm p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</div>
            )}

            {!isLoading && drafts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map(post => (
                        <DraftCard 
                            key={post.id} 
                            post={post} 
                            onEdit={() => onEdit(post.id)}
                            onDelete={() => onDelete(post.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
