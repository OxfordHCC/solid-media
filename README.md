- [Table of contents](#table-of-contents)
- [Welcome to Solid Media](#welcome-to-solid-media)
  * [Set up locally](#set-up-locally)
    + [Clone project and installations](#clone-project-and-installations)
  * [Getting started with Solid Media](#getting-started-with-solid-media)
    + [Log in with a WebID](#log-in-with-a-webid)
    + [Add movies](#add-movies)
    + [Sharing with friends](#sharing-with-friends)
    + [Personalised Movie Recommendations](#personalised-movie-recommendations)
  * [Application Architecture](#architecture)
  * [Development note](#development-note)
    + [Authentication](#authentication)
    + [Fetch movie data from a pod](#fetch-movie-data-from-a-pod)
    + [Add friends](#add-friends)
    + [Group authentication](#group-authentication)
    + [Future features](#future-features)


# Welcome to Solid Media

Solidflix is a demonstration of the use of [Solid](https://solidproject.org/) in a social sharing and personalised recommendations app. It is inspired by [Media Kraken](https://noeldemartin.github.io/media-kraken/login).

You can use the latest deployed application here: [SolidFlix](https://oxfordhcc.github.io/solid-media/), or you can clone the repository and run it locally.

**To play with the application you will need a WebID or a Solid pod provided by [solidcommunity.net](https://solidcommunity.net) or any other pod provider such as [Inrupt](https://inrupt.net/), [Solid Web](https://solidweb.org/), [solidweb.me](https://solidweb.me/) or using your self-hosted pod url**


## Set up locally

If you wish to deploy Solid-media locally, then please follow the instructions below to build the project.

Solidflix is developed using [Typescript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/). If you are unfamiliar with them, then you will need to have your `npm` set up. Please follow [this tutorial](https://docs.npmjs.com/getting-started).


### Clone project and installations

1. Make a directory.

2. Clone on GitHub here:

`git clone git@github.com:OxfordHCC/solid-media.git`

3. `cd solid-media` into the directory.

4. Install dependencies:

`npm install`

5. Run the development server:

`npm run dev` or `npm start`

The application will be opened on your local web browser [http://localhost:8080](http://localhost:8080).

### Build for production

To build the application for production:

`npm run build`

To preview the production build:

`npm run preview`


## Getting started with Solidflix

A public version can be accessed [https://oxfordhcc.github.io/solid-media/](https://oxfordhcc.github.io/solid-media/).

### Log in with a WebID

To get started with sharing your movies, you will need a [WebID](https://solidcommunity.net) to log into the system, so that you can store movies on your Solid pod and share them with your friends. We recommend you register with [solidcommunity.net](https://solidcommunity.net). Alternatively, you could use  other supported pod providers such as [Inrupt](https://inrupt.net/), [Solid Web](https://solidweb.org/), [solidweb.me](https://solidweb.me/) or using your self-hosted pod url.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/login.png" width="800" />

Once you have set up a Solid/WebID then you can log in and start to add movies to your pod.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/options.png" width="400" />

After logging in, you'll be able to add movies, add friends, view your personalised movie recommendations, view your movies (watch history, liked and wishlisted movies), your friends movies (watch history, liked and wishlisted movies), like and wishlist movies.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/users-movies.png" width="800" />

### Add movies

You can add movies by uploading your netflix viewing history csv file, or by manually adding movies with the search feature. If you input a keyword of your favorite movie, you should see a list of search results. You can choose the `tick` button if you have already watched the movie, or the `plus` button to add the movie to your wishlist. And the movie should appear in your list.

<p float="left">
	<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/add-movies.png" height="400" />
	<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/netflix-upload.png" height="400" />
</p>

Once you have added movies in **Solidflix**, you can express your level of interest of a movie by the `thumb up` or `thumb down` button, and the movies will show up as your favorites.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/ratings.png" width="600" />

### Sharing with friends

One particular thing that `Solid-Media` supports is sharing movies amongst friends.

Click on the "Add Friends" button, and enter your friends WebID (eg: https://FRIEND.solidcommunity.net/profile/card#me) and click on "Add".
Now, the newly added friend will get added to your profile (foaf:knows) and they will get added as a member to the /friends group with which your movies data READ_ACCESS is shared. For adding friends in real-time, a PATCH request is sent using UpdateManager from [RDFlib](https://linkeddata.github.io/rdflib.js/Documentation/webapp-intro.html)

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/add-friends.png" width="500" />

Once you finish adding friends, you will be able to see your friends' movies on the top of the `Solidflix` application.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/friends-movies.png" width="800" />

### Personalised Movie Recommendations
Solidflix provides personalised movie recommendations which come from a content-based movie recommendation model fitted with [TMDB 5000 movies](https://www.kaggle.com/tmdb/tmdb-movie-metadata) dataset. Based on randomly samples movies from users' watched, liked or wishlisted movies, the recommendation model returns personalised similar movie recommendations with the highest cosine similarity score.
To retreive recommendations, a POST request with a list of movies is sent to our hosted REST API: [https://api.pod.ewada.ox.ac.uk/solidflix-recommender/](https://api.pod.ewada.ox.ac.uk/solidflix-recommender/). The code for the recommendation model can be found [here](https://github.com/OxfordHCC/solid-media/tree/main/solidflix-movie-reco-api).

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/recommendations.png" width="800" />

## Architecture

The diagram below shows the architecture of Solidflix, where the client is the users' browser and we have our server for the recommendations.
Once a user signs in and gives authorisation consent to Solidflix, the app will be able to store and retreive data from the users' pod.
We are using the TMDB API to fetch movies metadata while storing movies on the pod, which takes in only the movie id's.
The recommendation model only takes in movie id's, such that no personal data is ever sent back to the server.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/architecture.png" width="800" />

## Development note

### Authentication

The authentication is handled by `Login.tsx` and uses `@inrupt/solid-client-authn-browser`.

The basic structure can be supported using these lines.
```
async function login() {
  if (!session.info.isLoggedIn && !new URL(window.location.href).searchParams.get("code")) {
    await session.login({
      oidcIssuer: provider,
      clientName: "Playlist example app",
      redirectUrl: window.location.href
    });
  }
}
```

### Fetch movie data from a pod

Here we used `getSolidDataset` from `@inrupt/solid-client` to retrieve `movies` data from a pod.

```
const movieList = (await Promise.all(people.map(async x => {
	try {
		const parts = x.id.split('/');
		const pod = parts.slice(0, parts.length - 2).join('/');

		# retrieve the movies from a personal pod, in which `movie` data are stored on the root directory of the pod.

		const moviesDataset = await getSolidDataset(`${pod}/movies`, {fetch: session.fetch});

		const movies = getContainedResourceUrlAll(moviesDataset);

		return movies.map(m => ({...x, url: m}));
	} catch {
		return [];
	}
}

```

The metadata about a movie, including its title, a short description and an icon, is retrieved from tbmd:

```
const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');

const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));

const {title, released, icon} = await loadData(tmdbUrl);

```

### Add friends

Here we used rdflib.js to set a local data store and associated data fetcher to perform the PATCH operation. We are using UpdateManager to “patch” the data as the data to update it in real-time.

```
// Set up a local data store and associated data fetcher
const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
// create a local RDF store
const store = $rdf.graph();
// create a fetcher to read/write
const fetcher = new $rdf.Fetcher(store, {fetch: session.fetch});
// create update manager to "patch" the data as the data is updated in real time
const updater = new $rdf.UpdateManager(store);

// RDF Statement (subject, predicate, object, why)
let ins = [];
ins.push($rdf.st($rdf.sym(webID), FOAF('knows'), $rdf.sym(newFriendWebID), $rdf.sym(webID).doc()));
updater.update([], ins, (uri, ok, message) => {
	if (!ok) alert(message_f);
});

```

### Group authentication

The diagram below shows that the sharing of resources on solid pods currently relies on the authentication to be set up at both the `profile` level and the `pod` level, where the group is setup as a vcard. Once a user adds a friend, they get added to users' RDF and to the vcard group as a member. READ_ACCESS for the users' movies data is shared with the /friends group.
If a user deletes any movie data or unlikes a movie, the movies shown to their friends get updated accordingly.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/group.jpg" width="800" />


<!-- ### Benchmarking performance
@@TODO -->

### Future features
- Privacy Preserving ML -based Collaborative Filtering Recommendations
- Cross-app or platform integration beyond just Netflix (eg: [Trakt](https://trakt.tv), [LetterBoxd](https://letterboxd.com/), or other streaming services)
- Optimising data storage and fetching (Storing hundreds of movies takes a couple of minutes on NSS and CSS. While loading 1000 movies takes 3 minutes using NSS, and 20 seconds using CSS)
- Enabling a friend to control whether they would like to their movies with another friend, instead of having their movies shared by default when they become friends.
