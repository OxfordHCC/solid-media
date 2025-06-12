import { VNode } from 'preact';
import Carousel from '../../components/Carousel';
import { MovieData, State } from './types';
import { MovieCarouselElement } from './MovieCarouselElement';

export function createCarouselElements(
  movies: { [key: string]: MovieData },
  pod: string,
  session: any,
  setState: (updater: ((prevState: State) => Partial<State>) | Partial<State>) => void,
  globalState: { state: State }
) {
  return (movie: string, type: 'friend' | 'me'): VNode => {
    const movieData = movies[movie];
    return (
      <MovieCarouselElement
        movieData={movieData}
        movie={movie}
        type={type}
        session={session}
        setState={setState}
        globalState={globalState}
        pod={pod}
      />
    );
  };
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
