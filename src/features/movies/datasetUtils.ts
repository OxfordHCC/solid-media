import { SolidDataset, createThing, setUrl, setInteger, setThing, asUrl, setDatetime, getThingAll, getUrl, removeThing, getThing, Thing, getInteger, getStringNoLocaleAll, createSolidDataset, setStringNoLocale, addUrl, addStringNoLocale, getDatetime } from "@inrupt/solid-client";
import { RDF, DCTERMS, SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";
import { MovieData } from "./types";
import { MediaData } from "../../apis/tmdb";


export function removeFromDataset(dataset: SolidDataset, typeToRemove: string): SolidDataset {
  for (const thing of getThingAll(dataset)) {
    if (getUrl(thing, RDF.type) === typeToRemove) {
      dataset = removeThing(dataset, thing);
    }
  }
  return dataset;
}

export function addRating(dataset: SolidDataset, datasetUrl: string, value: 1 | 2 | 3) {
  let rating = createThing();
  rating = setUrl(rating, RDF.type, 'https://schema.org/Rating');
  rating = setInteger(rating, 'https://schema.org/worstRating', 1);
  rating = setInteger(rating, 'https://schema.org/bestRating', 3);
  rating = setInteger(rating, 'https://schema.org/ratingValue', value);
  dataset = setThing(dataset, rating);

  let review = createThing();
  const time = new Date();
  review = setUrl(review, RDF.type, 'https://schema.org/ReviewAction');
  review = setUrl(review, 'https://schema.org/resultReview', asUrl(rating, datasetUrl));
  review = setDatetime(review, DCTERMS.created, time);
  review = setDatetime(review, SCHEMA_INRUPT.startTime, time);
  review = setDatetime(review, SCHEMA_INRUPT.endTime, time);
  review = setUrl(review, 'https://schema.org/object', `${datasetUrl}#it`);
  dataset = setThing(dataset, review);

  return dataset;
}

export function setWatched(dataset: SolidDataset, datasetUrl: string, time: Date | undefined = undefined) {
  let thing = createThing();
  if (time === undefined) {
    time = new Date();
  }
  thing = setUrl(thing, RDF.type, 'https://schema.org/WatchAction');
  thing = setDatetime(thing, DCTERMS.created, time);
  thing = setDatetime(thing, SCHEMA_INRUPT.startTime, time);
  thing = setDatetime(thing, SCHEMA_INRUPT.endTime, time);
  thing = setUrl(thing, 'https://schema.org/object', `${datasetUrl}#it`);
  dataset = setThing(dataset, thing);

  return dataset;
}

export function fromFriendToMeDataset(dataset: SolidDataset, solidUrl: string, pod: string, title: string, datasetName?: string): {
  dataset: SolidDataset,
  datasetName: string
} {
  if (!datasetName) {
    datasetName = generateDatasetName(title);
  }
  let movieDataset = createSolidDataset();
  let thing = getThing(dataset, `${solidUrl}#it`)!;
  thing = Object.freeze({ ...thing, url: `${pod}/movies/${datasetName}#it` });
  movieDataset = setThing(movieDataset, thing);

  return {
    dataset: movieDataset,
    datasetName
  };
}

function extractLikedStatus(things: Thing[], movieDataset: SolidDataset): boolean | null {
  const review = things.find(x => getUrl(x, RDF.type) === 'https://schema.org/ReviewAction');

  if (!review) return null;

  const ratingUrl = getUrl(review, 'https://schema.org/resultReview')!;
  const rating = getThing(movieDataset, ratingUrl)!;

  const min = getInteger(rating, 'https://schema.org/worstRating');
  const max = getInteger(rating, 'https://schema.org/bestRating');
  const value = getInteger(rating, 'https://schema.org/ratingValue');

  if (value === max) return true;
  if (value === min) return false;
  return null;
}

export function datasetToMovieDataInfo(movieDataset: SolidDataset, url: string, type: 'me' | 'friend'): MovieData {
  const movieThing = getThing(movieDataset, `${url}#it`)!;
  const things = getThingAll(movieDataset);

  // Extract movie properties
  const watched = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/WatchAction');
  const liked = extractLikedStatus(things, movieDataset);
  const recommended = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/Recommendation');

  const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
  const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));

  const title = getStringNoLocaleAll(movieThing, 'https://schema.org/name')[0]!;
  const released = getDatetime(movieThing, 'https://schema.org/datePublished')!;
  const icon = getStringNoLocaleAll(movieThing, 'https://schema.org/image')[0]!;

  return {
    tmdbUrl,
    solidUrl: url,
    type,
    watched,
    liked,
    recommended,
    title,
    released,
    image: icon,
    dataset: movieDataset
  };
}

export function generateDatasetName(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replaceAll(' ', '-')
    .toLowerCase();
}

export function mediaDataToDataset(media: MediaData, ids: string[], pod: string, watched: boolean, recommended: boolean): {
  dataset: SolidDataset,
  url: string
} {
  const datasetName = generateDatasetName(media.title);
  const datasetUrl = `${pod}/movies/${datasetName}`;

  let movieDataset = createSolidDataset();
  let movie = createThing({ url: `${datasetUrl}#it` });

  const time = new Date();

  movie = setDatetime(movie, DCTERMS.created, time);
  movie = setDatetime(movie, DCTERMS.modified, time);
  movie = setUrl(movie, RDF.type, 'https://schema.org/Movie');
  movie = setStringNoLocale(movie, 'https://schema.org/name', media.title);
  movie = setStringNoLocale(movie, 'https://schema.org/description', media.description);
  movie = setStringNoLocale(movie, 'https://schema.org/image', media.image);
  movie = setDatetime(movie, 'https://schema.org/datePublished', media.released);
  for (const id of ids) movie = addStringNoLocale(movie, 'https://schema.org/sameAs', id);

  movieDataset = setThing(movieDataset, movie);

  // Add WatchAction as a separate entity if watched
  if (watched) {
    movieDataset = setWatched(movieDataset, datasetUrl, time);
  }

  // Add Recommendation as a separate entity if recommended
  if (recommended) {
    let recommendation = createThing();
    recommendation = setUrl(recommendation, RDF.type, 'https://schema.org/Recommendation');
    recommendation = setDatetime(recommendation, DCTERMS.created, time);
    recommendation = setDatetime(recommendation, SCHEMA_INRUPT.startTime, time);
    recommendation = setDatetime(recommendation, SCHEMA_INRUPT.endTime, time);
    recommendation = setUrl(recommendation, 'https://schema.org/object', `${datasetUrl}#it`);
    movieDataset = setThing(movieDataset, recommendation);
  }

  return {
    dataset: movieDataset,
    url: datasetUrl
  };
}
