import { VNode } from 'preact';
import Carousel from '../../components/Carousel';
import { MovieCarouselElement } from './MovieCarouselElement';
import { MovieData } from './types';

export interface MovieSectionProps {
  title: string;
  items: Set<string>;
  movies: Map<string, MovieData>;
  type: 'friend' | 'me';
  session: any;
  pod: string;
}

export default function MovieCarouselSection({
  title,
  items,
  movies,
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
        {Array.from(items).map(movie => (
          <MovieCarouselElement
            key={movie}
            movieData={movies.get(movie)!}
            movie={movie}
            type={type}
            session={session}
            pod={pod}
          />
        ))}
      </Carousel>
    </div>
  );
}
