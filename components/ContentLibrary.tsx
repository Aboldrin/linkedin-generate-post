import React, { useCallback, useState } from 'react';
import { LibraryItem } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface ContentLibraryProps {
  items: LibraryItem[];
  onUpload: (files: FileList) => void;
  onDelete: (itemId: string) => void;
  onUseItem: (item: LibraryItem) => void;
  isUploading: boolean;
}

const ContentCard: React.FC<{ item: LibraryItem; onUse: () => void; onDelete: () => void; }> = ({ item, onUse, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all hover:shadow-lg hover:border-indigo-500/50">
            <div className="p-4 flex-grow flex flex-col items-center justify-center text-center">
                {item.type === 'image' ? (
                    <img src={item.data} alt={item.name} className="max-h-24 w-auto object-contain rounded-md mb-2" />
                ) : (
                    <DocumentTextIcon className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-2" />
                )}
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 break-all line-clamp-2">{item.name}</p>
            </div>
             <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                 <button 
                    onClick={onDelete}
                    className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    aria-label={`Elimina ${item.name}`}
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
                 <button
                    onClick={onUse}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Usa per un Post
                </button>
            </div>
        </div>
    );
};


export const ContentLibrary: React.FC<ContentLibraryProps> = ({ items, onUpload, onDelete, onUseItem, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mt-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
            La Mia Libreria di Contenuti
        </h2>
        
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".png,.jpg,.jpeg,.webp,.txt,.docx"
            className="hidden"
        />

        <label
            htmlFor="file-upload-dropzone"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
             <UploadIcon className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
             <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400" onClick={(e) => {e.preventDefault(); handleUploadClick()}}>Clicca per caricare</span> o trascina i tuoi file qui
             </p>
             <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">.docx, .txt, .png, .jpg (Max 4MB)</p>
        </label>
        
        {isUploading && (
            <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                <p className="animate-pulse">Caricamento in corso...</p>
            </div>
        )}

        {items.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {items.map(item => (
                    <ContentCard
                        key={item.id}
                        item={item}
                        onUse={() => onUseItem(item)}
                        onDelete={() => onDelete(item.id)}
                    />
                ))}
            </div>
        ) : !isUploading && (
             <div className="text-center py-10">
                <p className="text-slate-500 dark:text-slate-400">La tua libreria è vuota. Inizia caricando i tuoi contenuti!</p>
            </div>
        )}
    </div>
  );
};