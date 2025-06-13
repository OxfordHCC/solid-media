import { useState, useEffect, useReducer } from 'preact/hooks';
import AddPopup from './AddMovies';
import AddFriends from '../../components/AddFriends';
import Logout from '../../components/Logout';
import { useSession, useAuthenticatedSession } from '../../contexts/SessionContext';
import { MediaData, getIds, search } from '../../apis/tmdb';
import { createThing, saveSolidDatasetAt, setUrl, setDatetime, setThing, createSolidDataset, setStringNoLocale, addStringNoLocale } from '@inrupt/solid-client';
import { DCTERMS, RDF, SCHEMA_INRUPT } from '@inrupt/vocab-common-rdf';
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
  sampleUserMovies
} from './dataLoaders';
import { fetchRecommendations } from '../../apis/solidflix-recommendataion';
import { setupMoviesAcl } from '../../apis/solid/movies';
import { getOrCreateMoviesContainerWithAcl } from '../../apis/solid/movies';
import { synchronizeToFriendsDataset } from '../../apis/solid/friendsUtils';
import { moviesReducer, MoviesAction } from './moviesReducer';

type ModalType = 'add-movies' | 'add-friends' | 'logout' | null;

// 合并 carouselUtils.tsx 的 sectionConfigs 和 renderCarouselSections
const sectionConfigs: Array<{
  title: string;
  key: keyof State;
  type: 'friend' | 'me';
}> = [
  { title: 'Recommended Movies', key: 'recommendedDict', type: 'me' },
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
    recommendedDict: new Set<string>(),
    movies: new Map<string, MovieData>(),
  });
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
      const { movieDict, categorizedMovies } = await loadMoviesData(webID, friends, session.fetch);

      // Update state with loaded data
      dispatch({
        type: 'LOAD_DATA',
        payload: { categorizedMovies, movieDict }
      });

      const loadingEnd = (new Date()).getTime();
      console.log(`Loaded movies in ${(loadingEnd - loadingStart) / 1000} seconds`);

      // Fetch and save recommendations
      await fetchAndSaveRecommendations(movieDict);

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

  async function fetchAndSaveRecommendations(movieDict: Map<string, MovieData>) {
    try {
      const userMovies = Array.from(movieDict.values()).filter(x => x.me && !x.recommended);
      const sampledTitles = sampleUserMovies(userMovies, 10);
      const recommendedList = await fetchRecommendations(sampledTitles);

      for (const name of recommendedList) {
        const movies = await search(name);
        const movie = movies.find((x: any) => x.title === name);
        if (movie) {
          await saveMovie(movie, true);
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
    }
  }

  async function saveMovie(media: MediaData, recommended: Boolean = false, watch: Boolean = false) {
    const ids = await getIds(media.tmdbUrl);

    const datasetName = media.title
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replaceAll(' ', '-')
      .toLowerCase();

    const datasetUrl = `${pod}/movies/${datasetName}`;

    let movieDataset = createSolidDataset();

    let movie = createThing({ url: `${datasetUrl}#it` });

    const time = new Date();

    movie = setDatetime(movie, DCTERMS.created, time);
    movie = setDatetime(movie, DCTERMS.modified, time);
    movie = setUrl(movie, RDF.type, 'https://schema.org/Movie');
    if (watch) movie = setUrl(movie, RDF.type, 'https://schema.org/WatchAction');
    if (recommended) movie = setUrl(movie, RDF.type, 'https://schema.org/Recommendation');
    movie = setStringNoLocale(movie, 'https://schema.org/name', media.title);
    movie = setStringNoLocale(movie, 'https://schema.org/description', media.description);
    movie = setStringNoLocale(movie, 'https://schema.org/image', media.image);
    movie = setDatetime(movie, 'https://schema.org/datePublished', media.released);
    for (const id of ids) movie = addStringNoLocale(movie, 'https://schema.org/sameAs', id);

    movieDataset = setThing(movieDataset, movie);

    await saveSolidDatasetAt(datasetUrl, movieDataset, { fetch: session.fetch });

    const movieData = {
      movie: media.tmdbUrl,
      solidUrl: datasetUrl,
      watched: Boolean(watch),
      liked: null,
      recommended: Boolean(recommended),
      title: media.title,
      released: media.released,
      image: media.image,
      dataset: movieDataset,
      me: true,
      friend: false,
    };

    updateStateAfterSave(movieData, media.tmdbUrl);
    return movieData;
  }

  function updateStateAfterSave(movieData: MovieData, tmdbUrl: string) {
    dispatch({
      type: 'ADD_MOVIE',
      payload: { movieData, tmdbUrl }
    });
  }

  const isDataEmpty = () => {
    const { friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked } = state;
    return [friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked]
      .every(set => set && set.size === 0);
  };

  const handleAddPopupSave = async (media: MediaData) => {
    if (!Array.from(state.movies.values()).some((x: MovieData) => x.title === media.title)) {
      await saveMovie(media, false);
    }
  };

  const handleAddPopupWatch = async (media: MediaData) => {
    let data = Array.from(state.movies.values()).find((x: MovieData) => x.title === media.title) as MovieData | undefined;

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        data = await saveMovie(media, false, true);
      }
    } else {
      data = await saveMovie(media, false, true);
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
                      globalState={{ state }}
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
