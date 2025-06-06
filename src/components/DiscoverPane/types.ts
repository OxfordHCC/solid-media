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
  movie: string,
  solidUrl: string,
  watched: boolean,
  liked: boolean | null,
  recommended: boolean,
  title: string,
  released: Date,
  image: string,
  dataset: any,
  me: boolean,
  friend: boolean,
};

export type State = {
  myWatched?: string[],
  myUnwatched?: string[],
  myLiked?: string[],
  friendWatched?: string[],
  friendUnwatched?: string[],
  friendLiked?: string[],
  recommendedDict?: string[],
  movies?: { [key: string]: MovieData },
};

export interface PersonInfo {
  type: 'me' | 'friend';
  id: string;
}

export interface MovieListItem extends PersonInfo {
  url: string;
}

export interface CategorizedMovies {
  myWatched: string[];
  myUnwatched: string[];
  myLiked: string[];
  friendWatched: string[];
  friendUnwatched: string[];
  friendLiked: string[];
  recommendedDict: string[];
}
