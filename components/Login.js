import {h, Component, Fragment} from "../_snowpack/pkg/preact.js";
import {Redirect} from "../_snowpack/pkg/wouter-preact.js";
import {session} from "./authentication.js";
import Loading from "./Loading.js";
import Form from "./Form.js";
import {HOMEPAGE} from "../env.js";
const providers = [
  {title: "inrupt.net", url: "https://inrupt.net/"},
  {title: "solidcommunity.net", url: "https://solidcommunity.net/"},
  {title: "Solid Web", url: "https://solidweb.org/"},
  {title: "solidweb.me", url: "https://solidweb.me/"}
];
export default class Login extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      handleRedirect: true,
      provider: ""
    };
  }
  render({redirect}) {
    if (session.info.isLoggedIn) {
      return /* @__PURE__ */ h(Redirect, {
        to: redirect ?? `${HOMEPAGE}/`
      });
    } else if (this.state.handleRedirect) {
      session.handleIncomingRedirect({restorePreviousSession: true}).then(() => {
        this.setState({handleRedirect: false});
      });
      return /* @__PURE__ */ h(Loading, null);
    } else {
      return /* @__PURE__ */ h("div", {
        class: "login-page"
      }, /* @__PURE__ */ h("header", {
        class: "showcase"
      }, /* @__PURE__ */ h("div", {
        class: "logo"
      }, /* @__PURE__ */ h("img", {
        src: "./assets/logo.png"
      })), /* @__PURE__ */ h("div", {
        class: "showcase-content"
      }, /* @__PURE__ */ h("div", {
        class: "formm"
      }, /* @__PURE__ */ h(Form, {
        submit: ({provider}) => session.login({
          oidcIssuer: provider,
          clientName: "Solid Media",
          redirectUrl: window.location.href
        })
      }, /* @__PURE__ */ h("h3", null, "Sign In"), /* @__PURE__ */ h("h3", null, "Select or enter your pod provider"), /* @__PURE__ */ h("div", {
        class: "pod-input-container"
      }, /* @__PURE__ */ h("div", {
        class: "info"
      }, /* @__PURE__ */ h("input", {
        class: "provider",
        id: "provider",
        name: "provider",
        type: "text",
        placeholder: "Pod Provider",
        value: this.state.provider,
        onInput: ({target}) => this.setState({provider: target.value})
      })), /* @__PURE__ */ h("div", {
        class: "btn1"
      }, /* @__PURE__ */ h("input", {
        class: "btn-secondary",
        type: "submit",
        value: "Login"
      }))), providers.map(({url, title}) => /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("div", {
        class: "btn"
      }, /* @__PURE__ */ h("input", {
        class: "btn-primary",
        type: "submit",
        onClick: () => this.setState({provider: url}),
        value: title
      })), /* @__PURE__ */ h("br", null))))))));
    }
  }
}
