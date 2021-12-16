# Welcome to Solid Media

A demonstration of the use of [Solid](https://solidproject.org/) in a small media recommendation sharing app.


The application can be downloaded and deployed locally or accessed at [solid-media](https://oxfordhcc.github.io/solid-media/).

## Getting started locally


Solid-media is developed using [Node.js](https://nodejs.org/en/) and [snowpack](https://www.snowpack.dev/tutorials/getting-started). 

If you are unfamiliar with them, then you will need to have you `npm` set up. Please follow [this tutorial](https://docs.npmjs.com/getting-started).


### Clone project and installations

1. Make a directory.

2. Clone on GitHub here:

`git clone git@github.com:OxfordHCC/solid-media.git`

3. `CD` into the directory.

4. Set up your `snowpack`

`npm install --save-dev snowpack`

Run

`npm run start`

The application will be opened on your local web browser [http://localhost:8080](http://localhost:8080).

![login page](/img/login.png)

### Log in with a Solid ID

You will need a webID to log into the system. For now, we recommend you register with [solidcommunity.net](https://solidcommunity.net).

Once you have set up a Solid/WebID then you can log in and start to add movies to solid-media.

![my moviews page](/img/my-movies.png)


### Upcoming feature

The next feature we are planning to develop for solid-media is to share the movies you have watched or would like to watch with your friends, which are currently shown as blank at the top of the application:

![friends page](/img/future.png)


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

The code `getSolidDataset(`${pod}/movies`, {fetch: session.fetch})` shows that we are expecting to retrieve the movies from a personal pod, in which `movie` data are stored on the root directory of the pod. 

```
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
}

```

The metadata about a movie, including its title, a short description and an icon, is retrieved from tbmd:

```
const urls = getStringNoLocaleAll(movieThing, 'https://schema.org/sameAs');
						
const [tmdbUrl] = urls.filter(x => x.startsWith('https://www.themoviedb.org/'));

const {title, released, icon} = await loadData(tmdbUrl);
						
```

### Friends and authentication

At the moment, to enable the sharing of movies between friends, one must have had the friends relationship set up on their Solid/WebID profile.

