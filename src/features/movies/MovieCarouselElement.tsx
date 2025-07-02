import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { BASE_URL } from '../../env';
import { PREFIXES_MOVIE } from '../../utils/prefixes';
import { addRating, fromFriendToMeDataset, removeFromDataset, setWatched } from './datasetUtils';
import { useDeleteMovie, useSaveMovie, useUpdateMovieDataset } from './movieQueries';
import { useMovieStore } from './movieStore';
import { DATE_FORMAT, MovieData } from './types';

export interface MovieCarouselElementProps {
  movieData: MovieData;
  movie: string;
  type: 'me' | 'friend';
  session: any;
  pod?: string;
}

export const MovieCarouselElement = ({
  movieData,
  movie,
  type,
  session,
  pod
}: MovieCarouselElementProps): VNode => {
  const { solidUrl, watched, liked, title, released, image } = movieData;
  let { dataset } = movieData;

  // Get store actions and computed values directly
  const {
    toggleLike,
    toggleWatch,
    removeMovie,
    addToMyCollection,
    getUserMovieCollection,
    getFriendMovieCollection
  } = useMovieStore();

  const userCollection = getUserMovieCollection();
  const friendsCollection = getFriendMovieCollection();

  const updateMovieDataset = useUpdateMovieDataset(session.fetch);
  const deleteMovie = useDeleteMovie(session.fetch);
  const saveMovie = useSaveMovie(pod || '', session.fetch);

  const buttons = [];

  const myToggleLike = async (like: boolean | null) => {
    dataset = removeFromDataset(dataset, 'https://schema.org/Rating');
    dataset = removeFromDataset(dataset, 'https://schema.org/ReviewAction');
    switch (like) {
      case true:
        dataset = addRating(dataset, solidUrl, 3);
        break;
      case false:
        dataset = addRating(dataset, solidUrl, 1);
        break;
      case null:
        break;
      default:
        throw new Error('Invalid like value');
    }
    updateMovieDataset.mutate({
      datasetUrl: solidUrl,
      dataset,
      prefixes: PREFIXES_MOVIE
    });
    toggleLike(movie, like, dataset);
  };

  if (type === 'me') {
    if (watched) {
      buttons.push(
        {
          text: '👎',
          cssClass: 'carousel-dislike',
          selected: liked === false,
          click: async () => await myToggleLike(liked === false ? null : false)
        },
        {
          text: '👍',
          cssClass: 'carousel-like',
          selected: liked === true,
          click: async () => await myToggleLike(liked === true ? null : true)
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
          toggleWatch(movie, false, dataset);
        } else {
          dataset = setWatched(dataset, solidUrl);
          updateMovieDataset.mutate({
            datasetUrl: solidUrl,
            dataset,
            prefixes: PREFIXES_MOVIE
          });
          toggleWatch(movie, true, dataset);
        }
      }
    });
    buttons.push({
      text: '❌',
      cssClass: 'carousel-remove',
      click: async () => {
        deleteMovie.mutate(solidUrl);
        const shouldRemoveFromDict = !friendsCollection.has(movie);
        removeMovie(movie, shouldRemoveFromDict);
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
          addToMyCollection(movie, { type: 'me', solidUrl: newUrl, dataset: movieDataset });
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
