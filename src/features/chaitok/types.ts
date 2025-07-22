// Chaitok feature types. Mainly used for the histories.


// The entry in the history list from CHAITok.
export interface HistoryEntry {
    videoID: string;
    videoDocUrl: string;
    userID: string;
    liked?: boolean;
}

// The converted/resolved history item, including additional metadata useful for the UI.
export interface ResolvedHistoryItem {
    videoID: string;
    title: string;
    description: string;
    uploadedAt: Date | null;
    thumbnail: string | null;
    liked?: boolean;
}