import React, { useState, useCallback, useEffect } from 'react';
import { PostGenerator } from './components/PostGenerator';
import { Chatbot } from './components/Chatbot';
import { FavoritesList } from './components/FavoritesList';
import { SmartScheduler } from './components/SmartScheduler';
import { ProactivePostDashboard } from './components/ProactivePostDashboard';
import { ContentLibrary } from './components/ContentLibrary';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { ContentCalendar } from './components/ContentCalendar';
import { QuickQueryChat } from './components/QuickQueryChat';
import { Toast } from './components/Toast';
import { GeneratedPost, LibraryItem, ContentToLoad, PlannedPost, ProactiveSuggestion } from './types';
import { useFavorites } from './hooks/useFavorites';
import { usePublicationReminder } from './hooks/usePublicationReminder';
import { useContentLibrary } from './hooks/useContentLibrary';
import { generateLinkedInPost, generateMonthlyContentPlan, answerCalendarQuery } from './services/geminiService';

const PROACTIVE_DRAFTS_KEY = 'proactivePostDrafts';
const CALENDAR_PLAN_KEY = 'calendarPlan';

function App() {
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialChatContext, setInitialChatContext] = useState<string | undefined>(undefined);
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { libraryItems, addContent, removeContent, isUploading } = useContentLibrary();
  const [contentToLoad, setContentToLoad] = useState<ContentToLoad | null>(null);

  // State for proactive generation
  const [proactiveDrafts, setProactiveDrafts] = useState<GeneratedPost[]>([]);
  const [isProactiveLoading, setIsProactiveLoading] = useState(false);
  const [proactiveError, setProactiveError] = useState<string | null>(null);
  const [suggestedPostType, setSuggestedPostType] = useState<string | null>(null);
  
  // State for Calendar feature
  const [monthlyPlan, setMonthlyPlan] = useState<PlannedPost[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const { 
    shouldAskPermission, 
    requestPermission, 
    dismissPermissionRequest,
    resetTimer
  } = usePublicationReminder({ proactiveDraftsReady: proactiveDrafts.length > 0 });

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000); // Hide toast after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);
  
  // Load calendar plan from localStorage on mount
  useEffect(() => {
    try {
        const storedPlan = localStorage.getItem(CALENDAR_PLAN_KEY);
        if (storedPlan) {
            setMonthlyPlan(JSON.parse(storedPlan));
        }
    } catch(err) {
        console.error("Failed to load calendar plan", err);
    }
  }, []);

  const handlePostGenerated = useCallback((generatedPost: GeneratedPost | null, chatContext?: string) => {
    setPost(generatedPost);
    if(generatedPost) {
        resetTimer();
    }
    if (chatContext) {
      setInitialChatContext(chatContext);
    } else {
      setInitialChatContext(undefined);
    }
  }, [resetTimer]);
  
  const handleApplySuggestion = (postType: string) => {
        setSuggestedPostType(postType);
  };
  
  const handleSuggestionApplied = () => {
        setSuggestedPostType(null);
  };
  
  const handleApplyLibrarySuggestion = (item: LibraryItem) => {
    setContentToLoad({
        type: item.type,
        data: item.data,
        name: item.name,
    });
  };

  const handleContentLoaded = () => {
      setContentToLoad(null);
  };

  const generateProactiveDrafts = useCallback(async (postType: string) => {
        setIsProactiveLoading(true);
        setProactiveError(null);
        setProactiveDrafts([]);
        
        try {
            const storedDrafts = localStorage.getItem(PROACTIVE_DRAFTS_KEY);
            if (storedDrafts) {
                setProactiveDrafts(JSON.parse(storedDrafts));
                return;
            }

            const topics = ["Trend di Sviluppo Software", "IA nel Recruiting", "Cultura DevOps"];
            const generatedDrafts: GeneratedPost[] = [];

            for (const topic of topics) {
                const draft = await generateLinkedInPost(
                    topic,
                    postType,
                    "Professionale ma accessibile",
                    Math.random() > 0.5 ? 'image' : 'none',
                    '', '1:1', 'it', null, () => {}
                );
                generatedDrafts.push(draft);
            }
            setProactiveDrafts(generatedDrafts);
            localStorage.setItem(PROACTIVE_DRAFTS_KEY, JSON.stringify(generatedDrafts));
        } catch (err: any) {
            setProactiveError(err.message || "Errore nella generazione proattiva dei post.");
            setToastMessage({ message: err.message || "Errore nella generazione proattiva.", type: 'error' });
        } finally {
            setIsProactiveLoading(false);
        }
    }, []);

    const handleScheduleIdentified = useCallback((postType: string) => {
        generateProactiveDrafts(postType);
    }, [generateProactiveDrafts]);

    const handleEditDraft = (postId: string) => {
        const draftToEdit = proactiveDrafts.find(d => d.id === postId);
        if (draftToEdit) {
            setPost(draftToEdit);
            setProactiveDrafts(proactiveDrafts.filter(d => d.id !== postId));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    const handleDeleteDraft = (postId: string) => {
        const updatedDrafts = proactiveDrafts.filter(d => d.id !== postId);
        setProactiveDrafts(updatedDrafts);
        localStorage.setItem(PROACTIVE_DRAFTS_KEY, JSON.stringify(updatedDrafts));
    };
    
    // Clear drafts when component mounts if they exist, to force regeneration on new schedule
    useEffect(() => {
        localStorage.removeItem(PROACTIVE_DRAFTS_KEY);
    }, []);
    
    // Calendar functions
    const handleGeneratePlan = useCallback(async (month: number, year: number) => {
        setIsPlanLoading(true);
        setPlanError(null);
        try {
            const plan = await generateMonthlyContentPlan(month, year);
            setMonthlyPlan(plan);
            localStorage.setItem(CALENDAR_PLAN_KEY, JSON.stringify(plan));
            setToastMessage({ message: `Piano di ${MONTH_NAMES[month]} generato!`, type: 'success' });
        } catch(err: any) {
            const errorMessage = err.message || "Impossibile generare il piano editoriale.";
            setPlanError(errorMessage);
            setToastMessage({ message: errorMessage, type: 'error' });
        } finally {
            setIsPlanLoading(false);
        }
    }, []);

    const addPostToCalendar = useCallback((post: GeneratedPost, details: ProactiveSuggestion) => {
        const newPlannedPost: PlannedPost = {
            date: details.date,
            postType: details.postType,
            topic: details.topic,
            generatedPost: post,
        };
        const updatedPlan = [...monthlyPlan, newPlannedPost].sort((a,b) => a.date.localeCompare(b.date));
        setMonthlyPlan(updatedPlan);
        localStorage.setItem(CALENDAR_PLAN_KEY, JSON.stringify(updatedPlan));
        setToastMessage({ message: 'Post pianificato nel calendario!', type: 'success' });
    }, [monthlyPlan]);

    const handleLoadDraftFromCalendar = (plannedPost: PlannedPost) => {
        setPost(plannedPost.generatedPost);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAnswerQuery = useCallback(async (query: string): Promise<string | ProactiveSuggestion> => {
        return await answerCalendarQuery(query, monthlyPlan);
    }, [monthlyPlan]);

  const handleAddFavorite = (post: GeneratedPost) => {
    addFavorite(post);
    setToastMessage({ message: 'Post salvato nei preferiti!', type: 'success' });
  };

  const handleRemoveFavorite = (postId: string) => {
    removeFavorite(postId);
    setToastMessage({ message: 'Post rimosso dai preferiti.', type: 'success' });
  };


  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                 <h1 className="text-xl font-bold text-slate-900 dark:text-white">LinkedIn Post Generator AI</h1>
            </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
            <SmartScheduler 
                onApplySuggestion={handleApplySuggestion}
                onScheduleIdentified={handleScheduleIdentified}
                libraryItems={libraryItems}
                onApplyLibrarySuggestion={handleApplyLibrarySuggestion}
            />
        </div>
        
        <div className="mt-8">
          <ContentCalendar 
            plannedPosts={monthlyPlan}
            onGeneratePlan={handleGeneratePlan}
            onLoadDraft={handleLoadDraftFromCalendar}
            isLoading={isPlanLoading}
            error={planError}
          />
        </div>

        <ProactivePostDashboard 
            drafts={proactiveDrafts}
            isLoading={isProactiveLoading}
            error={proactiveError}
            onEdit={handleEditDraft}
            onDelete={handleDeleteDraft}
        />
        
        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          <PostGenerator 
            onPostGenerated={handlePostGenerated} 
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setToastMessage={setToastMessage}
            post={post}
            addFavorite={handleAddFavorite}
            removeFavorite={handleRemoveFavorite}
            isFavorite={isFavorite}
            suggestedPostType={suggestedPostType}
            onSuggestionApplied={handleSuggestionApplied}
            contentToLoad={contentToLoad}
            onContentLoaded={handleContentLoaded}
          />
          <Chatbot 
            post={post} 
            onPostUpdate={setPost}
            initialChatContext={initialChatContext}
            setToastMessage={setToastMessage}
          />
        </div>

        <ContentLibrary
            items={libraryItems}
            onUpload={addContent}
            onDelete={removeContent}
            onUseItem={handleApplyLibrarySuggestion}
            isUploading={isUploading}
        />
        
        <FavoritesList favorites={favorites} removeFavorite={handleRemoveFavorite} />
        
        <QuickQueryChat
            onQuery={handleAnswerQuery}
            onAddFavorite={handleAddFavorite}
            onAddToCalendar={addPostToCalendar}
        />
        
        {shouldAskPermission && (
            <NotificationPermissionBanner
                onAllow={requestPermission}
                onDismiss={dismissPermissionRequest}
            />
        )}
        <Toast
          message={toastMessage?.message}
          type={toastMessage?.type}
          onClose={() => setToastMessage(null)}
        />
      </main>
    </div>
  );
}

export default App;
const MONTH_NAMES = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];