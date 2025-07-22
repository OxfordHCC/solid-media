// Expose a custom hook to automatically fetch and update the history of CHAITok movies watched by a user.
// It uses historyQueries.ts and historyStore.ts to manage the history data.

import { useCallback, useState } from 'preact/hooks';
import { resolveHistoryEntry } from './utils';
import { useFetchHistoryList, useFetchHistoryEntry, useFetchResolvedHistoryEntry } from './historyQueries';
import { useHistoryStore } from './historyStore';
import { useEffect } from 'preact/hooks';

export function useHistory(
    pod: string,
    fetch: typeof window.fetch,
    enabled: boolean = true
) {
    console.log('useHistory hook initialized for pod:', pod, 'enabled:', enabled);

    const historyStore = useHistoryStore();

    // Fetch the list of history entries
    const fetchHistoryList = useFetchHistoryList(fetch);

    // Fetch a specific history entry
    const fetchHistoryEntry = useFetchHistoryEntry(fetch);

    // Fetch a resolved history entry with additional metadata
    const fetchResolvedHistoryEntry = useFetchResolvedHistoryEntry(fetch);

    const [isLoading, setIsLoading] = useState(false);

    // Function to load and resolve the full history
    const loadAndResolveHistory = useCallback(async (pod: string) => {
        console.log('useHistory::loadAndResolveHistory called for pod:', pod);

        setIsLoading(true);
        const historyUrls = await fetchHistoryList(pod);

        console.log('Fetched history URLs:', historyUrls);

        for (const url of historyUrls) {
            const entry = await fetchHistoryEntry(url);
            console.log('Fetched history entry:', entry);
            if (entry) {
                const resolvedItem = await fetchResolvedHistoryEntry(entry);
                console.log('Resolved history item:', resolvedItem);
                if (resolvedItem) {
                    historyStore.loadHistoryItem(resolvedItem);
                }
            }
        }
        setIsLoading(false);
    }, [fetchHistoryList, fetchHistoryEntry, resolveHistoryEntry, historyStore]);

    useEffect(() => {
        // Load and resolve history when the pod changes
        if (pod && enabled && !isLoading) {
            loadAndResolveHistory(pod);
        }
    }, [pod, loadAndResolveHistory, enabled]);

    return {
        isLoading,
        loadAndResolveHistory,
        historyStore,
    };

}

