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