import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { BASE_URL } from '../../env';
import { useComputedMovieCollections, useMovieActions } from './useMovies';
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

  // Use new movie actions instead of deprecated coordination layer
  const movieActions = useMovieActions(session, pod);
  const { userMovieCollection: userCollection } = useComputedMovieCollections();

  const buttons = [];

  // Simplified like toggle with automatic state coordination
  const myToggleLike = async (like: boolean | null) => {
    try {
      await movieActions.toggleLike(movieData, like);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Error handling - the coordinated action already rolled back the state
    }
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
        try {
          await movieActions.toggleWatch(movieData, !watched);
        } catch (error) {
          console.error('Failed to toggle watch:', error);
        }
      }
    });
    buttons.push({
      text: '❌',
      cssClass: 'carousel-remove',
      click: async () => {
        try {
          await movieActions.removeMovie(movieData);
        } catch (error) {
          console.error('Failed to remove movie:', error);
        }
      }
    });
  } else if (type === 'friend') {
    buttons.push({
      text: '➕',
      cssClass: 'carousel-save',
      click: async () => {
        try {
          await movieActions.addFriendMovieToMyCollection(movieData, userCollection);
        } catch (error) {
          console.error('Failed to add movie to collection:', error);
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
