- [Table of contents](#table-of-contents)
- [Welcome to Solid Media](#welcome-to-solid-media)
  * [Set up locally](#set-up-locally)
    + [Clone project and installations](#clone-project-and-installations)
  * [Getting started with Solid Media](#getting-started-with-solid-media)
    + [Log in with a WebID](#log-in-with-a-webid)
    + [Add movies](#add-movies)
  * [Sharing with friends](#sharing-with-friends)
    + [Step 1: Add friends to the Solid profile](#step-1--add-friends-to-the-solid-profile)
    + [Step 2: Add friends to the Solid pod](#step-2--add-friends-to-the-solid-pod)
  * [Development note](#development-note)
    + [Authentication](#authentication)
    + [Fetch movie data from a pod](#fetch-movie-data-from-a-pod)
    + [Group authentication](#group-authentication)


# Welcome to Solid Media

Solid Media is a demonstration of the use of [Solid](https://solidproject.org/) in a small media recommendation sharing app.

The application can be downloaded and deployed locally or accessed at [solid-media](https://oxfordhcc.github.io/solid-media/).

**To play with the application you will need a Solid pod provided by [solidcommunity.net](https://solidcommunity.net).**

## Set up locally


If you wish to deploy Solid-media locally, then please follow the instructions below to build the project.

Solid Media is developed using [Node.js](https://nodejs.org/en/) and [snowpack](https://www.snowpack.dev/tutorials/getting-started). If you are unfamiliar with them, then you will need to have your `npm` set up. Please follow [this tutorial](https://docs.npmjs.com/getting-started).


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

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/login.png" width="400" />


## Getting started with Solid Media

A public version can be accessed [https://oxfordhcc.github.io/solid-media/ https://oxfordhcc.github.io/solid-media/]. It's still experimental, for example, the `import` function is still not working. If you notice any bugs please feel free to raise an issue and we will most value your feedback!

### Log in with a WebID

To get started with sharing your movies, you will need a webID to log into the system, so that you can store movies on your Solid pod and share them with your friends. For now, we recommend you register with [solidcommunity.net](https://solidcommunity.net).

Once you have set up a Solid/WebID then you can log in and start to add movies to your pod.


<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/my-movies.png" width="800" />

### Add movies

Currently, the netflix import function doesn't work very well. But if you input a keyword of your favorite movie, you should see a list of results. You can choose the `tick` button if you have already watched the movie, or the `plus` button to the movie to a list to be watch. And the movie should appear below in the according section.

<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/add-movies.png" width="200" height="200" />

Once you have added movies in **Solid Media**, you can express your level of interest of a movie by the `thumb up` or `thumb down` button, and the movies will show up as your favorites.

## Sharing with friends

*Note that this implementation is experimental as group authentication on Solid CSS is still under active development.*

One particular thing that `Solid Media` supports is sharing of movie amongst friends.

At the moment, to enable the sharing of movies between friends, one must have set up the friends relationship on their Solid/WebID profile, and this must be set up in two steps and may require some writing of RDF.

### Step 1: Add friends to the Solid profile

Go to `https://WEBID.solidcommunity.net/profile/card/me#`, and click on the `RDF` button (third one to the left), so that you can edit friends of yours. 


<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/RDF_profile.png" width="300" />

To add a friend's WebID you should use the triple of `foaf:knows <webId>`, as shown in the code snippet below:

``` 
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix schema: <http://schema.org/>.
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix space: <http://www.w3.org/ns/pim/space#>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
@prefix pro: <./>.
@prefix inbox: </inbox/>.
@prefix the: </>.

pro:card a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

:me
    a schema:Person, foaf:Person;
    vcard:fn "JunChiltern";
    ## add your friends with a triple below
    foaf:knows <https://WEBID.solidcommunity.net/> ;
```

### Step 2: Add friends to the Solid pod


In order to let `Solid Media` access your friends' movies, you also need to add our friends to your friends Group in your Solid pod.

Go to `https://WEBID.solidcommunity.net/` (after you have logged in), and click on the `Your Storage` tab. From the list of dropdown items, select `friends` and expand the list, which is equivalent for you to go to `https://WEBID.solidcommunity.net/friends#group`. Click on the pencil icon on the button right corner to edit your friend list.


Here you should use the RDF triple `foaf:member` to express the friend relationship.
```
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
:group a foaf:Group; 
			foaf:member <https://thechilterns.solidcommunity.net/profile/card#>.
```


Once finishing setting the above two steps, you will be able to see your friends' movies on the top of the `Solid Media` application.


<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/friends.png" width="800" />


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

### Group authentication

**As noted above, our group authentication is still experimental as the feature is still under active development and may not be universally supported by all solid servers.**

The diagram below shows that the sharing of resources on solid pods currently relies on the authentication to be set up at both the `profile` level and the `pod` level. We welcome suggestions on any alternative approaches to this current solution, either for the Solid community server or any other Solid server.


<img src="https://github.com/OxfordHCC/solid-media/blob/main/img/group.png" width="800" />


