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
import { useComputedMovieCollections, useMovieActions, useMovieData } from './useMovies';
import { useMovieStore } from './movieStore';
import { useAutoRecommendations } from './useRecommendations';
import {
  MovieData,
  State
} from './types';
import { UIElement } from '../privacy_profile/privacyProfileDefinitions';
import { usePrivacyProfile } from '../privacy_profile/usePrivacyProfile';

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

export default function DiscoverPane() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [hasBasicLoaded, setHasBasicLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [friends, setFriends] = useState<string[]>([]);

  const sessionContext = useSessionContext(true);
  if (!sessionContext) return <div />; // Guard against rendering when not logged in
  const { session, logout } = sessionContext;

  const webID = session.info.webId!;
  const pod = useMemo(() => {
    const parts = webID.split('/');
    return parts.slice(0, parts.length - 2).join('/');
  }, [webID]);

  const movieActions = useMovieActions(session, pod);
  const movieStore = useMovieStore();
  const { isStoreEmpty } = useComputedMovieCollections();

  const { refetchMovies, isLoading: movieDataLoading, error: movieDataError } = useMovieData(webID, friends, session.fetch, hasBasicLoaded);

  // Use the new recommendations hook
  const {
    isLoading: isRecommendationLoading,
    error: recommendationError
  } = useAutoRecommendations({
    session,
    pod,
    hasBasicLoaded,
    movieDataLoading,
    enabled: true
  });

  // Privacy profile management
  const {
    privacyProfile,
    enabledUIElements,
    updatePrivacyProfile: handlePrivacyProfileChange
  } = usePrivacyProfile({ webID, authFetch: session.fetch });

  const isLoading = !hasBasicLoaded || movieDataLoading || isRecommendationLoading;

  const retryLoad = () => {
    setHasBasicLoaded(false);
    setError(null);
    movieActions.resetMovieStore();
    refetchMovies();
  };

  const combinedError = error || movieDataError || recommendationError;

  useEffect(() => {
    if (!hasBasicLoaded) {
      loadApplicationData();
    }
  }, [hasBasicLoaded, session, pod, webID]);

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

  const handleAddPopupSave = async (media: MediaData): Promise<void> => {
    if (movieActions.findMovieInMyCollection(media.title) === undefined) {
      try {
        await movieActions.saveMovie(media, false);
      } catch (error) {
        console.error('Failed to save movie:', error);
      }
    }
  };

  const handleAddPopupWatch = async (media: MediaData): Promise<void> => {
    let data = movieActions.findMovieInMyCollection(media.title);

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        try {
          data = await movieActions.saveMovie(media, false, true);
        } catch (error) {
          console.error('Failed to save movie:', error);
        }
      }
    } else {
      try {
        data = await movieActions.saveMovie(media, false, true);
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

      {combinedError && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p>Error loading data: {combinedError}</p>
          <button onClick={() => {
            retryLoad();
          }}>Retry</button>
        </div>
      )}

      {!combinedError && isStoreEmpty && (
        <div class="empty-container-data">
          <h3>Add Movies or Friends</h3>
        </div>
      )}

      {!combinedError && (
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
              myMovies={movieStore.myMovies}
              friendMovies={movieStore.friendMovies}
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
