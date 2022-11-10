import {h, Component} from "../_snowpack/pkg/preact.js";
import Carousel, {CarouselElement} from "./Carousel.js";
import AddPopup from "./AddPopup.js";
import AddFriends from "./AddFriends.js";
import Logout from "./Logout.js";
import {useAuthentication} from "./authentication.js";
import {loadData, getIds, search} from "../media.js";
import {getSolidDataset, deleteSolidDataset, getContainedResourceUrlAll, getUrl, getStringNoLocaleAll, hasResourceAcl, getUrlAll, getThing, getThingAll, setGroupDefaultAccess, setGroupResourceAccess, getSolidDatasetWithAcl, createAcl, saveAclFor, setAgentDefaultAccess, setAgentResourceAccess, removeThing, createThing, saveSolidDatasetAt, setUrl, setDatetime, setThing, setInteger, asUrl, getInteger, createSolidDataset, createContainerAt, addUrl, removeUrl, getResourceAcl, setStringNoLocale, addStringNoLocale, getPublicAccess, setPublicDefaultAccess, setPublicResourceAccess, getGroupAccess} from "../_snowpack/pkg/@inrupt/solid-client.js";
import {DCTERMS, RDF, SCHEMA_INRUPT} from "../_snowpack/pkg/@inrupt/vocab-common-rdf.js";
import {logout} from "../_snowpack/pkg/@inrupt/solid-client-authn-browser.js";
import {HOMEPAGE} from "../env.js";
import * as $rdf from "../_snowpack/pkg/rdflib.js";
const DATE_FORMAT = {
  year: "numeric",
  month: "long"
};
const NO_ACCESS = {
  read: false,
  write: false,
  append: false,
  control: false
};
const FULL_ACCESS = {
  read: true,
  write: true,
  append: true,
  control: true
};
const READ_ACCESS = {
  read: true,
  write: false,
  append: false,
  control: false
};
export default class DiscoverPane extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      addPopup: false,
      addFriends: false,
      showLogout: false
    };
  }
  render({globalState}) {
    const session = useAuthentication();
    if (!session)
      return /* @__PURE__ */ h("div", null);
    const webID = session.info.webId;
    const parts = webID.split("/");
    const pod = parts.slice(0, parts.length - 2).join("/");
    if (!globalState.state.loading) {
      globalState.setState({
        loading: true
      });
      (async () => {
        let loadingStart = new Date().getTime();
        let moviesAclDataset;
        try {
          moviesAclDataset = await getSolidDatasetWithAcl(`${pod}/movies/`, {fetch: session.fetch});
        } catch {
          moviesAclDataset = await createContainerAt(`${pod}/movies/`, {fetch: session.fetch});
        }
        let friendsDataset;
        try {
          friendsDataset = await getSolidDataset(`${pod}/friends`, {fetch: session.fetch});
        } catch {
          friendsDataset = createSolidDataset();
          let groupThing2 = createThing({url: `${pod}/friends#group`});
          groupThing2 = setUrl(groupThing2, RDF.type, "http://www.w3.org/2006/vcard/ns#Group");
          friendsDataset = setThing(friendsDataset, groupThing2);
          await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
        }
        let groupThing = getThing(friendsDataset, `${pod}/friends#group`);
        const profile = await getSolidDataset(`${pod}/profile/card`, {fetch: session.fetch});
        const me = getThing(profile, `${pod}/profile/card#me`);
        const groupFriends = new Set(getUrlAll(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember"));
        const profileFriends = new Set(getUrlAll(me, "http://xmlns.com/foaf/0.1/knows"));
        const newFriends = [...profileFriends].filter((x) => !groupFriends.has(x));
        for (const friend of newFriends) {
          console.log("print friend : " + friend);
          if (friend != webID) {
            groupThing = addUrl(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember", friend);
          }
        }
        const deletedFriends = [...groupFriends].filter((x) => !profileFriends.has(x));
        for (const friend of deletedFriends) {
          groupThing = removeUrl(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember", friend);
        }
        if (newFriends.length > 0 || deletedFriends.length > 0) {
          friendsDataset = setThing(friendsDataset, groupThing);
          await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
        }
        const friends = getUrlAll(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember");
        for (const friend of friends) {
          console.log("friend : " + friend);
        }
        try {
          if (!hasResourceAcl(moviesAclDataset)) {
            let moviesAcl = createAcl(moviesAclDataset);
            moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
            moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
            moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
            moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
            for (const id of friends) {
              moviesAcl = setAgentDefaultAccess(moviesAcl, id, READ_ACCESS);
              moviesAcl = setAgentResourceAccess(moviesAcl, id, READ_ACCESS);
            }
            moviesAcl = setAgentDefaultAccess(moviesAcl, webID, FULL_ACCESS);
            moviesAcl = setAgentResourceAccess(moviesAcl, webID, FULL_ACCESS);
            await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
          }
        } catch {
        }
        try {
          let moviesAcl = createAcl(moviesAclDataset);
          let currentGlobalAccess = getPublicAccess(moviesAclDataset);
          let currentGroupAccess = getGroupAccess(moviesAclDataset, `${pod}/friends#group`);
          if (currentGlobalAccess && !currentGlobalAccess["read"] || currentGroupAccess && !currentGroupAccess["read"]) {
            moviesAcl = setGroupDefaultAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
            moviesAcl = setGroupResourceAccess(moviesAcl, `${pod}/friends#group`, READ_ACCESS);
            moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
            moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
            await saveAclFor(moviesAclDataset, moviesAcl, {fetch: session.fetch});
          }
          if (newFriends.length > 0) {
            let moviesAcl2 = getResourceAcl(moviesAclDataset);
            for (const id of newFriends) {
              moviesAcl2 = setAgentDefaultAccess(moviesAcl2, id, READ_ACCESS);
              moviesAcl2 = setAgentResourceAccess(moviesAcl2, id, READ_ACCESS);
            }
            await saveAclFor(moviesAclDataset, moviesAcl2, {fetch: session.fetch});
          }
          if (deletedFriends.length > 0) {
            let moviesAcl2 = getResourceAcl(moviesAclDataset);
            for (const id of deletedFriends) {
              moviesAcl2 = setAgentDefaultAccess(moviesAcl2, id, NO_ACCESS);
              moviesAcl2 = setAgentResourceAccess(moviesAcl2, id, NO_ACCESS);
            }
            await saveAclFor(moviesAclDataset, moviesAcl2, {fetch: session.fetch});
          }
        } catch {
          console.log("resource ACL isn't setup yet - first sign-up");
        }
        const people = [{type: "me", id: webID}, ...friends.map((x) => ({type: "friend", id: x}))];
        const movieList = (await Promise.all(people.map(async (x) => {
          try {
            const parts2 = x.id.split("/");
            const pod2 = parts2.slice(0, parts2.length - 2).join("/");
            const moviesDataset = await getSolidDataset(`${pod2}/movies/`, {fetch: session.fetch});
            const movies2 = getContainedResourceUrlAll(moviesDataset);
            return movies2.map((m) => ({...x, url: m}));
          } catch {
            return [];
          }
        }))).flat(1);
        const movies = await Promise.all(movieList.map(async ({type, url}) => {
          const movieDataset = await getSolidDataset(url, {fetch: session.fetch});
          const movieThing = getThing(movieDataset, `${url}#it`);
          const things = getThingAll(movieDataset);
          const watched = things.some((x) => getUrl(x, RDF.type) === "https://schema.org/WatchAction");
          const review = things.find((x) => getUrl(x, RDF.type) === "https://schema.org/ReviewAction");
          let liked = null;
          if (review) {
            const ratingUrl = getUrl(review, "https://schema.org/resultReview");
            const rating = getThing(movieDataset, ratingUrl);
            const min = getInteger(rating, "https://schema.org/worstRating");
            const max = getInteger(rating, "https://schema.org/bestRating");
            const value = getInteger(rating, "https://schema.org/ratingValue");
            if (value === max)
              liked = true;
            else if (value === min)
              liked = false;
          }
          let recommended = false;
          const recommend = things.find((x) => getUrl(x, RDF.type) === "https://schema.org/Recommendation");
          if (recommend)
            recommended = true;
          const urls = getStringNoLocaleAll(movieThing, "https://schema.org/sameAs");
          const [tmdbUrl] = urls.filter((x) => x.startsWith("https://www.themoviedb.org/"));
          const {title, released, icon} = await loadData(tmdbUrl);
          return {movie: tmdbUrl, solidUrl: url, type, watched, liked, recommended, title, released, image: icon, dataset: movieDataset};
        }));
        const movieDict = {};
        const myWatched = [];
        const myUnwatched = [];
        const myLiked = [];
        const friendWatched = [];
        const friendUnwatched = [];
        const friendLiked = [];
        const recommendedDict = [];
        for (const {type, ...movie} of movies) {
          switch (type) {
            case "me":
              {
                movieDict[movie.movie] = {...movie, me: true, friend: movieDict[movie.movie]?.friend};
                if (movie.watched && !myWatched.includes(movie.movie)) {
                  myWatched.push(movie.movie);
                } else if (movie.recommended && !recommendedDict.includes(movie.movie)) {
                  recommendedDict.push(movie.movie);
                } else {
                  if (!myUnwatched.includes(movie.movie)) {
                    myUnwatched.push(movie.movie);
                  }
                }
                if (movie.liked && !myLiked.includes(movie.movie)) {
                  myLiked.push(movie.movie);
                }
              }
              break;
            case "friend":
              {
                if (!(movie.movie in movieDict)) {
                  movieDict[movie.movie] = {...movie, watched: false, liked: null, me: false, friend: true};
                } else {
                  movieDict[movie.movie].friend = true;
                }
                if (movie.watched && !friendWatched.includes(movie.movie)) {
                  friendWatched.push(movie.movie);
                } else {
                  if (!friendUnwatched.includes(movie.movie)) {
                    friendUnwatched.push(movie.movie);
                  }
                }
                if (movie.liked && !friendLiked.includes(movie.movie)) {
                  friendLiked.push(movie.movie);
                }
              }
              break;
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
          recommendedDict
        });
        let loadingEnd = new Date().getTime();
        let currentSeconds = (loadingEnd - loadingStart) / 1e3;
        console.log("# of movies loaded: " + movieList.length + " | time taken: " + currentSeconds + " seconds");
        let dataLoadEndedTime = (new Date().getTime() - loadingStart) / 1e3;
        const userMovies = movies.filter((x) => x.type === "me" && !x.recommended);
        const shuffledMovies = userMovies.sort(() => 0.5 - Math.random());
        const sampledMovies = shuffledMovies.slice(0, Math.min(10, shuffledMovies.length));
        const sampledTitles = [];
        for (let movie of sampledMovies) {
          sampledTitles.push(movie.title);
        }
        const response = await fetch("http://5a22-34-125-253-230.ngrok.io/", {
          method: "POST",
          body: JSON.stringify(sampledTitles),
          headers: {
            "Content-Type": "application/json"
          }
        });
        let recommendedList;
        if (response.body !== null) {
          const body = await response.text();
          recommendedList = JSON.parse(body);
          console.log(recommendedList);
        }
        for (const name of recommendedList) {
          const movies2 = await search(name);
          const movie = movies2.find((x) => x.title === name);
          if (movie) {
            save(movie, true);
          }
        }
        let loadingEnd2 = new Date().getTime();
        let currentSeconds2 = (loadingEnd2 - loadingStart) / 1e3;
      })();
    }
    async function addNewFriendData() {
      const FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
      const store = $rdf.graph();
      const fetcher = new $rdf.Fetcher(store, {fetch: session.fetch});
      const updater = new $rdf.UpdateManager(store);
      const me_f = $rdf.sym(webID);
      const profile_f = me_f.doc();
      console.log("My WedID: " + webID);
      let newFriendWebID = document.getElementById("friend").value;
      console.log("new friend to be added : " + newFriendWebID);
      let ins = [];
      ins.push($rdf.st($rdf.sym(webID), FOAF("knows"), $rdf.sym(newFriendWebID), $rdf.sym(webID).doc()));
      updater.update([], ins, (uri, ok_f, message_f) => {
        console.log(uri);
        if (!ok_f) {
          alert(message_f);
        } else {
          window.location.reload();
        }
      });
      let friendsDataset;
      try {
        friendsDataset = await getSolidDataset(`${pod}/friends`, {fetch: session.fetch});
      } catch {
        friendsDataset = createSolidDataset();
        let groupThing2 = createThing({url: `${pod}/friends#group`});
        groupThing2 = setUrl(groupThing2, RDF.type, "http://www.w3.org/2006/vcard/ns#Group");
        friendsDataset = setThing(friendsDataset, groupThing2);
        await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
      }
      let groupThing = getThing(friendsDataset, `${pod}/friends#group`);
      if (newFriendWebID.length != 0) {
        groupThing = addUrl(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember", newFriendWebID);
        friendsDataset = setThing(friendsDataset, groupThing);
        await saveSolidDatasetAt(`${pod}/friends`, friendsDataset, {fetch: session.fetch});
        console.log("new friend added");
        const friends = getUrlAll(groupThing, "http://www.w3.org/2006/vcard/ns#hasMember");
        console.log("friends after adding : " + friends);
      }
    }
    async function save(media, recommended = false, watch2 = false) {
      const ids = await getIds(media.tmdbUrl);
      const datasetName = media.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replaceAll(" ", "-").toLowerCase();
      const datasetUrl = `${pod}/movies/${datasetName}`;
      let movieDataset = createSolidDataset();
      let movie = createThing({url: `${datasetUrl}#it`});
      const time = new Date();
      movie = setDatetime(movie, DCTERMS.created, time);
      movie = setDatetime(movie, DCTERMS.modified, time);
      movie = setUrl(movie, RDF.type, "https://schema.org/Movie");
      if (watch2)
        movie = setUrl(movie, RDF.type, "https://schema.org/WatchAction");
      if (recommended)
        movie = setUrl(movie, RDF.type, "https://schema.org/Recommendation");
      movie = setStringNoLocale(movie, "https://schema.org/name", media.title);
      movie = setStringNoLocale(movie, "https://schema.org/description", media.description);
      movie = setStringNoLocale(movie, "https://schema.org/image", media.image);
      movie = setDatetime(movie, "https://schema.org/datePublished", media.released);
      for (const id of ids)
        movie = addStringNoLocale(movie, "https://schema.org/sameAs", id);
      movieDataset = setThing(movieDataset, movie);
      await saveSolidDatasetAt(datasetUrl, movieDataset, {fetch: session.fetch});
      const movieData = {
        movie: media.tmdbUrl,
        solidUrl: datasetUrl,
        watched: Boolean(watch2),
        liked: null,
        recommended: Boolean(recommended),
        title: media.title,
        released: media.released,
        image: media.image,
        dataset: movieDataset,
        me: true,
        friend: false
      };
      if (!movieData.recommended) {
        if (!movieData.watched) {
          globalState.setState({
            myUnwatched: [media.tmdbUrl, ...globalState.state.myUnwatched],
            movies: {...globalState.state.movies, [media.tmdbUrl]: movieData}
          });
        } else {
          globalState.setState({
            myWatched: [media.tmdbUrl, ...globalState.state.myWatched],
            movies: {...globalState.state.movies, [media.tmdbUrl]: movieData}
          });
        }
      } else {
        globalState.setState({
          recommendedDict: [media.tmdbUrl, ...globalState.state.recommendedDict.filter((x) => x !== media.tmdbUrl)],
          movies: {...globalState.state.movies, [media.tmdbUrl]: movieData}
        });
      }
      return movieData;
    }
    async function watch(media, date = new Date()) {
      let dataset = media.dataset;
      let thing = createThing();
      thing = setUrl(thing, RDF.type, "https://schema.org/WatchAction");
      thing = setDatetime(thing, DCTERMS.created, new Date());
      thing = setDatetime(thing, SCHEMA_INRUPT.startTime, date);
      thing = setDatetime(thing, SCHEMA_INRUPT.endTime, date);
      thing = setUrl(thing, "https://schema.org/object", `${media.movie}#it`);
      dataset = setThing(dataset, thing);
      await saveSolidDatasetAt(media.solidUrl, dataset, {fetch: session.fetch});
      media.dataset = dataset;
      globalState.setState({
        myUnwatched: globalState.state.myUnwatched.filter((x) => x !== media.movie),
        recommendedDict: globalState.state.myUnwatched.filter((x) => x !== media.movie),
        myWatched: [media.movie, ...globalState.state.myWatched],
        movies: {...globalState.state.movies, [media.movie]: {...media, watched: true, dataset}}
      });
    }
    const createCarouselElement = (movie, type) => {
      const movieData = globalState.state.movies[movie];
      const {solidUrl, watched, liked, recommended, title, released, image} = movieData;
      let {dataset} = movieData;
      function remove(type2) {
        for (const thing of getThingAll(dataset)) {
          if (getUrl(thing, RDF.type) === type2) {
            dataset = removeThing(dataset, thing);
          }
        }
      }
      function rate(value) {
        let rating = createThing();
        rating = setUrl(rating, RDF.type, "https://schema.org/Rating");
        rating = setInteger(rating, "https://schema.org/worstRating", 1);
        rating = setInteger(rating, "https://schema.org/bestRating", 3);
        rating = setInteger(rating, "https://schema.org/ratingValue", value);
        dataset = setThing(dataset, rating);
        let review = createThing();
        const time = new Date();
        review = setUrl(review, RDF.type, "https://schema.org/ReviewAction");
        review = setUrl(review, "https://schema.org/resultReview", asUrl(rating, solidUrl));
        review = setDatetime(review, DCTERMS.created, time);
        review = setDatetime(review, SCHEMA_INRUPT.startTime, time);
        review = setDatetime(review, SCHEMA_INRUPT.endTime, time);
        review = setUrl(review, "https://schema.org/object", `${solidUrl}#it`);
        dataset = setThing(dataset, review);
      }
      switch (type) {
        case "me": {
          return /* @__PURE__ */ h(CarouselElement, {
            title,
            subtitle: released.toLocaleDateString("en-GB", DATE_FORMAT),
            image,
            redirect: `${HOMEPAGE}/view?url=${movie}`,
            buttons: [
              ...watched ? [
                {text: "👎", cssClass: "carousel-dislike", selected: liked === false, click: async () => {
                  remove("https://schema.org/Rating");
                  remove("https://schema.org/ReviewAction");
                  if (liked === false) {
                    await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                    globalState.setState({
                      movies: {...globalState.state.movies, [movie]: {...movieData, liked: null, dataset}}
                    });
                  } else {
                    rate(1);
                    await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                    globalState.setState({
                      myLiked: globalState.state.myLiked.filter((x) => x !== movie),
                      movies: {...globalState.state.movies, [movie]: {...movieData, liked: false, dataset}}
                    });
                  }
                }},
                {text: "👍", cssClass: "carousel-like", selected: liked === true, click: async () => {
                  remove("https://schema.org/Rating");
                  remove("https://schema.org/ReviewAction");
                  if (liked === true) {
                    await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                    globalState.setState({
                      myLiked: globalState.state.myLiked.filter((x) => x !== movie),
                      movies: {...globalState.state.movies, [movie]: {...movieData, liked: null, dataset}}
                    });
                  } else {
                    rate(3);
                    await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                    globalState.setState({
                      myLiked: [movie, ...globalState.state.myLiked],
                      movies: {...globalState.state.movies, [movie]: {...movieData, liked: true, dataset}}
                    });
                  }
                }}
              ] : [],
              {text: "✔️", cssClass: "carousel-watch", selected: watched, click: async () => {
                if (watched) {
                  remove("https://schema.org/WatchAction");
                  await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                  globalState.setState({
                    myWatched: globalState.state.myWatched.filter((x) => x !== movie),
                    myUnwatched: [movie, ...globalState.state.myUnwatched],
                    movies: {...globalState.state.movies, [movie]: {...movieData, watched: false, dataset}}
                  });
                } else {
                  let thing = createThing();
                  const time = new Date();
                  thing = setUrl(thing, RDF.type, "https://schema.org/WatchAction");
                  thing = setDatetime(thing, DCTERMS.created, time);
                  thing = setDatetime(thing, SCHEMA_INRUPT.startTime, time);
                  thing = setDatetime(thing, SCHEMA_INRUPT.endTime, time);
                  thing = setUrl(thing, "https://schema.org/object", `${solidUrl}#it`);
                  dataset = setThing(dataset, thing);
                  await saveSolidDatasetAt(solidUrl, dataset, {fetch: session.fetch});
                  globalState.setState({
                    myUnwatched: globalState.state.myUnwatched.filter((x) => x !== movie),
                    recommendedDict: globalState.state.recommendedDict.filter((x) => x !== movie),
                    myWatched: [movie, ...globalState.state.myWatched],
                    movies: {...globalState.state.movies, [movie]: {...movieData, watched: true, dataset}}
                  });
                }
              }},
              {text: "❌", cssClass: "carousel-remove", click: async () => {
                await deleteSolidDataset(solidUrl, {fetch: session.fetch});
                const {[movie]: deleted, ...remaining} = globalState.state.movies;
                const remove2 = [...globalState.state.friendWatched, ...globalState.state.friendUnwatched].every((x) => x !== movie);
                globalState.setState({
                  myUnwatched: globalState.state.myUnwatched.filter((x) => x !== movie),
                  myWatched: globalState.state.myWatched.filter((x) => x !== movie),
                  myLiked: globalState.state.myLiked.filter((x) => x !== movie),
                  recommendedDict: globalState.state.recommendedDict.filter((x) => x !== movie),
                  movies: remove2 ? remaining : globalState.state.movies
                });
              }}
            ]
          });
        }
        case "friend": {
          return /* @__PURE__ */ h(CarouselElement, {
            title,
            subtitle: released.toLocaleDateString("en-GB", DATE_FORMAT),
            image,
            redirect: `${HOMEPAGE}/view?url=${movie}`,
            buttons: [
              {text: "➕", cssClass: "carousel-save", click: async () => {
                if (![...globalState.state.myWatched, ...globalState.state.myUnwatched].some((x) => x === movie)) {
                  const datasetName = title.replace(/[^a-zA-Z0-9-_ ]/g, "").replaceAll(" ", "-").toLowerCase();
                  let movieDataset = createSolidDataset();
                  let thing = getThing(dataset, `${solidUrl}#it`);
                  thing = Object.freeze({...thing, url: `${pod}/movies/${datasetName}#it`});
                  movieDataset = setThing(movieDataset, thing);
                  const newUrl = `${pod}/movies/${datasetName}`;
                  await saveSolidDatasetAt(newUrl, movieDataset, {fetch: session.fetch});
                  globalState.setState({
                    myUnwatched: [movie, ...globalState.state.myUnwatched],
                    movies: {...globalState.state.movies, [movie]: {...movieData, me: true, solidUrl: newUrl, dataset: movieDataset}}
                  });
                }
              }}
            ]
          });
        }
      }
    };
    return /* @__PURE__ */ h("div", {
      class: "movies-page"
    }, /* @__PURE__ */ h("div", {
      class: "logo-container"
    }, /* @__PURE__ */ h("img", {
      src: "./assets/logo.png"
    })), /* @__PURE__ */ h("div", {
      class: "add-button-wrapper"
    }, /* @__PURE__ */ h("button", {
      class: "add-button",
      onClick: () => this.setState({addPopup: true})
    }, "➕ Add movies"), /* @__PURE__ */ h("button", {
      class: "add-button",
      onClick: () => this.setState({addFriends: true})
    }, "👥 Add friends"), /* @__PURE__ */ h("button", {
      class: "add-button",
      onClick: () => {
        session.logout();
        logout();
        async () => {
          await logout();
          session.info.isLoggedIn = false;
        };
        this.setState({showLogout: true});
      }
    }, "👋 Logout")), !globalState.state.friendWatched && /* @__PURE__ */ h("div", {
      style: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)"
      }
    }, /* @__PURE__ */ h("div", {
      class: "loader__filmstrip"
    }), /* @__PURE__ */ h("p", {
      class: "loader__text"
    }, "loading")), globalState.state.friendWatched && !globalState.state.friendWatched.length && globalState.state.friendUnwatched && !globalState.state.friendUnwatched.length && globalState.state.friendLiked && !globalState.state.friendLiked.length && globalState.state.myWatched && !globalState.state.myWatched.length && globalState.state.myUnwatched && !globalState.state.myUnwatched.length && globalState.state.myLiked && !globalState.state.myLiked.length && /* @__PURE__ */ h("div", {
      class: "empty-container-data"
    }, /* @__PURE__ */ h("h3", null, "Add Movies or Friends")), globalState.state.recommendedDict && globalState.state.recommendedDict.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Recommended Movies"), /* @__PURE__ */ h(Carousel, null, (globalState.state.recommendedDict ?? []).map((x) => createCarouselElement(x, "me")))), globalState.state.friendWatched && globalState.state.friendWatched.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Friends Collection"), /* @__PURE__ */ h(Carousel, null, (globalState.state.friendWatched ?? []).map((x) => createCarouselElement(x, "friend")))), globalState.state.friendUnwatched && globalState.state.friendUnwatched.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Friends Wishlist"), /* @__PURE__ */ h(Carousel, null, (globalState.state.friendUnwatched ?? []).map((x) => createCarouselElement(x, "friend")))), globalState.state.friendLiked && globalState.state.friendLiked.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Friends enjoyed"), /* @__PURE__ */ h(Carousel, null, (globalState.state.friendLiked ?? []).map((x) => createCarouselElement(x, "friend")))), globalState.state.myWatched && globalState.state.myWatched.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Your Collection"), /* @__PURE__ */ h(Carousel, null, (globalState.state.myWatched ?? []).map((x) => createCarouselElement(x, "me")))), globalState.state.myUnwatched && globalState.state.myUnwatched.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "Your Wishlist"), /* @__PURE__ */ h(Carousel, null, (globalState.state.myUnwatched ?? []).map((x) => createCarouselElement(x, "me")))), globalState.state.myLiked && globalState.state.myLiked.length != 0 && /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h3", {
      style: "margin-left: 2%;"
    }, "You enjoyed"), /* @__PURE__ */ h(Carousel, null, (globalState.state.myLiked ?? []).map((x) => createCarouselElement(x, "me")))), this.state.addPopup && /* @__PURE__ */ h(AddPopup, {
      close: () => this.setState({addPopup: false}),
      save: async (media) => {
        if (!Object.values(globalState.state.movies).some((x) => x.title === media.title)) {
          await save(media, false);
        }
      },
      watch: async (media) => {
        let data = Object.values(globalState.state.movies).find((x) => x.title === media.title);
        if (data) {
          let movieWebID = data.solidUrl;
          const movieWebIDParts = movieWebID.split("/");
          const movieWebIDPod = movieWebIDParts.slice(0, movieWebIDParts.length - 2).join("/");
          const webID2 = session.info.webId;
          const parts2 = webID2.split("/");
          const pod2 = parts2.slice(0, parts2.length - 2).join("/");
          if (movieWebIDPod != pod2) {
            data = await save(media, false, true);
          }
        } else {
          data = await save(media, false, true);
        }
      }
    }), this.state.addFriends && /* @__PURE__ */ h(AddFriends, {
      close: () => {
        this.setState({addFriends: false});
      },
      add: () => {
        addNewFriendData();
        this.setState({addFriends: false});
      }
    }), this.state.showLogout && /* @__PURE__ */ h(Logout, {
      close: () => {
        this.setState({showLogout: false});
      },
      add: () => {
        this.setState({showLogout: false});
      }
    }));
  }
}
