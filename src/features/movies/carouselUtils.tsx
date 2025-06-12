import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import Carousel from '../../components/Carousel';
import { deleteSolidDataset, setThing, saveSolidDatasetAt, getThing, createSolidDataset } from '@inrupt/solid-client';
import { BASE_URL } from '../../env';
import { MovieData, State, DATE_FORMAT } from './types';
import { addRating, removeFromDataset, setWatched } from './dataUtils';


export function createCarouselElements(
  movies: { [key: string]: MovieData },
  pod: string,
  session: any,
  setState: (updater: ((prevState: State) => Partial<State>) | Partial<State>) => void,
  globalState: { state: State }
) {
  return (movie: string, type: 'friend' | 'me'): VNode => {
    const movieData = movies[movie];
    const { solidUrl, watched, liked, title, released, image } = movieData;
    let { dataset } = movieData;

    if (type === 'me') {
      return createUserMovieElement({
        movieData,
        movie,
        title,
        released,
        image,
        watched,
        liked,
        solidUrl,
        dataset,
        session,
        setState,
        globalState
      });
    } else {
      return createFriendMovieElement({
        movieData,
        movie,
        title,
        released,
        image,
        dataset,
        solidUrl,
        pod,
        session,
        setState,
        globalState
      });
    }
  };
}

interface UserMovieElementProps {
  movieData: MovieData;
  movie: string;
  title: string;
  released: Date;
  image: string;
  watched: boolean;
  liked: boolean | null;
  solidUrl: string;
  dataset: any;
  session: any;
  setState: (updater: ((prevState: State) => Partial<State>) | Partial<State>) => void;
  globalState: { state: State };
}

function createUserMovieElement({
  movieData,
  movie,
  title,
  released,
  image,
  watched,
  liked,
  solidUrl,
  dataset,
  session,
  setState,
  globalState
}: UserMovieElementProps): VNode {
  const buttons = [];

  // Add like/dislike buttons if watched
  if (watched) {
    buttons.push(
      {
        text: '👎',
        cssClass: 'carousel-dislike',
        selected: liked === false,
        click: async () => {
          dataset = removeFromDataset(dataset, 'https://schema.org/Rating');
          dataset = removeFromDataset(dataset, 'https://schema.org/ReviewAction');

          if (liked === false) {
            await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
            setState(state => ({
              ...state,
              movies: { ...state.movies, [movie]: { ...movieData, liked: null, dataset } },
            }));
          } else {
            dataset = addRating(dataset, solidUrl, 1);
            await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
            setState(state => ({
              ...state,
              myLiked: state.myLiked!.filter(x => x !== movie),
              movies: { ...state.movies, [movie]: { ...movieData, liked: false, dataset } },
            }));
          }
        }
      },
      {
        text: '👍',
        cssClass: 'carousel-like',
        selected: liked === true,
        click: async () => {
          dataset = removeFromDataset(dataset, 'https://schema.org/Rating');
          dataset = removeFromDataset(dataset, 'https://schema.org/ReviewAction');

          if (liked === true) {
            await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
            setState(state => ({
              ...state,
              myLiked: state.myLiked!.filter(x => x !== movie),
              movies: { ...state.movies, [movie]: { ...movieData, liked: null, dataset } },
            }));
          } else {
            dataset = addRating(dataset, solidUrl, 3);
            await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
            setState(state => ({
              ...state,
              myLiked: [movie, ...state.myLiked!],
              movies: { ...state.movies, [movie]: { ...movieData, liked: true, dataset } },
            }));
          }
        }
      }
    );
  }

  // Add watch button
  buttons.push({
    text: '✔️',
    cssClass: 'carousel-watch',
    selected: watched,
    click: async () => {
      if (watched) {
        dataset = removeFromDataset(dataset, 'https://schema.org/WatchAction');
        await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
        setState(state => ({
          ...state,
          myWatched: state.myWatched!.filter(x => x !== movie),
          myUnwatched: [movie, ...state.myUnwatched!],
          movies: { ...state.movies, [movie]: { ...movieData, watched: false, dataset } },
        }));
      } else {
        dataset = setWatched(dataset, solidUrl);

        await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
        setState(state => ({
          ...state,
          myUnwatched: state.myUnwatched!.filter(x => x !== movie),
          recommendedDict: state.recommendedDict!.filter(x => x !== movie),
          myWatched: [movie, ...state.myWatched!],
          movies: { ...state.movies, [movie]: { ...movieData, watched: true, dataset } },
        }));
      }
    }
  });

  // Add remove button
  buttons.push({
    text: '❌',
    cssClass: 'carousel-remove',
    click: async () => {
      await deleteSolidDataset(solidUrl, { fetch: session.fetch });

      setState(state => {
        const shouldRemoveFromDict = ![...state.friendWatched!, ...state.friendUnwatched!]
          .some(x => x === movie);

        const { [movie]: deleted, ...remainingMovies } = state.movies!;

        return {
          ...state,
          myUnwatched: state.myUnwatched!.filter(x => x !== movie),
          myWatched: state.myWatched!.filter(x => x !== movie),
          myLiked: state.myLiked!.filter(x => x !== movie),
          recommendedDict: state.recommendedDict!.filter(x => x !== movie),
          movies: shouldRemoveFromDict ? remainingMovies : state.movies,
        };
      });
    }
  });

  return (
    <CarouselElement
      title={title}
      subtitle={released.toLocaleDateString('en-GB', DATE_FORMAT)}
      image={image}
      redirect={`${BASE_URL}view?url=${movie}`}
      buttons={buttons}
    />
  );
}

interface FriendMovieElementProps {
  movieData: MovieData;
  movie: string;
  title: string;
  released: Date;
  image: string;
  dataset: any;
  solidUrl: string;
  pod: string;
  session: any;
  setState: (updater: ((prevState: State) => Partial<State>) | Partial<State>) => void;
  globalState: { state: State };
}

function createFriendMovieElement({
  movieData,
  movie,
  title,
  released,
  image,
  dataset,
  solidUrl,
  pod,
  session,
  setState,
  globalState
}: FriendMovieElementProps): VNode {
  return (
    <CarouselElement
      title={title}
      subtitle={released.toLocaleDateString('en-GB', DATE_FORMAT)}
      image={image}
      redirect={`${BASE_URL}view?url=${movie}`}
      buttons={[
        {
          text: '➕',
          cssClass: 'carousel-save',
          click: async () => {
            const isAlreadyInUserMovies = globalState.state.myWatched?.includes(movie) || globalState.state.myUnwatched?.includes(movie);

            if (!isAlreadyInUserMovies) {
              const datasetName = title
                .replace(/[^a-zA-Z0-9-_ ]/g, '')
                .replaceAll(' ', '-')
                .toLowerCase();

              let movieDataset = createSolidDataset();
              let thing = getThing(dataset, `${solidUrl}#it`)!;
              thing = Object.freeze({ ...thing, url: `${pod}/movies/${datasetName}#it` });
              movieDataset = setThing(movieDataset, thing);

              const newUrl = `${pod}/movies/${datasetName}`;
              await saveSolidDatasetAt(newUrl, movieDataset, { fetch: session.fetch });

              setState(state => ({
                ...state,
                myUnwatched: [movie, ...state.myUnwatched!],
                movies: { ...state.movies, [movie]: { ...movieData, me: true, solidUrl: newUrl, dataset: movieDataset } },
              }));
            }
          }
        },
      ]}
    />
  );
}

export function renderCarouselSections(
  state: State,
  createCarouselElement: (movie: string, type: 'friend' | 'me') => VNode
): VNode[] {
  const sections = [];

  if (state.recommendedDict?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Recommended Movies</h3>
        <Carousel>{state.recommendedDict.map(x => createCarouselElement(x, 'me'))}</Carousel>
      </div>
    );
  }

  if (state.friendWatched?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Friends Collection</h3>
        <Carousel>{state.friendWatched.map(x => createCarouselElement(x, 'friend'))}</Carousel>
      </div>
    );
  }

  if (state.friendUnwatched?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Friends Wishlist</h3>
        <Carousel>{state.friendUnwatched.map(x => createCarouselElement(x, 'friend'))}</Carousel>
      </div>
    );
  }

  if (state.friendLiked?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Friends enjoyed</h3>
        <Carousel>{state.friendLiked.map(x => createCarouselElement(x, 'friend'))}</Carousel>
      </div>
    );
  }

  if (state.myWatched?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Your Collection</h3>
        <Carousel>{state.myWatched.map(x => createCarouselElement(x, 'me'))}</Carousel>
      </div>
    );
  }

  if (state.myUnwatched?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">Your Wishlist</h3>
        <Carousel>{state.myUnwatched.map(x => createCarouselElement(x, 'me'))}</Carousel>
      </div>
    );
  }

  if (state.myLiked?.length) {
    sections.push(
      <div>
        <h3 style="margin-left: 2%;">You enjoyed</h3>
        <Carousel>{state.myLiked.map(x => createCarouselElement(x, 'me'))}</Carousel>
      </div>
    );
  }

  return sections;
}
