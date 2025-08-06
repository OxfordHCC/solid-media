import { useCallback, useState, useEffect } from 'preact/hooks';
import { fetchRecommendations } from '../../apis/solidflix-recommendataion';
import { MediaData, search } from '../../apis/tmdb';
import { MovieData } from './types';
import { useMovieActions } from './useMovies';
import { useMovieStore } from './movieStore';
import { Session } from '@inrupt/solid-client-authn-browser';

const MAX_RECOMMENDATIONS = 10;

function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  return shuffledMovies.slice(0, maxSamples).map(movie => movie.title);
}

function matchedMovie(targetTitle: string, movies: MediaData[]): MediaData | undefined {
  const directMatch = movies.find(movie => movie.title === targetTitle);
  if (directMatch) return directMatch;
  const ignoreCaseMatch = movies.find(movie => movie.title.toLowerCase() === targetTitle.toLowerCase());
  if (ignoreCaseMatch) return ignoreCaseMatch;
  // Fuzzy match could be added here if needed
  return undefined;
}

interface UseRecommendationsOptions {
  session: Session;
  pod: string;
  enabled?: boolean;
}

export function useRecommendations({ session, pod, enabled = true }: UseRecommendationsOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const movieActions = useMovieActions(session, pod);
  const movieStore = useMovieStore();

  const fetchAndSaveRecommendations = useCallback(async (userMovies: MovieData[]): Promise<void> => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      if (movieStore.recommended.size >= MAX_RECOMMENDATIONS) {
        console.log('Enough recommendations already loaded, skipping loading more...');
        return;
      }

      const filteredUserMovies = userMovies.filter(x => x.type === 'me' && !x.recommended);
      if (filteredUserMovies.length === 0) {
        console.log('No user movies available for recommendations');
        return;
      }

      const sampledTitles = sampleUserMovies(filteredUserMovies, 10);
      const recommendedList = await fetchRecommendations(sampledTitles);

      if (recommendedList.length === 0) {
        console.log('No recommendations returned from API');
        return;
      }

      // Process recommendations sequentially to avoid overwhelming the API
      for (const name of recommendedList) {
        try {
          const movies = await search(name);
          const movie = matchedMovie(name, movies);
          if (movie) {
            await movieActions.saveMovie(movie, true);
          }
        } catch (error) {
          console.error(`Failed to save recommendation '${name}':`, error);
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, movieStore.recommended.size, movieActions]);

  const refetchRecommendations = useCallback((userMovies: MovieData[]) => {
    return fetchAndSaveRecommendations(userMovies);
  }, [fetchAndSaveRecommendations]);

  return {
    isLoading,
    error,
    fetchAndSaveRecommendations,
    refetchRecommendations,
    hasMaxRecommendations: movieStore.recommended.size >= MAX_RECOMMENDATIONS
  };
}

interface UseAutoRecommendationsOptions extends UseRecommendationsOptions {
  hasBasicLoaded: boolean;
  movieDataLoading: boolean;
}

export function useAutoRecommendations({
  session,
  pod,
  hasBasicLoaded,
  movieDataLoading,
  enabled = true
}: UseAutoRecommendationsOptions) {
  const { isLoading, error, fetchAndSaveRecommendations, hasMaxRecommendations } = useRecommendations({
    session,
    pod,
    enabled
  });

  const movieStore = useMovieStore();

  useEffect(() => {
    if (hasBasicLoaded && !movieDataLoading && !isLoading && enabled && !hasMaxRecommendations) {
      const userMoviesArray = Array.from(movieStore.myMovies.values());
      fetchAndSaveRecommendations(userMoviesArray);
    }
  }, [hasBasicLoaded, movieDataLoading, isLoading, enabled, hasMaxRecommendations, fetchAndSaveRecommendations, movieStore.myMovies.size]);
  // Note: Using movieStore.myMovies.size instead of the full map to avoid unnecessary re-renders
  // while still triggering when new movies are added

  return {
    isLoading,
    error,
    hasMaxRecommendations
  };
}
