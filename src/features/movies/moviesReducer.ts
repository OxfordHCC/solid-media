import { MovieData, State } from './types';
import { SolidDataset } from '@inrupt/solid-client';

export type MoviesAction =
  | { type: 'LOAD_DATA'; payload: State }
  | { type: 'LOAD_MOVIES'; payload: { movies: Set<MovieData> } }  // Incrementally load movies
  | { type: 'SET_MOVIE'; payload: { movieData: MovieData; tmdbUrl: string } }
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

    // Incrementally load movies into the state
    // The movie can be from 'me' or a friend, and we need to handle the sets accordingly
    case 'LOAD_MOVIES': {
      const { movies } = action.payload;
      let newMovies = new Map(state.movies);
      let newMyUnwatched = new Set(state.myUnwatched);
      let newMyWatched = new Set(state.myWatched);
      let newMyLiked = new Set(state.myLiked);
      let newFriendUnwatched = new Set(state.friendUnwatched);
      let newFriendWatched = new Set(state.friendWatched);
      let newFriendLiked = new Set(state.friendLiked);
      let newRecommended = new Set(state.recommended);

      for (const movie of movies) {
        const tmdbUrl = movie.tmdbUrl;
        const currentMovie: MovieData | undefined = newMovies.get(tmdbUrl);
        if (currentMovie) {
          // If the movie already exists, check if it's from 'me'. Only override if it's not from 'me'.
          if (currentMovie.type !== 'me') {
            newMovies.set(tmdbUrl, movie);
          }
        }
        else {
          newMovies.set(tmdbUrl, movie);
        }

        if (movie.type === 'me') {
          if (movie.recommended) {
            newRecommended.add(tmdbUrl);
          } else {
            if (!movie.watched) {
              newMyUnwatched.add(tmdbUrl);
            } else {
              newMyWatched.add(tmdbUrl);
            }
            if (movie.liked) {
              newMyLiked.add(tmdbUrl);
            }
          }
        }
        else if (movie.type === 'friend') {
          if (!movie.watched) {
            newFriendUnwatched.add(tmdbUrl);
          } else {
            newFriendWatched.add(tmdbUrl);
          }
          if (movie.liked) {
            newFriendLiked.add(tmdbUrl);
          }
        }
      }

      return {
        ...state,
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        friendUnwatched: newFriendUnwatched,
        friendWatched: newFriendWatched,
        friendLiked: newFriendLiked,
        recommended: newRecommended,
      };
    }

    case 'SET_MOVIE': {
      const { movieData, tmdbUrl } = action.payload;
      const newMovies = new Map(state.movies);
      newMovies.set(tmdbUrl, movieData);

      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newRecommended = new Set(state.recommended);

      if (!movieData.recommended) {
        if (!movieData.watched) {
          newMyUnwatched.add(tmdbUrl);
        } else {
          newMyWatched.add(tmdbUrl);
        }
      } else {
        newRecommended.add(tmdbUrl);
      }

      return {
        ...state,
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommended: newRecommended,
      };
    }

    case 'UPDATE_MOVIE': {
      const { tmdbUrl, updates } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie: MovieData | undefined = newMovies.get(tmdbUrl);
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
      const newRecommended = new Set(state.recommended);

      newMyUnwatched.delete(tmdbUrl);
      newMyWatched.delete(tmdbUrl);
      newMyLiked.delete(tmdbUrl);
      newRecommended.delete(tmdbUrl);

      return {
        ...state,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        recommended: newRecommended,
        movies: newMovies,
      };
    }

    case 'TOGGLE_LIKE': {
      const { tmdbUrl, liked, dataset } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie: MovieData | undefined = newMovies.get(tmdbUrl);
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
      const currentMovie: MovieData | undefined = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, {
          ...currentMovie,
          watched,
          dataset
        });
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newRecommended = new Set(state.recommended);

      if (watched) {
        newMyUnwatched.delete(tmdbUrl);
        newRecommended.delete(tmdbUrl);
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
        recommended: newRecommended,
      };
    }

    case 'ADD_TO_MY_COLLECTION': {
      const { tmdbUrl, updates } = action.payload;
      const newMovies = new Map(state.movies);
      const currentMovie: MovieData | undefined = newMovies.get(tmdbUrl);
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
        recommended: new Set<string>(),
        movies: new Map<string, MovieData>(),
      };

    default:
      return state;
  }
}
