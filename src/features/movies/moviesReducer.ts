import { MovieData, State } from './types';
import { SolidDataset } from '@inrupt/solid-client';

export type MoviesAction =
  | { type: 'LOAD_DATA'; payload: State }
  | { type: 'ADD_MOVIE'; payload: { movieData: MovieData; tmdbUrl: string } }
  | { type: 'UPDATE_MOVIE'; payload: { tmdbUrl: string; updates: Partial<MovieData> } }
  | { type: 'REMOVE_MOVIE'; payload: { tmdbUrl: string; removeFromDict: boolean } }
  | { type: 'TOGGLE_LIKE'; payload: { tmdbUrl: string; liked: boolean | null; dataset: SolidDataset } }
  | { type: 'TOGGLE_WATCH'; payload: { tmdbUrl: string; watched: boolean; dataset: SolidDataset } }
  | { type: 'ADD_TO_MY_COLLECTION'; payload: { tmdbUrl: string; updates: Partial<MovieData> } }
  | { type: 'RESET_STATE' };

export function moviesReducer(state: State, action: MoviesAction): State {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload,
      };

    case 'ADD_MOVIE': {
      const { movieData, tmdbUrl } = action.payload;
      const newMovies = new Map(state.movies);
      newMovies.set(tmdbUrl, movieData);

      const newState: State = {
        ...state,
        movies: newMovies,
      };

      if (!movieData.recommended) {
        if (!movieData.watched) {
          newState.myUnwatched.add(tmdbUrl);
        } else {
          newState.myWatched.add(tmdbUrl);
        }
      } else {
        newState.recommendedDict.add(tmdbUrl);
      }

      return newState;
    }

    case 'UPDATE_MOVIE': {
      const { tmdbUrl, updates } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, { ...currentMovie, ...updates });
      }
      return {
        ...state,
        movies: newMovies
      };
    }

    case 'REMOVE_MOVIE': {
      const { tmdbUrl, removeFromDict } = action.payload;
      const newMovies = new Map(state.movies);
      if (removeFromDict) {
        newMovies.delete(tmdbUrl);
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newMyLiked = new Set(state.myLiked);
      const newRecommendedDict = new Set(state.recommendedDict);

      newMyUnwatched.delete(tmdbUrl);
      newMyWatched.delete(tmdbUrl);
      newMyLiked.delete(tmdbUrl);
      newRecommendedDict.delete(tmdbUrl);

      return {
        ...state,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        recommendedDict: newRecommendedDict,
        movies: newMovies,
      };
    }

    case 'TOGGLE_LIKE': {
      const { tmdbUrl, liked, dataset } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, {
          ...currentMovie,
          liked,
          dataset
        });
      }

      const newMyLiked = new Set(state.myLiked);
      if (liked === true) {
        newMyLiked.add(tmdbUrl);
      } else {
        newMyLiked.delete(tmdbUrl);
      }

      return {
        ...state,
        movies: newMovies,
        myLiked: newMyLiked
      };
    }

    case 'TOGGLE_WATCH': {
      const { tmdbUrl, watched, dataset } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, {
          ...currentMovie,
          watched,
          dataset
        });
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newRecommendedDict = new Set(state.recommendedDict);

      if (watched) {
        newMyUnwatched.delete(tmdbUrl);
        newRecommendedDict.delete(tmdbUrl);
        newMyWatched.add(tmdbUrl);
      } else {
        newMyWatched.delete(tmdbUrl);
        newMyUnwatched.add(tmdbUrl);
      }

      return {
        ...state,
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommendedDict: newRecommendedDict,
      };
    }

    case 'ADD_TO_MY_COLLECTION': {
      const { tmdbUrl, updates } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, { ...currentMovie, ...updates });
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      newMyUnwatched.add(tmdbUrl);

      return {
        ...state,
        myUnwatched: newMyUnwatched,
        movies: newMovies,
      };
    }

    case 'RESET_STATE':
      return {
        myWatched: new Set<string>(),
        myUnwatched: new Set<string>(),
        myLiked: new Set<string>(),
        friendWatched: new Set<string>(),
        friendUnwatched: new Set<string>(),
        friendLiked: new Set<string>(),
        recommendedDict: new Set<string>(),
        movies: new Map<string, MovieData>(),
      };

    default:
      return state;
  }
}
