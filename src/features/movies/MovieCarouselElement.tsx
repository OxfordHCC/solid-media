import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { BASE_URL } from '../../env';
import { useCoordinatedMovieActions } from './useCoordinatedMovieActions';
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

  // Use coordinated actions instead of separate hooks
  const {
    toggleLike,
    toggleWatch,
    removeMovie,
    addFriendMovieToMyCollection,
    getUserMovieCollection,
    getFriendMovieCollection,
  } = useCoordinatedMovieActions(session, pod);

  const userCollection = getUserMovieCollection();
  const friendsCollection = getFriendMovieCollection();

  const buttons = [];

  // Simplified like toggle with automatic state coordination
  const myToggleLike = async (like: boolean | null) => {
    try {
      await toggleLike(movieData, like);
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
          await toggleWatch(movieData, !watched);
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
          await removeMovie(movieData, friendsCollection);
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
          await addFriendMovieToMyCollection(movieData, userCollection);
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
