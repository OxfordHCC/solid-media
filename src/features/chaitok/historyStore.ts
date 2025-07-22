import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import { ResolvedHistoryItem } from './types';

export interface HistoryActions {
    loadHistoryItem: (history: ResolvedHistoryItem) => void;
    resetState: () => void;
    find: (videoID: string) => ResolvedHistoryItem | undefined;
}

export interface State {
    history: Map<string, ResolvedHistoryItem>;
}

const initialState: State = {
    history: new Map<string, ResolvedHistoryItem>(),
};

export const useHistoryStore = create<State & HistoryActions>()(
    immer((set, get) => ({
        ...initialState,

        loadHistoryItem: (history: ResolvedHistoryItem) => {
            console.log('useHistoryStore::loadHistoryItem called with:', history);

            if (get().history.has(history.videoID)) {
                return; // Avoid overwriting existing history items. May want to handle updates differently in the future.
            }
            set((state) => {
                state.history.set(history.videoID, castDraft(history));
            });
        },

        resetState: () => {
            set(() => initialState);
        },

        find: (videoID: string) => {
            return get().history.get(videoID);
        },
    }))
);