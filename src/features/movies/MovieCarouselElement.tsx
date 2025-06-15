import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { setThing, getThing, createSolidDataset } from '@inrupt/solid-client';
import { BASE_URL } from '../../env';
import { MovieData, DATE_FORMAT } from './types';
import { addRating, fromFriendToMeDataset, removeFromDataset, setWatched } from './datasetUtils';
import { saveMovieDataset } from "./remoteMovieDataUtils";
import { generateDatasetName } from './datasetUtils';
import { MoviesAction } from './moviesReducer';
import { PREFIXES_MOVIE } from '../../utils/prefixes';
import { useUpdateMovieDataset, useDeleteMovie, useSaveMovie } from './movieQueries';

export interface MovieCarouselElementProps {
  movieData: MovieData;
  movie: string;
  type: 'me' | 'friend';
  session: any;
  dispatch: (action: MoviesAction) => void;
  userCollection: Set<string>;
  friendsCollection: Set<string>;
  pod?: string;
}

export const MovieCarouselElement = ({
  movieData,
  movie,
  type,
  session,
  dispatch,
  userCollection,
  friendsCollection,
  pod
}: MovieCarouselElementProps): VNode => {
  const { solidUrl, watched, liked, title, released, image } = movieData;
  let { dataset } = movieData;

  const updateMovieDataset = useUpdateMovieDataset(session.fetch);
  const deleteMovie = useDeleteMovie(session.fetch);
  const saveMovie = useSaveMovie(pod || '', session.fetch);

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
              updateMovieDataset.mutate({
                datasetUrl: solidUrl,
                dataset,
                prefixes: PREFIXES_MOVIE
              });
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: null, dataset }
              });
            } else {
              dataset = addRating(dataset, solidUrl, 1);
              updateMovieDataset.mutate({
                datasetUrl: solidUrl,
                dataset,
                prefixes: PREFIXES_MOVIE
              });
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
              updateMovieDataset.mutate({
                datasetUrl: solidUrl,
                dataset,
                prefixes: PREFIXES_MOVIE
              });
              dispatch({
                type: 'TOGGLE_LIKE',
                payload: { tmdbUrl: movie, liked: null, dataset }
              });
            } else {
              dataset = addRating(dataset, solidUrl, 3);
              updateMovieDataset.mutate({
                datasetUrl: solidUrl,
                dataset,
                prefixes: PREFIXES_MOVIE
              });
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
          updateMovieDataset.mutate({
            datasetUrl: solidUrl,
            dataset,
            prefixes: PREFIXES_MOVIE
          });
          dispatch({
            type: 'TOGGLE_WATCH',
            payload: { tmdbUrl: movie, watched: false, dataset }
          });
        } else {
          dataset = setWatched(dataset, solidUrl);
          updateMovieDataset.mutate({
            datasetUrl: solidUrl,
            dataset,
            prefixes: PREFIXES_MOVIE
          });
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
        deleteMovie.mutate(solidUrl);
        const shouldRemoveFromDict = !friendsCollection.has(movie);
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
        const isAlreadyInUserMovies = userCollection.has(movie);
        if (!isAlreadyInUserMovies && pod) {
          const { dataset: movieDataset, datasetName } = fromFriendToMeDataset(
            dataset,
            solidUrl,
            pod,
            title
          );
          const newUrl = `${pod}/movies/${datasetName}`;
          updateMovieDataset.mutate({
            datasetUrl: newUrl,
            dataset: movieDataset,
            prefixes: PREFIXES_MOVIE
          });
          dispatch({
            type: 'ADD_TO_MY_COLLECTION',
            payload: {
              tmdbUrl: movie,
              updates: { type: 'me', solidUrl: newUrl, dataset: movieDataset }
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
