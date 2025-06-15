import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VNode } from 'preact';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 404s or auth errors
        if (error && 'status' in error && (error.status === 404 || error.status === 401)) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: VNode | VNode[];
}

export function QueryProvider({ children }: QueryProviderProps): VNode {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
