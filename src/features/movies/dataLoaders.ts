import {
  getSolidDataset,
  SolidDataset,
  WithAcl,
  WithServerResourceInfo,
  WithAccessibleAcl,
  getContainedResourceUrlAll,
  getUrl,
  getStringNoLocaleAll,
  hasResourceAcl,
  getUrlAll,
  getThing,
  getThingAll,
  setGroupDefaultAccess,
  setGroupResourceAccess,
  getSolidDatasetWithAcl,
  createAcl,
  saveAclFor,
  setAgentDefaultAccess,
  setAgentResourceAccess,
  createThing,
  saveSolidDatasetAt,
  setUrl,
  createSolidDataset,
  createContainerAt,
  addUrl,
  removeUrl,
  getResourceAcl,
  getPublicAccess,
  setPublicDefaultAccess,
  setPublicResourceAccess,
  getGroupAccess,
  getInteger,
  setThing
} from '@inrupt/solid-client';
import { RDF } from '@inrupt/vocab-common-rdf';
import { loadData } from '../../apis/tmdb';
import { MovieData, PersonInfo, MovieListItem, CategorizedMovies, NO_ACCESS, FULL_ACCESS, READ_ACCESS } from './types';

export async function initializeMoviesContainer(
  pod: string,
  fetch: typeof window.fetch
): Promise<SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo> {
  try {
    return await getSolidDatasetWithAcl(`${pod}/movies/`, { fetch }) as any;
  } catch {
    return await createContainerAt(`${pod}/movies/`, { fetch }) as any;
  }
}

/**
 * Updates `${pod}/friends` with WebID Profile's friends list.
 * @returns The updated friends dataset and list of friends.
 */
export async function manageFriendsDataset(
  pod: string,
  webID: string,
  fetch: typeof window.fetch
): Promise<{ friendsDataset: SolidDataset; friends: string[] }> {
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
async function createInitialFriendsDataset(pod: string, fetch: typeof window.fetch): Promise<SolidDataset> {
  let friendsDataset = createSolidDataset();
  let groupThing = createThing({ url: `${pod}/friends#group` });
  groupThing = setUrl(groupThing, RDF.type, 'http://www.w3.org/2006/vcard/ns#Group');
  friendsDataset = setThing(friendsDataset, groupThing);
  await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, { fetch });
  return friendsDataset;
}

export async function setupMoviesAcl(
  moviesAclDataset: SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo,
  pod: string,
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  try {
    // Initialize ACL if it doesn't exist
    if (!hasResourceAcl(moviesAclDataset)) {
      await createInitialMoviesAcl(moviesAclDataset, pod, webID, friends, fetch);
    }

    // Update ACL permissions
    await updateMoviesAclPermissions(moviesAclDataset, pod, friends, fetch);
  } catch (error) {
    console.log('Resource ACL isn\'t setup yet - first sign-up');
  }
}

async function createInitialMoviesAcl(
  moviesAclDataset: SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo,
  pod: string,
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  let moviesAcl = createAcl(moviesAclDataset);

  // Set group access
  moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
  moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);

  // Set public access
  moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
  moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);

  // Set friend access
  for (const id of friends) {
    moviesAcl = setAgentDefaultAccess(moviesAcl, id, READ_ACCESS);
    moviesAcl = setAgentResourceAccess(moviesAcl, id, READ_ACCESS);
  }

  // Set full access for the user
  moviesAcl = setAgentDefaultAccess(moviesAcl, webID, FULL_ACCESS);
  moviesAcl = setAgentResourceAccess(moviesAcl, webID, FULL_ACCESS);

  await saveAclFor(moviesAclDataset, moviesAcl, { fetch });
}

async function updateMoviesAclPermissions(
  moviesAclDataset: SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo,
  pod: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  const currentGlobalAccess = getPublicAccess(moviesAclDataset);
  const currentGroupAccess = getGroupAccess(moviesAclDataset, `${pod}/friends#group`);

  if (currentGlobalAccess && !currentGlobalAccess['read'] || currentGroupAccess && !currentGroupAccess['read']) {
    let moviesAcl = createAcl(moviesAclDataset);
    moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
    moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
    moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
    moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
    await saveAclFor(moviesAclDataset, moviesAcl, { fetch });
  }
}

export async function loadMoviesData(
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<{ movieDict: { [key: string]: MovieData }; categorizedMovies: CategorizedMovies }> {
  const people: PersonInfo[] = [
    { type: 'me', id: webID },
    ...friends.map(x => ({ type: 'friend' as const, id: x }))
  ];

  const movieList = await loadMovieList(people, fetch);
  const movieResults = await loadMovieDetails(movieList, fetch);

  return categorizeMovies(movieResults);
}

async function loadMovieList(people: PersonInfo[], fetch: typeof window.fetch): Promise<MovieListItem[]> {
  const movieLists = await Promise.all(
    people.map(async (person): Promise<MovieListItem[]> => {
      try {
        const parts = person.id.split('/');
        const pod = parts.slice(0, parts.length - 2).join('/');
        const moviesDataset = await getSolidDataset(`${pod}/movies/`, { fetch });
        const movies = getContainedResourceUrlAll(moviesDataset);
        return movies.map(url => ({ ...person, url }));
      } catch {
        return [];
      }
    })
  );

  return movieLists.flat();
}

async function loadMovieDetails(movieList: MovieListItem[], fetch: typeof window.fetch) {
  const movieResults = await Promise.allSettled(
    movieList.map(async ({ type, url }) => {
      const movieDataset = await getSolidDataset(url, { fetch });
      const movieThing = getThing(movieDataset, `${url}#it`)!;
      const things = getThingAll(movieDataset);

      // Extract movie properties
      const watched = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/WatchAction');
      const liked = extractLikedStatus(things, movieDataset);
      const recommended = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/Recommendation');

      const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
      const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));

      const { title, released, icon } = await loadData(tmdbUrl);

      return {
        movie: tmdbUrl,
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
    })
  );

  return movieResults.filter(x => x.status === 'fulfilled').map(x => (x as PromiseFulfilledResult<any>).value);
}

function extractLikedStatus(things: any[], movieDataset: any): boolean | null {
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

function categorizeMovies(movies: any[]): { movieDict: { [key: string]: MovieData }; categorizedMovies: CategorizedMovies } {
  const movieDict: { [key: string]: MovieData } = {};
  const categorizedMovies: CategorizedMovies = {
    myWatched: [],
    myUnwatched: [],
    myLiked: [],
    friendWatched: [],
    friendUnwatched: [],
    friendLiked: [],
    recommendedDict: [],
  };

  for (const { type, ...movie } of movies) {
    if (type === 'me') {
      movieDict[movie.movie] = { ...movie, me: true, friend: movieDict[movie.movie]?.friend || false };

      if (movie.watched && !categorizedMovies.myWatched.includes(movie.movie)) {
        categorizedMovies.myWatched.push(movie.movie);
      } else if (movie.recommended && !categorizedMovies.recommendedDict.includes(movie.movie)) {
        categorizedMovies.recommendedDict.push(movie.movie);
      } else if (!categorizedMovies.myUnwatched.includes(movie.movie)) {
        categorizedMovies.myUnwatched.push(movie.movie);
      }

      if (movie.liked && !categorizedMovies.myLiked.includes(movie.movie)) {
        categorizedMovies.myLiked.push(movie.movie);
      }
    } else if (type === 'friend') {
      if (!(movie.movie in movieDict)) {
        movieDict[movie.movie] = { ...movie, watched: false, liked: null, me: false, friend: true };
      } else {
        movieDict[movie.movie].friend = true;
      }

      if (movie.watched && !categorizedMovies.friendWatched.includes(movie.movie)) {
        categorizedMovies.friendWatched.push(movie.movie);
      } else if (!categorizedMovies.friendUnwatched.includes(movie.movie)) {
        categorizedMovies.friendUnwatched.push(movie.movie);
      }

      if (movie.liked && !categorizedMovies.friendLiked.includes(movie.movie)) {
        categorizedMovies.friendLiked.push(movie.movie);
      }
    }
  }

  return { movieDict, categorizedMovies };
}

export function sampleUserMovies(userMovies: MovieData[], maxSamples: number): string[] {
  const sampledTitles: string[] = [];

  if (userMovies.length <= maxSamples) {
    return userMovies.map(movie => movie.title);
  }

  const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
  const sampledMovies = shuffledMovies.slice(0, maxSamples);
  return sampledMovies.map(movie => movie.title);
}

export async function fetchRecommendations(sampledTitles: string[]): Promise<string[]> {
  try {
    const response = await fetch('https://api.pod.ewada.ox.ac.uk/solidflix-recommender/', {
      method: 'POST',
      body: JSON.stringify(sampledTitles),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.body) return [];

    const body = await response.text();
    return JSON.parse(body);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}
