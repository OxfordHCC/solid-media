import { useState, useEffect } from 'preact/hooks';
import AddPopup from './AddMovies';
import AddFriends from './AddFriends';
import Logout from './Logout';
import { useSession, useAuthenticatedSession } from '../contexts/SessionContext';
import { MediaData, getIds, search } from '../media';
import { createThing, saveSolidDatasetAt, setUrl, setDatetime, setThing, createSolidDataset, setStringNoLocale, addStringNoLocale } from '@inrupt/solid-client';
import { DCTERMS, RDF, SCHEMA_INRUPT } from '@inrupt/vocab-common-rdf';
import logo from '../assets/logo.png';

import {
  MovieData,
  State
} from './DiscoverPane/types';
import {
  initializeMoviesContainer,
  manageFriendsDataset,
  setupMoviesAcl,
  loadMoviesData,
  fetchRecommendations,
  sampleUserMovies
} from './DiscoverPane/dataLoaders';
import {
  createCarouselElements,
  renderCarouselSections
} from './DiscoverPane/carouselUtils';
import { addNewFriendToProfile } from './DiscoverPane/friendsUtils';

type ModalType = 'add-movies' | 'add-friends' | 'logout' | null;

export default function DiscoverPane() {
  const [giantState, setGiantState] = useState<State>({});
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
      const moviesAclDataset = await initializeMoviesContainer(pod, session.fetch);

      // Manage friends dataset and sync with profile
      const { friendsDataset, friends } = await manageFriendsDataset(pod, webID, session.fetch);

      // Setup ACL permissions for movies
      await setupMoviesAcl(moviesAclDataset, pod, webID, friends, session.fetch);

      // Load all movies data (user + friends)
      const { movieDict, categorizedMovies } = await loadMoviesData(webID, friends, session.fetch);

      // Update state with loaded data
      setGiantState(prevState => ({
        ...prevState,
        ...categorizedMovies,
        movies: movieDict,
      }));

      const loadingEnd = (new Date()).getTime();
      console.log(`Loaded movies in ${(loadingEnd - loadingStart) / 1000} seconds`);

      // Fetch and save recommendations
      await handleRecommendations(movieDict);

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

  async function handleRecommendations(movieDict: { [key: string]: MovieData }) {
    try {
      const userMovies = Object.values(movieDict).filter(x => x.me && !x.recommended);
      const sampledTitles = sampleUserMovies(userMovies, 10);
      const recommendedList = await fetchRecommendations(sampledTitles);

      for (const name of recommendedList) {
        const movies = await search(name);
        const movie = movies.find((x: any) => x.title === name);
        if (movie) {
          await save(movie, true);
        }
      }
    } catch (error) {
      console.error('Error handling recommendations:', error);
    }
  }

  async function addNewFriendData() {
    try {
      const newFriendWebID = (document.getElementById("friend") as HTMLInputElement).value;
      if (!newFriendWebID.length) return;

      await addNewFriendToProfile(webID, newFriendWebID, session.fetch);

      // TODO: Fetch newly added friend's movies dynamically instead of refreshing
      window.location.reload();
    } catch (error) {
      console.error('Error adding friend:', error);
      alert('Failed to add friend. Please try again.');
    }
  }

  async function save(media: MediaData, recommended: Boolean = false, watch: Boolean = false) {
    // ...existing save function logic...
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
    if (!movieData.recommended) {
      if (!movieData.watched) {
        setGiantState((state: State) => ({
          ...state,
          myUnwatched: [tmdbUrl, ...state.myUnwatched!],
          movies: { ...state.movies, [tmdbUrl]: movieData },
        }));
      } else {
        setGiantState((state: State) => ({
          ...state,
          myWatched: [tmdbUrl, ...state.myWatched!],
          movies: { ...state.movies, [tmdbUrl]: movieData },
        }));
      }
    } else {
      setGiantState((state: State) => ({
        ...state,
        recommendedDict: [tmdbUrl, ...state.recommendedDict!.filter((x: string) => x !== tmdbUrl)],
        movies: { ...state.movies, [tmdbUrl]: movieData },
      }));
    }
  }

  async function watch(media: MovieData, date: Date = new Date()) {
    // ...existing watch function logic...
    let dataset = media.dataset;

    let thing = createThing();

    thing = setUrl(thing, RDF.type, 'https://schema.org/WatchAction');
    thing = setDatetime(thing, DCTERMS.created, new Date());
    thing = setDatetime(thing, SCHEMA_INRUPT.startTime, date);
    thing = setDatetime(thing, SCHEMA_INRUPT.endTime, date);
    thing = setUrl(thing, 'https://schema.org/object', `${media.movie}#it`);

    dataset = setThing(dataset, thing);
    await saveSolidDatasetAt(media.solidUrl, dataset, { fetch: session.fetch });

    media.dataset = dataset;

    setGiantState((state: State) => ({
      ...state,
      myUnwatched: state.myUnwatched!.filter((x: string) => x !== media.movie),
      recommendedDict: state.myUnwatched!.filter((x: string) => x !== media.movie),
      myWatched: [media.movie, ...state.myWatched!],
      movies: { ...state.movies, [media.movie]: { ...media, watched: true, dataset } },
    }));
  }

  const createCarouselElement = createCarouselElements(
    giantState.movies!,
    pod,
    session,
    setGiantState,
    { state: giantState }
  );

  const isDataEmpty = () => {
    const { friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked } = giantState;
    return [friendWatched, friendUnwatched, friendLiked, myWatched, myUnwatched, myLiked]
      .every(arr => arr && !arr.length);
  };

  const handleAddPopupSave = async (media: MediaData) => {
    if (!Object.values(giantState.movies!).some((x: MovieData) => x.title === media.title)) {
      await save(media, false);
    }
  };

  const handleAddPopupWatch = async (media: MediaData) => {
    let data = Object.values(giantState.movies!).find((x: MovieData) => x.title === media.title) as MovieData | undefined;

    if (data) {
      const movieWebIDParts = data.solidUrl.split('/');
      const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

      if (movieWebIDPod !== pod) {
        data = await save(media, false, true);
      }
    } else {
      data = await save(media, false, true);
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

      {!loadingState.isLoading && !loadingState.error && renderCarouselSections(giantState, createCarouselElement)}

      {activeModal === 'add-movies' && (
        <AddPopup
          close={() => setActiveModal(null)}
          save={handleAddPopupSave}
          watch={handleAddPopupWatch}
        />
      )}

      {activeModal === 'add-friends' && (
        <AddFriends
          close={() => setActiveModal(null)}
          add={() => {
            addNewFriendData();
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'logout' && <Logout />}
    </div>
  );
}
