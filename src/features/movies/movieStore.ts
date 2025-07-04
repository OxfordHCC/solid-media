import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import { MovieData, State } from './types';
import { SolidDataset } from '@inrupt/solid-client';

export interface MovieState extends State {
  // Loading states for UI feedback
  isLoading: boolean;
  error: string | null;
}

export interface MovieActions {
  loadMovies: (movies: MovieData[], reset?: boolean) => void;
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
}

const initialState: MovieState = {
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

export const useMovieStore = create<MovieState & MovieActions>()(
  immer((set, get) => ({
    ...initialState,

    loadMovies: (movies: MovieData[], reset?: boolean) => {
      set((state) => {

        if (reset) {
          // Reset the state if replacing
          state.myMovies.clear();
          state.friendMovies.clear();
          state.myWatched.clear();
          state.myUnwatched.clear();
          state.myLiked.clear();
          state.friendWatched.clear();
          state.friendUnwatched.clear();
          state.friendLiked.clear();
          state.recommended.clear();
        }

        for (const movie of movies) {
          const tmdbUrl = movie.tmdbUrl;

          if (movie.type === 'friend') {
            const existingFriendMovies = state.friendMovies.get(tmdbUrl) || [];
            // Find the index of the movie in the existing array
            const existingIndex = existingFriendMovies.findIndex(
              (m) => m.solidUrl === movie.solidUrl
            );
            if (existingIndex !== -1) { // If the movie already exists, update it
              existingFriendMovies[existingIndex] = castDraft(movie);
            } else { // If it's a new movie, add it to the array
              existingFriendMovies.push(castDraft(movie));
            }
            state.friendMovies.set(tmdbUrl, existingFriendMovies);

            if (movie.watched) {
              state.friendWatched.add(tmdbUrl);
            } else {
              state.friendUnwatched.add(tmdbUrl);
            }
            if (movie.liked) {
              state.friendLiked.add(tmdbUrl);
            }
          } else { // If it's a 'me' movie
            state.myMovies.set(tmdbUrl, castDraft(movie));
            if (movie.watched) {
              state.myWatched.add(tmdbUrl);
            } else {
              state.myUnwatched.add(tmdbUrl);
            }
            if (movie.liked) {
              state.myLiked.add(tmdbUrl);
            }
            if (movie.recommended) {
              state.recommended.add(tmdbUrl);
            }
          }
        }
      });
    },

    setMovie: (movieData: MovieData, tmdbUrl: string) => {
      set((state) => {
        state.myMovies.set(tmdbUrl, castDraft(movieData));

        if (!movieData.recommended) {
          if (!movieData.watched) {
            state.myUnwatched.add(tmdbUrl);
          } else {
            state.myWatched.add(tmdbUrl);
          }
        } else {
          state.recommended.add(tmdbUrl);
        }
      });
    },

    removeMovie: (tmdbUrl: string) => {
      set((state) => {
        state.myMovies.delete(tmdbUrl);
        state.myUnwatched.delete(tmdbUrl);
        state.myWatched.delete(tmdbUrl);
        state.myLiked.delete(tmdbUrl);
        state.recommended.delete(tmdbUrl);
      });
    },

    toggleLike: (tmdbUrl: string, liked: boolean | null) => {
      set((state) => {
        const currentMovie = state.myMovies.get(tmdbUrl);
        if (currentMovie) {
          state.myMovies.set(tmdbUrl, castDraft({
            ...currentMovie,
            liked,
          }));
        }

        if (liked === true) {
          state.myLiked.add(tmdbUrl);
        } else {
          state.myLiked.delete(tmdbUrl);
        }
      });
    },

    toggleWatch: (tmdbUrl: string, watched: boolean) => {
      set((state) => {
        const currentMovie = state.myMovies.get(tmdbUrl);
        if (currentMovie) {
          state.myMovies.set(tmdbUrl, castDraft({
            ...currentMovie,
            watched,
          }));
        }

        if (watched) {
          state.myUnwatched.delete(tmdbUrl);
          state.recommended.delete(tmdbUrl);
          state.myWatched.add(tmdbUrl);
        } else {
          state.myWatched.delete(tmdbUrl);
          state.myUnwatched.add(tmdbUrl);
        }
      });
    },

    addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => {
      set((state) => {
        const currentMovie = state.myMovies.get(tmdbUrl);
        if (currentMovie) {
          state.myMovies.set(tmdbUrl, castDraft({ ...currentMovie, ...updates }));
        }
        state.myUnwatched.add(tmdbUrl);
      });
    },

    resetState: () => {
      set(initialState);
    },

    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error;
      });
    },

    // Not handling friend movie deletion yet. Maybe in the future we will have a way to delete friend movies.
    syncMovieData: (movies: MovieData[]) => {
      get().loadMovies(movies, false);

      // // The following code is more correct (with caveat of friend movie deletion). But because it's more complex, we do not use it for now.
      // // It is reserved in case we still need it in the future when redesigning data loading.
      //
      // const state = get();

      // // Separate movies by type
      // const myMovies = movies.filter(movie => movie.type === 'me');
      // const friendMovies = movies.filter(movie => movie.type === 'friend');

      // // Get current movie URLs from the latest data
      // const currentMyMovieUrls = new Set(myMovies.map(movie => movie.tmdbUrl));

      // const deletedMyMovieUrls = Array.from(state.myMovies.keys()).filter(tmdbUrl =>
      //   !currentMyMovieUrls.has(tmdbUrl)
      // );

      // // Find new movies that haven't been loaded yet
      // const newMyMovies = myMovies.filter(movie =>
      //   !state.myMovies.has(movie.tmdbUrl)
      // );
      // const newFriendMovies = friendMovies.filter(movie =>
      //   !state.friendMovies.has(movie.tmdbUrl) &&
      //   !state.friendMovies.get(movie.tmdbUrl)?.some(existingMovie => existingMovie.solidUrl === movie.solidUrl)
      // );

      // // Handle deletions for my movies
      // if (deletedMyMovieUrls.length > 0) {
      //   deletedMyMovieUrls.forEach(tmdbUrl => {
      //     get().removeMovie(tmdbUrl);
      //   });
      // }

      // // Handle new movies (both my movies and friend movies)
      // const allNewMovies = [...newMyMovies, ...newFriendMovies];
      // if (allNewMovies.length > 0) {
      //   // Dispatch only the new movies for incremental loading
      //   get().loadMovies(allNewMovies);
      // }
    },
  }))
);
