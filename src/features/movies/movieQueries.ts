import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { MovieData, PersonInfo, MovieListItem } from './types';
import { loadMovieList, loadMovieDetail, saveMovieDataset, deleteMovieDataset } from './datasetUtils';
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
};

// Hook to fetch movie list for a person
export function useMovieList(
  person: PersonInfo,
  fetch: typeof window.fetch,
  enabled: boolean = true
): UseQueryResult<MovieListItem[], Error> {
  return useQuery({
    queryKey: movieQueryKeys.list(person.id),
    queryFn: () => loadMovieList(person, fetch),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to fetch movie detail
export function useMovieDetail(
  movieItem: MovieListItem,
  fetch: typeof window.fetch,
  enabled: boolean = true
): UseQueryResult<MovieData, Error> {
  return useQuery({
    queryKey: movieQueryKeys.detail(movieItem.url),
    queryFn: () => loadMovieDetail(movieItem, fetch),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Hook to fetch all movies for a user and their friends
export function useAllMovies(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch,
  enabled: boolean = true
) {
  const people: PersonInfo[] = [
    { type: 'me', id: webID },
    ...friends.map(id => ({ type: 'friend' as const, id }))
  ];

  // Fetch movie lists for all people
  const movieListQueries = people.map(person =>
    useMovieList(person, fetch, enabled)
  );

  // Combine all movie items from successful queries
  const allMovieItems = movieListQueries
    .filter(query => query.isSuccess)
    .flatMap(query => query.data || []);

  // Fetch details for all movies
  const movieDetailQueries = allMovieItems.map(item =>
    useMovieDetail(item, fetch, enabled && allMovieItems.length > 0)
  );

  const isLoading = movieListQueries.some(q => q.isLoading) ||
                   movieDetailQueries.some(q => q.isLoading);

  const isError = movieListQueries.some(q => q.isError) ||
                 movieDetailQueries.some(q => q.isError);

  const allMovies = movieDetailQueries
    .filter(query => query.isSuccess)
    .map(query => query.data!)
    .filter(Boolean);

  return {
    data: allMovies,
    isLoading,
    isError,
    error: movieListQueries.find(q => q.error)?.error ||
           movieDetailQueries.find(q => q.error)?.error,
    refetch: () => {
      movieListQueries.forEach(q => q.refetch());
      movieDetailQueries.forEach(q => q.refetch());
    }
  };
}

// Mutation to save a movie
export function useSaveMovie(
  pod: string,
  fetch: typeof window.fetch
): UseMutationResult<MovieData, Error, { media: MediaData; recommended?: boolean; watch?: boolean }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ media, recommended = false, watch = false }) => {
      return saveMovie(media, pod, fetch, recommended, watch);
    },
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
    mutationFn: async ({ datasetUrl, dataset, prefixes }) => {
      return saveMovieDataset(datasetUrl, dataset, fetch, prefixes);
    },
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
