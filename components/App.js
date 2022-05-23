import {h, Component} from "../_snowpack/pkg/preact.js";
import {Router, Switch, Route, useLocation} from "../_snowpack/pkg/wouter-preact.js";
import Login from "./Login.js";
import HomeScreen from "./HomeScreen.js";
import ViewScreen from "./ViewScreen.js";
import {getSearchParam} from "./lib.js";
import {HOMEPAGE} from "../env.js";
export default class App extends Component {
  constructor() {
    super(...arguments);
    this.state = {};
  }
  render({}) {
    const [location, setLocation] = useLocation();
    const spaUrl = getSearchParam("spaurl");
    if (spaUrl !== null)
      setLocation(spaUrl);
    return /* @__PURE__ */ h(Router, null, /* @__PURE__ */ h(Switch, null, /* @__PURE__ */ h(Route, {
      path: `${HOMEPAGE}/login`,
      component: () => /* @__PURE__ */ h(Login, {
        redirect: getSearchParam("redirect")
      })
    }), /* @__PURE__ */ h(Route, {
      path: `${HOMEPAGE}/view`,
      component: () => /* @__PURE__ */ h(ViewScreen, {
        url: getSearchParam("url")
      })
    }), /* @__PURE__ */ h(Route, {
      path: `${HOMEPAGE}/`,
      component: () => /* @__PURE__ */ h(HomeScreen, {
        globalState: this
      })
    })));
  }
}
