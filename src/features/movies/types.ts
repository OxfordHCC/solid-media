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
  myWatched: Set<string>,
  myUnwatched: Set<string>,
  myLiked: Set<string>,
  friendWatched: Set<string>,
  friendUnwatched: Set<string>,
  friendLiked: Set<string>,
  recommended: Set<string>,
  movies: Map<string, MovieData>, // Throughout the code, we assume friends won't update their own movies.
  // When two versions of the same movie exists, the 'me' version is always preferred.
};

export interface PersonInfo {
  type: 'me' | 'friend';
  id: string;
}

export interface MovieListItem extends PersonInfo {
  url: string;
}
