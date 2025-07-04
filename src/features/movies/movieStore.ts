import { create } from 'zustand';
import { MovieData, State } from './types';
import { SolidDataset } from '@inrupt/solid-client';

interface MovieState extends State {
  // Loading states for UI feedback
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMovies: (movies: MovieData[]) => void;
  setMovie: (movieData: MovieData, tmdbUrl: string) => void;
  // updateMovie: (tmdbUrl: string, updates: Partial<MovieData>) => void;  // Not using this yet/anymore. Will reconsider if needed later.
  removeMovie: (tmdbUrl: string) => void;
  toggleLike: (tmdbUrl: string, liked: boolean | null) => void;
  toggleWatch: (tmdbUrl: string, watched: boolean) => void;
  addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => void;
  resetState: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  syncMovieData: (movies: MovieData[]) => void;

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
  myMovies: new Map<string, MovieData>(),
  friendMovies: new Map<string, MovieData[]>(),
  isLoading: false,
  error: null,
};

export const useMovieStore = create<MovieState>((set, get) => ({
  ...initialState,

  loadMovies: (movies: MovieData[]) => {
    set((state) => {
      const newMyMovies = new Map(state.myMovies);
      const newMyUnwatched = new Set(state.myUnwatched);
      const newMyWatched = new Set(state.myWatched);
      const newMyLiked = new Set(state.myLiked);
      const newFriendMovies = new Map(state.friendMovies);
      const newFriendUnwatched = new Set(state.friendUnwatched);
      const newFriendWatched = new Set(state.friendWatched);
      const newFriendLiked = new Set(state.friendLiked);
      const newRecommended = new Set(state.recommended);

      for (const movie of movies) {
        const tmdbUrl = movie.tmdbUrl;

        if (movie.type === 'friend') {
          const friendMovies = newFriendMovies.get(tmdbUrl) || [];
          friendMovies.push(movie);
          newFriendMovies.set(tmdbUrl, friendMovies);

          if (movie.watched) {
            newFriendWatched.add(tmdbUrl);
          } else {
            newFriendUnwatched.add(tmdbUrl);
          }
          if (movie.liked) {
            newFriendLiked.add(tmdbUrl);
          }
        } else { // If it's a 'me' movie
          newMyMovies.set(tmdbUrl, movie);
          if (movie.watched) {
            newMyWatched.add(tmdbUrl);
          } else {
            newMyUnwatched.add(tmdbUrl);
          }
          if (movie.liked) {
            newMyLiked.add(tmdbUrl);
          }
          if (movie.recommended) {
            newRecommended.add(tmdbUrl);
          }
        }
      }

      return {
        myMovies: newMyMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        myLiked: newMyLiked,
        friendMovies: newFriendMovies,
        friendUnwatched: newFriendUnwatched,
        friendWatched: newFriendWatched,
        friendLiked: newFriendLiked,
        recommended: newRecommended,
      };
    });
  },

  setMovie: (movieData: MovieData, tmdbUrl: string) => {
    set((state) => {
      const newMyMovies = new Map(state.myMovies);
      newMyMovies.set(tmdbUrl, movieData);

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
        myMovies: newMyMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommended: newRecommended,
      };
    });
  },

  removeMovie: (tmdbUrl: string) => {
    set((state) => {
      const newMovies = new Map(state.myMovies);

      newMovies.delete(tmdbUrl);

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
        myMovies: newMovies,
      };
    });
  },

  toggleLike: (tmdbUrl: string, liked: boolean | null) => {
    set((state) => {
      const newMovies = new Map(state.myMovies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, {
          ...currentMovie,
          liked,
        });
      }

      const newMyLiked = new Set(state.myLiked);
      if (liked === true) {
        newMyLiked.add(tmdbUrl);
      } else {
        newMyLiked.delete(tmdbUrl);
      }

      return {
        myMovies: newMovies,
        myLiked: newMyLiked
      };
    });
  },

  toggleWatch: (tmdbUrl: string, watched: boolean) => {
    set((state) => {
      const newMyMovies = new Map(state.myMovies);
      const currentMovie = newMyMovies.get(tmdbUrl);
      if (currentMovie) {
        newMyMovies.set(tmdbUrl, {
          ...currentMovie,
          watched,
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
        myMovies: newMyMovies,
        myUnwatched: newMyUnwatched,
        myWatched: newMyWatched,
        recommended: newRecommended,
      };
    });
  },

  addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => {
    set((state) => {
      const newMovies = new Map(state.myMovies);
      const currentMovie = newMovies.get(tmdbUrl);
      if (currentMovie) {
        newMovies.set(tmdbUrl, { ...currentMovie, ...updates });
      }

      const newMyUnwatched = new Set(state.myUnwatched);
      newMyUnwatched.add(tmdbUrl);

      return {
        myUnwatched: newMyUnwatched,
        myMovies: newMovies,
      };
    });
  },

  resetState: () => {
    set(initialState);
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },


  // Not handling friend movie deletion yet. Maybe in the future we will have a way to delete friend movies.
  syncMovieData: (movies: MovieData[]) => {
    const state = get();

    // Separate movies by type
    const myMovies = movies.filter(movie => movie.type === 'me');
    const friendMovies = movies.filter(movie => movie.type === 'friend');

    // Get current movie URLs from the latest data
    const currentMyMovieUrls = new Set(myMovies.map(movie => movie.tmdbUrl));

    const deletedMyMovieUrls = Array.from(state.myMovies.keys()).filter(tmdbUrl =>
      !currentMyMovieUrls.has(tmdbUrl)
    );

    // Find new movies that haven't been loaded yet
    const newMyMovies = myMovies.filter(movie =>
      !state.myMovies.has(movie.tmdbUrl)
    );
    const newFriendMovies = friendMovies.filter(movie =>
      !state.friendMovies.has(movie.tmdbUrl) &&
      !state.friendMovies.get(movie.tmdbUrl)?.some(existingMovie => existingMovie.solidUrl === movie.solidUrl)
    );

    // Handle deletions for my movies
    if (deletedMyMovieUrls.length > 0) {
      deletedMyMovieUrls.forEach(tmdbUrl => {
        get().removeMovie(tmdbUrl);
      });
    }

    // Handle new movies (both my movies and friend movies)
    const allNewMovies = [...newMyMovies, ...newFriendMovies];
    if (allNewMovies.length > 0) {
      // Dispatch only the new movies for incremental loading
      get().loadMovies(allNewMovies);
    }
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
