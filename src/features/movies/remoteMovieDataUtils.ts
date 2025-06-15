import {
  getSolidDataset,
  getContainedResourceUrlAll,
  saveSolidDatasetAt} from '@inrupt/solid-client';
import { getIds, MediaData } from '../../apis/tmdb';
import { MovieData, PersonInfo, MovieListItem } from './types';
import { datasetToMovieDataInfo, mediaDataToDataset } from './datasetUtils';
import { PREFIXES_MOVIE } from '../../utils/prefixes';

export async function loadMoviesData(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch,
  dispatch: (action: any) => void
): Promise<void> {
  const people: PersonInfo[] = [
    { type: 'me', id: webID },
    ...friends.map(x => ({ type: 'friend' as const, id: x }))
  ];

  for (const person of people) {
    const personMovieList = await loadMovieList(person, fetch);
    for (const movieItem of personMovieList) {
      try {
        const movieData = await loadMovieDetail(movieItem, fetch);
        dispatch({ type: 'LOAD_MOVIES', payload: { movies: new Set([movieData]) } });
      } catch (error) {
        console.warn(`Failed to load movie data for ${movieItem.url}:`, error);
      }
    }
  }
}

async function loadMovieList(person: PersonInfo, fetch: typeof window.fetch): Promise<MovieListItem[]> {
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

async function loadMovieDetail(movieItem: MovieListItem, fetch: typeof window.fetch): Promise<MovieData> {
  const { type, url } = movieItem;

  const movieDataset = await getSolidDataset(url, { fetch });

  return datasetToMovieDataInfo(movieDataset, url, type);
}

export function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  return shuffledMovies.slice(0, maxSamples).map(movie => movie.title);
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