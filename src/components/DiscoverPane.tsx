import {h, Component, VNode} from 'preact';
import {Props} from './types';
import Carousel, {CarouselElement} from './Carousel';
import AddPopup from './AddPopup';
import {useAuthentication} from './authentication';
import {loadData, MediaData, getIds} from '../media';
import {getSolidDataset, deleteSolidDataset, SolidDataset, WithAcl, WithServerResourceInfo, WithAccessibleAcl, getContainedResourceUrlAll, getUrl, getStringNoLocaleAll, hasResourceAcl, getUrlAll, getThing, getThingAll, setGroupDefaultAccess, setGroupResourceAccess, getSolidDatasetWithAcl, createAcl, saveAclFor, setAgentDefaultAccess, setAgentResourceAccess, removeThing, createThing, saveSolidDatasetAt, setUrl, setDatetime, setThing, setInteger, asUrl, getInteger, createSolidDataset, createContainerAt, addUrl, getResourceAcl, setStringNoLocale, addStringNoLocale} from '@inrupt/solid-client';
import {DCTERMS, RDF, SCHEMA_INRUPT} from '@inrupt/vocab-common-rdf';
import {shuffle} from '../lib';

import {HOMEPAGE} from '../env';

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

export type MovieData = {
	movie: string,
	solidUrl: string,
	watched: boolean,
	liked: boolean | null,
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
	movies?: {[key: string]: MovieData},
	loading?: boolean,
};

export default class DiscoverPane extends Component<{globalState: {state: any}}> {
	state = {
		addPopup: false,
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
				let moviesAclDataset: SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo;
				
				try {
					moviesAclDataset = await getSolidDatasetWithAcl(`${pod}/movies`, {fetch: session.fetch}) as any;
				} catch {
					moviesAclDataset = await createContainerAt(`${pod}/movies`, {fetch: session.fetch}) as any;
				}
				
				let friendsDataset: SolidDataset;
				
				try {
					friendsDataset = await getSolidDataset(`${pod}/friends`, {fetch: session.fetch});
				} catch {
					friendsDataset = createSolidDataset();
					
					let groupThing = createThing({url: `${pod}/friends#group`});
					groupThing = setUrl(groupThing, RDF.type, 'http://xmlns.com/foaf/0.1/Group');
					
					friendsDataset = setThing(friendsDataset, groupThing);
					
					await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
				}
				
				let groupThing = getThing(friendsDataset, `${pod}/friends#group`)!;
				
				const profile = await getSolidDataset(`${pod}/profile/card`, {fetch: session.fetch});
				const me = getThing(profile, `${pod}/profile/card#me`)!;
				
				const groupFriends = new Set(getUrlAll(groupThing, 'http://xmlns.com/foaf/0.1/member'));
				const profileFriends = new Set(getUrlAll(me, 'http://xmlns.com/foaf/0.1/knows'));
				const newFriends = [...profileFriends].filter(x => !groupFriends.has(x));
				
				for (const friend of newFriends) {
					groupThing = addUrl(groupThing, 'http://xmlns.com/foaf/0.1/member', friend);
				}
				
				if (newFriends.length > 0) {
					friendsDataset = setThing(friendsDataset, groupThing);
					
					await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
				}
				
				const friends = getUrlAll(groupThing, 'http://xmlns.com/foaf/0.1/member');
				
				if (!hasResourceAcl(moviesAclDataset)) {
					// Temporarily allow friends access by default
					// TODO: Create a UI element to do this
					let moviesAcl = createAcl(moviesAclDataset);
					moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, {...NO_ACCESS, read: true});
					moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, {...NO_ACCESS, read: true});
					for (const id of friends) {
						moviesAcl = setAgentDefaultAccess(moviesAcl, id, {...NO_ACCESS, read: true});
						moviesAcl = setAgentResourceAccess(moviesAcl, id, {...NO_ACCESS, read: true});
					}
					moviesAcl = setAgentDefaultAccess(moviesAcl, webID, FULL_ACCESS);
					moviesAcl = setAgentResourceAccess(moviesAcl, webID, FULL_ACCESS);
					await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
				}
				
				if (newFriends.length > 0) {
					let moviesAcl = getResourceAcl(moviesAclDataset)!;
					for (const id of newFriends) {
						moviesAcl = setAgentDefaultAccess(moviesAcl, id, {...NO_ACCESS, read: true});
						moviesAcl = setAgentResourceAccess(moviesAcl, id, {...NO_ACCESS, read: true});
					}
					await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
				}
				
				const people = [{type: 'me', id: webID}, ...friends.map(x => ({type: 'friend', id: x}))] as {type: 'me' | 'friend', id: string}[];
				
				const movieList = (await Promise.all(people.map(async x => {
					try {
						const parts = x.id.split('/');
						const pod = parts.slice(0, parts.length - 2).join('/');
						
						const moviesDataset = await getSolidDataset(`${pod}/movies`, {fetch: session.fetch});
						
						const movies = getContainedResourceUrlAll(moviesDataset);
						
						return movies.map(m => ({...x, url: m}));
					} catch {
						return [];
					}
				}))).flat(1);
				
				const movies = await Promise.all(
					movieList.map(async ({type, url}) => {
						const movieDataset = await getSolidDataset(url, {fetch: session.fetch});
						
						const movieThing = getThing(movieDataset, `${url}#it`)!;
						
						const things = getThingAll(movieDataset);
						
						const watched = things.some(x => getUrl(x, RDF.type) === 'https://schema.org/WatchAction');
						
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
						
						const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
						
						const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));
						
						const {title, released, icon} = await loadData(tmdbUrl);
						
						return {movie: tmdbUrl, solidUrl: url, type, watched, liked, title, released, image: icon, dataset: movieDataset};
					})
				);
				
				shuffle(movies);
				
				const movieDict: {[key: string]: MovieData} = {};
				const myWatched: string[] = [];
				const myUnwatched: string[] = [];
				const myLiked: string[] = [];
				const friendWatched: string[] = [];
				const friendUnwatched: string[] = [];
				const friendLiked: string[] = [];
				
				for (const {type, ...movie} of movies) {
					switch (type) {
						case 'me': {
							movieDict[movie.movie] = {...movie, me: true, friend: movieDict[movie.movie]?.friend};
							
							if (movie.watched) myWatched.push(movie.movie);
							else myUnwatched.push(movie.movie);
							
							if (movie.liked) myLiked.push(movie.movie);
						} break;
						
						case 'friend': {
							if (!(movie.movie in movieDict)) movieDict[movie.movie] =
								{...movie, watched: false, liked: null, me: false, friend: true};
							else movieDict[movie.movie].friend = true;
							
							if (movie.watched) friendWatched.push(movie.movie);
							else friendUnwatched.push(movie.movie);
							
							if (movie.liked) friendLiked.push(movie.movie);
						} break;
					}
				}
				
				globalState.setState({
					myWatched,
					myUnwatched,
					myLiked,
					friendWatched,
					friendUnwatched,
					friendLiked,
					movies: movieDict,
				});
			})();
		}
		
		async function save(media: MediaData) {
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
				watched: false,
				liked: null,
				title: media.title,
				released: media.released,
				image: media.image,
				dataset: movieDataset,
				me: true,
				friend: false,
			};
			
			globalState.setState({
				myUnwatched: [media.tmdbUrl, ...globalState.state.myUnwatched!],
				movies: {...globalState.state.movies, [media.tmdbUrl]: movieData},
			});
			
			return movieData;
		}
		
		async function watch(media: MovieData, date: Date = new Date()) {
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
				myWatched: [media.movie, ...globalState.state.myWatched!],
				movies: {...globalState.state.movies, [media.movie]: {...media, watched: true, dataset}},
			});
		}
		
		const createCarouselElement = (movie: string, type: 'friend' | 'me'): VNode => {
			const movieData = globalState.state.movies![movie];
			const {solidUrl, watched, liked, title, released, image} = movieData;
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
			<div>
				<div class='add-button-wrapper'>
					<button class='add-button' onClick={() => this.setState({addPopup: true})}>➕ Add movies</button>
				</div>
				<h1>Your friends have recently watched:</h1>
				<Carousel>{(globalState.state.friendWatched ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
				<h1>Your friends want to watch:</h1>
				<Carousel>{(globalState.state.friendUnwatched ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
				<h1>Your friends enjoyed:</h1>
				<Carousel>{(globalState.state.friendLiked ?? []).map(x => createCarouselElement(x, 'friend'))}</Carousel>
				<h1>You have previously watched:</h1>
				<Carousel>{(globalState.state.myWatched ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
				<h1>You want to watch:</h1>
				<Carousel>{(globalState.state.myUnwatched ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
				<h1>You enjoyed:</h1>
				<Carousel>{(globalState.state.myLiked ?? []).map(x => createCarouselElement(x, 'me'))}</Carousel>
				{this.state.addPopup && <AddPopup
					close={() => this.setState({addPopup: false})}
					save={async (media: MediaData) => {
						if (!Object.values(globalState.state.movies!).some(x => x.title === media.title)) {
							await save(media);
						}
					}}
					watch={async (media: MediaData) => {
						let data = Object.values(globalState.state.movies!).find(x => x.title === media.title);
						if (!data) data = await save(media);
						if (!data.watched) await watch(data);
					}}
				/>}
			</div>
		);
	}
}
