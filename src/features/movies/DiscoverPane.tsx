import { useState, useEffect, useReducer } from 'preact/hooks';
import AddPopup from './AddMovies';
import AddFriends from '../../components/AddFriends';
import Logout from '../../components/Logout';
import { useSession, useAuthenticatedSession } from '../../contexts/SessionContext';
import { MediaData, search } from '../../apis/tmdb';
import logo from '../../assets/logo.png';
import { MovieCarouselElement } from './MovieCarouselElement';
import Carousel from '../../components/Carousel';
import { VNode } from 'preact';

import {
  MovieData,
  State
} from './types';
import {
  loadMoviesData,
  sampleUserMovies,
  saveMovie
} from './remoteMovieDataUtils';
import { fetchRecommendations } from '../../apis/solidflix-recommendataion';
import { setupMoviesAcl } from '../../apis/solid/movies';
import { getOrCreateMoviesContainerWithAcl } from '../../apis/solid/movies';
import { synchronizeToFriendsDataset } from '../../apis/solid/friendsUtils';
import { moviesReducer, MoviesAction } from './moviesReducer';

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
  const [userMovieCollection, setUserMovieCollection] = useState<Set<string>>(new Set<string>());
  const [friendMovieCollection, setFriendMovieCollection] = useState<Set<string>>(new Set<string>());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    hasLoaded: false,
    error: null as string | null
  });

  const session = useAuthenticatedSession();
  if (!session) return <div />; // Guard against rendering when not logged in
  const { logout } = useSession();

  const webID = session.info.webId!;
  const parts = webID.split('/');
  const pod = parts.slice(0, parts.length - 2).join('/');

  const retryLoad = () => {
    setLoadingState(prev => ({
      ...prev,
      hasLoaded: false,
      error: null
    }));
  };

  useEffect(() => {
    if (!loadingState.hasLoaded && !loadingState.isLoading) {
      loadApplicationData();
    }
  }, [loadingState.hasLoaded, loadingState.isLoading, session, pod, webID]);

  // Update user collection when user movies change
  useEffect(() => {
    const newUserCollection = new Set<string>([
      ...Array.from(state.myWatched),
      ...Array.from(state.myUnwatched),
      ...Array.from(state.myLiked)
    ]);
    setUserMovieCollection(newUserCollection);
  }, [state.myWatched, state.myUnwatched, state.myLiked]);

  // Update friend collection when friend movies change
  useEffect(() => {
    const newFriendCollection = new Set<string>([
      ...Array.from(state.friendWatched),
      ...Array.from(state.friendUnwatched),
      ...Array.from(state.friendLiked)
    ]);
    setFriendMovieCollection(newFriendCollection);
  }, [state.friendWatched, state.friendUnwatched, state.friendLiked]);

  async function loadApplicationData() {
    try {
      setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
      const loadingStart = (new Date()).getTime();

      // Initialize movies container
      const moviesAclDataset = await getOrCreateMoviesContainerWithAcl(pod, session.fetch);

      // Manage friends dataset and sync with profile
      const { friendsDataset, friends } = await synchronizeToFriendsDataset(pod, webID, session.fetch);

      // Setup ACL permissions for movies
      await setupMoviesAcl(moviesAclDataset, pod, webID, friends, session.fetch);

      // Load all movies data (user + friends)
      const loadedState = await loadMoviesData(webID, friends, session.fetch);

      // Update state with loaded data
      dispatch({
        type: 'LOAD_DATA',
        payload: loadedState
      });

      const loadingEnd = (new Date()).getTime();
      console.log(`Loaded movies in ${(loadingEnd - loadingStart) / 1000} seconds`);

      // Fetch and save recommendations
      await fetchAndSaveRecommendations(loadedState.movies);

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
          const savedMovie = await saveMovie(movie, pod, session.fetch, true);
          updateStateAfterSave(savedMovie, movie.tmdbUrl);
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
    }
  }

  function updateStateAfterSave(movieData: MovieData, tmdbUrl: string): void {
    dispatch({
      type: 'ADD_MOVIE',
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
      const savedMovie = await saveMovie(media, pod, session.fetch, false);
      updateStateAfterSave(savedMovie, media.tmdbUrl);
    }
  };

  const handleAddPopupWatch = async (media: MediaData): Promise<void> => {
    let data = Array.from(state.movies.values()).find(x => x.title === media.title);

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        data = await saveMovie(media, pod, session.fetch, false, true);
        updateStateAfterSave(data, media.tmdbUrl);
      }
    } else {
      data = await saveMovie(media, pod, session.fetch, false, true);
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

      {loadingState.isLoading && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div class="loader__filmstrip"></div>
          <p class="loader__text">loading</p>
        </div>
      )}

      {loadingState.error && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p>Error loading data: {loadingState.error}</p>
          <button onClick={retryLoad}>Retry</button>
        </div>
      )}

      {!loadingState.isLoading && !loadingState.error && isDataEmpty() && (
        <div class="empty-container-data">
          <h3>Add Movies or Friends</h3>
        </div>
      )}

      {!loadingState.isLoading && !loadingState.error && (
        sectionConfigs.map(({ title, key, type }) => {
          const items = state[key] as Set<string>;
          if (items && items.size > 0) {
            return (
              <div key={key}>
                <h3 style="margin-left: 2%;">{title}</h3>
                <Carousel>
                  {Array.from(items).map(movie => (
                    <MovieCarouselElement
                      key={movie}
                      movieData={state.movies.get(movie)!}
                      movie={movie}
                      type={type}
                      session={session}
                      dispatch={dispatch}
                      userCollection={userMovieCollection}
                      friendsCollection={friendMovieCollection}
                      pod={pod}
                    />
                  ))}
                </Carousel>
              </div>
            );
          }
          return null;
        })
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
