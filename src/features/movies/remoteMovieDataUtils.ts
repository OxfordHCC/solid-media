import {
  saveSolidDatasetAt} from '@inrupt/solid-client';
import { getIds, MediaData } from '../../apis/tmdb';
import { MovieData } from './types';
import { mediaDataToDataset } from './datasetUtils';
import { PREFIXES_MOVIE } from '../../utils/prefixes';

export async function saveMovie(
  media: MediaData,
  pod: string,
  fetch: typeof window.fetch,
  recommended: boolean = false,
  watch: boolean = false
): Promise<MovieData> {
  const ids = await getIds(media.tmdbUrl);

  const { url: datasetUrl, dataset: movieDataset } = mediaDataToDataset(
    media,
    ids,
    pod,
    watch,
    recommended
  );

  await saveSolidDatasetAt(datasetUrl, movieDataset, { fetch, prefixes: PREFIXES_MOVIE });

  const movieData: MovieData = {
    tmdbUrl: media.tmdbUrl,
    solidUrl: datasetUrl,
    watched: Boolean(watch),
    liked: null,
    recommended: Boolean(recommended),
    title: media.title,
    released: media.released,
    image: media.image,
    dataset: movieDataset,
    type: 'me',
  };

  return movieData;
}