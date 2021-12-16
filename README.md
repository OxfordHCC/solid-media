# Table of contents

- [Welcome to Solid Media](#welcome-to-solid-media)
  - [Set up locally](#set-up-locally)
  - [Getting started with a Solid ID](#getting-started-with-a-solid-id)
  - [Sharing with friends](#sharing-with-friends)
  - [Development note](#development-note)


# Welcome to Solid Media

A demonstration of the use of [Solid](https://solidproject.org/) in a small media recommendation sharing app.


The application can be downloaded and deployed locally or accessed at [solid-media](https://oxfordhcc.github.io/solid-media/).

## Set up locally


Solid-media is developed using [Node.js](https://nodejs.org/en/) and [snowpack](https://www.snowpack.dev/tutorials/getting-started). 

If you are unfamiliar with them, then you will need to have your `npm` set up. Please follow [this tutorial](https://docs.npmjs.com/getting-started).


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

### Access public solid-media

A public version can be accessed [https://oxfordhcc.github.io/solid-media/ https://oxfordhcc.github.io/solid-media/]. It's still experimental, for example, the `import` function is still not working. If you notice any bugs please feel free to raise an issue and we will most value your feedback!

## Getting started with a Solid ID

You will need a webID to log into the system. For now, we recommend you register with [solidcommunity.net](https://solidcommunity.net).

Once you have set up a Solid/WebID then you can log in and start to add movies to solid-media.

![my moviews page](/img/my-movies.png)


## Sharing with friends

*Note that this implementation is experimental as group authentication on Solid CSS is still under active development.*


At the moment, to enable the sharing of movies between friends, one must have had the friends relationship set up on their Solid/WebID profile, and this must be set up in two steps

### Step 1: Add friends to the Solid profile

Go to `https://WEBID.solidcommunity.net/profile/card/me#`, and click on the `RDF` button (third one to the left), which will then show you the following RDF triples, describing you.

![RDF button](/img/RDF_profile.png)

Add another friend's WebID with the triple of `foaf:knows <webId>`, shown in the highlights below

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
    vcard:hasPhoto <just-the-koala.png>;
    vcard:role "Housewife";
    acl:trustedApp
            [
                acl:mode acl:Append, acl:Read, acl:Write;
                acl:origin <http://localhost:8080>
            ];
    ldp:inbox inbox:;
    space:preferencesFile </settings/prefs.ttl>;
    space:storage the:;
    solid:account the:;
    solid:privateTypeIndex </settings/privateTypeIndex.ttl>;
    solid:publicTypeIndex </settings/publicTypeIndex.ttl>;
    ## add your friends with a triple below
    foaf:knows <https://WEBID.solidcommunity.net/> ;
```

### Step 2: Add friends to the Solid pod

Go to `https://WEBID.solidcommunity.net/` (after you have logged in), and click on the `Your Storage` tab. From the list of dropdown items, select `friends` and expand the list, which is equivalent for you to go to `https://WEBID.solidcommunity.net/friends#group`. Click on the pencil icon on the button right corner in order to edit your friend list.



Here you should use the RDF triple `foaf:member` to express the friend relationship.
```
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
:group a foaf:Group; 
			foaf:member <https://thechilterns.solidcommunity.net/profile/card#>.
```


Once finishing setting the above two steps, you will be able to see your friends' movies on the top of the `solid-media` application.

![Friends' movies](/img/friends.png)


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

