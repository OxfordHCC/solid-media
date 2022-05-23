import {h, Component} from "../_snowpack/pkg/preact.js";
import DiscoverPane from "./DiscoverPane.js";
export default class HomeScreen extends Component {
  render({globalState}) {
    return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h(DiscoverPane, {
      globalState
    }));
  }
}
