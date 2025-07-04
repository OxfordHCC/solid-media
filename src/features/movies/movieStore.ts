import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import { MovieData, State } from './types';
import { SolidDataset } from '@inrupt/solid-client';

export interface MovieActions {
  loadMovies: (movies: MovieData[]) => void;
  setMovie: (movieData: MovieData, tmdbUrl: string) => void;
  // updateMovie: (tmdbUrl: string, updates: Partial<MovieData>) => void;  // Not using this yet/anymore. Will reconsider if needed later.
  removeMovie: (tmdbUrl: string) => void;
  toggleLike: (tmdbUrl: string, liked: boolean | null) => void;
  toggleWatch: (tmdbUrl: string, watched: boolean) => void;
  addToMyCollection: (tmdbUrl: string, updates: Partial<MovieData>) => void;
  resetState: () => void;
}

const initialState: State = {
  myWatched: new Set<string>(),
  myUnwatched: new Set<string>(),
  myLiked: new Set<string>(),
  friendWatched: new Set<string>(),
  friendUnwatched: new Set<string>(),
  friendLiked: new Set<string>(),
  recommended: new Set<string>(),
  myMovies: new Map<string, MovieData>(),
  friendMovies: new Map<string, MovieData[]>(),
};

export const useMovieStore = create<State & MovieActions>()(
  immer((set, get) => ({
    ...initialState,

    loadMovies: (movies: MovieData[]) => {
      set((state) => {
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
            if (movie.recommended) {
              state.recommended.add(tmdbUrl);
            } else {
              state.recommended.delete(tmdbUrl);
              state.myWatched.delete(tmdbUrl);
              state.myUnwatched.delete(tmdbUrl);
              state.myLiked.delete(tmdbUrl);
              if (movie.watched) {
                state.myWatched.add(tmdbUrl);
              } else {
                state.myUnwatched.add(tmdbUrl);
              }
              if (movie.liked) {
                state.myLiked.add(tmdbUrl);
              }
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
  }))
);
