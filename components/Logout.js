import {h, Component} from "../_snowpack/pkg/preact.js";
export default class Logout extends Component {
  render({close, add}) {
    return /* @__PURE__ */ h("div", {
      class: "add-popup"
    }, /* @__PURE__ */ h("div", {
      class: "add-logout-menu"
    }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", {
      style: "text-align: center"
    }, "Logout Successful"), /* @__PURE__ */ h("div", {
      class: "btn"
    }, /* @__PURE__ */ h("input", {
      class: "btn-primary",
      type: "submit",
      onClick: close,
      value: "Return to Login"
    })))));
  }
}
