import React, { useState } from 'react';
import { PostGenerator } from './components/PostGenerator';
import { Chatbot } from './components/Chatbot';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { usePublicationReminder } from './hooks/usePublicationReminder';
import { useFavorites } from './hooks/useFavorites';
import { FavoritesList } from './components/FavoritesList';
import type { GeneratedPost } from './types';

const App: React.FC = () => {
    const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { shouldAskPermission, requestPermission, resetTimer, dismissPermissionRequest } = usePublicationReminder();
    const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

    const handlePostGenerated = (post: GeneratedPost) => {
        setGeneratedPost(post);
        setError(null);
        resetTimer(); // Reset reminder timer once a new post is generated
    };

    const handleAllowNotifications = () => {
        requestPermission();
    };

    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200 transition-colors duration-300">
            {shouldAskPermission && (
              <NotificationPermissionBanner 
                onAllow={handleAllowNotifications}
                onDismiss={dismissPermissionRequest}
              />
            )}
            
            <header className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Generatore di Post AI per LinkedIn
                    </h1>
                    <p className="mt-2 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">
                        Crea post magnetici per LinkedIn senza faticare.
                    </p>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <PostGenerator 
                        onPostGenerated={handlePostGenerated}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        error={error}
                        post={generatedPost}
                        addFavorite={addFavorite}
                        removeFavorite={removeFavorite}
                        isFavorite={isFavorite}
                    />
                    <Chatbot 
                        initialPostContent={generatedPost ? generatedPost.postContent : null}
                    />
                </div>
                <FavoritesList
                    favorites={favorites}
                    removeFavorite={removeFavorite}
                />
            </main>
        </div>
    );
};

export default App;