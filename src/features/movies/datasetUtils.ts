import { SolidDataset, createThing, setUrl, setInteger, setThing, asUrl, setDatetime, getThingAll, getUrl, removeThing } from "@inrupt/solid-client";
import { RDF, DCTERMS, SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";


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

