import { useState, useEffect, useCallback } from 'react';
import { LibraryItem } from '../types';

declare const mammoth: any; // Assuming mammoth.js is loaded from a CDN

const LIBRARY_STORAGE_KEY = 'linkedinContentLibrary';

interface UseContentLibraryReturn {
  libraryItems: LibraryItem[];
  addContent: (files: FileList) => void;
  removeContent: (itemId: string) => void;
  isUploading: boolean;
}

export const useContentLibrary = (): UseContentLibraryReturn => {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (storedLibrary) {
        setLibraryItems(JSON.parse(storedLibrary));
      }
    } catch (error) {
      console.error('Failed to load content library from localStorage', error);
      setLibraryItems([]);
    }
  }, []);

  const saveLibrary = (newLibrary: LibraryItem[]) => {
    try {
      // Limit library size to prevent localStorage from filling up (e.g., 20 items)
      const limitedLibrary = newLibrary.slice(0, 20);
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(limitedLibrary));
      setLibraryItems(limitedLibrary);
    } catch (error) {
      console.error('Failed to save content library to localStorage', error);
    }
  };

  const addContent = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const filePromises = Array.from(files).map(file => {
      return new Promise<LibraryItem | null>((resolve, reject) => {
        const reader = new FileReader();
        
        const fileType = file.type;
        const fileName = file.name;

        if (fileType.startsWith('image/')) {
          reader.onload = (e) => {
            resolve({
              id: `${Date.now()}_${Math.random()}`,
              name: fileName,
              type: 'image',
              data: e.target?.result as string,
              mimeType: fileType
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } else if (file.name.endsWith('.docx')) {
            reader.onload = (e) => {
                 mammoth.extractRawText({ arrayBuffer: e.target?.result })
                    .then((result: any) => {
                        resolve({
                            id: `${Date.now()}_${Math.random()}`,
                            name: fileName,
                            type: 'text',
                            data: result.value,
                        });
                    })
                    .catch(reject);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        } else if (fileType === 'text/plain') {
          reader.onload = (e) => {
            resolve({
              id: `${Date.now()}_${Math.random()}`,
              name: fileName,
              type: 'text',
              data: e.target?.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsText(file);
        } else {
            // Unsupported file type
            resolve(null);
        }
      });
    });

    Promise.all(filePromises).then(newItems => {
        const validNewItems = newItems.filter((item): item is LibraryItem => item !== null);
        if (validNewItems.length > 0) {
            setLibraryItems(prevItems => {
                const updatedLibrary = [...validNewItems, ...prevItems];
                saveLibrary(updatedLibrary);
                return updatedLibrary;
            });
        }
        setIsUploading(false);
    }).catch(error => {
        console.error("Error processing files:", error);
        setIsUploading(false);
    });

  }, []);

  const removeContent = useCallback((itemId: string) => {
    setLibraryItems(prevItems => {
      const newLibrary = prevItems.filter(item => item.id !== itemId);
      saveLibrary(newLibrary);
      return newLibrary;
    });
  }, []);

  return { libraryItems, addContent, removeContent, isUploading };
};