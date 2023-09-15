import { h, Component, VNode } from 'preact';
import { Props } from './types';
import Carousel, { CarouselElement } from './Carousel';
import AddPopup from './AddPopup';
import AddFriends from './AddFriends';
import Logout from './Logout';
import { useAuthentication } from './authentication';
import { loadData, MediaData, getIds, search } from '../media';
import { getSolidDataset, deleteSolidDataset, SolidDataset, WithAcl, WithServerResourceInfo, WithAccessibleAcl, getContainedResourceUrlAll, getUrl, getStringNoLocaleAll, hasResourceAcl, getUrlAll, getThing, getThingAll, setGroupDefaultAccess, setGroupResourceAccess, getSolidDatasetWithAcl, createAcl, saveAclFor, setAgentDefaultAccess, setAgentResourceAccess, removeThing, createThing, saveSolidDatasetAt, setUrl, setDatetime, setThing, setInteger, asUrl, getInteger, createSolidDataset, createContainerAt, addUrl, removeUrl, getResourceAcl, setStringNoLocale, addStringNoLocale, getPublicResourceAccess, getPublicAccess, setPublicDefaultAccess, setPublicResourceAccess, getGroupAccess } from '@inrupt/solid-client';
import { DCTERMS, RDF, SCHEMA_INRUPT } from '@inrupt/vocab-common-rdf';
// import {shuffle} from '../lib';
import seedrandom from 'seedrandom';

import { logout } from '@inrupt/solid-client-authn-browser';

import { HOMEPAGE } from '../env';

import * as $rdf from "rdflib"

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'long',
};

const NO_ACCESS = {
	read: false,
	write: false,
	append: false,
	control: false,
};

const FULL_ACCESS = {
	read: true,
	write: true,
	append: true,
	control: true,
};

const READ_ACCESS = {
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

type State = {
	myWatched?: string[],
	myUnwatched?: string[],
	myLiked?: string[],
	friendWatched?: string[],
	friendUnwatched?: string[],
	friendLiked?: string[],
	recommendedDict?: string[],
	movies?: {[key: string]: MovieData},
	loading?: boolean,
};

export default class DiscoverPane extends Component<{globalState: {state: any}}> {
	state = {
		addPopup: false,
		addFriends: false,
		showLogout: false,
	};
	
	public render({globalState}: Props<{globalState: {state: State, setState: (state: Partial<State>) => void}}>): VNode {
		const session = useAuthentication();
		if (!session) return <div />;
		
		const webID = session.info.webId!;
		const parts = webID.split('/');
		const pod = parts.slice(0, parts.length - 2).join('/');
		
		if (!globalState.state.loading) {
			globalState.setState({
				loading: true,
			});
			
			(async () => {
				let loadingStart = (new Date()).getTime();
				
				let moviesAclDataset: SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo;
				
				try {
					moviesAclDataset = await getSolidDatasetWithAcl(`${pod}/movies/`, {fetch: session.fetch}) as any;
				} catch {
					moviesAclDataset = await createContainerAt(`${pod}/movies/`, {fetch: session.fetch}) as any;
				}
				
				let friendsDataset: SolidDataset;
				
				try {
					// retrieve friends list
					friendsDataset = await getSolidDataset(`${pod}/friends`, {fetch: session.fetch});
				} catch {
					friendsDataset = createSolidDataset();
					
					let groupThing = createThing({url: `${pod}/friends#group`});
					groupThing = setUrl(groupThing, RDF.type, 'http://www.w3.org/2006/vcard/ns#Group');
					
					// inserts friends into the group
					friendsDataset = setThing(friendsDataset, groupThing);
					
					await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
				}
				
				let groupThing = getThing(friendsDataset, `${pod}/friends#group`)!;
				
				const profile = await getSolidDataset(`${pod}/profile/card`, {fetch: session.fetch});
				const me = getThing(profile, `${pod}/profile/card#me`)!;
				
				// get all friends in the pod
				const groupFriends = new Set(getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember'));
				// get all friends in the profile
				const profileFriends = new Set(getUrlAll(me, 'http://xmlns.com/foaf/0.1/knows'));
				// add new friends to the pod
				const newFriends = [...profileFriends].filter(x => !groupFriends.has(x));
				
				for (const friend of newFriends) {
					console.log('print friend : ' + friend);
					if(friend != webID) { // avoid adding the user itself as a friend
						groupThing = addUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', friend);
					} 
				}

				// get all deleted friends 
				const deletedFriends = [...groupFriends].filter(x => !profileFriends.has(x));
				
				// remove deleted friends from 'friends' group
				for (const friend of deletedFriends) {
					groupThing = removeUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', friend);
				}

				if (newFriends.length > 0 || deletedFriends.length > 0) {
					friendsDataset = setThing(friendsDataset, groupThing);
					
					await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
				}
				
				const friends = getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember');

				// remove later - for debugging 
				for (const friend of friends) {
					console.log("friend : " + friend);
				}

				try {
					// initialises ACL for the moviesAclDataset (during first log-in on the app)
					if (!hasResourceAcl(moviesAclDataset)) {
						// Temporarily allow friends access by default
						// TODO: Create a UI element to do this
						let moviesAcl = createAcl(moviesAclDataset);
						moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
						moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
						// Temporarily set /movies access to everyone by default
						moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
						moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
						for (const id of friends) { // add read access for all existing friends
							moviesAcl = setAgentDefaultAccess(moviesAcl, id, READ_ACCESS);
							moviesAcl = setAgentResourceAccess(moviesAcl, id, READ_ACCESS);
						}
						// Set full access for the user itself
						moviesAcl = setAgentDefaultAccess(moviesAcl, webID, FULL_ACCESS);
						moviesAcl = setAgentResourceAccess(moviesAcl, webID, FULL_ACCESS);
						await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
					}
				} catch {
					// try/catch because hasResourceAcl & getResourceAcl throws an error on the first sign-up
				}

				// Try & Check if Global Access setting for /movies is set to everyone for read access
				try {
					let moviesAcl = createAcl(moviesAclDataset);
					let currentGlobalAccess = getPublicAccess(moviesAclDataset);
					let currentGroupAccess = getGroupAccess(moviesAclDataset, `${pod}/friends#group`);
					if (currentGlobalAccess && !currentGlobalAccess['read'] || currentGroupAccess && !currentGroupAccess['read']) {
						moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
						moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
						moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
						moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
						await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
					}

					// provide movies access to new friends
					if (newFriends.length > 0) {
						let moviesAcl = getResourceAcl(moviesAclDataset)!;
						for (const id of newFriends) {
							moviesAcl = setAgentDefaultAccess(moviesAcl, id, READ_ACCESS);
							moviesAcl = setAgentResourceAccess(moviesAcl, id, READ_ACCESS);
						}
						await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
					}

					// remove movie access for deleted friends
					if (deletedFriends.length > 0) {
						let moviesAcl = getResourceAcl(moviesAclDataset)!; 
						for (const id of deletedFriends) {
							moviesAcl = setAgentDefaultAccess(moviesAcl, id, NO_ACCESS);
							moviesAcl = setAgentResourceAccess(moviesAcl, id, NO_ACCESS);
						} 
						await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
					}
				} catch {
					console.log('resource ACL isn\'t setup yet - first sign-up');
				}
				

				// creates an object of {type: {user or friend}, id: {users webID or friends webID}}
				const people = [{type: 'me', id: webID}, ...friends.map(x => ({type: 'friend', id: x}))] as {type: 'me' | 'friend', id: string}[];
				// console.log('people', people)

				// creates a list of movies including users and their friends movies data
				const movieList = (await Promise.all(people.map(async x => {
					try {
						const parts = x.id.split('/');
						const pod = parts.slice(0, parts.length - 2).join('/');
						// console.log('Pod', pod)

						// getting movies from the user and their friends movies pod
						const moviesDataset = await getSolidDataset(`${pod}/movies/`, {fetch: session.fetch});
						
						const movies = getContainedResourceUrlAll(moviesDataset);
						
						// adds the url to the specfic movie resource to the movies list
						return movies.map(m => ({...x, url: m}));
					} catch {
						return [];
					}
				}))).flat(1);



				const test_start = (new Date()).getTime();
				const movies = await Promise.all(
					movieList.map(async ({type, url}) => {
						// iterating through all movies (user + their friends)
						const movieDataset = await getSolidDataset(url, {fetch: session.fetch});
						
						// fetching the stored metadata for each movie
						const movieThing = getThing(movieDataset, `${url}#it`)!;
						
						const things = getThingAll(movieDataset);
						
						// checking if the user has watched the movie
						const watched = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/WatchAction');
						
						// checking if the user has reviewed this movie
						const review = things.find(x => getUrl(x, RDF.type) === 'https://schema.org/ReviewAction');
						
						let liked = null;
						
						if (review) {
							const ratingUrl = getUrl(review, 'https://schema.org/resultReview')!;
							
							const rating = getThing(movieDataset, ratingUrl)!;
							
							const min = getInteger(rating, 'https://schema.org/worstRating');
							const max = getInteger(rating, 'https://schema.org/bestRating');
							const value = getInteger(rating, 'https://schema.org/ratingValue');
							
							if (value === max) liked = true;
							else if (value === min) liked = false;
						}

						let recommended = false;
						const recommend = things.find(x => getUrl(x, RDF.type) === 'https://schema.org/Recommendation');
						if (recommend) recommended = true;
						
						const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
						
						const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));
						
						// fetch current movie assets from imdb API
						const {title, released, icon} = await loadData(tmdbUrl);
						
						return {movie: tmdbUrl, solidUrl: url, type, watched, liked, recommended: recommended, title, released, image: icon, dataset: movieDataset};
					})
				);
				console.log(((new Date()).getTime() - test_start)/1000 + ' seconds')
				
				const movieDict: {[key: string]: MovieData} = {};
				const myWatched: string[] = [];
				const myUnwatched: string[] = [];
				const myLiked: string[] = [];
				const friendWatched: string[] = [];
				const friendUnwatched: string[] = [];
				const friendLiked: string[] = [];
				const recommendedDict: string[] = [];
				

				for (const {type, ...movie} of movies) {
					switch (type) {
						case 'me': {
							movieDict[movie.movie] = {...movie, me: true, friend: movieDict[movie.movie]?.friend};
							
							// if the movie has been watched & check if the same movie does not already exist in the watched list
							if (movie.watched && !myWatched.includes(movie.movie)) {
								myWatched.push(movie.movie);
							} else if (movie.recommended && !recommendedDict.includes(movie.movie)) {
								recommendedDict.push(movie.movie);
							} else {
								if(!myUnwatched.includes(movie.movie)) {
									// check if the same movie does not already exist in users wishlist
									myUnwatched.push(movie.movie);
								}
							}
							
							// if the user liked the movie and it doesn't already exist in myLiked
							if (movie.liked && !myLiked.includes(movie.movie)) {
								myLiked.push(movie.movie);
							}
						} break;
						
						case 'friend': {
							if (!(movie.movie in movieDict)) {
								movieDict[movie.movie] =
								{...movie, watched: false, liked: null, me: false, friend: true};
							} else {
								movieDict[movie.movie].friend = true;
							}
							
							// if the friend has watched the movie and it isn't there in friendWatched already
							if (movie.watched && !friendWatched.includes(movie.movie)) {
								friendWatched.push(movie.movie);
							} else {
								if(!friendUnwatched.includes(movie.movie)) {
									friendUnwatched.push(movie.movie);
								}
							}
							
							if (movie.liked && !friendLiked.includes(movie.movie)) {
								friendLiked.push(movie.movie);
							}
						} break;
					}
				}
				
                
				// console.log('myLiked:', myLiked);
                // console.log('myWatched:', myWatched);
                // console.log('friendLiked:', friendLiked);
                // console.log('friendWatched:', friendWatched);


				// Update global state with values
                globalState.setState({
					myWatched,
					myUnwatched,
					myLiked,
					friendWatched,
					friendUnwatched,
					friendLiked,
					movies: movieDict,
					recommendedDict,
					// myMovieVector,
					// myMinHash,
					});

				
                globalState.setState({
					recommendedDict: []
				}); // deletes all recommendations, and adds new recos at each load



                // ADDED NEW CODE - Define the functions for minhash 
				// Generates a list of random hash functions, each represented by a pair (a, b)
				// Allow seed setting to recreate the hash functions/permutations
				function generateHashFunctions(numPerm, seed = 100) {
					const rng = seedrandom(seed); // Create a random number generator with a seed
					
					const hashFunctions = [];
					for (let i = 0; i < numPerm; i++) {
					  const a = Math.floor(rng() * (2 ** 32 - 1)) + 1; // Generate random 'a' value
					  const b = Math.floor(rng() * (2 ** 32 - 1)); // Generate random 'b' value
					  hashFunctions.push([a, b]); // Append hash function parameters to the list
					}
					
					return hashFunctions;
				}
				

				// Computes MinHash values for a given vector using a list of hash functions
				function minHash(movieIndexes, hashFunctions) {
					const minHashValues = [];
				  
					for (const [a, b] of hashFunctions) {
					  let minHash = Number.POSITIVE_INFINITY;
				  
					  for (const movieIndex of movieIndexes) { // Use 'of' instead of 'in' here
						const hashVal = (a * parseInt(movieIndex) + b) % 5000;
						minHash = Math.min(minHash, hashVal);
					  }
				  
					  minHashValues.push(minHash);
					}
				  
					return minHashValues;
				  }
				
				
				async function fetchMoviesFromPod(podUrl) {
				  try {
					const parts = podUrl.split('/');
					const pod = parts.slice(0, parts.length - 2).join('/');

					// Fetch movies from the given pod URL and retrieve their URLs
					const moviesDataset = await getSolidDataset(`${pod}/movies/`, { fetch: session.fetch });
					const movieUrls = getContainedResourceUrlAll(moviesDataset);
				  
					// Fetch and process movie data for each URL
					const movies = await Promise.all(
					movieUrls.map(async url => {
						const movieDataset = await getSolidDataset(url, { fetch: session.fetch });
				  
						// Fetching the stored metadata for each movie
						const movieThing = getThing(movieDataset, `${url}#it`)!;
						const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
				  
						const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));
				  
						// Fetch current movie assets from tMDb API
						const { title, released, icon } = await loadData(tmdbUrl);
				  
						return { tmdbUrl: tmdbUrl, solidUrl: url, title, released, image: icon, dataset: movieDataset };
					  })
					);
				  
					return movies;
				  } catch {
					return [];
				  }
				}
                


                // Function to compute the movie vector for a single pod URL
                async function collectMovieIndexes(podUrl) {
					const movieIndexes = []; // Initialize an empty array to store movie indexes
				  
					// Fetch movies from the given pod URL and retrieve their tmdbUrls
					const movies = await fetchMoviesFromPod(podUrl);
				  
					// Iterate through the movies and update the movieIndexes array
					for (const movie of movies) {
					  // Extract the movie ID from the tmdbUrl (e.g., "https://www.themoviedb.org/movie/289")
					  const tmdbId = extractMovieIdFromUrl(movie.tmdbUrl);
				  
					  // Add the tmdbId to the movieIndexes array
					  movieIndexes.push(tmdbId);
					}
				  
					// Now, movieIndexes contains all the extracted tmdbIds
					return movieIndexes;
				  }

				  
                // Function to extract movie ID from a tmdbUrl
                function extractMovieIdFromUrl(tmdbUrl) {
                  // Parse the URL and extract the last segment as the movie ID
                  const urlSegments = tmdbUrl.split('/');
                  return parseInt(urlSegments[urlSegments.length - 1]);
                }


				async function processPodURLs(people) {
					const numPerm = 128; // Number of permutation functions
					const seed = 100;
					// Generate a list of random hash functions (should be the same across all users)
					const hashFunctions = generateHashFunctions(numPerm, seed);
				  
					const results = [];
				  
					for (const person of people) {
					  const podUrl = person.id;
				  
					  // Collect the movie indexes for the current pod URL
					  const movieIndexes = await collectMovieIndexes(podUrl);
				  
					  // Compute MinHash for the movie vector
					  const minhashValues = minHash(movieIndexes, hashFunctions);
				  
					  console.log(`Pod URL: ${podUrl}`);
					  console.log('Movie Indexes:', movieIndexes);
					  console.log('MinHash Values:', minhashValues);
				  
					  // Save the computed minhash vector to the person's pod
					//   const savedDatasetUrl = await saveVector(minhashValues, podUrl);
				  
					//   if (savedDatasetUrl) {
					// 	console.log('Saved minhash vector at:', savedDatasetUrl);
					//   }
				  
					  results.push({
						podUrl,
						movieIndexes,
						minhashValues
						// savedDatasetUrl,
					  });
					}
				  
					return results;
				  }

				  
				// Example usage:
                let savedResults;

  				// Call the processPodURLs function and store the results synchronously
				try {
				  savedResults = await processPodURLs(people);
				  console.log('Processed all Pod URLs:', savedResults);
				} catch (error) {
			      console.error('Error processing Pod URLs:', error);
				}
				  
                

				// Save the minhash vector to a person's pod
                async function saveVector(vector, podUrl) {
                  try {
					const parts = podUrl.split('/');
					const pod = parts.slice(0, parts.length - 2).join('/');
                    // Generate a unique dataset URL for the vector
                    const datasetUrl = `${pod}/minhash`;

                    // Create a new Solid Dataset
                    let vectorDataset = createSolidDataset();

                    // Create a new Thing for the vector data
                    let vectorThing = createThing({ url: `${datasetUrl}#it` });

                    // Set vector data properties (customize as needed)
                    vectorThing = setUrl(vectorThing, 'https://schema.org/type', 'https://schema.org/Vector');
                    vectorThing = setDatetime(vectorThing, 'https://schema.org/dateCreated', new Date());
                    vectorThing = setStringNoLocale(vectorThing, 'https://schema.org/vectorData', JSON.stringify(vector));

                    // Add the vector Thing to the dataset
                    vectorDataset = setThing(vectorDataset, vectorThing);

                    // Save the Solid Dataset to the specified Pod URL
                    await saveSolidDatasetAt(datasetUrl, vectorDataset, { fetch: session.fetch });

                    console.log('Vector data saved successfully.');

                    return datasetUrl;
                  } catch (error) {
                    console.error('Error saving vector data:', error);
                    return null;
                  }
                }

				

                // ADDED NEW CODE - LSH
				function hashBand(band) {
					let hash = 0;
					for (let i = 0; i < band.length; i++) {
					  const value = band[i];
					  // Use bitwise left shift and addition to create the hash
					  hash = (hash << 5) - hash + value;
					}
					return hash;
				  }
				  
				  // function hashBand(band) {
				  // 	// Generate a hash value for a band (simple hash function)
				  // 	return band.reduce((hash, value) => hash + value, 0);
				  // 	}
				  
				  function insertIntoLSH(buckets, userPodUrl, minhash, numPerm, bandSize) {
					// Loop through the MinHash values in bands
					for (let i = 0; i < numPerm; i += bandSize) {
					  // Extract a band of MinHash values
					  const band = minhash.slice(i, i + bandSize); // Extract a band of MinHash values
					  // Hash the band to get a unique identifier for this band
					  const bandHash = hashBand(band); // Hash the band
				  
					  // Check if the bucket for this bandHash exists
					  if (!buckets[bandHash]) {
						// If not, create a new bucket (represented as a Set)
						buckets[bandHash] = new Set();
					  }
				  
					  // Add the user's Pod URL to the bucket for this bandHash
					  buckets[bandHash].add(userPodUrl);
					  console.log(`Inserted ${userPodUrl} into bucket ${bandHash}`);
					}
				  }
				  
				  function queryLSH(buckets, minhashQuery, numPerm, bandSize) {
					// Create a Set to store similar users
					const similarUsers = new Set();
				  
					// Loop through the MinHash values in the query in bands
					for (let i = 0; i < numPerm; i += bandSize) {
					  // Extract a band of MinHash values from the query
					  const band = minhashQuery.slice(i, i + bandSize); // Extract a band from the query MinHash
					  // Hash the band to get the corresponding bucket identifier
					  const bandHash = hashBand(band);
				  
					  // Check if a bucket for this bandHash exists
					  if (buckets[bandHash]) {
						// If it exists, iterate through the users in that bucket
						for (const user of buckets[bandHash]) {
						  // Add each user to the set of similar users
						  similarUsers.add(user);
						}
					  }
					}
				  
					return Array.from(similarUsers);
				  }
				  
				  
				  
				  // Create LSH buckets
				  const numPerm = 128;
				  const numBands = 32; 
                  const bandSize = numPerm / numBands; 
                  const buckets = {};
				  
				  console.log('savedResults again', savedResults)

				  for (let idx = 0; idx < savedResults.length; idx++) {
					const minhash = savedResults[idx].minhashValues;
					const userPodUrl = savedResults[idx].podUrl; // Use the ID as the userPodUrl
					insertIntoLSH(buckets, userPodUrl, minhash, numPerm, bandSize);
				}
			
				  console.log('Buckets', buckets);
				  
				  // Filter savedResults to get minhashValues for 'me'
				  // Find the user with type === 'me' in savedResults
				  const myId = people.find((person) => person.type === 'me').id;
				  const meUser = savedResults.find((user) => user.podUrl === myId);
				  const myMinhashValues = meUser.minhashValues;
				  
				  // Query the LSH index
				  const queryMinhash = myMinhashValues;
				  const similarUsers = queryLSH(buckets, queryMinhash, numPerm, bandSize);
				  
				  // Remove 'me' from similarUsers
				  const userIdToRemove = meUser.podUrl 
				  const filteredSimilarUsers = similarUsers.filter((user) => user !== userIdToRemove);
				  
				  console.log('Similar Users for Me', filteredSimilarUsers);


				
				
				// let loadingEnd = (new Date()).getTime();
				// let currentSeconds = (loadingEnd - loadingStart)/1000;
				// console.log('# of movies loaded: ' + movieList.length + ' | time taken: ' + currentSeconds + ' seconds');
				// // let dataLoadEndedTime = ((new Date()).getTime() - loadingStart)/1000;

				// // Random Sampling: sample 10 movies randomly from watched/liked/wishlist movies
				// const userMovies = movies.filter(x => x.type === "me" && !x.recommended)
				// const sampledTitles: String[] = []
				// if (userMovies.length <= 10) {
				// 	for (let movie of userMovies) {
				// 		sampledTitles.push(movie.title);
				// 	}
				// } else {
				// 	const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
				// 	const sampledMovies = shuffledMovies.slice(0, Math.min(10, shuffledMovies.length));
				// 	for (let movie of sampledMovies) {
				// 		sampledTitles.push(movie.title);
				// 	}
				// }


				// Randomly sample 5 movies from similar users
				function sampleMovieTitles(allMovieTitles, sampleSize) {
					const sampledTitles = [];
				  
					if (allMovieTitles.length <= sampleSize) {
					  for (let title of allMovieTitles) {
						sampledTitles.push(title);
					  }
					} else {
					  const shuffledTitles = allMovieTitles.sort(() => 0.5 - Math.random());
					  const sampledTitles = shuffledTitles.slice(0, Math.min(10, shuffledTitles.length));
					  for (let title of sampledTitles) {
						sampledTitles.push(title);
					  }
					}
				  
					return sampledTitles;
				  }


                // Produce recommendations based on similar users
				const OthersMovieTitles = [];
                const myMovieTitles = [];

				for (const userPodUrl of filteredSimilarUsers) {
					const movies = await fetchMoviesFromPod(userPodUrl);
					OthersMovieTitles.push(...movies.map((movie) => movie.title));
				  }
				  
				const myMovies = await fetchMoviesFromPod(meUser.podUrl);
				myMovieTitles.push(...myMovies.map((movie) => movie.title));
				  
				const sampledTitlesfromOthers = sampleMovieTitles(OthersMovieTitles, 5);
				const mySampledTitles = sampleMovieTitles(myMovieTitles, 10);
				console.log('Sampled Movies From Similar Users', sampledTitlesfromOthers)
				console.log('Sampled Movies From Me', mySampledTitles)


				// fetch movie recommendations
				// const response = await fetch('https://api.pod.ewada.ox.ac.uk/solidflix-recommender/', {
				// 	method: 'POST',
				// 	body: JSON.stringify(sampledTitles),
				// 	headers: {
				// 		'Content-Type': 'application/json'
				// 	}
				// });
				  
				// let recommendedList;
				// if (response.body !== null) {
				// 	const body = await response.text();
				// 	recommendedList = JSON.parse(body);
				// 	console.log(recommendedList);
				// }

				// for(const name of recommendedList) {
				// 	const movies = await search(name);
				// 	const movie = movies.find(x => x.title === name);
				// 	if (movie) {
				// 		save(movie, true);
				// 	}
				// }

				// load time
				// let loadingEnd2 = (new Date()).getTime();
				// let currentSeconds2 = (loadingEnd2 - loadingStart)/1000;
				// console.log('Fetching 10 recommendations took: ' + (currentSeconds2 - dataLoadEndedTime) + ' sec')
			})();
		}
		
		async function addNewFriendData() {
			// Set up a local data store and associated data fetcher
			const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
			// create a local RDF store
			const store = $rdf.graph();
			// create a fetcher to read/write 
			const fetcher = new $rdf.Fetcher(store, {fetch: session.fetch});
			// create update manager to "patch" the data as the data is updated in real time
			const updater = new $rdf.UpdateManager(store);
			
			const me_f = $rdf.sym(webID); // creates a user node identified by the webID URI
			const profile_f = me_f.doc(); 
			console.log("My WedID: " + webID);
			
			// read the value filled up by the user in the text input
			let newFriendWebID = (document.getElementById("friend") as HTMLInputElement).value;
			console.log("new friend to be added : " + newFriendWebID);

			let ins = [];
			ins.push($rdf.st($rdf.sym(webID), FOAF('knows'), $rdf.sym(newFriendWebID), $rdf.sym(webID).doc())); 
			updater.update([], ins, (uri, ok_f, message_f) => {
				console.log(uri);
				if (!ok_f) {
					alert(message_f);
				} else {
					window.location.reload();
				}
			});
			
			// Add new friend to the friends list
			let friendsDataset: SolidDataset;

			try {
				// retrieve friends list
				friendsDataset = await getSolidDataset(`${pod}/friends`, {fetch: session.fetch});
			} catch {
				friendsDataset = createSolidDataset();
				
				let groupThing = createThing({url: `${pod}/friends#group`});
				groupThing = setUrl(groupThing, RDF.type, 'http://www.w3.org/2006/vcard/ns#Group');
				
				// inserts friends into the group
				friendsDataset = setThing(friendsDataset, groupThing);
				
				await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
			}

			let groupThing = getThing(friendsDataset, `${pod}/friends#group`)!;
			
			if(newFriendWebID.length != 0) { // if new friend exists
				groupThing = addUrl(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember', newFriendWebID); // add to group thing
				friendsDataset = setThing(friendsDataset, groupThing); // update friends dataset
					
				await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch}); // save changes back
				console.log("new friend added");

				const friends = getUrlAll(groupThing, 'http://www.w3.org/2006/vcard/ns#hasMember');
				console.log("friends after adding : " + friends);
			}

			// TODO: Write a function to fetch newly added friend's movies dynamically, instead of refreshing the window

		}

		async function save(media: MediaData, recommended: Boolean = false, watch: Boolean = false) {
			// Adds movies to Wishlist

			const ids = await getIds(media.tmdbUrl);
			
			const datasetName = media.title
				.replace(/[^a-zA-Z0-9-_ ]/g, '')
				.replaceAll(' ', '-')
				.toLowerCase();
			
			const datasetUrl = `${pod}/movies/${datasetName}`;
			
			let movieDataset = createSolidDataset();
			
			let movie = createThing({url: `${datasetUrl}#it`});
			
			const time = new Date();
			
			movie = setDatetime(movie, DCTERMS.created, time);
			movie = setDatetime(movie, DCTERMS.modified, time);
			movie = setUrl(movie, RDF.type, 'https://schema.org/Movie');
			if (watch) movie = setUrl(movie, RDF.type, 'https://schema.org/WatchAction');
			if (recommended) movie = setUrl(movie, RDF.type, 'https://schema.org/Recommendation');
			movie = setStringNoLocale(movie, 'https://schema.org/name', media.title);
			movie = setStringNoLocale(movie, 'https://schema.org/description', media.description);
			movie = setStringNoLocale(movie, 'https://schema.org/image', media.image);
			movie = setDatetime(movie, 'https://schema.org/datePublished', media.released);
			for (const id of ids) movie = addStringNoLocale(movie, 'https://schema.org/sameAs', id);
			
			movieDataset = setThing(movieDataset, movie);
			
			await saveSolidDatasetAt(datasetUrl, movieDataset, {fetch: session.fetch});
			
			const movieData = {
				movie: media.tmdbUrl,
				solidUrl: datasetUrl,
				watched: Boolean(watch),
				liked: null,
				recommended: Boolean(recommended),
				title: media.title,
				released: media.released,
				image: media.image,
				dataset: movieDataset,
				me: true,
				friend: false,
			};
			
			if (!movieData.recommended) {
				if (!movieData.watched) {
					globalState.setState({
						myUnwatched: [media.tmdbUrl, ...globalState.state.myUnwatched!],
						movies: {...globalState.state.movies, [media.tmdbUrl]: movieData},
					});
				} else {
					globalState.setState({
						myWatched: [media.tmdbUrl, ...globalState.state.myWatched!],
						movies: {...globalState.state.movies, [media.tmdbUrl]: movieData},
					});
				}
			} else {
				globalState.setState({
					recommendedDict: [media.tmdbUrl, ...globalState.state.recommendedDict!.filter(x => x !== media.tmdbUrl)],
					movies: {...globalState.state.movies, [media.tmdbUrl]: movieData},
				});
			}
			
			return movieData;
		}
		
		async function watch(media: MovieData, date: Date = new Date()) {
			// Adds movies to watched movies list

			let dataset = media.dataset;
			
			let thing = createThing();
			
			thing = setUrl(thing, RDF.type, 'https://schema.org/WatchAction');
			thing = setDatetime(thing, DCTERMS.created, new Date());
			thing = setDatetime(thing, SCHEMA_INRUPT.startTime, date);
			thing = setDatetime(thing, SCHEMA_INRUPT.endTime, date);
			thing = setUrl(thing, 'https://schema.org/object', `${media.movie}#it`);
			
			dataset = setThing(dataset, thing);
			await saveSolidDatasetAt(media.solidUrl, dataset, {fetch: session.fetch});
			
			media.dataset = dataset;
			
			globalState.setState({
				myUnwatched: globalState.state.myUnwatched!.filter(x => x !== media.movie),
				recommendedDict: globalState.state.myUnwatched!.filter(x => x !== media.movie),
				myWatched: [media.movie, ...globalState.state.myWatched!],
				movies: {...globalState.state.movies, [media.movie]: {...media, watched: true, dataset}},
			});
		}
		
		const createCarouselElement = (movie: string, type: 'friend' | 'me'): VNode => {
			const movieData = globalState.state.movies![movie];
			const {solidUrl, watched, liked, recommended, title, released, image} = movieData;
			let {dataset} = movieData;
			
			function remove(type: string) {
				for (const thing of getThingAll(dataset)) {
					if (getUrl(thing, RDF.type) === type) {
						dataset = removeThing(dataset, thing);
					}
				}
			}
			
			function rate(value: 1 | 2 | 3) {
				let rating = createThing();
				
				rating = setUrl(rating, RDF.type, 'https://schema.org/Rating');
				rating = setInteger(rating, 'https://schema.org/worstRating', 1);
				rating = setInteger(rating, 'https://schema.org/bestRating', 3);
				rating = setInteger(rating, 'https://schema.org/ratingValue', value);
				
				dataset = setThing(dataset, rating);
				
				let review = createThing();
				
				const time = new Date();
				
				review = setUrl(review, RDF.type, 'https://schema.org/ReviewAction');
				review = setUrl(review, 'https://schema.org/resultReview', asUrl(rating, solidUrl));
				review = setDatetime(review, DCTERMS.created, time);
				review = setDatetime(review, SCHEMA_INRUPT.startTime, time);
				review = setDatetime(review, SCHEMA_INRUPT.endTime, time);
				review = setUrl(review, 'https://schema.org/object', `${solidUrl}#it`);
				
				dataset = setThing(dataset, review);
			}
			
			switch (type) {
				case 'me': {
					return (
						<CarouselElement
							title={title}
							subtitle={released.toLocaleDateString('en-GB', DATE_FORMAT)}
							image={image}
							redirect={`${HOMEPAGE}/view?url=${movie}`}
							buttons={[
								...(watched ? [
									{text: '👎', cssClass: 'carousel-dislike', selected: liked === false, click: async () => {
										remove('https://schema.org/Rating');
										remove('https://schema.org/ReviewAction');
										
										if (liked === false) {
											await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
											
											globalState.setState({
												movies: {...globalState.state.movies, [movie]: {...movieData, liked: null, dataset}},
											});
										} else {
											rate(1);
											
											await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
											
											globalState.setState({
												myLiked: globalState.state.myLiked!.filter(x => x !== movie),
												movies: {...globalState.state.movies, [movie]: {...movieData, liked: false, dataset}},
											});
										}
									}},
									{text: '👍', cssClass: 'carousel-like', selected: liked === true, click: async () => {
										remove('https://schema.org/Rating');
										remove('https://schema.org/ReviewAction');
										
										if (liked === true) {
											await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
											
											globalState.setState({
												myLiked: globalState.state.myLiked!.filter(x => x !== movie),
												movies: {...globalState.state.movies, [movie]: {...movieData, liked: null, dataset}},
											});
										} else {
											rate(3);
											
											await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
											
											globalState.setState({
												myLiked: [movie, ...globalState.state.myLiked!],
												movies: {...globalState.state.movies, [movie]: {...movieData, liked: true, dataset}},
											});
										}
									}},
								] : []),
								{text: '✔️', cssClass: 'carousel-watch', selected: watched, click: async () => {
									if (watched) {
										remove('https://schema.org/WatchAction');
										
										await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
										
										globalState.setState({
											myWatched: globalState.state.myWatched!.filter(x => x !== movie),
											myUnwatched: [movie, ...globalState.state.myUnwatched!],
											movies: {...globalState.state.movies, [movie]: {...movieData, watched: false, dataset}},
										});
									} else {
										let thing = createThing();
										
										const time = new Date();
										
										thing = setUrl(thing, RDF.type, 'https://schema.org/WatchAction');
										thing = setDatetime(thing, DCTERMS.created, time);
										thing = setDatetime(thing, SCHEMA_INRUPT.startTime, time);
										thing = setDatetime(thing, SCHEMA_INRUPT.endTime, time);
										thing = setUrl(thing, 'https://schema.org/object', `${solidUrl}#it`);
										
										dataset = setThing(dataset, thing);
										
										await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
										
										globalState.setState({
											myUnwatched: globalState.state.myUnwatched!.filter(x => x !== movie),
											recommendedDict: globalState.state.recommendedDict!.filter(x => x !== movie),
											myWatched: [movie, ...globalState.state.myWatched!],
											movies: {...globalState.state.movies, [movie]: {...movieData, watched: true, dataset}},
										});
									}
								}},
								{text: '❌', cssClass: 'carousel-remove', click: async () => {
									await deleteSolidDataset(solidUrl, {fetch: session.fetch});
									
									const {[movie]: deleted, ...remaining} = globalState.state.movies!;
									
									const remove = [...globalState.state.friendWatched!, ...globalState.state.friendUnwatched!]
										.every(x => x !== movie);
									
									globalState.setState({
										myUnwatched: globalState.state.myUnwatched!.filter(x => x !== movie),
										myWatched: globalState.state.myWatched!.filter(x => x !== movie),
										myLiked: globalState.state.myLiked!.filter(x => x !== movie),
										recommendedDict: globalState.state.recommendedDict!.filter(x => x !== movie),
										movies: remove ? remaining : globalState.state.movies,
									});
								}},
							]}
						/>
					);
				}
				
				case 'friend': {
					return (
						<CarouselElement
							title={title}
							subtitle={released.toLocaleDateString('en-GB', DATE_FORMAT)}
							image={image}
							redirect={`${HOMEPAGE}/view?url=${movie}`}
							buttons={[
								{text: '➕', cssClass: 'carousel-save', click: async () => {
									if (![...globalState.state.myWatched!, ...globalState.state.myUnwatched!].some(x => x === movie)) {
										const datasetName = title
											.replace(/[^a-zA-Z0-9-_ ]/g, '')
											.replaceAll(' ', '-')
											.toLowerCase();
										
										let movieDataset = createSolidDataset();
										
										let thing = getThing(dataset, `${solidUrl}#it`)!;
										
										thing = Object.freeze({...thing, url: `${pod}/movies/${datasetName}#it`});
										
										movieDataset = setThing(movieDataset, thing);
										
										const newUrl = `${pod}/movies/${datasetName}`;
										
										await saveSolidDatasetAt(newUrl, movieDataset, {fetch: session.fetch});
										
										globalState.setState({
											myUnwatched: [movie, ...globalState.state.myUnwatched!],
											movies: {...globalState.state.movies, [movie]: {...movieData, me: true, solidUrl: newUrl, dataset: movieDataset}},
										});
									}
								}},
							]}
						/>
					);
				}
			}
		}
		
		return (
			<div class="movies-page">
				<div class="logo-container">
					<img src={'./assets/logo.png'}></img>
				</div>
				<div class='add-button-wrapper'>
					<button class='add-button' onClick={() => this.setState({addPopup: true})}>➕ Add movies</button>
					<button class='add-button' onClick={() => this.setState({addFriends: true})}>👥 Add friends</button>
					<button class='add-button' onClick={() => {
						session.logout();
						logout();
						async (): Promise<void> => {
							await logout();
							session.info.isLoggedIn = false;
						};
						this.setState({showLogout: true});
					}}>👋 Logout</button>
				</div>
				{!globalState.state.friendWatched && 
					<div style={{
							position: 'absolute', left: '50%', top: '50%',
							transform: 'translate(-50%, -50%)'
					}}>
						<div class="loader__filmstrip"></div>
						<p class="loader__text">loading</p>
					</div>
				}
				{globalState.state.friendWatched && !globalState.state.friendWatched.length &&
					globalState.state.friendUnwatched && !globalState.state.friendUnwatched.length &&
					globalState.state.friendLiked && !globalState.state.friendLiked.length &&
					globalState.state.myWatched && !globalState.state.myWatched.length &&
					globalState.state.myUnwatched && !globalState.state.myUnwatched.length &&
					globalState.state.myLiked && !globalState.state.myLiked.length &&
					<div class="empty-container-data">
						<h3>Add Movies or Friends</h3>
					</div>
				}
				{globalState.state.recommendedDict && globalState.state.recommendedDict.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">Recommended Movies</h3>
						<Carousel>{(globalState.state.recommendedDict ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
					</div>
				}
				{globalState.state.friendWatched && globalState.state.friendWatched.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">Friends Collection</h3>
						<Carousel>{(globalState.state.friendWatched ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
					</div>
				}
				{globalState.state.friendUnwatched && globalState.state.friendUnwatched.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">Friends Wishlist</h3>
						<Carousel>{(globalState.state.friendUnwatched ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
					</div>
				}
				{globalState.state.friendLiked && globalState.state.friendLiked.length != 0 && 
					<div>
						<h3 style="margin-left: 2%;">Friends enjoyed</h3>
						<Carousel>{(globalState.state.friendLiked ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
					</div>
				}
				{globalState.state.myWatched && globalState.state.myWatched.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">Your Collection</h3>
						<Carousel>{(globalState.state.myWatched ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
					</div>
				}
				{globalState.state.myUnwatched && globalState.state.myUnwatched.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">Your Wishlist</h3>
						<Carousel>{(globalState.state.myUnwatched ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
					</div>
				}
				{globalState.state.myLiked && globalState.state.myLiked.length != 0 &&
					<div>
						<h3 style="margin-left: 2%;">You enjoyed</h3>
						<Carousel>{(globalState.state.myLiked ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
					</div>
				}
				{this.state.addPopup && <AddPopup
					close={() => this.setState({addPopup: false})}
					save={async (media: MediaData) => {
						if (!Object.values(globalState.state.movies!).some(x => x.title === media.title)) {
							await save(media, false);
						}
					}}
					watch={async (media: MediaData) => {
						let data = Object.values(globalState.state.movies!).find(x => x.title === media.title);

						if (data) {
							// retreive movie metadata if it has been watched by the user or their friends
							let movieWebID = data.solidUrl;
							const movieWebIDParts = movieWebID.split('/');
							const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join('/');

							const webID = session.info.webId!;
							const parts = webID.split('/');
							const pod = parts.slice(0, parts.length - 2).join('/');

							if (movieWebIDPod != pod) { // if user's friend has watched the movie, and not the user itself: save(movie)
								data = await save(media, false, true);
							}
						} else {
							data = await save(media, false, true);
						}
						
						// if (!data.watched) {
						// 	await watch(data);
						// }
					}}
				/>}
				{this.state.addFriends && <AddFriends
					close={() => {
						this.setState({addFriends: false});
					}}
					add={() => {
						addNewFriendData();
						this.setState({addFriends: false});
					}}
				/>}
				{this.state.showLogout && <Logout
					close={() => {
						this.setState({showLogout: false});
					}}
					add={() => {
						this.setState({showLogout: false});
					}}
				/>
				}
			</div>
		);
	}
}
