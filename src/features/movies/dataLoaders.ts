import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getUrl,
  getStringNoLocaleAll,
  getThing,
  getThingAll,
  getResourceAcl,
  getInteger,
  SolidDataset} from '@inrupt/solid-client';
import { RDF } from '@inrupt/vocab-common-rdf';
import { loadData } from '../../apis/tmdb';
import { MovieData, PersonInfo, MovieListItem, State, NO_ACCESS } from './types';

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
    recommendedDict: new Set<string>(),
    movies: movieDict,
  };

  for (const movie of movies) {
    if (movie.type === 'me') {
      movieDict.set(movie.tmdbUrl, movie);

      if (movie.watched) {
        state.myWatched.add(movie.tmdbUrl);
      } else if (movie.recommended) {
        state.recommendedDict.add(movie.tmdbUrl);
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