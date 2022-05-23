import {h, Component} from "../_snowpack/pkg/preact.js";
export default class Loading extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      contents: null
    };
  }
  componentWillReceiveProps(nextProps) {
    this.setState({contents: null});
  }
  render({render}) {
    if (this.state.contents !== null) {
      return this.state.contents;
    } else if (render !== void 0) {
      render().then((contents) => this.setState({contents}));
    }
    return /* @__PURE__ */ h("div", null, "Loading...");
  }
}
