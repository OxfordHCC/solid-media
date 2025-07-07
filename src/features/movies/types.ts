import { SolidDataset } from "@inrupt/solid-client";

export const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
};

export const NO_ACCESS = {
  read: false,
  write: false,
  append: false,
  control: false,
};

export const FULL_ACCESS = {
  read: true,
  write: true,
  append: true,
  control: true,
};

export const READ_ACCESS = {
  read: true,
  write: false,
  append: false,
  control: false,
};

export type MovieData = {
  tmdbUrl: string,
  watched: boolean,
  liked: boolean | null,
  recommended: boolean,
  title: string,
  released: Date,
  image: string,
  solidUrl: string,
  type: 'me' | 'friend',
  dataset: SolidDataset,
};

export type State = {
  myWatched: Set<string>, // Set of tmdbUrls
  myUnwatched: Set<string>,
  myLiked: Set<string>,
  friendWatched: Set<string>,
  friendUnwatched: Set<string>,
  friendLiked: Set<string>,
  recommended: Set<string>,
  myMovies: Map<string, MovieData>, // Map of tmdbUrl to MovieData
  friendMovies: Map<string, MovieData[]>, // Map of tmdbUrl to array of MovieData
};

export interface PersonInfo {
  type: 'me' | 'friend';
  id: string;
}

export interface MovieListItem extends PersonInfo {
  url: string;
}

export function areMoviesEqual(a?: MovieData, b?: MovieData): boolean {
  if (!a || !b) return false; // If either is undefined, they are not equal
  return (
    a.tmdbUrl === b.tmdbUrl &&
    a.watched === b.watched &&
    a.liked === b.liked &&
    a.recommended === b.recommended &&
    a.title === b.title &&
    a.released.getTime() === b.released.getTime() &&
    a.image === b.image &&
    a.solidUrl === b.solidUrl &&
    a.type === b.type
    // Note: 'dataset' is not compared. Add custom logic if needed.
  );
}
