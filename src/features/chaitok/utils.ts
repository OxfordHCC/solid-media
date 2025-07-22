import { getSolidDataset, getContainedResourceUrlAll, SolidDataset, getStringNoLocale, getUrl, getDatetime, getBoolean, getThingAll, getLiteral } from '@inrupt/solid-client';
import { HistoryEntry, ResolvedHistoryItem } from './types';
import * as ns from './ns';

const NS_RDF = ns.forSolidClient(ns.RDF);
const NS_CHAITOK = ns.forSolidClient(ns.NS_CHAITOK);

const CHAITOK_DATA_DIR = 'chaitok/data';
const HISTORY_DIR = 'history';

export async function getHistoryList(pod: string, authFetch: typeof fetch): Promise<string[]> {
    const historyPath = new URL(`${CHAITOK_DATA_DIR}/${HISTORY_DIR}/`, pod).toString();
    let containerDataset;
    try {
        containerDataset = await getSolidDataset(historyPath, { fetch: authFetch });
    } catch (error) {
        return [];
    }
    const historyUrls = getContainedResourceUrlAll(containerDataset);
    return historyUrls;
}

export async function getHistoryEntry(url: string, authFetch: typeof fetch): Promise<HistoryEntry | null> {
    console.log('chaitok:utils.ts:Fetching history entry from URL:', url);
    const dataset = await getSolidDataset(url, { fetch: authFetch });
    console.log('chaitok:utils.ts:Fetched dataset');
    return datasetToHistoryEntry(dataset);
}

export function datasetToHistoryEntry(dataset: SolidDataset): HistoryEntry | null {
    const things = getThingAll(dataset);
    for (const thing of things) {
        if (getUrl(thing, NS_RDF('type')) === NS_CHAITOK('WatchHistory')) {
            const videoID = getLiteral(thing, NS_CHAITOK('videoID'))!.value;
            const videoDocUrl = getUrl(thing, NS_CHAITOK('videoDocUrl'))!;
            const userID = getUrl(thing, NS_CHAITOK('user'))!;
            const liked = getBoolean(thing, NS_CHAITOK('isLiked')) === true;
            return {
                videoID,
                videoDocUrl,
                userID,
                liked,
            };
        } else {
            continue;
        }
    }
    return null;
}

export async function resolveHistoryEntry(
    entry: HistoryEntry,
    fetch: typeof window.fetch
): Promise<ResolvedHistoryItem | null> {
    try {
        const dataset = await getSolidDataset(entry.videoDocUrl, { fetch });
        const things = getThingAll(dataset);
        for (const thing of things) {
            if (getUrl(thing, NS_RDF('type')) === NS_CHAITOK('Video')) {
                const videoTitle = getStringNoLocale(thing, NS_CHAITOK('tagName'))!;
                const videoDescription = getStringNoLocale(thing, NS_CHAITOK('descriptionTags')) || '';
                const videoThumbnail = getUrl(thing, NS_CHAITOK('thumbnailUrl'));
                // const uploadedAt = getDatetime(thing, NS_CHAITOK('publishedDateTime')) || null;
                const uploadedAt = (() => {
                    const timeInMillisecondsStr = getLiteral(thing, NS_CHAITOK('publishedDateTime'))?.value;
                    const timeInMilliseconds = timeInMillisecondsStr ? parseInt(timeInMillisecondsStr) : null;
                    if (timeInMilliseconds) {
                        const date = new Date(timeInMilliseconds);
                        return isNaN(date.getTime()) ? null : date;
                    }
                    return null;
                })();
                return {
                    videoID: entry.videoID,
                    liked: entry.liked,
                    title: videoTitle,
                    description: videoDescription,
                    thumbnail: videoThumbnail,
                    uploadedAt,
                };
            }
        }
        console.warn('No video type found in dataset for entry:', entry);
        return null;
    } catch (error) {
        console.error('Error resolving history entry:', error);
        return null;
    }
}