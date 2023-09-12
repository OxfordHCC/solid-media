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
				
                
				console.log('myLiked:', myLiked);
                console.log('myWatched:', myWatched);
                console.log('friendLiked:', friendLiked);
                console.log('friendWatched:', friendWatched);


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

				
                // globalState.setState({
				// 	recommendedDict: []
				// }); // deletes all recommendations, and adds new recos at each load



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
				function minHash(vector, hashFunctions) {
					const minHashValues = [];
					for (const [a, b] of hashFunctions) {
					  let minHash = Number.POSITIVE_INFINITY;
				  
					  for (const movieIndex in vector) {
						if (vector[movieIndex] === 1) { // Only calculate hashVal on indexes where the movies exist
							const hashVal = (a * parseInt(movieIndex) + b) % vector.length;
						  minHash = Math.min(minHash, hashVal);
						}
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
				  
						// Fetch current movie assets from IMDb API
						const { title, released, icon } = await loadData(tmdbUrl);
				  
						return { tmdbUrl: tmdbUrl, solidUrl: url, title, released, image: icon, dataset: movieDataset };
					  })
					);
				  
					return movies;
				  } catch {
					return [];
				  }
				}
                


                // Create a dictionary to map tmdb index to tmdb-5000 movies
				const movie_id_values =[19995, 285, 206647, 49026, 49529, 559, 38757, 99861, 767, 209112, 1452, 10764, 58, 57201, 49521, 2454, 24428, 1865, 41154, 122917, 1930, 20662, 57158, 2268, 254, 597, 271110, 44833, 135397, 37724, 558, 68721, 12155, 36668, 62211, 8373, 91314, 68728, 102382, 20526, 49013, 44912, 10193, 534, 168259, 72190, 127585, 54138, 81005, 64682, 9543, 68726, 38356, 217, 105864, 62177, 188927, 10681, 5174, 14161, 17979, 76757, 258489, 411, 246655, 155, 14160, 15512, 1726, 44826, 8487, 1735, 297761, 2698, 137113, 9804, 14869, 150540, 278927, 10138, 58595, 102651, 119450, 79698, 64686, 100402, 10192, 158852, 177572, 82690, 5255, 47933, 10191, 296, 118340, 157336, 27205, 315011, 49051, 9799, 4922, 49538, 131634, 27022, 503, 241259, 810, 68735, 87101, 10140, 676, 1858, 1966, 675, 674, 8960, 6479, 118, 2062, 272, 10527, 18360, 2080, 605, 109445, 604, 76338, 76341, 13448, 10195, 13053, 19585, 57165, 62213, 177677, 7978, 5559, 49444, 10196, 956, 117251, 50321, 11619, 266647, 82703, 652, 80321, 36669, 43074, 95, 608, 2310, 140300, 56292, 81188, 7552, 616, 147441, 13475, 557, 82702, 205584, 10048, 13183, 944, 1927, 72559, 7364, 2114, 1771, 36643, 8619, 50620, 65759, 1724, 267935, 281957, 77950, 44896, 270946, 2503, 9502, 102899, 101299, 228161, 74, 8961, 417859, 27576, 86834, 17578, 673, 6972, 82700, 10567, 181533, 38055, 671, 49524, 22, 131631, 591, 172385, 36658, 51497, 58574, 18823, 861, 1911, 49040, 415, 8871, 435, 955, 2133, 1979, 87827, 1250, 324668, 9471, 70981, 10996, 68724, 2789, 97020, 7459, 42888, 37834, 75612, 1895, 1894, 585, 76170, 1893, 49519, 2395, 12100, 290595, 98566, 49047, 9619, 308531, 166424, 1593, 254128, 714, 2024, 163, 787, 262500, 2567, 38745, 40805, 53182, 41513, 13700, 262504, 39254, 77931, 1639, 80274, 1571, 120, 10204, 8489, 10588, 2048, 1495, 10137, 10198, 286217, 1635, 24113, 9679, 98, 180, 672, 36557, 869, 280, 11322, 4982, 36955, 18487, 39451, 27581, 9268, 68718, 10545, 11688, 76163, 2059, 2486, 16523, 116711, 37710, 9946, 1372, 106646, 414, 563, 83542, 41216, 314, 184315, 9016, 18162, 138103, 257088, 10214, 205775, 11692, 22972, 227973, 29193, 1734, 3131, 76758, 9408, 9890, 855, 77953, 18, 37786, 10501, 57800, 150689, 7980, 12, 122, 121, 68737, 1995, 157353, 331, 61791, 8204, 47964, 10733, 9806, 1408, 32657, 607, 863, 44048, 5175, 2655, 22794, 8355, 116745, 4327, 1422, 10674, 7446, 65754, 1572, 10528, 271969, 10865, 258509, 2253, 10661, 257344, 644, 10756, 686, 9383, 179, 76285, 1996, 291805, 10003, 1535, 2067, 46195, 2277, 10357, 4477, 8665, 9387, 921, 49852, 4464, 664, 8358, 9836, 2502, 9772, 161, 52451, 76492, 4523, 59961, 10481, 59108, 1581, 9798, 22897, 298, 7484, 157350, 853, 10159, 9593, 1904, 9615, 51052, 297, 9884, 16858, 62764, 22538, 9341, 12107, 9637, 49049, 9339, 16281, 39691, 8247, 11253, 1949, 8452, 310, 27578, 954, 70160, 45243, 364, 7518, 11544, 9986, 8656, 146216, 9291, 55301, 109418, 11665, 6964, 11324, 12193, 9928, 754, 10202, 4147, 50546, 1701, 13027, 2289, 20504, 9574, 11618, 2300, 12096, 10200, 8834, 228150, 6068, 41515, 9023, 38317, 2157, 14462, 161795, 159824, 49948, 2135, 9822, 9705, 1656, 12159, 9678, 4442, 75, 330770, 9433, 19959, 11973, 11228, 77951, 5491, 10715, 10197, 9562, 9922, 9447, 274854, 8870, 9992, 36970, 10077, 76649, 293644, 453, 8587, 72545, 109451, 9533, 2023, 71880, 584, 309809, 4858, 17711, 328111, 8698, 93456, 602, 330, 953, 9693, 36657, 8909, 9802, 950, 1824, 2976, 11026, 332, 75656, 38365, 594, 15189, 11678, 6538, 10555, 1125, 4551, 612, 9567, 37821, 203801, 2539, 9297, 3172, 6520, 1439, 37958, 2026, 7450, 11375, 9425, 25769, 23685, 11866, 9741, 211672, 23629, 8688, 10153, 153518, 8676, 20829, 4349, 9718, 10808, 197, 25, 35, 11086, 10477, 1997, 6947, 3050, 2675, 809, 920, 4806, 7451, 228165, 3595, 16869, 879, 1573, 9257, 1903, 9697, 395, 23398, 10590, 117263, 200, 44943, 587, 10395, 57212, 152760, 2756, 33909, 49017, 9882, 2270, 978, 44564, 3132, 8814, 8427, 52520, 80585, 10592, 49021, 11535, 10550, 11258, 12610, 59981, 201088, 5137, 3093, 107846, 188207, 4614, 24021, 11371, 20352, 11517, 214756, 26428, 9824, 48988, 9008, 300673, 12113, 38778, 72331, 1844, 846, 9703, 857, 136797, 3981, 425, 6171, 72976, 603, 568, 9021, 82695, 9489, 12133, 9342, 41733, 227306, 5551, 9350, 9208, 4244, 1852, 11820, 76493, 345, 196867, 256591, 59962, 36648, 1880, 9440, 71679, 10483, 11412, 11983, 6795, 550, 11170, 9292, 10783, 100241, 257, 9947, 189, 12618, 253412, 1427, 818, 16577, 329, 12160, 9331, 300168, 9072, 3536, 9087, 12177, 12138, 273248, 9955, 50359, 1271, 693, 14306, 497, 11199, 9982, 210577, 2501, 710, 2275, 37165, 9837, 10708, 136400, 10992, 9654, 2642, 8916, 19899, 2119, 9641, 294254, 38167, 5994, 39514, 9563, 547, 1538, 9334, 11128, 75780, 8914, 13576, 39538, 10628, 14836, 8645, 9509, 10067, 9384, 9279, 1487, 9422, 77174, 4824, 9620, 9302, 10199, 10771, 3512, 137094, 274479, 267860, 8078, 7485, 170687, 6435, 137106, 10040, 6278, 82682, 17610, 22954, 16995, 16558, 9849, 5820, 16866, 201, 11775, 87825, 12201, 11015, 9932, 13389, 8838, 17332, 4958, 786, 9513, 11679, 38321, 14411, 8413, 10052, 9676, 9664, 2100, 10384, 137321, 123553, 11260, 9009, 11374, 2309, 8285, 210860, 2312, 9839, 381902, 13922, 293660, 9713, 190859, 257445, 9007, 889, 1370, 4942, 347969, 24438, 116741, 35791, 72431, 1813, 87428, 8840, 10589, 71676, 1722, 10022, 11358, 13, 6477, 1597, 10530, 1924, 9327, 8488, 10603, 8273, 109424, 35056, 8839, 156022, 7303, 8963, 1402, 9315, 8984, 795, 24, 11353, 393, 9618, 9374, 8584, 2320, 58224, 1729, 175574, 8077, 8818, 8195, 10586, 116149, 80035, 10632, 12117, 1792, 13260, 72197, 3580, 12123, 9566, 9833, 4517, 8202, 16072, 34314, 19724, 145220, 14623, 42297, 2841, 802, 10375, 36586, 11321, 70074, 242, 9621, 1819, 8536, 8046, 1717, 479, 9444, 824, 11456, 261023, 3683, 22803, 285923, 39437, 1950, 640, 97630, 9767, 11631, 32856, 6519, 8741, 49520, 1850, 524, 26389, 11817, 2123, 9907, 9969, 18239, 808, 38050, 8367, 9390, 72105, 2898, 10312, 109443, 2022, 37686, 462, 9919, 187017, 628, 10201, 302699, 9441, 274167, 224141, 388, 2112, 10329, 74465, 13811, 6877, 10320, 50646, 8920, 13673, 60308, 6950, 225574, 13836, 752, 6038, 9975, 11451, 12103, 60304, 2251, 46529, 231, 300671, 228326, 9754, 66, 4421, 2649, 588, 10393, 71552, 9631, 216282, 306, 928, 205587, 6623, 1577, 9801, 2116, 9624, 14199, 1907, 4599, 22832, 10390, 9879, 38579, 44603, 11892, 9691, 1248, 12220, 72710, 10782, 9573, 4959, 10061, 10386, 421, 316152, 11615, 13498, 241554, 2252, 11968, 10047, 38319, 69668, 9770, 11212, 10533, 38363, 9923, 11863, 18501, 109491, 9275, 329833, 12634, 10416, 47327, 15268, 10796, 9548, 18947, 1900, 89, 96724, 198184, 9481, 4547, 53953, 6415, 181283, 9896, 167, 11232, 1636, 2148, 5176, 260346, 1389, 9894, 7504, 8592, 913, 11091, 1368, 593, 5393, 9095, 8874, 11467, 320, 199, 20533, 10684, 1624, 325789, 113464, 888, 82675, 4256, 1493, 88751, 11130, 9944, 10731, 7350, 9869, 4379, 146233, 2034, 926, 4248, 64328, 36647, 7214, 1537, 9360, 6282, 508, 9487, 768, 2636, 10478, 27983, 9981, 7453, 15045, 7737, 232672, 17379, 8987, 11359, 82525, 9759, 9486, 9906, 841, 4688, 4148, 2207, 9381, 9625, 9304, 20856, 5955, 9899, 9826, 21355, 10858, 11439, 9457, 12412, 1494, 13184, 2185, 6639, 38153, 58233, 116977, 68734, 5503, 27573, 819, 1369, 9623, 10895, 10935, 834, 228066, 711, 10468, 10027, 11812, 37233, 37950, 27582, 64688, 509, 7443, 5966, 11066, 136795, 8095, 87826, 11560, 25189, 2637, 18480, 709, 49730, 2749, 9607, 1830, 79, 54054, 228967, 46528, 27936, 65, 280391, 9476, 10610, 745, 49527, 73937, 1885, 168672, 18240, 10398, 165, 240832, 216015, 12279, 1645, 11007, 193756, 11287, 259693, 37799, 10184, 4257, 4234, 196, 257091, 6114, 24803, 109410, 1213, 100042, 9036, 257211, 323675, 9361, 1677, 187, 7461, 16538, 9889, 820, 11565, 6073, 16996, 193610, 19912, 296098, 8007, 32823, 4380, 11551, 10336, 11362, 50348, 48138, 1124, 227159, 68179, 1579, 708, 34851, 9930, 1586, 2044, 9913, 71864, 10761, 209451, 11975, 4970, 11831, 9096, 440, 11011, 10641, 11172, 39513, 82687, 41446, 8224, 10537, 225886, 10385, 55779, 10154, 10647, 11431, 8457, 188161, 8850, 64685, 38357, 10060, 11398, 1833, 10391, 8970, 9306, 11370, 12184, 1921, 1683, 203, 11858, 62835, 18937, 13536, 15556, 10718, 11062, 10802, 1887, 6071, 10461, 80278, 12704, 10315, 16643, 2687, 194, 11025, 8849, 78698, 30943, 9544, 24418, 7288, 14655, 24575, 10366, 19898, 4965, 15074, 56715, 1272, 72358, 20542, 266396, 9978, 8271, 10428, 5353, 11934, 14392, 19495, 110415, 77459, 26486, 9495, 256040, 24420, 1257, 62214, 16320, 8842, 9531, 64807, 12289, 11529, 20943, 9099, 9488, 193, 44865, 55787, 257932, 10400, 1957, 10833, 256961, 5852, 12312, 622, 11306, 12508, 25793, 10534, 1091, 87421, 10871, 13503, 13600, 68722, 14324, 14325, 299687, 312221, 23168, 76494, 4944, 10488, 96721, 334, 23742, 259694, 62837, 8966, 8470, 11001, 138832, 16911, 2163, 36670, 23048, 227735, 2155, 8409, 222936, 31908, 10219, 48171, 782, 75531, 11802, 9776, 18785, 365222, 817, 268, 45054, 943, 22881, 10054, 51540, 44264, 350, 152, 109431, 1598, 8065, 271718, 11638, 409, 2118, 11459, 10806, 9348, 377, 8843, 9313, 39486, 1273, 13920, 50544, 325133, 140823, 1883, 89492, 22949, 12437, 2959, 9957, 11648, 9366, 1576, 609, 5516, 13051, 49530, 34806, 49022, 11469, 23479, 11667, 423, 2447, 10066, 2288, 88794, 13515, 11979, 169, 8090, 11622, 3604, 9541, 94348, 8197, 336004, 35019, 10410, 8836, 14442, 321741, 59965, 14175, 11004, 11918, 98357, 10012, 49526, 268920, 9093, 119283, 11823, 35169, 118957, 849, 4515, 18886, 6575, 6440, 13496, 18320, 22787, 8967, 37498, 144336, 9616, 13056, 14113, 285783, 49478, 9726, 20763, 9702, 9311, 9280, 26843, 11876, 22267, 45958, 1969, 310706, 198663, 239573, 10436, 1381, 2162, 127493, 12429, 228205, 2900, 21311, 77875, 192136, 18254, 881, 10877, 9600, 202575, 71469, 85446, 326, 10685, 7220, 9763, 72387, 12596, 1892, 13460, 8055, 50647, 10719, 9294, 11888, 9647, 9353, 55721, 109414, 10307, 11978, 22907, 87567, 38322, 45612, 7305, 3594, 157841, 11519, 12920, 59, 9335, 12106, 11141, 8649, 31867, 10253, 3587, 124459, 24662, 32274, 182, 5494, 28, 38073, 2054, 302156, 606, 87502, 698, 120467, 11313, 6488, 10559, 296099, 8012, 1574, 9032, 2770, 862, 1637, 72570, 27569, 10637, 1669, 132363, 9472, 2907, 9273, 9880, 2925, 807, 17654, 11836, 322, 70, 9535, 11036, 6557, 18126, 16340, 10333, 4476, 22947, 2755, 82654, 59967, 16300, 9598, 82696, 9870, 8292, 8780, 9715, 10521, 10762, 10096, 59436, 227783, 4133, 10207, 172, 21972, 36593, 707, 533, 6023, 6439, 4347, 37056, 4105, 76489, 3933, 9918, 273481, 307081, 16871, 293863, 13156, 41233, 9266, 1262, 4513, 22970, 7278, 9013, 865, 10776, 50456, 9823, 59861, 133805, 12763, 9766, 14034, 12244, 109421, 11137, 51162, 10152, 9452, 239566, 53113, 9271, 4474, 184346, 48340, 14846, 72207, 16232, 43539, 9920, 8978, 11702, 18550, 8869, 43347, 3489, 9701, 2122, 37707, 10658, 13150, 9042, 17813, 11208, 58151, 11400, 10350, 28902, 14164, 76640, 11058, 14844, 57089, 1947, 8054, 46829, 146238, 9989, 9665, 311, 102362, 11162, 6016, 17186, 13967, 2008, 9053, 4512, 76349, 31203, 265208, 45610, 50135, 1874, 271331, 215211, 367961, 10955, 223702, 254470, 69, 4967, 9449, 11499, 4912, 12771, 323676, 12506, 24071, 11249, 9667, 812, 277216, 87, 14444, 2043, 315664, 1428, 562, 15373, 318846, 26320, 14292, 924, 2018, 192577, 9428, 2832, 137093, 699, 9778, 8831, 9398, 112949, 10439, 3638, 23483, 62206, 10577, 218778, 4348, 78, 11780, 192102, 2001, 10383, 11516, 10025, 15198, 23172, 17834, 10016, 10317, 58431, 9746, 13092, 59859, 13495, 254473, 700, 4964, 10024, 13490, 15927, 1259, 5125, 174, 9583, 9437, 525, 10188, 63574, 245, 9825, 186, 9549, 61891, 34584, 2666, 12783, 13155, 42807, 28355, 8080, 5126, 56288, 303858, 1613, 31582, 16617, 8944, 41488, 37028, 14560, 10330, 6957, 1934, 169917, 951, 10189, 9454, 2055, 1551, 5902, 11460, 9358, 134, 22894, 134374, 1901, 15028, 11509, 7445, 17047, 62838, 2057, 70436, 16784, 8011, 31640, 9092, 2779, 316002, 36355, 238615, 1985, 615, 788, 380, 13223, 10523, 8681, 239571, 619, 424, 50014, 162903, 11024, 208763, 6466, 254024, 12589, 7191, 1497, 117, 6977, 168530, 634, 392, 10327, 88042, 41630, 11969, 2085, 794, 9286, 77877, 1265, 866, 175555, 75174, 11096, 8699, 769, 10923, 11283, 111, 11676, 746, 77866, 9416, 7345, 14317, 20694, 12277, 9779, 2140, 12620, 14177, 198185, 227156, 10735, 11351, 10030, 10623, 590, 9655, 1268, 11237, 190955, 5123, 4518, 11932, 11165, 6116, 57431, 21724, 278, 9290, 11543, 284536, 152737, 13374, 8976, 319888, 9469, 1909, 22971, 34813, 46261, 10431, 8051, 9352, 10167, 18147, 17170, 18975, 15487, 22825, 11152, 1831, 43931, 10591, 10861, 12770, 276907, 10074, 65055, 10397, 200505, 11954, 60309, 9787, 293646, 6978, 133698, 59440, 1770, 10655, 8988, 15992, 17707, 77883, 40001, 64639, 9903, 21338, 20766, 24264, 19803, 20309, 9912, 9067, 27360, 8338, 168705, 72113, 9729, 94352, 22256, 12404, 152742, 11699, 49953, 48034, 39845, 25353, 36696, 109091, 38543, 33157, 290864, 242166, 859, 83770, 168, 1246, 4233, 174751, 184098, 2069, 1788, 11635, 177, 3600, 2621, 10358, 10480, 10313, 18828, 3558, 13476, 10208, 24961, 20697, 20761, 70868, 43593, 6478, 40688, 26672, 45881, 41283, 4935, 19908, 10663, 1891, 9737, 37137, 9532, 10316, 2787, 12658, 152601, 10866, 227707, 21349, 19150, 70435, 580, 9819, 13579, 20024, 2453, 6973, 11156, 354110, 22215, 11632, 30596, 3021, 957, 256917, 251, 544, 11395, 14635, 13680, 688, 11090, 783, 228194, 1642, 10950, 235260, 277, 8999, 11323, 10445, 11453, 146239, 205588, 10878, 82650, 10279, 2294, 2176, 270487, 19366, 204082, 24100, 1599, 5550, 30379, 42586, 17709, 287948, 7548, 9075, 11661, 109513, 12085, 204922, 38985, 44113, 21494, 164457, 4566, 17795, 1073, 153158, 81836, 10724, 9473, 2196, 1499, 20857, 82693, 1646, 44944, 4108, 8456, 7341, 19255, 10187, 31005, 49517, 44857, 50780, 16363, 1946, 85, 772, 840, 9682, 96, 10678, 274, 8872, 16290, 579, 14405, 138843, 11637, 226486, 1584, 9312, 12153, 65057, 8326, 35690, 76203, 13497, 35688, 162, 296096, 103370, 1051, 376659, 10073, 16690, 273895, 14873, 8968, 9963, 15655, 21208, 272878, 9760, 314365, 13279, 1975, 33644, 1649, 9895, 9570, 27579, 16052, 40264, 1164, 239678, 14359, 3989, 76617, 1710, 4258, 20391, 10139, 335778, 9645, 55465, 617, 19904, 48289, 243, 6933, 17182, 8848, 38, 38303, 1266, 107985, 14043, 19901, 34016, 59860, 10069, 9588, 12819, 9954, 10115, 25132, 577, 328387, 12690, 9945, 539, 13596, 226857, 13159, 47941, 526, 22796, 2355, 5915, 9842, 61012, 755, 13682, 9089, 9470, 18357, 7979, 470, 15644, 9582, 10642, 22074, 2428, 290751, 13805, 4597, 9414, 63492, 81796, 10710, 15092, 11382, 15005, 8198, 6963, 15070, 12797, 17134, 41402, 18885, 4953, 10773, 146198, 2639, 10563, 295964, 5971, 9716, 11835, 26171, 31117, 9074, 14396, 15673, 42618, 171274, 24432, 109417, 13948, 106747, 10929, 14220, 46435, 256962, 48231, 3509, 82684, 12142, 23367, 10740, 241239, 14582, 14914, 3902, 77948, 21755, 4960, 128, 14652, 40932, 16608, 334531, 32316, 7299, 13405, 19457, 112937, 314385, 8953, 29078, 46503, 10448, 13688, 10353, 43935, 11458, 44638, 241257, 14538, 13250, 133931, 280871, 239897, 184341, 334074, 199373, 14202, 6968, 581, 52449, 12150, 11247, 4232, 9378, 694, 105, 11377, 26367, 385383, 41210, 12090, 62630, 16110, 29427, 129, 244114, 2669, 203833, 13523, 25195, 17277, 50725, 82631, 73191, 22479, 340611, 10065, 2757, 11683, 244339, 1878, 23082, 195589, 854, 2280, 496, 8835, 157, 8643, 10402, 218043, 9043, 21301, 10147, 816, 302688, 60307, 106, 279, 8617, 10625, 10934, 5279, 10013, 194662, 160588, 9829, 10028, 10535, 790, 43959, 10364, 16991, 9610, 1578, 25643, 11904, 28665, 44115, 10569, 10560, 333348, 20483, 11457, 321697, 19840, 22327, 38665, 2575, 11644, 146227, 68924, 253235, 22102, 18701, 10068, 848, 36811, 522, 130150, 12246, 13809, 27380, 10549, 33870, 245703, 10739, 127560, 37903, 396152, 10017, 11468, 193613, 17436, 43434, 31166, 69848, 8408, 332411, 9389, 9626, 75638, 8363, 15670, 290555, 8328, 10982, 205, 1620, 175541, 241254, 31932, 1933, 679, 11113, 3597, 193893, 9675, 9988, 948, 21765, 146304, 7516, 41439, 2752, 9429, 38117, 9792, 13778, 228203, 41382, 13960, 114150, 26602, 10223, 16028, 15639, 16112, 26390, 27759, 109428, 23049, 9310, 11411, 16988, 7304, 24747, 58048, 1491, 2989, 10629, 255343, 4723, 10800, 25763, 79694, 4032, 18615, 10673, 4584, 2977, 10760, 11093, 207, 8467, 639, 24226, 9285, 14709, 74643, 13788, 83666, 10781, 318850, 13908, 1417, 39180, 16161, 49950, 10956, 9594, 4638, 13972, 5038, 13491, 10571, 10994, 19994, 25166, 30890, 23169, 17403, 12120, 9800, 1090, 18475, 40160, 18074, 9689, 9781, 8009, 3877, 8854, 152599, 18840, 68727, 12657, 8265, 12410, 34647, 73935, 28178, 185567, 264656, 35696, 16351, 38717, 18777, 2110, 9035, 90, 771, 12154, 9576, 744, 146, 14, 45269, 9493, 22556, 873, 33196, 205596, 10765, 16769, 33217, 132232, 11153, 208134, 1165, 4011, 17202, 9587, 65086, 10053, 11870, 11778, 586, 18736, 134411, 287903, 9276, 15765, 2142, 11397, 77016, 11478, 266856, 13411, 10564, 947, 24150, 228970, 18405, 6961, 11442, 2493, 14047, 64690, 11132, 17127, 1562, 232679, 17880, 14736, 9434, 23706, 11531, 9100, 116, 38843, 1245, 4995, 10413, 14012, 9793, 12212, 13768, 8975, 342521, 45272, 9424, 97367, 254904, 18681, 12162, 11495, 64689, 157849, 13166, 15511, 37003, 12211, 13816, 51828, 22798, 7501, 10743, 37718, 15237, 9686, 17644, 97430, 12257, 13539, 68, 14024, 115, 7874, 4911, 1988, 16222, 9557, 9026, 57943, 18276, 8321, 72359, 10186, 25704, 133694, 19265, 36047, 8053, 2290, 5236, 6552, 1018, 10075, 38031, 42188, 112430, 6687, 13853, 31306, 8461, 331592, 47692, 19, 10045, 400, 253450, 9104, 11190, 16353, 23759, 24206, 10185, 75033, 74536, 31668, 13501, 15208, 172391, 262543, 9288, 370980, 20083, 40880, 137, 264999, 454, 53457, 288980, 33, 1951, 12405, 10998, 114, 9396, 319910, 2604, 864, 14435, 1931, 691, 9877, 62008, 12227, 13824, 71688, 15173, 8291, 13950, 12158, 11586, 10008, 2830, 12403, 34563, 14557, 10368, 10280, 12637, 34152, 14434, 11470, 10741, 24940, 82679, 2013, 1440, 18041, 28029, 1123, 14033, 87729, 16899, 41317, 245700, 37842, 9045, 44092, 16005, 44754, 23988, 43949, 142, 9603, 10712, 243938, 10876, 86838, 25208, 613, 1913, 97370, 801, 70829, 54518, 44214, 240, 9816, 10131, 339984, 8859, 11967, 239563, 222899, 4951, 10985, 9644, 332567, 1954, 15489, 15250, 22345, 9448, 38223, 11186, 136835, 5876, 264660, 492, 25462, 238603, 10691, 1251, 5172, 58680, 264644, 14577, 11592, 16406, 19052, 3682, 9683, 2084, 107811, 2266, 13074, 144340, 48217, 28211, 47502, 9950, 84892, 24227, 9672, 44853, 157544, 59678, 79777, 158011, 407887, 17043, 8952, 62204, 13435, 17187, 319, 59457, 9504, 37414, 6217, 26688, 43867, 6615, 14574, 16, 39780, 21612, 36691, 23631, 45324, 12144, 11658, 56601, 9552, 578, 2105, 126319, 10136, 67660, 10611, 154, 3049, 860, 9281, 75674, 9762, 3179, 184, 13335, 76726, 10269, 36819, 17130, 57214, 11202, 9357, 13812, 9030, 19084, 8386, 10437, 1360, 101267, 222935, 10220, 284296, 31915, 11601, 205220, 11354, 16241, 14191, 286565, 26710, 129670, 9059, 34549, 57157, 1948, 28353, 46889, 38093, 14976, 11027, 3635, 387, 6020, 122906, 9550, 60599, 227719, 14299, 19419, 12088, 14799, 9466, 7510, 31246, 61752, 10944, 10362, 14778, 1255, 45226, 10212, 8669, 179144, 16857, 86825, 844, 8060, 15907, 38448, 327, 9260, 61337, 13079, 89325, 4170, 41508, 12479, 44555, 10133, 21345, 173931, 61984, 50601, 26466, 345003, 236751, 107, 357837, 8913, 13889, 18530, 358451, 927, 11, 291870, 907, 206563, 11887, 45317, 12094, 10377, 249164, 256092, 9942, 10748, 1817, 10229, 687, 796, 22804, 10156, 12837, 17708, 13937, 28932, 31909, 167073, 3175, 14369, 16888, 121826, 10646, 12149, 304357, 11184, 766, 20009, 1587, 30973, 11109, 9027, 63020, 86829, 11065, 13888, 42345, 13994, 1590, 62728, 11917, 45138, 80271, 4657, 14395, 24137, 190847, 11056, 62, 601, 13067, 25379, 88641, 58051, 14877, 96399, 304410, 489, 373314, 214, 10890, 1588, 316727, 10314, 663, 11804, 16781, 11873, 9289, 10414, 1970, 9614, 8922, 1648, 17917, 74534, 19405, 9355, 10999, 321258, 44040, 10426, 280092, 13938, 10163, 12182, 1832, 9034, 15301, 10135, 26352, 20616, 9794, 15037, 227, 294272, 11336, 283445, 88036, 10984, 22824, 9526, 39349, 15983, 14544, 11545, 42684, 268238, 8359, 15648, 41823, 11891, 9362, 9902, 14729, 9455, 103731, 10090, 164558, 19905, 17710, 75900, 9515, 27322, 328425, 14120, 10050, 1542, 10490, 87093, 10029, 9893, 11507, 37931, 3472, 87818, 13160, 88005, 52067, 73, 134597, 24034, 14283, 404, 13201, 209403, 7942, 73247, 253331, 34043, 9952, 256924, 82532, 41110, 134371, 2088, 10388, 1640, 25520, 27342, 13689, 67911, 24664, 329440, 47890, 252512, 55720, 9613, 29076, 29339, 68812, 32740, 14195, 73567, 41479, 15394, 10071, 1989, 91076, 12779, 13191, 11770, 12703, 64559, 222649, 115872, 101173, 25350, 10034, 20178, 5072, 18191, 31007, 11546, 41894, 184374, 268171, 78149, 24663, 39037, 22805, 39055, 245846, 25186, 15017, 12245, 49787, 16358, 7006, 66767, 17622, 283671, 18516, 217708, 42057, 17577, 14608, 34417, 15067, 78383, 43090, 16614, 9700, 10471, 250066, 667, 208869, 86837, 10306, 106845, 11576, 219, 11827, 22820, 31174, 244316, 37737, 62215, 66125, 132316, 348, 30497, 27586, 14811, 660, 68684, 40794, 9400, 16162, 10585, 2359, 238636, 10472, 11282, 6521, 14181, 1621, 9656, 16428, 10705, 8272, 24621, 1619, 9685, 14425, 14624, 10179, 15568, 14057, 12621, 1808, 293670, 67675, 27329, 29514, 250349, 12454, 39806, 15699, 8883, 17926, 291081, 41248, 25968, 9671, 52010, 11588, 43418, 71157, 13483, 333355, 327833, 1547, 25196, 16323, 175528, 8069, 71805, 9451, 16727, 272693, 10696, 150202, 19644, 29963, 26022, 152747, 62676, 20360, 1116, 185008, 11620, 14353, 11818, 680, 11176, 242582, 11217, 15121, 2619, 773, 235, 170, 14114, 10734, 37964, 28121, 40807, 10885, 225565, 16471, 385736, 11971, 668, 11596, 14429, 13751, 9490, 14536, 1359, 9962, 15049, 22821, 42819, 209263, 37735, 59930, 10873, 51588, 23570, 19489, 14629, 8293, 291270, 44009, 1958, 13154, 26618, 43923, 46138, 45791, 26306, 110683, 26963, 198277, 7870, 13072, 153397, 30141, 17044, 10288, 12183, 44147, 12192, 36597, 13197, 10913, 251321, 149, 10425, 49081, 256687, 220488, 1544, 374461, 302, 182873, 21512, 389425, 403, 29461, 33542, 283708, 9388, 1691, 24684, 2610, 11308, 11022, 34341, 15365, 36046, 12569, 24356, 55903, 2577, 103903, 73873, 312113, 14165, 2011, 45650, 7735, 301365, 25941, 29064, 7326, 326284, 681, 238, 535, 19913, 713, 77930, 10727, 253, 17908, 8390, 57119, 3291, 398, 8068, 10803, 682, 10117, 9392, 24977, 79316, 2074, 1696, 308639, 22314, 2662, 77156, 12573, 44718, 11342, 241771, 34653, 11051, 14578, 57825, 9555, 15581, 13006, 16651, 4251, 12400, 39053, 104896, 14112, 12271, 71859, 226354, 48620, 33676, 37080, 25388, 11687, 39210, 30128, 31535, 44835, 192134, 1956, 24985, 306745, 47088, 110402, 27004, 15013, 8374, 277519, 78381, 164372, 294512, 8879, 13001, 9571, 13649, 325373, 334527, 2211, 13919, 14576, 82505, 46738, 38970, 41009, 7347, 250546, 38415, 650, 16620, 25113, 11033, 34723, 9430, 8998, 10514, 10496, 1591, 76025, 4836, 14631, 87499, 18923, 26665, 28089, 62255, 5708, 218, 338, 21641, 10925, 2293, 621, 792, 1777, 642, 433, 16619, 1725, 11977, 20322, 16158, 629, 10160, 11452, 12163, 32275, 13785, 1103, 36739, 14144, 10622, 13370, 11191, 10215, 25066, 1523, 11361, 92591, 57612, 12509, 15256, 83686, 80304, 28053, 67913, 13991, 1443, 8545, 19556, 231576, 16172, 13403, 15797, 347764, 13537, 20794, 31064, 576, 13990, 11583, 18602, 27549, 59728, 10930, 32395, 58882, 7547, 35944, 42222, 13827, 44260, 9282, 38940, 35689, 97614, 37206, 58626, 183894, 837, 1555, 244783, 16564, 168027, 3482, 135595, 8982, 89861, 455, 57022, 14351, 147767, 10664, 55567, 9277, 9443, 16186, 7863, 138697, 11901, 1548, 11889, 33155, 5528, 321, 4997, 925, 27451, 73532, 979, 193722, 7913, 253253, 51995, 13173, 22908, 70670, 84204, 25248, 230266, 16633, 63006, 91586, 215, 333371, 9012, 345911, 72571, 242512, 10072, 211954, 82990, 29912, 11843, 11284, 504, 173, 227348, 1955, 152532, 243940, 77, 157547, 2295, 71, 147773, 16096, 24266, 16508, 2895, 15660, 59968, 323677, 19848, 256274, 235271, 45153, 284293, 24973, 21610, 10283, 8346, 122081, 10987, 1391, 747, 14745, 26748, 11357, 24913, 13776, 14854, 50357, 13090, 192141, 16441, 29996, 351819, 14834, 22649, 378200, 20455, 13193, 11042, 10786, 12484, 17339, 11959, 9900, 14662, 335, 15745, 17431, 21014, 78394, 10217, 46332, 13996, 3028, 1024, 343795, 45658, 16148, 4553, 36351, 245916, 27585, 1415, 313922, 14474, 199933, 13685, 8744, 38428, 8847, 39269, 46838, 51384, 56930, 41730, 18442, 298312, 11600, 71547, 57876, 77495, 13849, 14849, 12486, 19615, 244403, 292481, 340816, 78814, 297596, 299552, 11935, 113406, 447027, 290825, 361159, 12555, 31175, 12498, 77949, 1690, 8435, 64720, 49365, 11404, 300706, 16337, 11577, 77987, 40185, 68202, 8981, 10914, 50848, 166624, 10822, 10844, 9336, 5689, 712, 13342, 10339, 1429, 9303, 641, 27686, 65749, 6106, 252680, 141, 66607, 17139, 12079, 39800, 4550, 62116, 9991, 13807, 68818, 12093, 36419, 281730, 510, 362105, 10970, 375290, 17663, 270938, 116613, 11826, 29920, 1088, 26379, 34069, 10947, 47452, 3040, 11386, 10246, 29426, 10331, 153, 703, 27191, 1365, 287424, 451, 165864, 987, 241251, 40494, 39781, 8337, 5925, 8357, 146203, 85350, 512, 13408, 47816, 10744, 11536, 9782, 18713, 6537, 184345, 1809, 2370, 9809, 5, 11013, 19153, 10132, 16448, 15122, 8141, 1546, 48572, 14517, 89708, 27551, 64678, 309503, 14293, 15059, 103328, 157847, 25719, 48309, 27723, 20468, 242575, 44945, 29122, 125123, 111190, 133575, 54580, 52015, 34941, 227975, 60422, 81390, 10981, 225235, 14902, 121676, 22301, 20065, 257087, 46420, 114635, 158150, 251979, 874, 10774, 770, 266102, 29715, 25209, 37495, 29262, 34769, 35032, 5178, 8618, 3116, 9427, 813, 352978, 10634, 9516, 16288, 23330, 18900, 27029, 26268, 573, 310131, 40505, 11363, 3033, 25376, 22007, 765, 10615, 205321, 89540, 46146, 38007, 14256, 540, 370464, 20055, 224569, 395766, 39303, 142061, 370662, 252360, 256740, 299145, 241766, 12535, 1667, 50839, 86549, 13973, 244786, 598, 11129, 75861, 13551, 103663, 850, 12586, 11564, 301748, 108346, 8841, 805, 11697, 22051, 436, 55347, 10070, 8469, 658, 125490, 1585, 627, 23618, 41436, 10162, 1430, 259943, 10014, 11257, 158015, 82507, 20337, 261, 1685, 20737, 10991, 10225, 826, 34086, 5854, 284, 10285, 5780, 292, 223485, 29463, 18065, 22013, 821, 53862, 3089, 30139, 132344, 15582, 15158, 44634, 30309, 7509, 10557, 23531, 28005, 40247, 252, 24126, 13982, 16642, 17734, 18892, 549, 121986, 868, 10683, 17995, 246403, 670, 35691, 49010, 317930, 11229, 22488, 24469, 82533, 50942, 84174, 34099, 79940, 342, 281230, 38033, 100975, 38541, 39563, 234212, 27404, 170480, 71866, 192210, 180296, 157058, 70006, 26039, 79587, 176077, 260947, 342502, 191229, 43213, 44594, 666, 248, 325173, 55831, 351043, 43942, 10226, 66942, 356483, 10476, 239, 10281, 630, 3034, 13025, 21461, 55306, 17264, 346081, 16016, 15875, 5900, 43306, 11072, 9730, 209274, 26371, 14137, 291, 14139, 33106, 8875, 872, 72914, 139038, 126509, 9591, 10676, 1687, 24748, 181330, 468, 401, 76, 50538, 25636, 19316, 21074, 84329, 20, 157386, 13007, 13518, 116584, 46849, 40428, 17334, 1698, 20764, 45132, 76706, 254472, 332285, 49471, 13569, 7512, 356216, 11798, 146631, 43546, 61038, 78373, 17820, 74457, 283384, 19933, 756, 433715, 9728, 9731, 9916, 309425, 14156, 43610, 360339, 31163, 297621, 16205, 887, 9517, 6007, 364083, 8329, 69640, 371085, 347548, 322443, 657, 28165, 11561, 270303, 11624, 595, 8810, 12207, 226, 92182, 582, 72213, 990, 55604, 9662, 20862, 2771, 80, 55, 11023, 33667, 39013, 11194, 43839, 1382, 44639, 301351, 4816, 7873, 331190, 15186, 17994, 1378, 8885, 48382, 12901, 250124, 14284, 57120, 12228, 22617, 55561, 42889, 10656, 24363, 13121, 24746, 325140, 12109, 27023, 22913, 273899, 20653, 67373, 171759, 206296, 35219, 28260, 7515, 13075, 335866, 13510, 215881, 18238, 22600, 12612, 50698, 115210, 34335, 459488, 11302, 119458, 20406, 3766, 18616, 18808, 95755, 198062, 188652, 174311, 12602, 153795, 17768, 13516, 98549, 312793, 309919, 299553, 21309, 32235, 329540, 26388, 49020, 159037, 12838, 157293, 14048, 356987, 295886, 38358, 33511, 702, 935, 542, 84175, 1705, 62677, 50875, 260778, 58492, 44562, 37232, 4929, 36334, 9783, 386826, 205126, 98557, 104, 10894, 246449, 32579, 1688, 1999, 43947, 24066, 9709, 191714, 25312, 34106, 11426, 13909, 206284, 27455, 66468, 7973, 283686, 15976, 592, 74084, 1651, 25428, 298584, 10758, 11690, 3083, 9344, 10707, 15647, 308529, 4174, 20156, 9464, 49018, 13820, 18079, 127918, 17113, 129139, 507, 4012, 14054, 323271, 10972, 13066, 66025, 11908, 3082, 39541, 1961, 51820, 291362, 30082, 72913, 23963, 29406, 361505, 104755, 253306, 29595, 46729, 294600, 137347, 290370, 426469, 356841, 301325, 347755, 408, 44413, 39209, 48463, 394047, 312791, 266034, 280381, 2661, 100, 218500, 309, 27845, 25784, 52790, 100275, 295914, 42033, 19187, 46415, 38570, 27588, 223, 9725, 28580, 23730, 84197, 46256, 19997, 43266, 278316, 1412, 176, 39939, 357834, 215924, 480, 14295, 11219, 20770, 176124, 500, 60400, 429, 310569, 98369, 114065, 89750, 49951, 86331, 355629, 16433, 15544, 43884, 107315, 137955, 13064, 59917, 157422, 310933, 7553, 12877, 39895, 102840, 55616, 29697, 50037, 94329, 53502, 202604, 289, 27374, 26815, 811, 1366, 244776, 5769, 277685, 103, 11298, 646, 93856, 9003, 347126, 10092, 10643, 46705, 546, 76487, 5722, 39833, 1781, 18712, 7944, 171424, 361475, 113947, 18570, 83860, 41469, 244772, 50837, 248774, 10183, 159014, 32456, 49963, 13508, 22597, 9707, 37532, 26791, 56666, 8675, 13132, 47686, 46989, 192132, 24424, 13198, 244267, 21413, 123678, 13362, 39183, 62402, 206412, 201132, 251471, 112456, 20296, 25983, 66195, 16155, 46727, 55180, 29015, 91122, 18206, 320146, 13856, 219716, 43630, 56491, 99826, 186935, 357441, 19344, 242083, 18869, 26673, 41830, 37694, 63287, 335874, 34592, 92635, 258755, 96534, 21283, 272724, 84178, 101179, 52462, 269057, 287524, 206213, 248402, 29146, 207769, 271185, 29731, 292539, 654, 91070, 2009, 323270, 2652, 9813, 60421, 157354, 127867, 3170, 14014, 15708, 146882, 215918, 84200, 84184, 45767, 14823, 367551, 343409, 60243, 57294, 11446, 47889, 25461, 905, 279759, 78705, 25212, 26899, 146269, 292483, 14451, 10105, 211557, 838, 40862, 13158, 84332, 74510, 74725, 58428, 8416, 36584, 13429, 9022, 22530, 288, 14275, 2287, 18734, 206197, 26837, 7859, 302579, 51955, 376004, 158752, 40658, 296943, 118612, 138976, 323967, 3080, 2667, 9459, 11598, 26916, 181940, 125263, 263503, 324322, 331493, 375950, 278348, 704, 70875, 75986, 385636, 14438, 211086, 23069, 83, 89857, 30315, 14358, 2056, 41144, 35199, 14271, 16653, 14757, 84401, 23655, 36825, 33430, 12281, 125052, 96238, 30246, 7301, 172533, 180383, 346, 84318, 45145, 13983, 45649, 19844, 21801, 43933, 73511, 43653, 139715, 45380, 30867, 81220, 253626, 294550, 90369, 117942, 380097, 322194, 98568, 119657, 380733, 285743, 362765, 379532, 253261, 297100, 15239, 94072, 4107, 325579, 15624, 17287, 198370, 3062, 328307, 15389, 464, 308467, 8193, 188166, 23827, 1282, 762, 64499, 281189, 1435, 47546, 189711, 19204, 9029, 18045, 11240, 43743, 157909, 10238, 3059, 15800, 65203, 764, 103620, 319069, 14278, 25678, 79161, 371690, 389, 52032, 3078, 38810, 21525, 55123, 11980, 11956, 1550, 162396, 26518, 8942, 68412, 2786, 87943, 73981, 91721, 118452, 47534, 40914, 365052, 13282, 250184, 426067, 324352, 318040, 27420, 80468, 84188, 2255, 50035, 300327, 14290, 29371, 44490, 32222, 378237, 431, 76996, 51942, 1424, 60420, 325123, 142132, 20520, 109729, 78307, 12247, 29917, 70687, 60463, 46252, 24869, 77934, 34697, 320435, 150211, 306667, 274758, 3060, 40963, 173224, 18533, 376010, 139948, 77332, 70478, 35073, 9659, 10218, 391, 43595, 194588, 54897, 83588, 53256, 40920, 287815, 54702, 176074, 69270, 5759, 402515, 126141, 48035, 14758, 13363, 37985, 25786, 36549, 361398, 289180, 288927, 21334, 79120, 27995, 253290, 344466, 55420, 5822, 408429, 39141, 5723, 28666, 30979, 50497, 354624, 13187, 335244, 178862, 331745, 1779, 282128, 86812, 38786, 84355, 18632, 40652, 339408, 266857, 18925, 299245, 985, 34101, 9821, 65448, 18841, 272726, 175291, 80215, 13538, 51130, 270554, 72086, 268917, 64973, 473, 90414, 111794, 360188, 9372, 85860, 244534, 33468, 294086, 139998, 74777, 16388, 159770, 42109, 47607, 193603, 84659, 322745, 20981, 174362, 242095, 250902, 158895, 222250, 18292, 125537, 326576, 228550, 13963, 290391, 44770, 69382, 40769, 220490, 42151, 2292, 42497, 33693, 14585, 185465, 38780, 14022, 366967, 255266, 17345, 226458, 24055, 287625, 44990, 86304, 692, 39851, 13898, 157185, 36095, 182291, 286939, 124606, 14337, 67238, 9367, 72766, 231617, 126186, 25975]
                const id_matching_dict = {};
                // const numberAtPosition = movie_id_values[2912];
                // console.log('Number at position 2912:', numberAtPosition);

                for (let i = 0; i < movie_id_values.length; i++) {
                  id_matching_dict[i] = movie_id_values[i];
                }

                // Function to compute the movie vector for a single pod URL
                async function computeMovieVector(podUrl, idMatchingDict) {
                  const movieVectorLength = Object.keys(idMatchingDict).length;
                  const movieVector = Array(movieVectorLength).fill(0);

                  // Fetch movies from the given pod URL and retrieve their tmdbUrls
                  const movies = await fetchMoviesFromPod(podUrl); 

                  // Iterate through the movies and update the movie vector
                  for (const movie of movies) {
                    // Extract the movie ID from the tmdbUrl (e.g., "https://www.themoviedb.org/movie/289")
                    const tmdbId = extractMovieIdFromUrl(movie.tmdbUrl);

                    // Find the key associated with the tmdb ID in the id_matching_dict
                    const key = getKeyByValue(idMatchingDict, tmdbId);

                    // If a key is found, update the movie vector at that position to 1
                    if (key !== null) {
                      movieVector[key] = 1;
                    }
                  }

                  return movieVector;
                }

                // Function to extract movie ID from a tmdbUrl
                function extractMovieIdFromUrl(tmdbUrl) {
                  // Parse the URL and extract the last segment as the movie ID
                  const urlSegments = tmdbUrl.split('/');
                  return parseInt(urlSegments[urlSegments.length - 1]);
                }

                // Function to find a key in an object by its value
                function getKeyByValue(object, value) {
                  return Object.keys(object).find((key) => object[key] === value);
                }


				// Example usage:
                const podURLs = people.map(person => person.id);
                console.log('All Pod URLs', podURLs);

				// Compute the minhash for all people
                const numPerm = 128; // Number of permutation functions
                const seed = 100;
				// Generate a list of random hash functions (should be the same across all users)
                const hashFunctions = generateHashFunctions(numPerm, seed); 
                
				// Compute movie vectors for each pod URL
                const movieVectors = await Promise.all(
                  podURLs.map(async (podUrl) => {
                    const movieVector = await computeMovieVector(podUrl, id_matching_dict);

                    // Count the number of 1s in the movie vector
                    const onesCount = movieVector.reduce((count, value) => count + value, 0);

                    // Find the positions of the 1s in the movie vector
                    const onesPositions = movieVector.reduce(
                      (positions, value, index) => {
                        if (value === 1) positions.push(index);
                          return positions;
                        },
                     []
                    );

					// Compute MinHash for the movie vector
                    const minhashValues = minHash(movieVector, hashFunctions);

                    console.log(`Pod URL: ${podUrl}`);
                    console.log('Movie Vector:', movieVector);
                    console.log('Number of 1s:', onesCount);
                    console.log('Positions of 1s:', onesPositions);
                    console.log('MinHash Values:', minhashValues);

                    return { podUrl, movieVector, onesCount, onesPositions, minhashValues };
                  })
                );

                console.log('Movie Vectors:', movieVectors);



				// Test code to save the minhash vector to a person's pod
                async function saveVector(vector, podUrl) {
                  try {
					const parts = podUrl.split('/');
					const pod = parts.slice(0, parts.length - 2).join('/');
                    // Generate a unique dataset URL for the vector
                    const datasetUrl = `${pod}/movie/test`;

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

                // Example usage:
                const vectorData = [0.1, 0.2, 0.3, 0.4]; // Replace with your vector data
                const podUrl = 'https://yushiyang.solidcommunity.net/profile/card#me'; // Replace with your Pod URL
                const savedDatasetUrl = await saveVector(vectorData, podUrl);

                if (savedDatasetUrl) {
                  console.log('Saved vector data at:', savedDatasetUrl);
                }




                // // Define the LSH Class
                // class LSH {
                //   constructor(numBands, bandSize) {
                //     this.numBands = numBands; // Number of bands for LSH
                //     this.bandSize = bandSize; // Number of rows in each band
                //     this.buckets = new Map(); // Map to store buckets
                //   }
  
                //   hashBand(band) {
                //   // Generate a hash value for a band (simple hash function)
                //   return band.reduce((hash, value) => hash * 31 + value, 0);
                //   }
  
                //   insert(userId, minhash) {
                //     for (let i = 0; i < minhash.length; i += this.bandSize) {
                //       const band = minhash.slice(i, i + this.bandSize); // Extract a band of MinHash values
                //       const bandHash = this.hashBand(band); // Hash the band
                //       if (!this.buckets.has(bandHash)) {
                //         this.buckets.set(bandHash, new Set());
                //       }
                //       this.buckets.get(bandHash).add(userId); // Add user to the corresponding bucket
                //       }
                //   }
  
                //   query(minhashQuery) {
				// 	const similarUsers = new Set(); // Create an empty set to store similar users
				  
				// 	// Loop through the MinHash query in bands
				// 	for (let i = 0; i < minhashQuery.length; i += this.bandSize) {
				// 	  const band = minhashQuery.slice(i, i + this.bandSize); // Extract a band from the query MinHash
				// 	  const bandHash = this.hashBand(band); // Calculate a hash value for the band
				  
				// 	  if (this.buckets.has(bandHash)) {
				// 		// Check if the hash value corresponds to a bucket in the data structure
				// 		similarUsers.add(...this.buckets.get(bandHash)); // Add similar users from the corresponding bucket to the set
				// 	  }
				// 	}
				  
				// 	return Array.from(similarUsers); // Convert the set to an array to return the result
				//   }
	
				  

				
				let loadingEnd = (new Date()).getTime();
				let currentSeconds = (loadingEnd - loadingStart)/1000;
				console.log('# of movies loaded: ' + movieList.length + ' | time taken: ' + currentSeconds + ' seconds');
				// let dataLoadEndedTime = ((new Date()).getTime() - loadingStart)/1000;

				// Random Sampling: sample 10 movies randomly from watched/liked/wishlist movies
				const userMovies = movies.filter(x => x.type === "me" && !x.recommended)
				const sampledTitles: String[] = []
				if (userMovies.length <= 10) {
					for (let movie of userMovies) {
						sampledTitles.push(movie.title);
					}
				} else {
					const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
					const sampledMovies = shuffledMovies.slice(0, Math.min(10, shuffledMovies.length));
					for (let movie of sampledMovies) {
						sampledTitles.push(movie.title);
					}
				}

				// Change Huna's code of getting all movies to getting all the hashes from me and friends (and store them in e.g. pods/movies or a parallel directory)
				// Add the LSH function here (need me and my friends' hashes)
                // Retrive hashes using RDF things like getthing() etc, or save hashes to json file and use json operations to retrive hashes

				// fetch movie recommendations
				const response = await fetch('https://api.pod.ewada.ox.ac.uk/solidflix-recommender/', {
					method: 'POST',
					body: JSON.stringify(sampledTitles),
					headers: {
						'Content-Type': 'application/json'
					}
				});
				  
				let recommendedList;
				if (response.body !== null) {
					const body = await response.text();
					recommendedList = JSON.parse(body);
					console.log(recommendedList);
				}

				for(const name of recommendedList) {
					const movies = await search(name);
					const movie = movies.find(x => x.title === name);
					if (movie) {
						save(movie, true);
					}
				}

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
