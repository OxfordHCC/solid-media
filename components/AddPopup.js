import {h, Component, createRef} from "../_snowpack/pkg/preact.js";
import Loading from "./Loading.js";
import {search} from "../media.js";
const DATE_FORMAT = {
  year: "numeric",
  month: "long"
};
export default class AddPopup extends Component {
  constructor() {
    super(...arguments);
    this.state = {subPopup: null};
    this.fileInput = createRef();
  }
  render({close, save, watch}) {
    return /* @__PURE__ */ h("div", {
      class: "add-popup"
    }, /* @__PURE__ */ h("div", {
      class: "add-popup-menu"
    }, /* @__PURE__ */ h("button", {
      class: "add-popup-close",
      onClick: close
    }, "❌"), this.state.subPopup === "netflix" ? /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", null, "Import from Netflix"), /* @__PURE__ */ h("ol", null, /* @__PURE__ */ h("li", null, "Open Netflix"), /* @__PURE__ */ h("li", null, "Under 'Account -> Profile & parental controls' click on 'Viewing activity'"), /* @__PURE__ */ h("li", null, "Click on 'Download all'"), /* @__PURE__ */ h("li", null, "Save the file, then import it below:")), /* @__PURE__ */ h("input", {
      type: "file",
      onChange: async () => {
        const [file] = this.fileInput.current.files;
        if (file) {
          const data = await file.text();
          const [, ...lines] = data.split("\n").slice(0, -1);
          for (const line of lines) {
            const [, name, watched] = line.match(/"([^"]*)","([^"]*)"/);
            if (!name.includes(": Season ")) {
              const movies = await search(name);
              const movie = movies.find((x) => x.title === name);
              if (movie) {
                watch(movie, new Date(watched));
              }
            }
          }
          close();
        }
      },
      ref: this.fileInput
    })) : /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("h2", null, "Add movies:"), /* @__PURE__ */ h(AddPopupSearchList, {
      close,
      save,
      watch
    }), /* @__PURE__ */ h("div", {
      class: "add-popup-option",
      onClick: () => {
        this.setState({subPopup: "netflix"});
      }
    }, "Import from Netflix"))));
  }
}
class AddPopupSearchList extends Component {
  constructor() {
    super(...arguments);
    this.ref = createRef();
    this.state = {
      results: /* @__PURE__ */ h("div", null)
    };
  }
  render({close, save, watch}) {
    return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("input", {
      type: "text",
      class: "add-popup-search-box",
      ref: this.ref
    }), /* @__PURE__ */ h("input", {
      type: "button",
      class: "add-popup-search-button",
      value: "Search",
      onClick: () => {
        this.setState({
          results: /* @__PURE__ */ h(Loading, {
            render: async () => {
              const results = await search(this.ref.current.value);
              return /* @__PURE__ */ h("div", null, results.map((r) => {
                return /* @__PURE__ */ h("div", {
                  class: "add-popup-search-result"
                }, /* @__PURE__ */ h("div", {
                  class: "add-popup-search-results-text"
                }, `${r.title} - ${r.released.toLocaleDateString("en-GB", DATE_FORMAT)}`), /* @__PURE__ */ h("div", {
                  class: "add-popup-search-result-buttons"
                }, /* @__PURE__ */ h("div", {
                  class: "add-popup-search-result-watch",
                  onClick: () => {
                    watch(r);
                    close();
                  }
                }, "✔️"), /* @__PURE__ */ h("div", {
                  class: "add-popup-search-result-save",
                  onClick: () => {
                    save(r);
                    close();
                  }
                }, "➕")));
              }));
            }
          })
        });
      }
    }), /* @__PURE__ */ h("div", {
      class: "add-popup-search-results"
    }, this.state.results));
  }
}
