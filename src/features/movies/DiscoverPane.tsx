import { useEffect, useState, useRef, useMemo } from 'preact/hooks';
import { MediaData, search } from '../../apis/tmdb';
import logo from '../../assets/logo.png';
import AddFriends from '../../components/AddFriends';
import Logout from '../../components/Logout';
import PrivacyProfileIcon from '../privacy_profile/PrivacyProfileIcon';
import { useSessionContext } from '../../contexts/SessionContext';
import AddPopup from './AddMovies';
import MovieCarouselSection from './MovieCarouselSection';

import { synchronizeToFriendsDataset } from '../../apis/solid/friendsUtils';
import { getOrCreateMoviesContainerWithAcl, setupMoviesAcl } from '../../apis/solid/movies';
import { fetchRecommendations } from '../../apis/solidflix-recommendataion';
import { useAllMovies } from './movieQueries';
import { useMovieStore } from './movieStore';
import { useCoordinatedMovieActions } from './useCoordinatedMovieActions';
import {
  MovieData,
  State
} from './types';
import { PrivacyProfile, UIElement } from '../privacy_profile/privacyProfileDefinitions';
import { PrivacyProfileUIElements } from '../privacy_profile/privacyProfileDefinitions';
import { getPrivacyProfileFromWebIdProfile, savePrivacyProfileToWebIdProfile } from '../privacy_profile/utils';

const MAX_RECOMMENDATIONS = 10;

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
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [hasBasicLoaded, setHasBasicLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);

  const [friends, setFriends] = useState<string[]>([]);

  const loadedMoviesRef = useRef<Set<string>>(new Set());
  const movieStore = useMovieStore();
  const { loadMovies, removeMovie } = movieStore;

  const sessionContext = useSessionContext(true);
  if (!sessionContext) return <div />; // Guard against rendering when not logged in
  const { session, logout } = sessionContext;

  const webID = session.info.webId!;
  const parts = webID.split('/');
  const pod = parts.slice(0, parts.length - 2).join('/');

  // Use coordinated actions for movie operations
  const { saveMovie } = useCoordinatedMovieActions(session, pod);

  const [privacyProfile, setPrivacyProfile] = useState<PrivacyProfile | null>(null);
  const enabledUIElements = useMemo<UIElement[]>(() => privacyProfile ? PrivacyProfileUIElements[privacyProfile] : PrivacyProfileUIElements.null, [privacyProfile]);

  useEffect(() => {
    // Load privacy profile from webID
    getPrivacyProfileFromWebIdProfile(webID, session.fetch)
      .then(profile => {
        setPrivacyProfile(profile);
      })
      .catch(error => {
        console.error('Error loading privacy profile:', error);
      });
  }, [webID, session.fetch]);

  const handlePrivacyProfileChange = async (newProfile: PrivacyProfile): Promise<void> => {
    try {
      await savePrivacyProfileToWebIdProfile(webID, newProfile, session.fetch);
      setPrivacyProfile(newProfile);
    } catch (error) {
      console.error('Failed to save privacy profile:', error);
      throw error;
    }
  };

  // React Query for movie data
  const {
    data: moviesData,
    isLoading: moviesLoading,
    refetch: refetchMovies
  } = useAllMovies(webID, friends, session.fetch, hasBasicLoaded);

  const retryLoad = () => {
    setHasBasicLoaded(false);
    setError(null);
    // Clear the loaded movies ref to force reload
    loadedMoviesRef.current.clear();
  };

  const isLoading = useMemo(() => {
    return !hasBasicLoaded || moviesLoading || isRecommendationLoading;
  }, [hasBasicLoaded, moviesLoading]);

  useEffect(() => {
    if (!hasBasicLoaded) {
      loadApplicationData();
    }
  }, [hasBasicLoaded, session, pod, webID]);

  // Incrementally sync React Query movie data with reducer state
  useEffect(() => {
    if (moviesData && moviesData.length > 0) {
      mergeLoadedMovies(moviesData);
    }
  }, [moviesData]);

  useEffect(() => {
    if (hasBasicLoaded && !moviesLoading && !isRecommendationLoading) {
      fetchAndSaveMoreRecommendations(movieStore.movies);
    }
  }, [hasBasicLoaded, moviesLoading, isRecommendationLoading, movieStore.movies]);

  async function loadApplicationData() {
    try {
      setHasBasicLoaded(false);
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

      setHasBasicLoaded(true);
    } catch (error) {
      console.error('Error loading application data:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load data'
      );
    }
  }

  /**
   * Incrementally merge loaded movies into the movie store state.
   */
  async function mergeLoadedMovies(
    movies: MovieData[]
  ): Promise<void> {
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
        removeMovie(tmdbUrl, true);  // FIXME: Correctly handle 'me' and 'friend', such as by checking both tmdbUrl and solidUrl
      });
    }

    // Add and dispatch new movies
    if (newMovies.length > 0) {
      // Update the ref to track loaded movies
      newMovies.forEach(movie => {
        loadedMoviesRef.current.add(movie.tmdbUrl);
      });

      // Dispatch only the new movies for incremental loading
      loadMovies(new Set(newMovies));
    }
  }

  async function fetchAndSaveMoreRecommendations(movieDict: Map<string, MovieData>): Promise<void> {
    try {
      setIsRecommendationLoading(true);
      if (movieStore.recommended.size >= MAX_RECOMMENDATIONS) {
        console.log('Enough recommendations already loaded, skipping loading more...');
        return;
      }
      const userMovies = Array.from(movieDict.values()).filter(x => x.type === 'me' && !x.recommended);
      const sampledTitles = sampleUserMovies(userMovies, 10);
      const recommendedList = await fetchRecommendations(sampledTitles);

      for (const name of recommendedList) {
        const movies = await search(name);
        const movie = movies.find((x: any) => x.title === name);
        if (movie) {
          try {
            const savedMovie = await saveMovie(movie, true);
          } catch (error) {
            console.error('Failed to save recommendation:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
    } finally {
      setIsRecommendationLoading(false);
    }
  }

  const handleAddPopupSave = async (media: MediaData): Promise<void> => {
    if (!Array.from(movieStore.movies.values()).some((x: MovieData) => x.title === media.title)) {
      try {
        await saveMovie(media, false);
      } catch (error) {
        console.error('Failed to save movie:', error);
      }
    }
  };

  const handleAddPopupWatch = async (media: MediaData): Promise<void> => {
    let data = Array.from(movieStore.movies.values()).find((x: MovieData) => x.title === media.title);

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        try {
          data = await saveMovie(media, false, true);
        } catch (error) {
          console.error('Failed to save movie:', error);
        }
      }
    } else {
      try {
        data = await saveMovie(media, false, true);
      } catch (error) {
        console.error('Failed to save movie:', error);
      }
    }
  };

  return (
    <div class="movies-page">
      <div class="logo-container">
        <img src={logo} alt="Logo"></img>
      </div>

      <PrivacyProfileIcon
        currentProfile={privacyProfile}
        onProfileChange={handlePrivacyProfileChange}
      />

      <div class='add-button-wrapper'>
        <button class='add-button' onClick={() => setActiveModal('add-movies')}>➕ Add movies</button>
        <button class='add-button' onClick={() => setActiveModal('add-friends')}>👥 Add friends</button>
        <button class='add-button' onClick={() => { setActiveModal('logout'); logout(); }}>👋 Logout</button>
      </div>

      {(isLoading) && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div class="loader__filmstrip"></div>
          <p class="loader__text">loading</p>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p>Error loading data: {error}</p>
          <button onClick={() => {
            retryLoad();
            refetchMovies();
          }}>Retry</button>
        </div>
      )}

      {!error && movieStore.isDataEmpty() && (
        <div class="empty-container-data">
          <h3>Add Movies or Friends</h3>
        </div>
      )}

      {!error && (
        sectionConfigs
          .filter(({ title, key, type }) => {
            if (type === 'friend') {
              if (key == 'friendLiked') {
                return enabledUIElements.includes(UIElement.FRIEND_LIKED);
              }
              return enabledUIElements.includes(UIElement.FRIEND_MOVIE);
            }
            if (key == 'recommended') {
              return enabledUIElements.includes(UIElement.RECOMMENDATION);
            }
            return true;
          })
          .map(({ title, key, type }) => (
            <MovieCarouselSection
              key={key}
              title={title}
              items={movieStore[key] as Set<string>}
              movies={movieStore.movies}
              type={type}
              session={session}
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
