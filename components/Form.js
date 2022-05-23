import {h, Component} from "../_snowpack/pkg/preact.js";
export default class Form extends Component {
  render({submit, children}) {
    return /* @__PURE__ */ h("form", {
      onSubmit: (e) => {
        e.preventDefault();
        submit(Object.fromEntries(new FormData(e.target).entries()));
      }
    }, children);
  }
}
