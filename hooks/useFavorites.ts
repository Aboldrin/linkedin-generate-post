import { useState, useEffect, useCallback } from 'react';
import { GeneratedPost } from '../types';

const FAVORITES_STORAGE_KEY = 'linkedinPostGeneratorFavorites';

interface UseFavoritesReturn {
  favorites: GeneratedPost[];
  addFavorite: (post: GeneratedPost) => void;
  removeFavorite: (postId: string) => void;
  isFavorite: (postId: string) => boolean;
}

export const useFavorites = (): UseFavoritesReturn => {
  const [favorites, setFavorites] = useState<GeneratedPost[]>([]);

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Failed to load favorites from localStorage', error);
      setFavorites([]);
    }
  }, []);

  const saveFavorites = (newFavorites: GeneratedPost[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save favorites to localStorage', error);
    }
  };

  const addFavorite = useCallback((post: GeneratedPost) => {
    setFavorites(prevFavorites => {
      const newFavorites = [post, ...prevFavorites];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);

  const removeFavorite = useCallback((postId: string) => {
    setFavorites(prevFavorites => {
      const newFavorites = prevFavorites.filter(p => p.id !== postId);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);
  
  const isFavorite = useCallback((postId: string): boolean => {
    return favorites.some(p => p.id === postId);
  }, [favorites]);


  return { favorites, addFavorite, removeFavorite, isFavorite };
};