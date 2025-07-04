import { useMovieStore } from './movieStore';
import { useUpdateMovieDataset, useDeleteMovie, useSaveMovie, useAllMovies } from './movieQueries';
import { addRating, removeFromDataset, setWatched, fromFriendToMeDataset } from './datasetUtils';
import { PREFIXES_MOVIE } from '../../utils/prefixes';
import { MovieData } from './types';
import { MediaData } from '../../apis/tmdb';
import { useEffect, useMemo } from 'preact/hooks';

/**
 * Memoized computed values for better performance
 */
export function useComputedMovieCollections() {
  const movieStore = useMovieStore();

  const userMovieCollection = useMemo(() => {
    return new Set<string>([
      ...Array.from(movieStore.myWatched),
      ...Array.from(movieStore.myUnwatched),
      ...Array.from(movieStore.myLiked)
    ]);
  }, [movieStore.myWatched, movieStore.myUnwatched, movieStore.myLiked]);

  const friendMovieCollection = useMemo(() => {
    return new Set<string>([
      ...Array.from(movieStore.friendWatched),
      ...Array.from(movieStore.friendUnwatched),
      ...Array.from(movieStore.friendLiked)
    ]);
  }, [movieStore.friendWatched, movieStore.friendUnwatched, movieStore.friendLiked]);

  const isStoreEmpty = useMemo(() => {
    const { friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended } = movieStore;
    return [friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended]
      .every(set => set && set.size === 0);
  }, [movieStore.friendWatched, movieStore.friendUnwatched, movieStore.friendLiked,
  movieStore.myWatched, movieStore.myUnwatched, movieStore.myLiked, movieStore.recommended]);

  return {
    userMovieCollection,
    friendMovieCollection,
    isStoreEmpty
  };
}

/**
 * Enhanced movie actions hook that integrates React Query with Zustand store
 * This replaces useCoordinatedMovieActions and provides a cleaner interface
 */
export function useMovieActions(session: any, pod?: string) {
  const movieStore = useMovieStore();
  const updateMovieDataset = useUpdateMovieDataset(session.fetch);
  const deleteMovie = useDeleteMovie(session.fetch);
  const saveMovie = useSaveMovie(pod || '', session.fetch);

  /**
   * Toggle like status - coordinates external dataset mutation with internal state
   */
  const toggleLike = async (
    movieData: MovieData,
    like: boolean | null
  ): Promise<void> => {
    const { solidUrl, dataset: originalDataset, tmdbUrl } = movieData;

    // Store original state for rollback
    const originalMovie = { ...movieData };

    // Prepare the complete dataset mutation first
    let dataset = originalDataset;
    dataset = removeFromDataset(dataset, 'https://schema.org/Rating');
    dataset = removeFromDataset(dataset, 'https://schema.org/ReviewAction');

    if (like !== null) {
      dataset = addRating(dataset, solidUrl, like ? 3 : 1);
    }

    // Optimistically update internal state with complete dataset
    movieStore.toggleLike(tmdbUrl, like);

    try {
      // Perform external mutation using the same prepared dataset
      await updateMovieDataset.mutateAsync({
        datasetUrl: solidUrl,
        dataset,
        prefixes: PREFIXES_MOVIE
      });

      // External mutation succeeded - optimistic update is now confirmed

    } catch (error) {
      // Rollback to original state on failure
      movieStore.toggleLike(tmdbUrl, originalMovie.liked);
      throw error;
    }
  };

  /**
   * Toggle watch status - coordinates external dataset mutation with internal state
   */
  const toggleWatch = async (
    movieData: MovieData,
    watched: boolean
  ): Promise<void> => {
    const { solidUrl, dataset: originalDataset, tmdbUrl } = movieData;

    // Store original state for rollback
    const originalMovie = { ...movieData };

    // Prepare the complete dataset mutation first
    let dataset = originalDataset;
    if (watched) {
      dataset = setWatched(dataset, solidUrl);
    } else {
      dataset = removeFromDataset(dataset, 'https://schema.org/WatchAction');
    }

    // Optimistically update internal state with complete dataset
    movieStore.toggleWatch(tmdbUrl, watched);

    try {
      // Perform external mutation using the same prepared dataset
      await updateMovieDataset.mutateAsync({
        datasetUrl: solidUrl,
        dataset,
        prefixes: PREFIXES_MOVIE
      });

      // External mutation succeeded - optimistic update is now confirmed

    } catch (error) {
      // Rollback to original state on failure
      movieStore.toggleWatch(tmdbUrl, originalMovie.watched);
      throw error;
    }
  };

  /**
   * Remove movie - coordinates external deletion with internal state cleanup
   */
  const removeMovieAction = async (
    movieData: MovieData
  ): Promise<void> => {
    const { solidUrl, tmdbUrl } = movieData;

    // Store original state for rollback
    const originalMovie = { ...movieData };

    // Optimistically remove from internal state
    movieStore.removeMovie(tmdbUrl);

    try {
      await deleteMovie.mutateAsync(solidUrl);
      // External deletion succeeded - optimistic update is confirmed

    } catch (error) {
      // Rollback - re-add the movie with original data
      movieStore.setMovie(originalMovie, tmdbUrl);
      throw error;
    }
  };

  /**
   * Add friend's movie to my collection
   */
  const addFriendMovieToMyCollection = async (
    movieData: MovieData,
    userCollection: Set<string>
  ): Promise<void> => {
    const { dataset, solidUrl, title, tmdbUrl } = movieData;

    if (userCollection.has(tmdbUrl) || !pod) {
      return; // Already have it or no pod
    }

    try {
      const { dataset: movieDataset, datasetName } = fromFriendToMeDataset(
        dataset,
        solidUrl,
        pod,
        title
      );
      const newUrl = `${pod}/movies/${datasetName}`;

      await updateMovieDataset.mutateAsync({
        datasetUrl: newUrl,
        dataset: movieDataset,
        prefixes: PREFIXES_MOVIE
      });

      movieStore.addToMyCollection(tmdbUrl, {
        type: 'me',
        solidUrl: newUrl,
        dataset: movieDataset
      });

    } catch (error) {
      console.error('Failed to add friend movie to collection:', error);
      throw error;
    }
  };

  /**
   * Save new movie - coordinates external creation with internal state
   */
  const saveMovieAction = async (
    media: MediaData,
    recommended: boolean = false,
    watch: boolean = false
  ): Promise<MovieData> => {
    if (!pod) {
      throw new Error('Pod not available');
    }

    try {
      // Create the movie in SOLID pod
      const savedMovie = await saveMovie.mutateAsync({
        media,
        recommended,
        watch
      });

      // Update internal state with the new movie
      movieStore.setMovie(savedMovie, media.tmdbUrl);

      return savedMovie;
    } catch (error) {
      console.error('Failed to save movie:', error);
      throw error;
    }
  };

  return {
    toggleLike,
    toggleWatch,
    removeMovie: removeMovieAction,
    addFriendMovieToMyCollection,
    saveMovie: saveMovieAction,
  };
}

/**
 * Hook that manages React Query data fetching and syncs with Zustand store
 */
export function useMovieData(webID: string, friends: string[], fetch: typeof window.fetch, enabled: boolean) {
  const movieStore = useMovieStore();

  // React Query for movie data
  const {
    data: moviesData,
    isLoading,
    error,
    refetch: refetchMovies
  } = useAllMovies(webID, friends, fetch, enabled);

  // Incrementally sync React Query movie data with store
  useEffect(() => {
    if (moviesData && moviesData.length > 0) {
      movieStore.syncMovieData(moviesData);
    }
  }, [moviesData, movieStore]);

  return {
    moviesData,
    isLoading,
    error: error?.message || null,
    refetchMovies,
  };
}
