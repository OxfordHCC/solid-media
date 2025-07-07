import { VNode } from 'preact';
import Carousel from '../../components/Carousel';
import { MovieCarouselElement } from './MovieCarouselElement';
import { MovieData, State } from './types';
import { useMovieStore } from './movieStore';

export interface MovieSectionProps {
  title: string;
  sectionKey: keyof State;
  type: 'friend' | 'me';
  session: any;
  pod: string;
}

export default function MovieCarouselSection({
  title,
  sectionKey,
  type,
  session,
  pod
}: MovieSectionProps): VNode | null {
  const movieStore = useMovieStore(); // TODO: Reconsider whether this should be wrapped, for optimistic updates

  // Get the relevant data from the store
  const items = movieStore[sectionKey] as Set<string>;
  const myMovies = movieStore.myMovies;
  const friendMovies = movieStore.friendMovies;

  if (!items || items.size === 0) {
    return null;
  }

  return (
    <div>
      <h3 style="margin-left: 2%;">{title}</h3>
      <Carousel>
        {Array.from(items)
          .map(movie => (type === 'me') ? myMovies.get(movie)! : friendMovies.get(movie)![0])
          .map(movieData => (
            <MovieCarouselElement
              key={movieData.tmdbUrl}
              movieData={movieData}
              movie={movieData.tmdbUrl}
              type={type}
              session={session}
              pod={pod}
            />
          ))}
      </Carousel>
    </div>
  );
}
