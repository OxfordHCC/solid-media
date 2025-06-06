import {
  getSolidDataset,
  createSolidDataset,
  getThing,
  setThing,
  saveSolidDatasetAt,
  addUrl,
  createThing,
  setUrl,
  getUrlAll
} from '@inrupt/solid-client';
import { RDF } from '@inrupt/vocab-common-rdf';
import * as $rdf from "rdflib";

export async function addNewFriendToProfile(
  webID: string,
  newFriendWebID: string,
  fetch: typeof window.fetch
): Promise<void> {
  if (!newFriendWebID.length) {
    throw new Error('Friend WebID cannot be empty');
  }

  // Add friend to profile using RDFLib
  const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
  const store = $rdf.graph();
  const fetcher = new $rdf.Fetcher(store, { fetch });
  const updater = new $rdf.UpdateManager(store);

  const ins = [
    $rdf.st(
      $rdf.sym(webID),
      FOAF('knows'),
      $rdf.sym(newFriendWebID),
      $rdf.sym(webID).doc()
    )
  ];

  return new Promise((resolve, reject) => {
    updater.update([], ins, (uri, ok, message) => {
      if (!ok) {
        reject(new Error(message));
      } else {
        resolve();
      }
    });
  });
}

export async function addFriendToGroup(
  pod: string,
  newFriendWebID: string,
  fetch: typeof window.fetch
): Promise<void> {
  let friendsDataset;

  try {
    friendsDataset = await getSolidDataset(`${pod}/friends`, { fetch });
  } catch {
    friendsDataset = await createInitialFriendsDataset(pod, fetch);
  }

  let groupThing = getThing(friendsDataset, `${pod}/friends#group`)!;
  
  if (!isAlreadyInGroup(groupThing, newFriendWebID)) {
    groupThing = addUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', newFriendWebID);
    friendsDataset = setThing(friendsDataset, groupThing);
    await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, { fetch });
  }
}

async function createInitialFriendsDataset(pod: string, fetch: typeof window.fetch) {
  let friendsDataset = createSolidDataset();
  let groupThing = createThing({ url: `${pod}/friends#group` });
  groupThing = setUrl(groupThing, RDF.type, 'http://www.w3.org/2006/vcard/ns#Group');
  friendsDataset = setThing(friendsDataset, groupThing);
  await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, { fetch });
  return friendsDataset;
}

function isAlreadyInGroup(groupThing: any, webID: string): boolean {
  const members = getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember');
  return members.includes(webID);
}
