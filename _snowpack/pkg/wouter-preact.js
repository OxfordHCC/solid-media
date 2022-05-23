import { l as l$1, D, v as v$1, d as d$1, i as i$1, B } from './common/preact.module-b01247cf.js';

var t,u,r,o=0,i=[],c=l$1.__b,f=l$1.__r,e=l$1.diffed,a=l$1.__c,v=l$1.unmount;function l(t,r){l$1.__h&&l$1.__h(u,t,o||r),o=0;var i=u.__H||(u.__H={__:[],__h:[]});return t>=i.__.length&&i.__.push({}),i.__[t]}function m(n){return o=1,p(w,n)}function p(n,r,o){var i=l(t++,2);return i.t=n,i.__c||(i.__=[o?o(r):w(void 0,r),function(n){var t=i.t(i.__[0],n);i.__[0]!==t&&(i.__=[t,i.__[1]],i.__c.setState({}));}],i.__c=u),i.__}function y(r,o){var i=l(t++,3);!l$1.__s&&k(i.__H,o)&&(i.__=r,i.__H=o,u.__H.__h.push(i));}function d(r,o){var i=l(t++,4);!l$1.__s&&k(i.__H,o)&&(i.__=r,i.__H=o,u.__h.push(i));}function h(n){return o=5,_(function(){return {current:n}},[])}function _(n,u){var r=l(t++,7);return k(r.__H,u)&&(r.__=n(),r.__H=u,r.__h=n),r.__}function A(n,t){return o=8,_(function(){return n},t)}function F(n){var r=u.context[n.__c],o=l(t++,9);return o.c=n,r?(null==o.__&&(o.__=!0,r.sub(u)),r.props.value):n.__}function x(){for(var t;t=i.shift();)if(t.__P)try{t.__H.__h.forEach(g),t.__H.__h.forEach(j),t.__H.__h=[];}catch(u){t.__H.__h=[],l$1.__e(u,t.__v);}}l$1.__b=function(n){u=null,c&&c(n);},l$1.__r=function(n){f&&f(n),t=0;var r=(u=n.__c).__H;r&&(r.__h.forEach(g),r.__h.forEach(j),r.__h=[]);},l$1.diffed=function(t){e&&e(t);var o=t.__c;o&&o.__H&&o.__H.__h.length&&(1!==i.push(o)&&r===l$1.requestAnimationFrame||((r=l$1.requestAnimationFrame)||function(n){var t,u=function(){clearTimeout(r),b&&cancelAnimationFrame(t),setTimeout(n);},r=setTimeout(u,100);b&&(t=requestAnimationFrame(u));})(x)),u=null;},l$1.__c=function(t,u){u.some(function(t){try{t.__h.forEach(g),t.__h=t.__h.filter(function(n){return !n.__||j(n)});}catch(r){u.some(function(n){n.__h&&(n.__h=[]);}),u=[],l$1.__e(r,t.__v);}}),a&&a(t,u);},l$1.unmount=function(t){v&&v(t);var u,r=t.__c;r&&r.__H&&(r.__H.__.forEach(function(n){try{g(n);}catch(n){u=n;}}),u&&l$1.__e(u,r.__v));};var b="function"==typeof requestAnimationFrame;function g(n){var t=u,r=n.__c;"function"==typeof r&&(n.__c=void 0,r()),u=t;}function j(n){var t=u;n.__c=n.__(),u=t;}function k(n,t){return !n||n.length!==t.length||t.some(function(t,u){return t!==n[u]})}function w(n,t){return "function"==typeof t?t(n):t}

/**
 * History API docs @see https://developer.mozilla.org/en-US/docs/Web/API/History
 */
const eventPopstate = "popstate";
const eventPushState = "pushState";
const eventReplaceState = "replaceState";
const events = [eventPopstate, eventPushState, eventReplaceState];

var locationHook = ({ base = "" } = {}) => {
  const [{ path, search }, update] = m(() => ({
    path: currentPathname(base),
    search: location.search,
  })); // @see https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const prevHash = h(path + search);

  y(() => {
    // this function checks if the location has been changed since the
    // last render and updates the state only when needed.
    // unfortunately, we can't rely on `path` value here, since it can be stale,
    // that's why we store the last pathname in a ref.
    const checkForUpdates = () => {
      const pathname = currentPathname(base);
      const search = location.search;
      const hash = pathname + search;

      if (prevHash.current !== hash) {
        prevHash.current = hash;
        update({ path: pathname, search });
      }
    };

    events.forEach((e) => addEventListener(e, checkForUpdates));

    // it's possible that an update has occurred between render and the effect handler,
    // so we run additional check on mount to catch these updates. Based on:
    // https://gist.github.com/bvaughn/e25397f70e8c65b0ae0d7c90b731b189
    checkForUpdates();

    return () => events.forEach((e) => removeEventListener(e, checkForUpdates));
  }, [base]);

  // the 2nd argument of the `useLocation` return value is a function
  // that allows to perform a navigation.
  //
  // the function reference should stay the same between re-renders, so that
  // it can be passed down as an element prop without any performance concerns.
  const navigate = A(
    (to, { replace = false } = {}) =>
      history[replace ? eventReplaceState : eventPushState](
        null,
        "",
        // handle nested routers and absolute paths
        to[0] === "~" ? to.slice(1) : base + to
      ),
    [base]
  );

  return [path, navigate];
};

// While History API does have `popstate` event, the only
// proper way to listen to changes via `push/replaceState`
// is to monkey-patch these methods.
//
// See https://stackoverflow.com/a/4585031
if (typeof history !== "undefined") {
  for (const type of [eventPushState, eventReplaceState]) {
    const original = history[type];

    history[type] = function () {
      const result = original.apply(this, arguments);
      const event = new Event(type);
      event.arguments = arguments;

      dispatchEvent(event);
      return result;
    };
  }
}

const currentPathname = (base, path = location.pathname) =>
  !path.toLowerCase().indexOf(base.toLowerCase())
    ? path.slice(base.length) || "/"
    : "~" + path;

// creates a matcher function
function makeMatcher(makeRegexpFn = pathToRegexp) {
  let cache = {};

  // obtains a cached regexp version of the pattern
  const getRegexp = (pattern) =>
    cache[pattern] || (cache[pattern] = makeRegexpFn(pattern));

  return (pattern, path) => {
    const { regexp, keys } = getRegexp(pattern || "");
    const out = regexp.exec(path);

    if (!out) return [false, null];

    // formats an object with matched params
    const params = keys.reduce((params, key, i) => {
      params[key.name] = out[i + 1];
      return params;
    }, {});

    return [true, params];
  };
}

// escapes a regexp string (borrowed from path-to-regexp sources)
// https://github.com/pillarjs/path-to-regexp/blob/v3.0.0/index.js#L202
const escapeRx = (str) => str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

// returns a segment representation in RegExp based on flags
// adapted and simplified version from path-to-regexp sources
const rxForSegment = (repeat, optional, prefix) => {
  let capture = repeat ? "((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*)" : "([^\\/]+?)";
  if (optional && prefix) capture = "(?:\\/" + capture + ")";
  return capture + (optional ? "?" : "");
};

const pathToRegexp = (pattern) => {
  const groupRx = /:([A-Za-z0-9_]+)([?+*]?)/g;

  let match = null,
    lastIndex = 0,
    keys = [],
    result = "";

  while ((match = groupRx.exec(pattern)) !== null) {
    const [_, segment, mod] = match;

    // :foo  [1]      (  )
    // :foo? [0 - 1]  ( o)
    // :foo+ [1 - ∞]  (r )
    // :foo* [0 - ∞]  (ro)
    const repeat = mod === "+" || mod === "*";
    const optional = mod === "?" || mod === "*";
    const prefix = optional && pattern[match.index - 1] === "/" ? 1 : 0;

    const prev = pattern.substring(lastIndex, match.index - prefix);

    keys.push({ name: segment });
    lastIndex = groupRx.lastIndex;

    result += escapeRx(prev) + rxForSegment(repeat, optional, prefix);
  }

  result += escapeRx(pattern.substring(lastIndex));
  return { keys, regexp: new RegExp("^" + result + "(?:\\/)?$", "i") };
};

/*
 * Part 1, Hooks API: useRouter, useRoute and useLocation
 */

// one of the coolest features of `createContext`:
// when no value is provided — default object is used.
// allows us to use the router context as a global ref to store
// the implicitly created router (see `useRouter` below)
const RouterCtx = D({});

const buildRouter = ({
  hook = locationHook,
  base = "",
  matcher = makeMatcher(),
} = {}) => ({ hook, base, matcher });

const useRouter = () => {
  const globalRef = F(RouterCtx);

  // either obtain the router from the outer context (provided by the
  // `<Router /> component) or create an implicit one on demand.
  return globalRef.v || (globalRef.v = buildRouter());
};

const useLocation = () => {
  const router = useRouter();
  return router.hook(router);
};

const useRoute = (pattern) => {
  const [path] = useLocation();
  return useRouter().matcher(pattern, path);
};

// internal hook used by Link and Redirect in order to perform navigation
const useNavigate = (options) => {
  const navRef = h();
  const [, navigate] = useLocation();

  navRef.current = () => navigate(options.to || options.href, options);
  return navRef;
};

/*
 * Part 2, Low Carb Router API: Router, Route, Link, Switch
 */

const Router = (props) => {
  const ref = h();

  // this little trick allows to avoid having unnecessary
  // calls to potentially expensive `buildRouter` method.
  // https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
  const value = ref.current || (ref.current = { v: buildRouter(props) });

  return v$1(RouterCtx.Provider, {
    value,
    children: props.children,
  });
};

const Route = ({ path, match, component, children }) => {
  const useRouteMatch = useRoute(path);

  // `props.match` is present - Route is controlled by the Switch
  const [matches, params] = match || useRouteMatch;

  if (!matches) return null;

  // React-Router style `component` prop
  if (component) return v$1(component, { params });

  // support render prop or plain children
  return typeof children === "function" ? children(params) : children;
};

const flattenChildren = (children) => {
  return Array.isArray(children)
    ? [].concat(
        ...children.map((c) =>
          c && c.type === d$1
            ? flattenChildren(c.props.children)
            : flattenChildren(c)
        )
      )
    : [children];
};

const Switch = ({ children, location }) => {
  const { matcher } = useRouter();
  const [originalLocation] = useLocation();

  for (const element of flattenChildren(children)) {
    let match = 0;

    if (
      i$1(element) &&
      // we don't require an element to be of type Route,
      // but we do require it to contain a truthy `path` prop.
      // this allows to use different components that wrap Route
      // inside of a switch, for example <AnimatedRoute />.
      (match = element.props.path
        ? matcher(element.props.path, location || originalLocation)
        : [true, {}])[0]
    )
      return B(element, { match });
  }

  return null;
};

const Redirect = (props) => {
  const navRef = useNavigate(props);

  // empty array means running the effect once, navRef is a ref so it never changes
  d(() => {
    navRef.current();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export { Redirect, Route, Router, Switch, useLocation };
