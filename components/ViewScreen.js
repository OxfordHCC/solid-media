import {h, Component} from "../_snowpack/pkg/preact.js";
import Loading from "./Loading.js";
import {loadData} from "../media.js";
import {useLocation} from "../_snowpack/pkg/wouter-preact.js";
import {HOMEPAGE} from "../env.js";
export default class ViewScreen extends Component {
  render({url}) {
    const [location, setLocation] = useLocation();
    return /* @__PURE__ */ h(Loading, {
      render: async () => {
        const {title, description, released, image, backdrop} = await loadData(url);
        return /* @__PURE__ */ h("div", {
          class: "view"
        }, /* @__PURE__ */ h("img", {
          class: "view-background",
          src: backdrop
        }), /* @__PURE__ */ h("img", {
          class: "view-image",
          src: image
        }), /* @__PURE__ */ h("div", {
          class: "view-body"
        }, /* @__PURE__ */ h("h1", {
          class: "view-title"
        }, title), /* @__PURE__ */ h("p", {
          class: "view-description"
        }, description)), /* @__PURE__ */ h("button", {
          class: "back-button",
          onClick: () => setLocation(`${HOMEPAGE}/`)
        }, "◀"), /* @__PURE__ */ h("div", {
          class: "view-background-colour"
        }));
      }
    });
  }
}
