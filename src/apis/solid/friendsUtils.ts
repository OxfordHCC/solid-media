import {
  getSolidDataset,
  createSolidDataset,
  getThing,
  setThing,
  saveSolidDatasetAt,
  addUrl,
  createThing,
  setUrl,
  getUrlAll,
  removeUrl,
  SolidDataset
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

function isAlreadyInGroup(groupThing: any, webID: string): boolean {
  const members = getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember');
  return members.includes(webID);
}

/**
 * Updates `${pod}/friends` with WebID Profile's friends list.
 * @returns The updated friends dataset and list of friends.
 */
export async function manageFriendsDataset(
  pod: string,
  webID: string,
  fetch: typeof window.fetch
): Promise<{ friendsDataset: SolidDataset; friends: string[]; }> {
  let friendsDataset: SolidDataset;

  try {
    friendsDataset = await getSolidDataset(`${pod}/friends`, { fetch });
  } catch {
    friendsDataset = await createInitialFriendsDataset(pod, fetch);
  }

  let groupThing = getThing(friendsDataset, `${pod}/friends#group`)!;

  const profile = await getSolidDataset(`${pod}/profile/card`, { fetch });
  const me = getThing(profile, `${pod}/profile/card#me`)!;

  // Sync friends between pod and profile
  const groupFriends = new Set(getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember'));
  const profileFriends = new Set(getUrlAll(me, 'http://xmlns.com/foaf/0.1/knows'));

  const newFriends = [...profileFriends].filter(x => !groupFriends.has(x) && x !== webID);
  const deletedFriends = [...groupFriends].filter(x => !profileFriends.has(x));

  // Update friends group if needed
  if (newFriends.length > 0 || deletedFriends.length > 0) {
    for (const friend of newFriends) {
      groupThing = addUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', friend);
    }

    for (const friend of deletedFriends) {
      groupThing = removeUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', friend);
    }

    friendsDataset = setThing(friendsDataset, groupThing);
    await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, { fetch });
  }

  const friends = getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember');
  return { friendsDataset, friends };
}

/**
 * Creates ${pod}/friends with a group Thing if it doesn't exist.
 * @returns The created friends dataset.
 */
export async function createInitialFriendsDataset(pod: string, fetch: typeof window.fetch): Promise<SolidDataset> {
  let friendsDataset = createSolidDataset();
  let groupThing = createThing({ url: `${pod}/friends#group` });
  groupThing = setUrl(groupThing, RDF.type, 'http://www.w3.org/2006/vcard/ns#Group');
  friendsDataset = setThing(friendsDataset, groupThing);
  await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, { fetch });
  return friendsDataset;
}

