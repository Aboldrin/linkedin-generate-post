import React, { useState } from 'react';
import { GeneratedPost } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FavoritesListProps {
  favorites: GeneratedPost[];
  removeFavorite: (postId: string) => void;
}

const FavoriteItem: React.FC<{ post: GeneratedPost; onRemove: (id: string) => void; }> = ({ post, onRemove }) => {
    const [copySuccess, setCopySuccess] = useState('');

    const handleCopyToClipboard = () => {
        const fullPostText = `${post.postContent}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`;
        navigator.clipboard.writeText(fullPostText).then(() => {
            setCopySuccess('Copiato!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            setCopySuccess('Errore!');
            console.error('Could not copy text: ', err);
        });
    };
    
    return (
         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md relative border border-transparent hover:border-indigo-500 transition-colors">
            {post.imageUrl && (
                <div className="mb-4">
                    <img src={post.imageUrl} alt="Immagine del post" className="rounded-lg w-full aspect-[16/9] object-cover border dark:border-gray-700" />
                </div>
            )}
            <div className="absolute top-2 right-2 flex items-center space-x-1">
                 <button onClick={() => onRemove(post.id)} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500">
                    <TrashIcon className="w-5 h-5" />
                </button>
                <button onClick={handleCopyToClipboard} className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500">
                    {copySuccess ? <span className="text-sm text-indigo-600 dark:text-indigo-400">{copySuccess}</span> : <CopyIcon className="w-5 h-5" />}
                </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{post.postContent}</div>
            <div className="mt-4 flex flex-wrap gap-2">
                {post.hashtags.map(h => <span key={h} className="text-sm text-indigo-600 dark:text-indigo-400">#{h}</span>)}
            </div>
        </div>
    );
};


export const FavoritesList: React.FC<FavoritesListProps> = ({ favorites, removeFavorite }) => {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
            I tuoi Post Salvati
        </h2>
        
        {favorites.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map(post => (
                    <FavoriteItem key={post.id} post={post} onRemove={removeFavorite} />
                ))}
            </div>
        ) : (
            <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-500 dark:text-gray-400">Non hai ancora salvato nessun post. Clicca sull'icona a stella per aggiungerne uno!</p>
            </div>
        )}
    </div>
  );
};