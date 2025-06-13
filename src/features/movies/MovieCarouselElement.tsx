import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { deleteSolidDataset, setThing, saveSolidDatasetAt, getThing, createSolidDataset } from '@inrupt/solid-client';
import { BASE_URL } from '../../env';
import { MovieData, State, DATE_FORMAT } from './types';
import { addRating, removeFromDataset, setWatched } from './dataUtils';
import { MoviesAction } from './moviesReducer';

export interface MovieCarouselElementProps {
  movieData: MovieData;
  movie: string;
  type: 'me' | 'friend';
  session: any;
  dispatch: (action: MoviesAction) => void;
  globalState: { state: State };
  pod?: string;
}

export const MovieCarouselElement = ({
  movieData,
  movie,
  type,
  session,
  dispatch,
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
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: null, dataset }
              });
            } else {
              dataset = addRating(dataset, solidUrl, 1);
              await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: false, dataset }
              });
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
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: null, dataset }
              });
            } else {
              dataset = addRating(dataset, solidUrl, 3);
              await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: true, dataset }
              });
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
          dispatch({
            type: 'TOGGLE_WATCH',
            payload: { tmdbUrl: movie, watched: false, dataset }
          });
        } else {
          dataset = setWatched(dataset, solidUrl);
          await saveSolidDatasetAt(solidUrl, dataset, { fetch: session.fetch });
          dispatch({
            type: 'TOGGLE_WATCH',
            payload: { tmdbUrl: movie, watched: true, dataset }
          });
        }
      }
    });
    buttons.push({
      text: '❌',
      cssClass: 'carousel-remove',
      click: async () => {
        await deleteSolidDataset(solidUrl, { fetch: session.fetch });
        const shouldRemoveFromDict = ![...globalState.state.friendWatched || [], ...globalState.state.friendUnwatched || []]
          .some(x => x === movie);
        dispatch({
          type: 'REMOVE_MOVIE',
          payload: { tmdbUrl: movie, removeFromDict: shouldRemoveFromDict }
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
          dispatch({
            type: 'ADD_TO_MY_COLLECTION',
            payload: { 
              tmdbUrl: movie, 
              updates: { me: true, solidUrl: newUrl, dataset: movieDataset }
            }
          });
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
