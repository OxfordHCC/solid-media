import {
  deleteSolidDataset,
  getContainedResourceUrlAll,
  getSolidDataset,
  saveSolidDatasetAt,
  SolidDataset} from '@inrupt/solid-client';
import { getIds, MediaData } from '../../apis/tmdb';
import { MovieData, MovieListItem, PersonInfo } from './types';
import { datasetToMovieDataInfo, mediaDataToDataset } from './datasetUtils';
import { PREFIXES_MOVIE } from '../../utils/prefixes';

// React Query compatible dataset operations

export async function loadMovieList(person: PersonInfo, fetch: typeof window.fetch): Promise<MovieListItem[]> {
  try {
    const parts = person.id.split('/');
    const pod = parts.slice(0, parts.length - 2).join('/');
    const moviesDataset = await getSolidDataset(`${pod}/movies/`, { fetch });
    const movies = getContainedResourceUrlAll(moviesDataset);
    return movies.map(url => ({ ...person, url }));
  } catch {
    return [];
  }
}

export async function loadMovieDetail(movieItem: MovieListItem, fetch: typeof window.fetch): Promise<MovieData> {
  const { type, url } = movieItem;
  const movieDataset = await getSolidDataset(url, { fetch });
  return datasetToMovieDataInfo(movieDataset, url, type);
}

export async function saveMovieDataset(
  datasetUrl: string,
  dataset: SolidDataset,
  fetch: typeof window.fetch,
  prefixes?: any
): Promise<void> {
  await saveSolidDatasetAt(datasetUrl, dataset, { fetch, prefixes });
}

export async function deleteMovieDataset(
  datasetUrl: string,
  fetch: typeof window.fetch
): Promise<void> {
  await deleteSolidDataset(datasetUrl, { fetch });
}

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