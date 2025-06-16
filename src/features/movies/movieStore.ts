import { create } from 'zustand';
import { MovieData } from './types';
import { SolidDataset } from '@inrupt/solid-client';

interface MovieState {
  // State
  myWatched: Set<string>;
  myUnwatched: Set<string>;
  myLiked: Set<string>;
  friendWatched: Set<string>;
  friendUnwatched: Set<string>;
  friendLiked: Set<string>;
  recommended: Set<string>;
  movies: Map<string, MovieData>;

  // Actions
  loadMovies: (movies: Set<MovieData>) => void;
  setMovie: (movieData: MovieData, tmdbUrl: string) => void;
  updateMovie: (tmdbUrl: string, updates: Partial<MovieData>) => void;
  removeMovie: (tmdbUrl: string, removeFromDict: boolean) => void;
  toggleLike: (tmdbUrl: string, liked: boolean | null, dataset: SolidDataset) => void;
  toggleWatch: (tmdbUrl: string, watched: boolean, dataset: SolidDataset) => void;
  addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => void;
  resetState: () => void;

  // Selectors/computed values
  getUserMovieCollection: () => Set<string>;
  getFriendMovieCollection: () => Set<string>;
  isDataEmpty: () => boolean;
}

const initialState = {
  myWatched: new Set<string>(),
  myUnwatched: new Set<string>(),
  myLiked: new Set<string>(),
  friendWatched: new Set<string>(),
  friendUnwatched: new Set<string>(),
  friendLiked: new Set<string>(),
  recommended: new Set<string>(),
  movies: new Map<string, MovieData>(),
};

export const useMovieStore = create<MovieState>((set, get) => ({
  ...initialState,

  loadMovies: (movies: Set<MovieData>) => {
    set((state) => {
      const newMovies = new Map(state.movies);
      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newMyLiked = new Set(state.myLiked);
      const newFriendUnwatched = new Set(state.friendUnwatched);
      const newFriendWatched = new Set(state.friendWatched);
      const newFriendLiked = new Set(state.friendLiked);
      const newRecommended = new Set(state.recommended);

      for (const movie of movies) {
        const tmdbUrl = movie.tmdbUrl;
        const currentMovie = newMovies.get(tmdbUrl);

        if (currentMovie) {
          // Only override if it's not from 'me'
          if (currentMovie.type !== 'me') {
            newMovies.set(tmdbUrl, movie);
          }
        } else {
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
        } else if (movie.type === 'friend') {
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
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        friendUnwatched: newFriendUnwatched,
        friendWatched: newFriendWatched,
        friendLiked: newFriendLiked,
        recommended: newRecommended,
      };
    });
  },

  setMovie: (movieData: MovieData, tmdbUrl: string) => {
    set((state) => {
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
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommended: newRecommended,
      };
    });
  },

  updateMovie: (tmdbUrl: string, updates: Partial<MovieData>) => {
    set((state) => {
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, { ...currentMovie, ...updates });
      }
      return { movies: newMovies };
    });
  },

  removeMovie: (tmdbUrl: string, removeFromDict: boolean) => {
    set((state) => {
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
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        recommended: newRecommended,
        movies: newMovies,
      };
    });
  },

  toggleLike: (tmdbUrl: string, liked: boolean | null, dataset: SolidDataset) => {
    set((state) => {
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
        movies: newMovies,
        myLiked: newMyLiked
      };
    });
  },

  toggleWatch: (tmdbUrl: string, watched: boolean, dataset: SolidDataset) => {
    set((state) => {
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
        movies: newMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommended: newRecommended,
      };
    });
  },

  addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => {
    set((state) => {
      const newMovies = new Map(state.movies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, { ...currentMovie, ...updates });
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      newMyUnwatched.add(tmdbUrl);

      return {
        myUnwatched: newMyUnwatched,
        movies: newMovies,
      };
    });
  },

  resetState: () => {
    set(initialState);
  },

  // Computed values
  getUserMovieCollection: () => {
    const state = get();
    return new Set<string>([
      ...Array.from(state.myWatched),
      ...Array.from(state.myUnwatched),
      ...Array.from(state.myLiked)
    ]);
  },

  getFriendMovieCollection: () => {
    const state = get();
    return new Set<string>([
      ...Array.from(state.friendWatched),
      ...Array.from(state.friendUnwatched),
      ...Array.from(state.friendLiked)
    ]);
  },

  isDataEmpty: () => {
    const state = get();
    const { friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended } = state;
    return [friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended]
      .every(set => set && set.size === 0);
  },
}));
