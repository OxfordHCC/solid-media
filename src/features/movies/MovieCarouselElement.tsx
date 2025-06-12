import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { deleteSolidDataset, setThing, saveSolidDatasetAt, getThing, createSolidDataset } from '@inrupt/solid-client';
import { BASE_URL } from '../../env';
import { MovieData, State, DATE_FORMAT } from './types';
import { addRating, removeFromDataset, setWatched } from './dataUtils';

export interface MovieCarouselElementProps {
  movieData: MovieData;
  movie: string;
  type: 'me' | 'friend';
  session: any;
  setState: (updater: ((prevState: State) => Partial<State>) | Partial<State>) => void;
  globalState: { state: State };
  pod?: string;
}

export const MovieCarouselElement = ({
  movieData,
  movie,
  type,
  session,
  setState,
  globalState,
  pod
}: MovieCarouselElementProps): VNode => {
  const { solidUrl, watched, liked, title, released, image } = movieData;
  let { dataset } = movieData;
  const buttons = [];

  if (type === 'me') {
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
  } else if (type === 'friend') {
    buttons.push({
      text: '➕',
      cssClass: 'carousel-save',
      click: async () => {
        const isAlreadyInUserMovies = globalState.state.myWatched?.includes(movie) || globalState.state.myUnwatched?.includes(movie);
        if (!isAlreadyInUserMovies && pod) {
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
    });
  }

  return (
    <CarouselElement
      title={title}
      subtitle={released.toLocaleDateString('en-GB', DATE_FORMAT)}
      image={image}
      redirect={`${BASE_URL}view?url=${movie}`}
      buttons={buttons}
    />
  );
};
