import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'preact/hooks';
import { HistoryEntry, ResolvedHistoryItem } from './types';
import { getHistoryList, getHistoryEntry, resolveHistoryEntry } from './utils';

const HISTORY_LIST_QUERY_PARAMS = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
}
const HISTORY_ENTRY_QUERY_PARAMS = {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => (attemptIndex + 1) * 1500, // add delay between retries
};
const HISTORY_RESOLVED_ENTRY_QUERY_PARAMS = {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => (attemptIndex + 1) * 1500, // add delay between retries
};

export const historyQueryKeys = {
    all: ['history'] as const,
    list: () => [...historyQueryKeys.all, 'list'] as const,
    entry: (url: string) => [...historyQueryKeys.all, 'entry', url] as const,
    resolvedEntry: (url: string) => [...historyQueryKeys.all, 'resolvedEntry', url] as const,
}

export function useFetchHistoryList(
    fetch: typeof window.fetch
) {
    console.log('useFetchHistoryList hook initialized');

    const queryClient = useQueryClient();

    const fetchHistoryList = useCallback(async (pod: string): Promise<string[]> => {
        return queryClient.fetchQuery({
            queryKey: historyQueryKeys.list(),
            queryFn: () => getHistoryList(pod, fetch),
            ...HISTORY_LIST_QUERY_PARAMS,
        });
    }, [queryClient, fetch]);

    return fetchHistoryList;
}

export function useFetchHistoryEntry(
    fetch: typeof window.fetch
) {
    console.log('useFetchHistoryEntry hook initialized');

    const queryClient = useQueryClient();

    const fetchHistoryEntry = useCallback(async (url: string): Promise<HistoryEntry | null> => {
        return queryClient.fetchQuery({
            queryKey: historyQueryKeys.entry(url),
            queryFn: () => getHistoryEntry(url, fetch),
            ...HISTORY_ENTRY_QUERY_PARAMS,
        });
    }, [queryClient, fetch]);

    return fetchHistoryEntry;
}

export function useFetchResolvedHistoryEntry(
    fetch: typeof window.fetch
): (entry: HistoryEntry) => Promise<ResolvedHistoryItem | null> {
    console.log('useFetchResolvedHistoryEntry hook initialized');

    const queryClient = useQueryClient();

    const fetchResolvedHistoryEntry = useCallback(async (entry: HistoryEntry): Promise<ResolvedHistoryItem | null> => {
        return queryClient.fetchQuery({
            queryKey: historyQueryKeys.resolvedEntry(entry.videoDocUrl),
            queryFn: () => resolveHistoryEntry(entry, fetch),
            ...HISTORY_RESOLVED_ENTRY_QUERY_PARAMS,
        });
    }, [queryClient, fetch]);

    return fetchResolvedHistoryEntry;
}