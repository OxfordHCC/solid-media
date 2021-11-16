const TMDB_API_KEY = 'e70f4a66202d9b5df3586802586bc7d2';

type TMBDConfig = {
	base_url: string,
	small_poster_size: string,
	big_poster_size: string,
	backdrop_size: string,
};

async function loadConfig(): Promise<TMBDConfig> {
	const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`);
	const {images: {base_url}} = await response.json();
	return {
		base_url,
		small_poster_size: 'w342',
		big_poster_size: 'original',
		backdrop_size: 'original',
	};
}

const config = loadConfig();

export type MediaData = {
	tmdbUrl: string,
	title: string,
	description: string,
	released: Date,
	icon: string,
	image: string,
	backdrop: string,
};

export async function loadData(url: string): Promise<MediaData> {
	const match = url.match(/https:\/\/www.themoviedb.org\/(?<type>movie|tv)\/(?<id>\d+)/);
	
	if (match !== null) {
		const {type, id} = match.groups!;
		
		switch (type) {
			case 'movie': {
				const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
				const {title, overview, release_date, poster_path, backdrop_path} = await response.json();
				
				const {base_url, small_poster_size, big_poster_size, backdrop_size} = await config;
				
				return {
					tmdbUrl: url,
					title: title,
					description: overview,
					released: new Date(release_date),
					icon: `${base_url}${small_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
					image: `${base_url}${big_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
					backdrop: `${base_url}${backdrop_size}${backdrop_path}?api_key=${TMDB_API_KEY}`,
				};
			}
			case 'tv': {
				const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}`);
				const {name, overview, last_air_date, poster_path, backdrop_path} = await response.json();
				
				const {base_url, small_poster_size, big_poster_size, backdrop_size} = await config;
				
				return {
					tmdbUrl: url,
					title: name,
					description: overview,
					released: new Date(last_air_date),
					icon: `${base_url}${small_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
					image: `${base_url}${big_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
					backdrop: `${base_url}${backdrop_size}${backdrop_path}?api_key=${TMDB_API_KEY}`,
				};
			}
		}
	}
	
	throw new Error("Unknown URL format");
}

export async function getIds(url: string): Promise<string[]> {
	const match = url.match(/https:\/\/www.themoviedb.org\/(?<type>movie|tv)\/(?<id>\d+)/);
	
	if (match !== null) {
		const {id} = match.groups!;
		
		const response = await fetch(`https://api.themoviedb.org/3/movie/${id}/external_ids?api_key=${TMDB_API_KEY}`);
		const {imdb_id} = await response.json();
		
		return [url, `https://www.imdb.com/title/${imdb_id}`];
	} else return [url];
}

export async function search(name: string): Promise<MediaData[]> {
	const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(name)}&api_key=${TMDB_API_KEY}`);
	const {results} = await response.json();
	
	const {base_url, small_poster_size, big_poster_size, backdrop_size} = await config;
	
	return results.map(({id, title, overview, release_date, poster_path, backdrop_path}: {id: number, title: string, overview: string, release_date: string, poster_path: string, backdrop_path: string}) => ({
		tmdbUrl: `https://www.themoviedb.org/movie/${id}`,
		title: title,
		description: overview,
		released: new Date(release_date),
		icon: `${base_url}${small_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
		image: `${base_url}${big_poster_size}${poster_path}?api_key=${TMDB_API_KEY}`,
		backdrop: `${base_url}${backdrop_size}${backdrop_path}?api_key=${TMDB_API_KEY}`,
	}));
}
