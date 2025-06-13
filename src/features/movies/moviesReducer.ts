import { MovieData, State } from './types';

export type MoviesAction =
  | { type: 'LOAD_DATA'; payload: { categorizedMovies: any; movieDict: { [key: string]: MovieData } } }
  | { type: 'ADD_MOVIE'; payload: { movieData: MovieData; tmdbUrl: string } }
  | { type: 'UPDATE_MOVIE'; payload: { tmdbUrl: string; updates: Partial<MovieData> } }
  | { type: 'REMOVE_MOVIE'; payload: { tmdbUrl: string; removeFromDict: boolean } }
  | { type: 'TOGGLE_LIKE'; payload: { tmdbUrl: string; liked: boolean | null; dataset: MovieData } }
  | { type: 'TOGGLE_WATCH'; payload: { tmdbUrl: string; watched: boolean; dataset: MovieData } }
  | { type: 'ADD_TO_MY_COLLECTION'; payload: { tmdbUrl: string; updates: Partial<MovieData> } }
  | { type: 'RESET_STATE' };

export function moviesReducer(state: State, action: MoviesAction): State {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload.categorizedMovies,
        movies: action.payload.movieDict,
      };

    case 'ADD_MOVIE': {
      const { movieData, tmdbUrl } = action.payload;
      const newState = { ...state, movies: { ...state.movies, [tmdbUrl]: movieData } };

      if (!movieData.recommended) {
        if (!movieData.watched) {
          newState.myUnwatched = [tmdbUrl, ...(state.myUnwatched || [])];
        } else {
          newState.myWatched = [tmdbUrl, ...(state.myWatched || [])];
        }
      } else {
        newState.recommendedDict = [
          tmdbUrl,
          ...(state.recommendedDict || []).filter((x: string) => x !== tmdbUrl)
        ];
      }

      return newState;
    }

    case 'UPDATE_MOVIE': {
      const { tmdbUrl, updates } = action.payload;
      return {
        ...state,
        movies: {
          ...state.movies,
          [tmdbUrl]: { ...state.movies![tmdbUrl], ...updates }
        }
      };
    }

    case 'REMOVE_MOVIE': {
      const { tmdbUrl, removeFromDict } = action.payload;
      const { [tmdbUrl]: deleted, ...remainingMovies } = state.movies!;

      return {
        ...state,
        myUnwatched: (state.myUnwatched || []).filter(x => x !== tmdbUrl),
        myWatched: (state.myWatched || []).filter(x => x !== tmdbUrl),
        myLiked: (state.myLiked || []).filter(x => x !== tmdbUrl),
        recommendedDict: (state.recommendedDict || []).filter(x => x !== tmdbUrl),
        movies: removeFromDict ? remainingMovies : state.movies,
      };
    }

    case 'TOGGLE_LIKE': {
      const { tmdbUrl, liked, dataset } = action.payload;
      const newState = {
        ...state,
        movies: {
          ...state.movies,
          [tmdbUrl]: {
            ...state.movies![tmdbUrl],
            liked,
            dataset
          }
        }
      };

      if (liked === true) {
        newState.myLiked = [tmdbUrl, ...(state.myLiked || [])];
      } else if (liked === false) {
        newState.myLiked = (state.myLiked || []).filter(x => x !== tmdbUrl);
      } else {
        newState.myLiked = (state.myLiked || []).filter(x => x !== tmdbUrl);
      }

      return newState;
    }

    case 'TOGGLE_WATCH': {
      const { tmdbUrl, watched, dataset } = action.payload;
      const newState = {
        ...state,
        movies: {
          ...state.movies,
          [tmdbUrl]: {
            ...state.movies![tmdbUrl],
            watched,
            dataset
          }
        }
      };

      if (watched) {
        newState.myUnwatched = (state.myUnwatched || []).filter(x => x !== tmdbUrl);
        newState.recommendedDict = (state.recommendedDict || []).filter(x => x !== tmdbUrl);
        newState.myWatched = [tmdbUrl, ...(state.myWatched || [])];
      } else {
        newState.myWatched = (state.myWatched || []).filter(x => x !== tmdbUrl);
        newState.myUnwatched = [tmdbUrl, ...(state.myUnwatched || [])];
      }

      return newState;
    }

    case 'ADD_TO_MY_COLLECTION': {
      const { tmdbUrl, updates } = action.payload;
      return {
        ...state,
        myUnwatched: [tmdbUrl, ...(state.myUnwatched || [])],
        movies: {
          ...state.movies,
          [tmdbUrl]: { ...state.movies![tmdbUrl], ...updates }
        }
      };
    }

    case 'RESET_STATE':
      return {};

    default:
      return state;
  }
}
