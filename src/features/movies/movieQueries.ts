import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'preact/hooks';
import { MovieData, PersonInfo, MovieListItem } from './types';
import { loadMovieList, loadMovieDetail, saveMovieDataset, deleteMovieDataset } from "./remoteMovieDataUtils";
import { saveMovie } from './remoteMovieDataUtils';
import { MediaData } from '../../apis/tmdb';

// Query keys
export const movieQueryKeys = {
  all: ['movies'] as const,
  lists: () => [...movieQueryKeys.all, 'list'] as const,
  list: (personId: string) => [...movieQueryKeys.lists(), personId] as const,
  details: () => [...movieQueryKeys.all, 'detail'] as const,
  detail: (url: string) => [...movieQueryKeys.details(), url] as const,
  userMovies: (webID: string) => [...movieQueryKeys.all, 'user', webID] as const,
  friendMovies: (friendIds: string[]) => [...movieQueryKeys.all, 'friends', friendIds.sort().join(',')] as const,
  allMovies: (webID: string, friends: string[]) => [
    ...movieQueryKeys.all,
    'allMovies',
    webID,
    friends.sort().join(',')
  ] as const,
};

// Hook to fetch movie list on demand
export function useFetchMovieList(
  fetch: typeof window.fetch
) {
  const queryClient = useQueryClient();

  const fetchMovieList = useCallback((person: PersonInfo): Promise<MovieListItem[]> => {
    return queryClient.fetchQuery({
      queryKey: movieQueryKeys.list(person.id),
      queryFn: () => loadMovieList(person, fetch),
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    });
  }, [queryClient, fetch]);

  return fetchMovieList;
}

// Hook to fetch movie detail on demand
export function useFetchMovieDetail(
  fetch: typeof window.fetch
) {
  const queryClient = useQueryClient();

  const fetchMovieDetail = useCallback((movieItem: MovieListItem): Promise<MovieData> => {
    return queryClient.fetchQuery({
      queryKey: movieQueryKeys.detail(movieItem.url),
      queryFn: () => loadMovieDetail(movieItem, fetch),
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      retryDelay: (attemptIndex) => (attemptIndex + 1) * 1500, // add delay between retries
    });
  }, [queryClient, fetch]);

  return fetchMovieDetail;
}

// Hook to fetch all movies for a user and their friends on demand
export function useFetchAllMovies(
  fetch: typeof window.fetch
) {
  const fetchMovieList = useFetchMovieList(fetch);
  const fetchMovieDetail = useFetchMovieDetail(fetch);

  const fetchAllMovies = useCallback(async (webID: string, friends: string[]): Promise<MovieData[]> => {
    const people: PersonInfo[] = [
      { type: 'me', id: webID },
      ...friends.map(id => ({ type: 'friend' as const, id }))
    ];

    try {
      // Fetch all movie lists in parallel
      const movieLists = await Promise.all(
        people.map(person => fetchMovieList(person))
      );

      // Combine all movie items
      const allMovieItems = movieLists.flat();

      // Fetch all movie details in parallel
      const allMovies = await Promise.all(
        allMovieItems.map((item: MovieListItem) => fetchMovieDetail(item))
      );

      return allMovies;
    } catch (error) {
      throw error;
    }
  }, [fetchMovieList, fetchMovieDetail]);

  return fetchAllMovies;
}

// Hook to fetch all movies for a user and their friends
export function useAllMovies(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch,
  enabled: boolean = true
) {
  const fetchAllMovies = useFetchAllMovies(fetch);

  return useQuery({
    queryKey: movieQueryKeys.allMovies(webID, friends),
    queryFn: () => fetchAllMovies(webID, friends),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => (attemptIndex + 1) * 1500,
  });
}

// Mutation to save a movie
export function useSaveMovie(
  pod: string,
  fetch: typeof window.fetch
): UseMutationResult<MovieData, Error, { media: MediaData; recommended?: boolean; watch?: boolean }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ media, recommended = false, watch = false }) =>
      saveMovie(media, pod, fetch, recommended, watch),
    onSuccess: (movieData) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: movieQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: movieQueryKeys.details() });

      // Optimistically update the cache
      queryClient.setQueryData(
        movieQueryKeys.detail(movieData.solidUrl),
        movieData
      );
    },
  });
}

// Mutation to update movie dataset
export function useUpdateMovieDataset(
  fetch: typeof window.fetch
): UseMutationResult<void, Error, { datasetUrl: string; dataset: any; prefixes?: any }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ datasetUrl, dataset, prefixes }) =>
      saveMovieDataset(datasetUrl, dataset, fetch, prefixes),
    onSuccess: (_, { datasetUrl }) => {
      // Invalidate the specific movie detail query
      queryClient.invalidateQueries({
        queryKey: movieQueryKeys.detail(datasetUrl)
      });
    },
  });
}

// Mutation to delete a movie
export function useDeleteMovie(
  fetch: typeof window.fetch
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datasetUrl: string) => deleteMovieDataset(datasetUrl, fetch),
    onSuccess: (_, datasetUrl) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: movieQueryKeys.detail(datasetUrl) });
      queryClient.invalidateQueries({ queryKey: movieQueryKeys.lists() });
    },
  });
}
