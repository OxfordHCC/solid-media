import { VNode } from 'preact';
import Carousel from '../../components/Carousel';
import { MovieCarouselElement } from './MovieCarouselElement';
import { MovieData } from './types';

export interface MovieSectionProps {
  title: string;
  items: Set<string>;
  myMovies: Map<string, MovieData>;
  friendMovies: Map<string, MovieData[]>;
  type: 'friend' | 'me';
  session: any;
  pod: string;
}

export default function MovieCarouselSection({
  title,
  items,
  myMovies,
  friendMovies,
  type,
  session,
  pod
}: MovieSectionProps): VNode | null {
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
