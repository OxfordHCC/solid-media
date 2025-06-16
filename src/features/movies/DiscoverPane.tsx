import { useEffect, useReducer, useState, useRef, useMemo } from 'preact/hooks';
import { MediaData, search } from '../../apis/tmdb';
import logo from '../../assets/logo.png';
import AddFriends from '../../components/AddFriends';
import Logout from '../../components/Logout';
import { useAuthenticatedSession, useSession } from '../../contexts/SessionContext';
import AddPopup from './AddMovies';
import MovieCarouselSection from './MovieCarouselSection';

import { synchronizeToFriendsDataset } from '../../apis/solid/friendsUtils';
import { getOrCreateMoviesContainerWithAcl, setupMoviesAcl } from '../../apis/solid/movies';
import { fetchRecommendations } from '../../apis/solidflix-recommendataion';
import { useAllMovies, useSaveMovie } from './movieQueries';
import { moviesReducer } from './moviesReducer';
import {
  MovieData,
  State
} from './types';

type ModalType = 'add-movies' | 'add-friends' | 'logout' | null;

const sectionConfigs: Array<{
  title: string;
  key: keyof State;
  type: 'friend' | 'me';
}> = [
  { title: 'Recommended Movies', key: 'recommended', type: 'me' },
  { title: 'Friends Collection', key: 'friendWatched', type: 'friend' },
  { title: 'Friends Wishlist', key: 'friendUnwatched', type: 'friend' },
  { title: 'Friends enjoyed', key: 'friendLiked', type: 'friend' },
  { title: 'Your Collection', key: 'myWatched', type: 'me' },
  { title: 'Your Wishlist', key: 'myUnwatched', type: 'me' },
  { title: 'You enjoyed', key: 'myLiked', type: 'me' },
];

function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  return shuffledMovies.slice(0, maxSamples).map(movie => movie.title);
}

export default function DiscoverPane() {
  const [state, dispatch] = useReducer(moviesReducer, {
    myWatched: new Set<string>(),
    myUnwatched: new Set<string>(),
    myLiked: new Set<string>(),
    friendWatched: new Set<string>(),
    friendUnwatched: new Set<string>(),
    friendLiked: new Set<string>(),
    recommended: new Set<string>(),
    movies: new Map<string, MovieData>(),
  });
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    hasLoaded: false,
    error: null as string | null
  });
  const [friends, setFriends] = useState<string[]>([]);

  const userMovieCollection = useMemo(() => {
    return new Set<string>([
      ...Array.from(state.myWatched),
      ...Array.from(state.myUnwatched),
      ...Array.from(state.myLiked)
    ]);
  }, [state.myWatched, state.myUnwatched, state.myLiked]);
  const friendMovieCollection = useMemo(() => {
    return new Set<string>([
      ...Array.from(state.friendWatched),
      ...Array.from(state.friendUnwatched),
      ...Array.from(state.friendLiked)
    ]);
  }, [state.friendWatched, state.friendUnwatched, state.friendLiked]);

  const loadedMoviesRef = useRef<Set<string>>(new Set());

  const session = useAuthenticatedSession();
  if (!session) return <div />; // Guard against rendering when not logged in
  const { logout } = useSession();

  const webID = session.info.webId!;
  const parts = webID.split('/');
  const pod = parts.slice(0, parts.length - 2).join('/');

  // React Query for movie data - only enabled after setup is complete
  const {
    data: moviesData,
    isLoading: moviesLoading,
    refetch: refetchMovies
  } = useAllMovies(webID, friends, session.fetch, loadingState.hasLoaded);

  // React Query mutation for saving movies
  const saveMovieMutation = useSaveMovie(pod, session.fetch);

  const retryLoad = () => {
    setLoadingState(prev => ({
      ...prev,
      hasLoaded: false,
      error: null
    }));
    // Clear the loaded movies ref to force reload
    loadedMoviesRef.current.clear();
  };

  useEffect(() => {
    if (!loadingState.hasLoaded && !loadingState.isLoading) {
      loadApplicationData();
    }
  }, [loadingState.hasLoaded, loadingState.isLoading, session, pod, webID]);

  // Incrementally sync React Query movie data with reducer state
  useEffect(() => {
    if (moviesData && moviesData.length > 0) {
      // Get current movie URLs from the latest data
      const currentMovieUrls = new Set(moviesData.map(movie => movie.tmdbUrl));

      // Find new movies that haven't been loaded yet
      const newMovies = moviesData.filter(movie =>
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
          dispatch({
            type: 'REMOVE_MOVIE',
            payload: { tmdbUrl, removeFromDict: true }
          });  // FIXME: Correctly handle 'me' and 'friend', such as by checking both tmdbUrl and solidUrl
        });
      }

      // Add and dispatch new movies
      if (newMovies.length > 0) {
        // Update the ref to track loaded movies
        newMovies.forEach(movie => {
          loadedMoviesRef.current.add(movie.tmdbUrl);
        });

        // Dispatch only the new movies for incremental loading
        dispatch({
          type: 'LOAD_MOVIES',
          payload: { movies: new Set(newMovies) }
        });
      }
    }
  }, [moviesData]);

  useEffect(() => {
    if (loadingState.hasLoaded) {
      fetchAndSaveRecommendations(state.movies);
    }
  }, [loadingState.hasLoaded]);

  async function loadApplicationData() {
    try {
      setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
      const loadingStart = (new Date()).getTime();

      // Initialize movies container
      const moviesAclDataset = await getOrCreateMoviesContainerWithAcl(pod, session.fetch);

      // Manage friends dataset and sync with profile
      const { friendsDataset, friends: friendsList } = await synchronizeToFriendsDataset(pod, webID, session.fetch);

      // Setup ACL permissions for movies
      await setupMoviesAcl(moviesAclDataset, pod, webID, friendsList, session.fetch);

      // Set friends to trigger React Query data loading
      setFriends(friendsList);

      const loadingEnd = (new Date()).getTime();
      console.log(`Loaded movies in ${(loadingEnd - loadingStart) / 1000} seconds`);

      setLoadingState(prev => ({ ...prev, hasLoaded: true }));
    } catch (error) {
      console.error('Error loading application data:', error);
      setLoadingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false }));
    }
  }

  async function fetchAndSaveRecommendations(movieDict: Map<string, MovieData>): Promise<void> {
    try {
      const userMovies = Array.from(movieDict.values()).filter(x => x.type === 'me' && !x.recommended);
      const sampledTitles = sampleUserMovies(userMovies, 10);
      const recommendedList = await fetchRecommendations(sampledTitles);

      for (const name of recommendedList) {
        const movies = await search(name);
        const movie = movies.find((x: any) => x.title === name);
        if (movie) {
          const savedMovie = await new Promise<MovieData>((resolve, reject) => {
            saveMovieMutation.mutate(
              { media: movie, recommended: true },
              {
                onSuccess: resolve,
                onError: reject
              }
            );
          });
          updateStateAfterSave(savedMovie, movie.tmdbUrl);
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
    }
  }

  function updateStateAfterSave(movieData: MovieData, tmdbUrl: string): void {
    dispatch({
      type: 'SET_MOVIE',
      payload: { movieData, tmdbUrl }
    });
  }

  const isDataEmpty = () => {
    const { friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended } = state;
    return [friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked, recommended]
      .every(set => set && set.size === 0);
  };

  const handleAddPopupSave = async (media: MediaData): Promise<void> => {
    if (!Array.from(state.movies.values()).some(x => x.title === media.title)) {
      const savedMovie = await new Promise<MovieData>((resolve, reject) => {
        saveMovieMutation.mutate(
          { media, recommended: false },
          {
            onSuccess: resolve,
            onError: reject
          }
        );
      });
      updateStateAfterSave(savedMovie, media.tmdbUrl);
    }
  };

  const handleAddPopupWatch = async (media: MediaData): Promise<void> => {
    let data = Array.from(state.movies.values()).find(x => x.title === media.title);

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        data = await new Promise<MovieData>((resolve, reject) => {
          saveMovieMutation.mutate(
            { media, recommended: false, watch: true },
            {
              onSuccess: resolve,
              onError: reject
            }
          );
        });
        updateStateAfterSave(data, media.tmdbUrl);
      }
    } else {
      data = await new Promise<MovieData>((resolve, reject) => {
        saveMovieMutation.mutate(
          { media, recommended: false, watch: true },
          {
            onSuccess: resolve,
            onError: reject
          }
        );
      });
      updateStateAfterSave(data, media.tmdbUrl);
    }
  };

  return (
    <div class="movies-page">
      <div class="logo-container">
        <img src={logo} alt="Logo"></img>
      </div>

      <div class='add-button-wrapper'>
        <button class='add-button' onClick={() => setActiveModal('add-movies')}>➕ Add movies</button>
        <button class='add-button' onClick={() => setActiveModal('add-friends')}>👥 Add friends</button>
        <button class='add-button' onClick={() => { setActiveModal('logout'); logout(); }}>👋 Logout</button>
      </div>

      {(loadingState.isLoading || moviesLoading) && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div class="loader__filmstrip"></div>
          <p class="loader__text">loading</p>
        </div>
      )}

      {loadingState.error && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p>Error loading data: {loadingState.error}</p>
          <button onClick={() => {
            retryLoad();
            refetchMovies();
          }}>Retry</button>
        </div>
      )}

      {!loadingState.error && isDataEmpty() && (
        <div class="empty-container-data">
          <h3>Add Movies or Friends</h3>
        </div>
      )}

      {!loadingState.error && (
        sectionConfigs.map(({ title, key, type }) => (
          <MovieCarouselSection
            key={key}
            title={title}
            items={state[key] as Set<string>}
            movies={state.movies}
            type={type}
            session={session}
            dispatch={dispatch}
            userCollection={userMovieCollection}
            friendsCollection={friendMovieCollection}
            pod={pod}
          />
        ))
      )}

      {activeModal === 'add-movies' && (
        <AddPopup
          close={() => setActiveModal(null)}
          save={handleAddPopupSave}
          watch={handleAddPopupWatch}
        />
      )}

      {activeModal === 'add-friends' && (
        <AddFriends
          webID={webID}
          authFetch={session.fetch}
          close={() => setActiveModal(null)}
          onFriendAdded={async (friendId) => {
            // TODO: Fetch newly added friend's movies dynamically instead of refreshing
            window.location.reload();
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'logout' && <Logout />}
    </div>
  );
}
