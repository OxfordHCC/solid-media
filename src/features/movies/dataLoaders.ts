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

type RawMovieData = {
  movie: string;
  solidUrl: string;
  type: 'me' | 'friend';
  watched: boolean;
  liked: boolean | null;
  recommended: boolean;
  title: string;
  released: Date;
  image: string;
  dataset: SolidDataset;
};

export async function loadMoviesData(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<State> {
  const people: PersonInfo[] = [
    { type: 'me', id: webID },
    ...friends.map(x => ({ type: 'friend' as const, id: x }))
  ];

  const movieList = await loadMovieList(people, fetch);
  const movieResults = await loadMovieDetails(movieList, fetch);

  return categorizeMovies(movieResults);
}

async function loadMovieList(people: PersonInfo[], fetch: typeof window.fetch): Promise<MovieListItem[]> {
  const movieLists = await Promise.all(
    people.map(async (person): Promise<MovieListItem[]> => {
      try {
        const parts = person.id.split('/');
        const pod = parts.slice(0, parts.length - 2).join('/');
        const moviesDataset = await getSolidDataset(`${pod}/movies/`, { fetch });
        const movies = getContainedResourceUrlAll(moviesDataset);
        return movies.map(url => ({ ...person, url }));
      } catch {
        return [];
      }
    })
  );

  return movieLists.flat();
}

async function loadMovieDetails(movieList: MovieListItem[], fetch: typeof window.fetch): Promise<RawMovieData[]> {
  const movieResults = await Promise.allSettled(
    movieList.map(async ({ type, url }) => {
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
        movie: tmdbUrl,
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
    })
  );

  return movieResults.filter(x => x.status === 'fulfilled').map(x => (x as PromiseFulfilledResult<RawMovieData>).value);
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

function categorizeMovies(movies: RawMovieData[]): State {
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

  for (const { type, ...movie } of movies) {
    if (type === 'me') {
      movieDict.set(movie.movie, { ...movie, me: true, friend: movieDict.get(movie.movie)?.friend || false });

      if (movie.watched && !state.myWatched.has(movie.movie)) {
        state.myWatched.add(movie.movie);
      } else if (movie.recommended && !state.recommendedDict.has(movie.movie)) {
        state.recommendedDict.add(movie.movie);
      } else if (!state.myUnwatched.has(movie.movie)) {
        state.myUnwatched.add(movie.movie);
      }

      if (movie.liked && !state.myLiked.has(movie.movie)) {
        state.myLiked.add(movie.movie);
      }
    } else if (type === 'friend') {
      if (!movieDict.has(movie.movie)) {
        movieDict.set(movie.movie, { ...movie, watched: false, liked: null, me: false, friend: true });
      } else {
        const existingMovie = movieDict.get(movie.movie)!;
        movieDict.set(movie.movie, { ...existingMovie, friend: true });
      }

      if (movie.watched && !state.friendWatched.has(movie.movie)) {
        state.friendWatched.add(movie.movie);
      } else if (!state.friendUnwatched.has(movie.movie)) {
        state.friendUnwatched.add(movie.movie);
      }

      if (movie.liked && !state.friendLiked.has(movie.movie)) {
        state.friendLiked.add(movie.movie);
      }
    }
  }

  return state;
}

export function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  const sampledTitles: string[] = [];

  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  const sampledMovies = shuffledMovies.slice(0, maxSamples);
  return sampledMovies.map(movie => movie.title);
}