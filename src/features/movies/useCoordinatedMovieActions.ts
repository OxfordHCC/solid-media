import { useMovieStore } from './movieStore';
import { useUpdateMovieDataset, useDeleteMovie, useSaveMovie } from './movieQueries';
import { addRating, removeFromDataset, setWatched, fromFriendToMeDataset } from './datasetUtils';
import { PREFIXES_MOVIE } from '../../utils/prefixes';
import { MovieData } from './types';
import { MediaData } from '../../apis/tmdb';
import { MutableRef } from 'preact/hooks';

/**
 * Coordinated movie actions that manage both external (SOLID) and internal (Zustand) state
 */
export function useCoordinatedMovieActions(session: any, pod?: string) {
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
    movieStore.toggleLike(tmdbUrl, like, dataset);

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
      movieStore.toggleLike(tmdbUrl, originalMovie.liked, originalMovie.dataset);
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
    movieStore.toggleWatch(tmdbUrl, watched, dataset);

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
      movieStore.toggleWatch(tmdbUrl, originalMovie.watched, originalMovie.dataset);
      throw error;
    }
  };

  /**
   * Remove movie - coordinates external deletion with internal state cleanup
   */
  const removeMovieAction = async (
    movieData: MovieData,
    friendsCollection: Set<string>
  ): Promise<void> => {
    const { solidUrl, tmdbUrl } = movieData;

    // Store original state for rollback
    const originalMovie = { ...movieData };
    const shouldRemoveFromDict = !friendsCollection.has(tmdbUrl);

    // Optimistically remove from internal state
    movieStore.removeMovie(tmdbUrl, shouldRemoveFromDict);

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

  /**
   * Synchronize movie data between React Query and Zustand store
   * Handles incremental updates by adding new movies and removing deleted ones
   */
  const syncMovieData = async (
    movies: MovieData[],
    loadedMoviesRef: MutableRef<Set<string>>
  ): Promise<void> => {
    // Get current movie URLs from the latest data
    const currentMovieUrls = new Set(movies.map(movie => movie.tmdbUrl));

    // Find new movies that haven't been loaded yet
    const newMovies = movies.filter(movie =>
      !loadedMoviesRef.current.has(movie.tmdbUrl)
    );

    // Find movies that were loaded before but are no longer in the data (deleted)
    const deletedMovieUrls = Array.from(loadedMoviesRef.current).filter(tmdbUrl =>
      !currentMovieUrls.has(tmdbUrl)
    );

    // Remove deleted movies from tracking
    deletedMovieUrls.forEach(tmdbUrl => {
      loadedMoviesRef.current.delete(tmdbUrl);
    });

    // Dispatch deleted movies for cleanup
    if (deletedMovieUrls.length > 0) {
      deletedMovieUrls.forEach(tmdbUrl => {
        movieStore.removeMovie(tmdbUrl, true);  // FIXME: Correctly handle 'me' and 'friend', such as by checking both tmdbUrl and solidUrl
      });
    }

    // Add and dispatch new movies
    if (newMovies.length > 0) {
      // Update the ref to track loaded movies
      newMovies.forEach(movie => {
        loadedMoviesRef.current.add(movie.tmdbUrl);
      });

      // Dispatch only the new movies for incremental loading
      movieStore.loadMovies(new Set(newMovies));
    }
  };

  return {
    toggleLike,
    toggleWatch,
    removeMovie: removeMovieAction,
    addFriendMovieToMyCollection,
    saveMovie: saveMovieAction,
    syncMovieData,
    // Expose store selectors
    getUserMovieCollection: movieStore.getUserMovieCollection,
    getFriendMovieCollection: movieStore.getFriendMovieCollection,
  };
}
