import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getUrl,
  getStringNoLocaleAll,
  getThing,
  getThingAll,
  getResourceAcl,
  getInteger,
  SolidDataset,
  createThing,
  saveSolidDatasetAt,
  setUrl,
  addUrl,
  setDatetime,
  setThing,
  createSolidDataset,
  setStringNoLocale,
  addStringNoLocale
} from '@inrupt/solid-client';
import { RDF, DCTERMS } from '@inrupt/vocab-common-rdf';
import { loadData, getIds, MediaData } from '../../apis/tmdb';
import { MovieData, PersonInfo, MovieListItem, State, NO_ACCESS } from './types';
import { PREFIXES_MOVIE } from '../../utils/prefixes';

export async function loadMoviesData(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<State> {
  const people: PersonInfo[] = [
    { type: 'me', id: webID },
    ...friends.map(x => ({ type: 'friend' as const, id: x }))
  ];

  const allMovieResults: MovieData[] = [];

  for (const person of people) {
    const personMovieList = await loadMovieList(person, fetch);
    for (const movieItem of personMovieList) {
      try {
        const movieData = await loadMovieDetail(movieItem, fetch);
        allMovieResults.push(movieData);
      } catch (error) {
        console.warn(`Failed to load movie data for ${movieItem.url}:`, error);
      }
    }
  }

  return categorizeMovies(allMovieResults);
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
  const movieThing = getThing(movieDataset, `${url}#it`)!;
  const things = getThingAll(movieDataset);

  // Extract movie properties
  const watched = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/WatchAction');
  const liked = extractLikedStatus(things, movieDataset);
  const recommended = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/Recommendation');

  const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
  const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));

  const { title, released, icon } = await loadData(tmdbUrl);

  return {
    tmdbUrl,
    solidUrl: url,
    type,
    watched,
    liked,
    recommended,
    title,
    released,
    image: icon,
    dataset: movieDataset
  };
}

function extractLikedStatus(things: any[], movieDataset: SolidDataset): boolean | null {
  const review = things.find(x => getUrl(x, RDF.type) === 'https://schema.org/ReviewAction');

  if (!review) return null;

  const ratingUrl = getUrl(review, 'https://schema.org/resultReview')!;
  const rating = getThing(movieDataset, ratingUrl)!;

  const min = getInteger(rating, 'https://schema.org/worstRating');
  const max = getInteger(rating, 'https://schema.org/bestRating');
  const value = getInteger(rating, 'https://schema.org/ratingValue');

  if (value === max) return true;
  if (value === min) return false;
  return null;
}

function categorizeMovies(movies: MovieData[]): State {
  const movieDict = new Map<string, MovieData>();
  const state: State = {
    myWatched: new Set<string>(),
    myUnwatched: new Set<string>(),
    myLiked: new Set<string>(),
    friendWatched: new Set<string>(),
    friendUnwatched: new Set<string>(),
    friendLiked: new Set<string>(),
    recommended: new Set<string>(),
    movies: movieDict,
  };

  for (const movie of movies) {
    if (movie.type === 'me') {
      movieDict.set(movie.tmdbUrl, movie);

      if (movie.watched) {
        state.myWatched.add(movie.tmdbUrl);
      } else if (movie.recommended) {
        state.recommended.add(movie.tmdbUrl);
      } else {
        state.myUnwatched.add(movie.tmdbUrl);
      }

      if (movie.liked) {
        state.myLiked.add(movie.tmdbUrl);
      }
    } else if (movie.type === 'friend') {
      if (!movieDict.has(movie.tmdbUrl)) {
        // Friend version is added only if no 'me' version exists
        movieDict.set(movie.tmdbUrl, movie);
      }

      if (movie.watched) {
        state.friendWatched.add(movie.tmdbUrl);
      } else {
        state.friendUnwatched.add(movie.tmdbUrl);
      }

      if (movie.liked) {
        state.friendLiked.add(movie.tmdbUrl);
      }
    }
  }

  return state;
}

export function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  return shuffledMovies.slice(0, maxSamples).map(movie => movie.title);
}

export function generateDatasetName(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replaceAll(' ', '-')
    .toLowerCase();
}

export async function saveMovie(
  media: MediaData,
  pod: string,
  fetch: typeof window.fetch,
  recommended: boolean = false,
  watch: boolean = false
): Promise<MovieData> {
  const ids = await getIds(media.tmdbUrl);

  const datasetName = generateDatasetName(media.title);
  const datasetUrl = `${pod}/movies/${datasetName}`;

  let movieDataset = createSolidDataset();
  let movie = createThing({ url: `${datasetUrl}#it` });

  const time = new Date();

  movie = setDatetime(movie, DCTERMS.created, time);
  movie = setDatetime(movie, DCTERMS.modified, time);
  movie = setUrl(movie, RDF.type, 'https://schema.org/Movie');
  if (watch) movie = addUrl(movie, RDF.type, 'https://schema.org/WatchAction');
  if (recommended) movie = addUrl(movie, RDF.type, 'https://schema.org/Recommendation');
  movie = setStringNoLocale(movie, 'https://schema.org/name', media.title);
  movie = setStringNoLocale(movie, 'https://schema.org/description', media.description);
  movie = setStringNoLocale(movie, 'https://schema.org/image', media.image);
  movie = setDatetime(movie, 'https://schema.org/datePublished', media.released);
  for (const id of ids) movie = addStringNoLocale(movie, 'https://schema.org/sameAs', id);

  movieDataset = setThing(movieDataset, movie);

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