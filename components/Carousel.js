import {h, Component, toChildArray, createRef} from "../_snowpack/pkg/preact.js";
import {useLocation} from "../_snowpack/pkg/wouter-preact.js";
import {noDefault} from "./lib.js";
export default class Carousel extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      scroll: 0
    };
    this.list = createRef();
  }
  render({children}) {
    const count = toChildArray(children).length;
    return /* @__PURE__ */ h("div", {
      class: "carousel"
    }, /* @__PURE__ */ h("div", {
      ref: this.list,
      class: "carousel-list"
    }, /* @__PURE__ */ h("div", {
      class: "carousel-list-scroll",
      style: `width: ${27 * count + 1}vw`
    }, children)), /* @__PURE__ */ h("button", {
      onClick: () => this.setState({scroll: Math.max(0, this.state.scroll - 3)}),
      class: "carousel-left"
    }, "❮"), /* @__PURE__ */ h("button", {
      onClick: () => this.setState({scroll: Math.min(count - 3, this.state.scroll + 3)}),
      class: "carousel-right"
    }, "❯"));
  }
  componentDidUpdate() {
    const scroll = Math.min(toChildArray(this.props.children).length - 3, Math.max(0, this.state.scroll - 0.3));
    this.list.current.scrollLeft = scroll * 0.27 * window.innerWidth;
  }
}
export class CarouselElement extends Component {
  render({title, subtitle, image, redirect, buttons = []}) {
    const [location, setLocation] = useLocation();
    return /* @__PURE__ */ h("div", {
      onClick: noDefault(() => redirect && setLocation(redirect)),
      class: "carousel-panel"
    }, /* @__PURE__ */ h("div", {
      class: "carousel-element"
    }, /* @__PURE__ */ h("img", {
      class: "carousel-image",
      src: image
    }), /* @__PURE__ */ h("div", {
      class: "carousel-body"
    }, /* @__PURE__ */ h("p", {
      class: "carousel-title"
    }, title), /* @__PURE__ */ h("p", {
      class: "carousel-subtitle"
    }, subtitle), buttons.map(({text, click, cssClass, selected}, i) => /* @__PURE__ */ h("p", {
      class: `carousel-button ${selected ? "carousel-selected" : ""} ${cssClass}`,
      onClick: noDefault(click),
      style: `right: ${1 + 2 * i}vw`
    }, text)))));
  }
}
