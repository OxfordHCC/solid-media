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

  function renderSection(title: string, items: string[] | undefined, type: 'friend' | 'me') {
    if (items?.length) {
      return (
        <div>
          <h3 style="margin-left: 2%;">{title}</h3>
          <Carousel>{items.map(x => createCarouselElement(x, type))}</Carousel>
        </div>
      );
    }
    return null;
  }

  const sectionConfigs = [
    { title: 'Recommended Movies', items: state.recommendedDict, type: 'me' },
    { title: 'Friends Collection', items: state.friendWatched, type: 'friend' },
    { title: 'Friends Wishlist', items: state.friendUnwatched, type: 'friend' },
    { title: 'Friends enjoyed', items: state.friendLiked, type: 'friend' },
    { title: 'Your Collection', items: state.myWatched, type: 'me' },
    { title: 'Your Wishlist', items: state.myUnwatched, type: 'me' },
    { title: 'You enjoyed', items: state.myLiked, type: 'me' },
  ];

  for (const { title, items, type } of sectionConfigs) {
    const section = renderSection(title, items, type as 'friend' | 'me');
    if (section) sections.push(section);
  }

  return sections;
}
