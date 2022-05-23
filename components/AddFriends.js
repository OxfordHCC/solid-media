import {h, Component} from "../_snowpack/pkg/preact.js";
export default class AddFriends extends Component {
  render({close, add}) {
    return /* @__PURE__ */ h("div", {
      class: "add-popup"
    }, /* @__PURE__ */ h("div", {
      class: "add-logout-menu",
      style: "height: 30vh"
    }, /* @__PURE__ */ h("button", {
      class: "add-popup-close",
      onClick: close
    }, "❌"), /* @__PURE__ */ h("div", {
      class: "add-friends-container"
    }, /* @__PURE__ */ h("h2", null, "Add Friends"), /* @__PURE__ */ h("h4", null, "Enter the webID"), /* @__PURE__ */ h("input", {
      id: "friend"
    }), /* @__PURE__ */ h("input", {
      class: "btn-primary",
      type: "submit",
      onClick: add,
      value: "Add"
    }))));
  }
}
