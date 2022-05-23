import { c as commonjsGlobal, g as getDefaultExportFromNamespaceIfNotNamed, a as createCommonjsModule, b as getDefaultExportFromCjs } from './common/_commonjsHelpers-fdecda49.js';
import { a as N3Parser, N as N3Writer, g as global } from './common/N3Writer-744d9ae7.js';
import { p as process } from './common/process-2545f00a.js';
import { b as browserPonyfill, a as crossFetch } from './common/browser-ponyfill-c9a58b8e.js';

/*
 * Copyright (c) 2016-2021 Digital Bazaar, Inc. All rights reserved.
 */

var IdentifierIssuer_1 = class IdentifierIssuer {
  /**
   * Creates a new IdentifierIssuer. A IdentifierIssuer issues unique
   * identifiers, keeping track of any previously issued identifiers.
   *
   * @param prefix the prefix to use ('<prefix><counter>').
   * @param existing an existing Map to use.
   * @param counter the counter to use.
   */
  constructor(prefix, existing = new Map(), counter = 0) {
    this.prefix = prefix;
    this._existing = existing;
    this.counter = counter;
  }

  /**
   * Copies this IdentifierIssuer.
   *
   * @return a copy of this IdentifierIssuer.
   */
  clone() {
    const {prefix, _existing, counter} = this;
    return new IdentifierIssuer(prefix, new Map(_existing), counter);
  }

  /**
   * Gets the new identifier for the given old identifier, where if no old
   * identifier is given a new identifier will be generated.
   *
   * @param [old] the old identifier to get the new identifier for.
   *
   * @return the new identifier.
   */
  getId(old) {
    // return existing old identifier
    const existing = old && this._existing.get(old);
    if(existing) {
      return existing;
    }

    // get next identifier
    const identifier = this.prefix + this.counter;
    this.counter++;

    // save mapping
    if(old) {
      this._existing.set(old, identifier);
    }

    return identifier;
  }

  /**
   * Returns true if the given old identifer has already been assigned a new
   * identifier.
   *
   * @param old the old identifier to check.
   *
   * @return true if the old identifier has been assigned a new identifier,
   *   false if not.
   */
  hasId(old) {
    return this._existing.has(old);
  }

  /**
   * Returns all of the IDs that have been issued new IDs in the order in
   * which they were issued new IDs.
   *
   * @return the list of old IDs that has been issued new IDs in order.
   */
  getOldIds() {
    return [...this._existing.keys()];
  }
};

(function (global, undefined$1) {

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined$1, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof commonjsGlobal === "undefined" ? commonjsGlobal : commonjsGlobal : self));

const crypto = self.crypto || self.msCrypto;

// TODO: synchronous version no longer supported in browser

var MessageDigestBrowser = class MessageDigest {
  /**
   * Creates a new MessageDigest.
   *
   * @param algorithm the algorithm to use.
   */
  constructor(algorithm) {
    // check if crypto.subtle is available
    // check is here rather than top-level to only fail if class is used
    if(!(crypto && crypto.subtle)) {
      throw new Error('crypto.subtle not found.');
    }
    if(algorithm === 'sha256') {
      this.algorithm = {name: 'SHA-256'};
    } else if(algorithm === 'sha1') {
      this.algorithm = {name: 'SHA-1'};
    } else {
      throw new Error(`Unsupport algorithm "${algorithm}".`);
    }
    this._content = '';
  }

  update(msg) {
    this._content += msg;
  }

  async digest() {
    const data = new TextEncoder().encode(this._content);
    const buffer = new Uint8Array(
      await crypto.subtle.digest(this.algorithm, data));
    // return digest in hex
    let hex = '';
    for(let i = 0; i < buffer.length; ++i) {
      hex += buffer[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
};

/*
 * Copyright (c) 2016-2021 Digital Bazaar, Inc. All rights reserved.
 */

// TODO: convert to ES6 iterable?

var Permuter_1 = class Permuter {
  /**
   * A Permuter iterates over all possible permutations of the given array
   * of elements.
   *
   * @param list the array of elements to iterate over.
   */
  constructor(list) {
    // original array
    this.current = list.sort();
    // indicates whether there are more permutations
    this.done = false;
    // directional info for permutation algorithm
    this.dir = new Map();
    for(let i = 0; i < list.length; ++i) {
      this.dir.set(list[i], true);
    }
  }

  /**
   * Returns true if there is another permutation.
   *
   * @return true if there is another permutation, false if not.
   */
  hasNext() {
    return !this.done;
  }

  /**
   * Gets the next permutation. Call hasNext() to ensure there is another one
   * first.
   *
   * @return the next permutation.
   */
  next() {
    // copy current permutation to return it
    const {current, dir} = this;
    const rval = current.slice();

    /* Calculate the next permutation using the Steinhaus-Johnson-Trotter
     permutation algorithm. */

    // get largest mobile element k
    // (mobile: element is greater than the one it is looking at)
    let k = null;
    let pos = 0;
    const length = current.length;
    for(let i = 0; i < length; ++i) {
      const element = current[i];
      const left = dir.get(element);
      if((k === null || element > k) &&
        ((left && i > 0 && element > current[i - 1]) ||
        (!left && i < (length - 1) && element > current[i + 1]))) {
        k = element;
        pos = i;
      }
    }

    // no more permutations
    if(k === null) {
      this.done = true;
    } else {
      // swap k and the element it is looking at
      const swap = dir.get(k) ? pos - 1 : pos + 1;
      current[pos] = current[swap];
      current[swap] = k;

      // reverse the direction of all elements larger than k
      for(const element of current) {
        if(element > k) {
          dir.set(element, !dir.get(element));
        }
      }
    }

    return rval;
  }
};

/*
 * Copyright (c) 2016-2021 Digital Bazaar, Inc. All rights reserved.
 */
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDF_LANGSTRING = RDF + 'langString';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

const TYPE_NAMED_NODE = 'NamedNode';
const TYPE_BLANK_NODE = 'BlankNode';
const TYPE_LITERAL = 'Literal';
const TYPE_DEFAULT_GRAPH = 'DefaultGraph';

// build regexes
const REGEX = {};
(() => {
  const iri = '(?:<([^:]+:[^>]*)>)';
  // https://www.w3.org/TR/turtle/#grammar-production-BLANK_NODE_LABEL
  const PN_CHARS_BASE =
    'A-Z' + 'a-z' +
    '\u00C0-\u00D6' +
    '\u00D8-\u00F6' +
    '\u00F8-\u02FF' +
    '\u0370-\u037D' +
    '\u037F-\u1FFF' +
    '\u200C-\u200D' +
    '\u2070-\u218F' +
    '\u2C00-\u2FEF' +
    '\u3001-\uD7FF' +
    '\uF900-\uFDCF' +
    '\uFDF0-\uFFFD';
    // TODO:
    //'\u10000-\uEFFFF';
  const PN_CHARS_U =
    PN_CHARS_BASE +
    '_';
  const PN_CHARS =
    PN_CHARS_U +
    '0-9' +
    '-' +
    '\u00B7' +
    '\u0300-\u036F' +
    '\u203F-\u2040';
  const BLANK_NODE_LABEL =
    '(_:' +
      '(?:[' + PN_CHARS_U + '0-9])' +
      '(?:(?:[' + PN_CHARS + '.])*(?:[' + PN_CHARS + ']))?' +
    ')';
  const bnode = BLANK_NODE_LABEL;
  const plain = '"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"';
  const datatype = '(?:\\^\\^' + iri + ')';
  const language = '(?:@([a-zA-Z]+(?:-[a-zA-Z0-9]+)*))';
  const literal = '(?:' + plain + '(?:' + datatype + '|' + language + ')?)';
  const ws = '[ \\t]+';
  const wso = '[ \\t]*';

  // define quad part regexes
  const subject = '(?:' + iri + '|' + bnode + ')' + ws;
  const property = iri + ws;
  const object = '(?:' + iri + '|' + bnode + '|' + literal + ')' + wso;
  const graphName = '(?:\\.|(?:(?:' + iri + '|' + bnode + ')' + wso + '\\.))';

  // end of line and empty regexes
  REGEX.eoln = /(?:\r\n)|(?:\n)|(?:\r)/g;
  REGEX.empty = new RegExp('^' + wso + '$');

  // full quad regex
  REGEX.quad = new RegExp(
    '^' + wso + subject + property + object + graphName + wso + '$');
})();

var NQuads_1 = class NQuads {
  /**
   * Parses RDF in the form of N-Quads.
   *
   * @param input the N-Quads input to parse.
   *
   * @return an RDF dataset (an array of quads per http://rdf.js.org/).
   */
  static parse(input) {
    // build RDF dataset
    const dataset = [];

    const graphs = {};

    // split N-Quad input into lines
    const lines = input.split(REGEX.eoln);
    let lineNumber = 0;
    for(const line of lines) {
      lineNumber++;

      // skip empty lines
      if(REGEX.empty.test(line)) {
        continue;
      }

      // parse quad
      const match = line.match(REGEX.quad);
      if(match === null) {
        throw new Error('N-Quads parse error on line ' + lineNumber + '.');
      }

      // create RDF quad
      const quad = {subject: null, predicate: null, object: null, graph: null};

      // get subject
      if(match[1] !== undefined) {
        quad.subject = {termType: TYPE_NAMED_NODE, value: match[1]};
      } else {
        quad.subject = {termType: TYPE_BLANK_NODE, value: match[2]};
      }

      // get predicate
      quad.predicate = {termType: TYPE_NAMED_NODE, value: match[3]};

      // get object
      if(match[4] !== undefined) {
        quad.object = {termType: TYPE_NAMED_NODE, value: match[4]};
      } else if(match[5] !== undefined) {
        quad.object = {termType: TYPE_BLANK_NODE, value: match[5]};
      } else {
        quad.object = {
          termType: TYPE_LITERAL,
          value: undefined,
          datatype: {
            termType: TYPE_NAMED_NODE
          }
        };
        if(match[7] !== undefined) {
          quad.object.datatype.value = match[7];
        } else if(match[8] !== undefined) {
          quad.object.datatype.value = RDF_LANGSTRING;
          quad.object.language = match[8];
        } else {
          quad.object.datatype.value = XSD_STRING;
        }
        quad.object.value = _unescape(match[6]);
      }

      // get graph
      if(match[9] !== undefined) {
        quad.graph = {
          termType: TYPE_NAMED_NODE,
          value: match[9]
        };
      } else if(match[10] !== undefined) {
        quad.graph = {
          termType: TYPE_BLANK_NODE,
          value: match[10]
        };
      } else {
        quad.graph = {
          termType: TYPE_DEFAULT_GRAPH,
          value: ''
        };
      }

      // only add quad if it is unique in its graph
      if(!(quad.graph.value in graphs)) {
        graphs[quad.graph.value] = [quad];
        dataset.push(quad);
      } else {
        let unique = true;
        const quads = graphs[quad.graph.value];
        for(const q of quads) {
          if(_compareTriples(q, quad)) {
            unique = false;
            break;
          }
        }
        if(unique) {
          quads.push(quad);
          dataset.push(quad);
        }
      }
    }

    return dataset;
  }

  /**
   * Converts an RDF dataset to N-Quads.
   *
   * @param dataset (array of quads) the RDF dataset to convert.
   *
   * @return the N-Quads string.
   */
  static serialize(dataset) {
    if(!Array.isArray(dataset)) {
      dataset = NQuads.legacyDatasetToQuads(dataset);
    }
    const quads = [];
    for(const quad of dataset) {
      quads.push(NQuads.serializeQuad(quad));
    }
    return quads.sort().join('');
  }

  /**
   * Converts an RDF quad to an N-Quad string (a single quad).
   *
   * @param quad the RDF quad convert.
   *
   * @return the N-Quad string.
   */
  static serializeQuad(quad) {
    const s = quad.subject;
    const p = quad.predicate;
    const o = quad.object;
    const g = quad.graph;

    let nquad = '';

    // subject can only be NamedNode or BlankNode
    if(s.termType === TYPE_NAMED_NODE) {
      nquad += `<${s.value}>`;
    } else {
      nquad += `${s.value}`;
    }

    // predicate can only be NamedNode
    nquad += ` <${p.value}> `;

    // object is NamedNode, BlankNode, or Literal
    if(o.termType === TYPE_NAMED_NODE) {
      nquad += `<${o.value}>`;
    } else if(o.termType === TYPE_BLANK_NODE) {
      nquad += o.value;
    } else {
      nquad += `"${_escape(o.value)}"`;
      if(o.datatype.value === RDF_LANGSTRING) {
        if(o.language) {
          nquad += `@${o.language}`;
        }
      } else if(o.datatype.value !== XSD_STRING) {
        nquad += `^^<${o.datatype.value}>`;
      }
    }

    // graph can only be NamedNode or BlankNode (or DefaultGraph, but that
    // does not add to `nquad`)
    if(g.termType === TYPE_NAMED_NODE) {
      nquad += ` <${g.value}>`;
    } else if(g.termType === TYPE_BLANK_NODE) {
      nquad += ` ${g.value}`;
    }

    nquad += ' .\n';
    return nquad;
  }

  /**
   * Converts a legacy-formatted dataset to an array of quads dataset per
   * http://rdf.js.org/.
   *
   * @param dataset the legacy dataset to convert.
   *
   * @return the array of quads dataset.
   */
  static legacyDatasetToQuads(dataset) {
    const quads = [];

    const termTypeMap = {
      'blank node': TYPE_BLANK_NODE,
      IRI: TYPE_NAMED_NODE,
      literal: TYPE_LITERAL
    };

    for(const graphName in dataset) {
      const triples = dataset[graphName];
      triples.forEach(triple => {
        const quad = {};
        for(const componentName in triple) {
          const oldComponent = triple[componentName];
          const newComponent = {
            termType: termTypeMap[oldComponent.type],
            value: oldComponent.value
          };
          if(newComponent.termType === TYPE_LITERAL) {
            newComponent.datatype = {
              termType: TYPE_NAMED_NODE
            };
            if('datatype' in oldComponent) {
              newComponent.datatype.value = oldComponent.datatype;
            }
            if('language' in oldComponent) {
              if(!('datatype' in oldComponent)) {
                newComponent.datatype.value = RDF_LANGSTRING;
              }
              newComponent.language = oldComponent.language;
            } else if(!('datatype' in oldComponent)) {
              newComponent.datatype.value = XSD_STRING;
            }
          }
          quad[componentName] = newComponent;
        }
        if(graphName === '@default') {
          quad.graph = {
            termType: TYPE_DEFAULT_GRAPH,
            value: ''
          };
        } else {
          quad.graph = {
            termType: graphName.startsWith('_:') ?
              TYPE_BLANK_NODE : TYPE_NAMED_NODE,
            value: graphName
          };
        }
        quads.push(quad);
      });
    }

    return quads;
  }
};

/**
 * Compares two RDF triples for equality.
 *
 * @param t1 the first triple.
 * @param t2 the second triple.
 *
 * @return true if the triples are the same, false if not.
 */
function _compareTriples(t1, t2) {
  // compare subject and object types first as it is the quickest check
  if(!(t1.subject.termType === t2.subject.termType &&
    t1.object.termType === t2.object.termType)) {
    return false;
  }
  // compare values
  if(!(t1.subject.value === t2.subject.value &&
    t1.predicate.value === t2.predicate.value &&
    t1.object.value === t2.object.value)) {
    return false;
  }
  if(t1.object.termType !== TYPE_LITERAL) {
    // no `datatype` or `language` to check
    return true;
  }
  return (
    (t1.object.datatype.termType === t2.object.datatype.termType) &&
    (t1.object.language === t2.object.language) &&
    (t1.object.datatype.value === t2.object.datatype.value)
  );
}

const _escapeRegex = /["\\\n\r]/g;
/**
 * Escape string to N-Quads literal
 */
function _escape(s) {
  return s.replace(_escapeRegex, function(match) {
    switch(match) {
      case '"': return '\\"';
      case '\\': return '\\\\';
      case '\n': return '\\n';
      case '\r': return '\\r';
    }
  });
}

const _unescapeRegex =
  /(?:\\([tbnrf"'\\]))|(?:\\u([0-9A-Fa-f]{4}))|(?:\\U([0-9A-Fa-f]{8}))/g;
/**
 * Unescape N-Quads literal to string
 */
function _unescape(s) {
  return s.replace(_unescapeRegex, function(match, code, u, U) {
    if(code) {
      switch(code) {
        case 't': return '\t';
        case 'b': return '\b';
        case 'n': return '\n';
        case 'r': return '\r';
        case 'f': return '\f';
        case '"': return '"';
        case '\'': return '\'';
        case '\\': return '\\';
      }
    }
    if(u) {
      return String.fromCharCode(parseInt(u, 16));
    }
    if(U) {
      // FIXME: support larger values
      throw new Error('Unsupported U escape');
    }
  });
}

var URDNA2015_1 = class URDNA2015 {
  constructor() {
    this.name = 'URDNA2015';
    this.blankNodeInfo = new Map();
    this.canonicalIssuer = new IdentifierIssuer_1('_:c14n');
    this.hashAlgorithm = 'sha256';
    this.quads = null;
  }

  // 4.4) Normalization Algorithm
  async main(dataset) {
    this.quads = dataset;

    // 1) Create the normalization state.
    // 2) For every quad in input dataset:
    for(const quad of dataset) {
      // 2.1) For each blank node that occurs in the quad, add a reference
      // to the quad using the blank node identifier in the blank node to
      // quads map, creating a new entry if necessary.
      this._addBlankNodeQuadInfo({quad, component: quad.subject});
      this._addBlankNodeQuadInfo({quad, component: quad.object});
      this._addBlankNodeQuadInfo({quad, component: quad.graph});
    }

    // 3) Create a list of non-normalized blank node identifiers
    // non-normalized identifiers and populate it using the keys from the
    // blank node to quads map.
    // Note: We use a map here and it was generated during step 2.

    // 4) `simple` flag is skipped -- loop is optimized away. This optimization
    // is permitted because there was a typo in the hash first degree quads
    // algorithm in the URDNA2015 spec that was implemented widely making it
    // such that it could not be fixed; the result was that the loop only
    // needs to be run once and the first degree quad hashes will never change.
    // 5.1-5.2 are skipped; first degree quad hashes are generated just once
    // for all non-normalized blank nodes.

    // 5.3) For each blank node identifier identifier in non-normalized
    // identifiers:
    const hashToBlankNodes = new Map();
    const nonNormalized = [...this.blankNodeInfo.keys()];
    let i = 0;
    for(const id of nonNormalized) {
      // Note: batch hashing first degree quads 100 at a time
      if(++i % 100 === 0) {
        await this._yield();
      }
      // steps 5.3.1 and 5.3.2:
      await this._hashAndTrackBlankNode({id, hashToBlankNodes});
    }

    // 5.4) For each hash to identifier list mapping in hash to blank
    // nodes map, lexicographically-sorted by hash:
    const hashes = [...hashToBlankNodes.keys()].sort();
    // optimize away second sort, gather non-unique hashes in order as we go
    const nonUnique = [];
    for(const hash of hashes) {
      // 5.4.1) If the length of identifier list is greater than 1,
      // continue to the next mapping.
      const idList = hashToBlankNodes.get(hash);
      if(idList.length > 1) {
        nonUnique.push(idList);
        continue;
      }

      // 5.4.2) Use the Issue Identifier algorithm, passing canonical
      // issuer and the single blank node identifier in identifier
      // list, identifier, to issue a canonical replacement identifier
      // for identifier.
      const id = idList[0];
      this.canonicalIssuer.getId(id);

      // Note: These steps are skipped, optimized away since the loop
      // only needs to be run once.
      // 5.4.3) Remove identifier from non-normalized identifiers.
      // 5.4.4) Remove hash from the hash to blank nodes map.
      // 5.4.5) Set simple to true.
    }

    // 6) For each hash to identifier list mapping in hash to blank nodes map,
    // lexicographically-sorted by hash:
    // Note: sort optimized away, use `nonUnique`.
    for(const idList of nonUnique) {
      // 6.1) Create hash path list where each item will be a result of
      // running the Hash N-Degree Quads algorithm.
      const hashPathList = [];

      // 6.2) For each blank node identifier identifier in identifier list:
      for(const id of idList) {
        // 6.2.1) If a canonical identifier has already been issued for
        // identifier, continue to the next identifier.
        if(this.canonicalIssuer.hasId(id)) {
          continue;
        }

        // 6.2.2) Create temporary issuer, an identifier issuer
        // initialized with the prefix _:b.
        const issuer = new IdentifierIssuer_1('_:b');

        // 6.2.3) Use the Issue Identifier algorithm, passing temporary
        // issuer and identifier, to issue a new temporary blank node
        // identifier for identifier.
        issuer.getId(id);

        // 6.2.4) Run the Hash N-Degree Quads algorithm, passing
        // temporary issuer, and append the result to the hash path list.
        const result = await this.hashNDegreeQuads(id, issuer);
        hashPathList.push(result);
      }

      // 6.3) For each result in the hash path list,
      // lexicographically-sorted by the hash in result:
      hashPathList.sort(_stringHashCompare);
      for(const result of hashPathList) {
        // 6.3.1) For each blank node identifier, existing identifier,
        // that was issued a temporary identifier by identifier issuer
        // in result, issue a canonical identifier, in the same order,
        // using the Issue Identifier algorithm, passing canonical
        // issuer and existing identifier.
        const oldIds = result.issuer.getOldIds();
        for(const id of oldIds) {
          this.canonicalIssuer.getId(id);
        }
      }
    }

    /* Note: At this point all blank nodes in the set of RDF quads have been
    assigned canonical identifiers, which have been stored in the canonical
    issuer. Here each quad is updated by assigning each of its blank nodes
    its new identifier. */

    // 7) For each quad, quad, in input dataset:
    const normalized = [];
    for(const quad of this.quads) {
      // 7.1) Create a copy, quad copy, of quad and replace any existing
      // blank node identifiers using the canonical identifiers
      // previously issued by canonical issuer.
      // Note: We optimize with shallow copies here.
      const q = {...quad};
      q.subject = this._useCanonicalId({component: q.subject});
      q.object = this._useCanonicalId({component: q.object});
      q.graph = this._useCanonicalId({component: q.graph});
      // 7.2) Add quad copy to the normalized dataset.
      normalized.push(NQuads_1.serializeQuad(q));
    }

    // sort normalized output
    normalized.sort();

    // 8) Return the normalized dataset.
    return normalized.join('');
  }

  // 4.6) Hash First Degree Quads
  async hashFirstDegreeQuads(id) {
    // 1) Initialize nquads to an empty list. It will be used to store quads in
    // N-Quads format.
    const nquads = [];

    // 2) Get the list of quads `quads` associated with the reference blank node
    // identifier in the blank node to quads map.
    const info = this.blankNodeInfo.get(id);
    const quads = info.quads;

    // 3) For each quad `quad` in `quads`:
    for(const quad of quads) {
      // 3.1) Serialize the quad in N-Quads format with the following special
      // rule:

      // 3.1.1) If any component in quad is an blank node, then serialize it
      // using a special identifier as follows:
      const copy = {
        subject: null, predicate: quad.predicate, object: null, graph: null
      };
      // 3.1.2) If the blank node's existing blank node identifier matches
      // the reference blank node identifier then use the blank node
      // identifier _:a, otherwise, use the blank node identifier _:z.
      copy.subject = this.modifyFirstDegreeComponent(
        id, quad.subject, 'subject');
      copy.object = this.modifyFirstDegreeComponent(
        id, quad.object, 'object');
      copy.graph = this.modifyFirstDegreeComponent(
        id, quad.graph, 'graph');
      nquads.push(NQuads_1.serializeQuad(copy));
    }

    // 4) Sort nquads in lexicographical order.
    nquads.sort();

    // 5) Return the hash that results from passing the sorted, joined nquads
    // through the hash algorithm.
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    for(const nquad of nquads) {
      md.update(nquad);
    }
    info.hash = await md.digest();
    return info.hash;
  }

  // 4.7) Hash Related Blank Node
  async hashRelatedBlankNode(related, quad, issuer, position) {
    // 1) Set the identifier to use for related, preferring first the canonical
    // identifier for related if issued, second the identifier issued by issuer
    // if issued, and last, if necessary, the result of the Hash First Degree
    // Quads algorithm, passing related.
    let id;
    if(this.canonicalIssuer.hasId(related)) {
      id = this.canonicalIssuer.getId(related);
    } else if(issuer.hasId(related)) {
      id = issuer.getId(related);
    } else {
      id = this.blankNodeInfo.get(related).hash;
    }

    // 2) Initialize a string input to the value of position.
    // Note: We use a hash object instead.
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    md.update(position);

    // 3) If position is not g, append <, the value of the predicate in quad,
    // and > to input.
    if(position !== 'g') {
      md.update(this.getRelatedPredicate(quad));
    }

    // 4) Append identifier to input.
    md.update(id);

    // 5) Return the hash that results from passing input through the hash
    // algorithm.
    return md.digest();
  }

  // 4.8) Hash N-Degree Quads
  async hashNDegreeQuads(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    // Note: 2) and 3) handled within `createHashToRelated`
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    const hashToRelated = await this.createHashToRelated(id, issuer);

    // 4) Create an empty string, data to hash.
    // Note: We created a hash object `md` above instead.

    // 5) For each related hash to blank node list mapping in hash to related
    // blank nodes map, sorted lexicographically by related hash:
    const hashes = [...hashToRelated.keys()].sort();
    for(const hash of hashes) {
      // 5.1) Append the related hash to the data to hash.
      md.update(hash);

      // 5.2) Create a string chosen path.
      let chosenPath = '';

      // 5.3) Create an unset chosen issuer variable.
      let chosenIssuer;

      // 5.4) For each permutation of blank node list:
      const permuter = new Permuter_1(hashToRelated.get(hash));
      let i = 0;
      while(permuter.hasNext()) {
        const permutation = permuter.next();
        // Note: batch permutations 3 at a time
        if(++i % 3 === 0) {
          await this._yield();
        }

        // 5.4.1) Create a copy of issuer, issuer copy.
        let issuerCopy = issuer.clone();

        // 5.4.2) Create a string path.
        let path = '';

        // 5.4.3) Create a recursion list, to store blank node identifiers
        // that must be recursively processed by this algorithm.
        const recursionList = [];

        // 5.4.4) For each related in permutation:
        let nextPermutation = false;
        for(const related of permutation) {
          // 5.4.4.1) If a canonical identifier has been issued for
          // related, append it to path.
          if(this.canonicalIssuer.hasId(related)) {
            path += this.canonicalIssuer.getId(related);
          } else {
            // 5.4.4.2) Otherwise:
            // 5.4.4.2.1) If issuer copy has not issued an identifier for
            // related, append related to recursion list.
            if(!issuerCopy.hasId(related)) {
              recursionList.push(related);
            }
            // 5.4.4.2.2) Use the Issue Identifier algorithm, passing
            // issuer copy and related and append the result to path.
            path += issuerCopy.getId(related);
          }

          // 5.4.4.3) If chosen path is not empty and the length of path
          // is greater than or equal to the length of chosen path and
          // path is lexicographically greater than chosen path, then
          // skip to the next permutation.
          // Note: Comparing path length to chosen path length can be optimized
          // away; only compare lexicographically.
          if(chosenPath.length !== 0 && path > chosenPath) {
            nextPermutation = true;
            break;
          }
        }

        if(nextPermutation) {
          continue;
        }

        // 5.4.5) For each related in recursion list:
        for(const related of recursionList) {
          // 5.4.5.1) Set result to the result of recursively executing
          // the Hash N-Degree Quads algorithm, passing related for
          // identifier and issuer copy for path identifier issuer.
          const result = await this.hashNDegreeQuads(related, issuerCopy);

          // 5.4.5.2) Use the Issue Identifier algorithm, passing issuer
          // copy and related and append the result to path.
          path += issuerCopy.getId(related);

          // 5.4.5.3) Append <, the hash in result, and > to path.
          path += `<${result.hash}>`;

          // 5.4.5.4) Set issuer copy to the identifier issuer in
          // result.
          issuerCopy = result.issuer;

          // 5.4.5.5) If chosen path is not empty and the length of path
          // is greater than or equal to the length of chosen path and
          // path is lexicographically greater than chosen path, then
          // skip to the next permutation.
          // Note: Comparing path length to chosen path length can be optimized
          // away; only compare lexicographically.
          if(chosenPath.length !== 0 && path > chosenPath) {
            nextPermutation = true;
            break;
          }
        }

        if(nextPermutation) {
          continue;
        }

        // 5.4.6) If chosen path is empty or path is lexicographically
        // less than chosen path, set chosen path to path and chosen
        // issuer to issuer copy.
        if(chosenPath.length === 0 || path < chosenPath) {
          chosenPath = path;
          chosenIssuer = issuerCopy;
        }
      }

      // 5.5) Append chosen path to data to hash.
      md.update(chosenPath);

      // 5.6) Replace issuer, by reference, with chosen issuer.
      issuer = chosenIssuer;
    }

    // 6) Return issuer and the hash that results from passing data to hash
    // through the hash algorithm.
    return {hash: await md.digest(), issuer};
  }

  // helper for modifying component during Hash First Degree Quads
  modifyFirstDegreeComponent(id, component) {
    if(component.termType !== 'BlankNode') {
      return component;
    }
    /* Note: A mistake in the URDNA2015 spec that made its way into
    implementations (and therefore must stay to avoid interop breakage)
    resulted in an assigned canonical ID, if available for
    `component.value`, not being used in place of `_:a`/`_:z`, so
    we don't use it here. */
    return {
      termType: 'BlankNode',
      value: component.value === id ? '_:a' : '_:z'
    };
  }

  // helper for getting a related predicate
  getRelatedPredicate(quad) {
    return `<${quad.predicate.value}>`;
  }

  // helper for creating hash to related blank nodes map
  async createHashToRelated(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    const hashToRelated = new Map();

    // 2) Get a reference, quads, to the list of quads in the blank node to
    // quads map for the key identifier.
    const quads = this.blankNodeInfo.get(id).quads;

    // 3) For each quad in quads:
    let i = 0;
    for(const quad of quads) {
      // Note: batch hashing related blank node quads 100 at a time
      if(++i % 100 === 0) {
        await this._yield();
      }
      // 3.1) For each component in quad, if component is the subject, object,
      // and graph name and it is a blank node that is not identified by
      // identifier:
      // steps 3.1.1 and 3.1.2 occur in helpers:
      await Promise.all([
        this._addRelatedBlankNodeHash({
          quad, component: quad.subject, position: 's',
          id, issuer, hashToRelated
        }),
        this._addRelatedBlankNodeHash({
          quad, component: quad.object, position: 'o',
          id, issuer, hashToRelated
        }),
        this._addRelatedBlankNodeHash({
          quad, component: quad.graph, position: 'g',
          id, issuer, hashToRelated
        })
      ]);
    }

    return hashToRelated;
  }

  async _hashAndTrackBlankNode({id, hashToBlankNodes}) {
    // 5.3.1) Create a hash, hash, according to the Hash First Degree
    // Quads algorithm.
    const hash = await this.hashFirstDegreeQuads(id);

    // 5.3.2) Add hash and identifier to hash to blank nodes map,
    // creating a new entry if necessary.
    const idList = hashToBlankNodes.get(hash);
    if(!idList) {
      hashToBlankNodes.set(hash, [id]);
    } else {
      idList.push(id);
    }
  }

  _addBlankNodeQuadInfo({quad, component}) {
    if(component.termType !== 'BlankNode') {
      return;
    }
    const id = component.value;
    const info = this.blankNodeInfo.get(id);
    if(info) {
      info.quads.add(quad);
    } else {
      this.blankNodeInfo.set(id, {quads: new Set([quad]), hash: null});
    }
  }

  async _addRelatedBlankNodeHash(
    {quad, component, position, id, issuer, hashToRelated}) {
    if(!(component.termType === 'BlankNode' && component.value !== id)) {
      return;
    }
    // 3.1.1) Set hash to the result of the Hash Related Blank Node
    // algorithm, passing the blank node identifier for component as
    // related, quad, path identifier issuer as issuer, and position as
    // either s, o, or g based on whether component is a subject, object,
    // graph name, respectively.
    const related = component.value;
    const hash = await this.hashRelatedBlankNode(
      related, quad, issuer, position);

    // 3.1.2) Add a mapping of hash to the blank node identifier for
    // component to hash to related blank nodes map, adding an entry as
    // necessary.
    const entries = hashToRelated.get(hash);
    if(entries) {
      entries.push(related);
    } else {
      hashToRelated.set(hash, [related]);
    }
  }

  _useCanonicalId({component}) {
    if(component.termType === 'BlankNode' &&
      !component.value.startsWith(this.canonicalIssuer.prefix)) {
      return {
        termType: 'BlankNode',
        value: this.canonicalIssuer.getId(component.value)
      };
    }
    return component;
  }

  async _yield() {
    return new Promise(resolve => setImmediate(resolve));
  }
};

function _stringHashCompare(a, b) {
  return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
}

var URGNA2012 = class URDNA2012 extends URDNA2015_1 {
  constructor() {
    super();
    this.name = 'URGNA2012';
    this.hashAlgorithm = 'sha1';
  }

  // helper for modifying component during Hash First Degree Quads
  modifyFirstDegreeComponent(id, component, key) {
    if(component.termType !== 'BlankNode') {
      return component;
    }
    if(key === 'graph') {
      return {
        termType: 'BlankNode',
        value: '_:g'
      };
    }
    return {
      termType: 'BlankNode',
      value: (component.value === id ? '_:a' : '_:z')
    };
  }

  // helper for getting a related predicate
  getRelatedPredicate(quad) {
    return quad.predicate.value;
  }

  // helper for creating hash to related blank nodes map
  async createHashToRelated(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    const hashToRelated = new Map();

    // 2) Get a reference, quads, to the list of quads in the blank node to
    // quads map for the key identifier.
    const quads = this.blankNodeInfo.get(id).quads;

    // 3) For each quad in quads:
    let i = 0;
    for(const quad of quads) {
      // 3.1) If the quad's subject is a blank node that does not match
      // identifier, set hash to the result of the Hash Related Blank Node
      // algorithm, passing the blank node identifier for subject as related,
      // quad, path identifier issuer as issuer, and p as position.
      let position;
      let related;
      if(quad.subject.termType === 'BlankNode' && quad.subject.value !== id) {
        related = quad.subject.value;
        position = 'p';
      } else if(
        quad.object.termType === 'BlankNode' && quad.object.value !== id) {
        // 3.2) Otherwise, if quad's object is a blank node that does not match
        // identifier, to the result of the Hash Related Blank Node algorithm,
        // passing the blank node identifier for object as related, quad, path
        // identifier issuer as issuer, and r as position.
        related = quad.object.value;
        position = 'r';
      } else {
        // 3.3) Otherwise, continue to the next quad.
        continue;
      }
      // Note: batch hashing related blank nodes 100 at a time
      if(++i % 100 === 0) {
        await this._yield();
      }
      // 3.4) Add a mapping of hash to the blank node identifier for the
      // component that matched (subject or object) to hash to related blank
      // nodes map, adding an entry as necessary.
      const hash = await this.hashRelatedBlankNode(
        related, quad, issuer, position);
      const entries = hashToRelated.get(hash);
      if(entries) {
        entries.push(related);
      } else {
        hashToRelated.set(hash, [related]);
      }
    }

    return hashToRelated;
  }
};

var URDNA2015Sync_1 = class URDNA2015Sync {
  constructor() {
    this.name = 'URDNA2015';
    this.blankNodeInfo = new Map();
    this.canonicalIssuer = new IdentifierIssuer_1('_:c14n');
    this.hashAlgorithm = 'sha256';
    this.quads = null;
  }

  // 4.4) Normalization Algorithm
  main(dataset) {
    this.quads = dataset;

    // 1) Create the normalization state.
    // 2) For every quad in input dataset:
    for(const quad of dataset) {
      // 2.1) For each blank node that occurs in the quad, add a reference
      // to the quad using the blank node identifier in the blank node to
      // quads map, creating a new entry if necessary.
      this._addBlankNodeQuadInfo({quad, component: quad.subject});
      this._addBlankNodeQuadInfo({quad, component: quad.object});
      this._addBlankNodeQuadInfo({quad, component: quad.graph});
    }

    // 3) Create a list of non-normalized blank node identifiers
    // non-normalized identifiers and populate it using the keys from the
    // blank node to quads map.
    // Note: We use a map here and it was generated during step 2.

    // 4) `simple` flag is skipped -- loop is optimized away. This optimization
    // is permitted because there was a typo in the hash first degree quads
    // algorithm in the URDNA2015 spec that was implemented widely making it
    // such that it could not be fixed; the result was that the loop only
    // needs to be run once and the first degree quad hashes will never change.
    // 5.1-5.2 are skipped; first degree quad hashes are generated just once
    // for all non-normalized blank nodes.

    // 5.3) For each blank node identifier identifier in non-normalized
    // identifiers:
    const hashToBlankNodes = new Map();
    const nonNormalized = [...this.blankNodeInfo.keys()];
    for(const id of nonNormalized) {
      // steps 5.3.1 and 5.3.2:
      this._hashAndTrackBlankNode({id, hashToBlankNodes});
    }

    // 5.4) For each hash to identifier list mapping in hash to blank
    // nodes map, lexicographically-sorted by hash:
    const hashes = [...hashToBlankNodes.keys()].sort();
    // optimize away second sort, gather non-unique hashes in order as we go
    const nonUnique = [];
    for(const hash of hashes) {
      // 5.4.1) If the length of identifier list is greater than 1,
      // continue to the next mapping.
      const idList = hashToBlankNodes.get(hash);
      if(idList.length > 1) {
        nonUnique.push(idList);
        continue;
      }

      // 5.4.2) Use the Issue Identifier algorithm, passing canonical
      // issuer and the single blank node identifier in identifier
      // list, identifier, to issue a canonical replacement identifier
      // for identifier.
      const id = idList[0];
      this.canonicalIssuer.getId(id);

      // Note: These steps are skipped, optimized away since the loop
      // only needs to be run once.
      // 5.4.3) Remove identifier from non-normalized identifiers.
      // 5.4.4) Remove hash from the hash to blank nodes map.
      // 5.4.5) Set simple to true.
    }

    // 6) For each hash to identifier list mapping in hash to blank nodes map,
    // lexicographically-sorted by hash:
    // Note: sort optimized away, use `nonUnique`.
    for(const idList of nonUnique) {
      // 6.1) Create hash path list where each item will be a result of
      // running the Hash N-Degree Quads algorithm.
      const hashPathList = [];

      // 6.2) For each blank node identifier identifier in identifier list:
      for(const id of idList) {
        // 6.2.1) If a canonical identifier has already been issued for
        // identifier, continue to the next identifier.
        if(this.canonicalIssuer.hasId(id)) {
          continue;
        }

        // 6.2.2) Create temporary issuer, an identifier issuer
        // initialized with the prefix _:b.
        const issuer = new IdentifierIssuer_1('_:b');

        // 6.2.3) Use the Issue Identifier algorithm, passing temporary
        // issuer and identifier, to issue a new temporary blank node
        // identifier for identifier.
        issuer.getId(id);

        // 6.2.4) Run the Hash N-Degree Quads algorithm, passing
        // temporary issuer, and append the result to the hash path list.
        const result = this.hashNDegreeQuads(id, issuer);
        hashPathList.push(result);
      }

      // 6.3) For each result in the hash path list,
      // lexicographically-sorted by the hash in result:
      hashPathList.sort(_stringHashCompare$1);
      for(const result of hashPathList) {
        // 6.3.1) For each blank node identifier, existing identifier,
        // that was issued a temporary identifier by identifier issuer
        // in result, issue a canonical identifier, in the same order,
        // using the Issue Identifier algorithm, passing canonical
        // issuer and existing identifier.
        const oldIds = result.issuer.getOldIds();
        for(const id of oldIds) {
          this.canonicalIssuer.getId(id);
        }
      }
    }

    /* Note: At this point all blank nodes in the set of RDF quads have been
    assigned canonical identifiers, which have been stored in the canonical
    issuer. Here each quad is updated by assigning each of its blank nodes
    its new identifier. */

    // 7) For each quad, quad, in input dataset:
    const normalized = [];
    for(const quad of this.quads) {
      // 7.1) Create a copy, quad copy, of quad and replace any existing
      // blank node identifiers using the canonical identifiers
      // previously issued by canonical issuer.
      // Note: We optimize with shallow copies here.
      const q = {...quad};
      q.subject = this._useCanonicalId({component: q.subject});
      q.object = this._useCanonicalId({component: q.object});
      q.graph = this._useCanonicalId({component: q.graph});
      // 7.2) Add quad copy to the normalized dataset.
      normalized.push(NQuads_1.serializeQuad(q));
    }

    // sort normalized output
    normalized.sort();

    // 8) Return the normalized dataset.
    return normalized.join('');
  }

  // 4.6) Hash First Degree Quads
  hashFirstDegreeQuads(id) {
    // 1) Initialize nquads to an empty list. It will be used to store quads in
    // N-Quads format.
    const nquads = [];

    // 2) Get the list of quads `quads` associated with the reference blank node
    // identifier in the blank node to quads map.
    const info = this.blankNodeInfo.get(id);
    const quads = info.quads;

    // 3) For each quad `quad` in `quads`:
    for(const quad of quads) {
      // 3.1) Serialize the quad in N-Quads format with the following special
      // rule:

      // 3.1.1) If any component in quad is an blank node, then serialize it
      // using a special identifier as follows:
      const copy = {
        subject: null, predicate: quad.predicate, object: null, graph: null
      };
      // 3.1.2) If the blank node's existing blank node identifier matches
      // the reference blank node identifier then use the blank node
      // identifier _:a, otherwise, use the blank node identifier _:z.
      copy.subject = this.modifyFirstDegreeComponent(
        id, quad.subject, 'subject');
      copy.object = this.modifyFirstDegreeComponent(
        id, quad.object, 'object');
      copy.graph = this.modifyFirstDegreeComponent(
        id, quad.graph, 'graph');
      nquads.push(NQuads_1.serializeQuad(copy));
    }

    // 4) Sort nquads in lexicographical order.
    nquads.sort();

    // 5) Return the hash that results from passing the sorted, joined nquads
    // through the hash algorithm.
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    for(const nquad of nquads) {
      md.update(nquad);
    }
    info.hash = md.digest();
    return info.hash;
  }

  // 4.7) Hash Related Blank Node
  hashRelatedBlankNode(related, quad, issuer, position) {
    // 1) Set the identifier to use for related, preferring first the canonical
    // identifier for related if issued, second the identifier issued by issuer
    // if issued, and last, if necessary, the result of the Hash First Degree
    // Quads algorithm, passing related.
    let id;
    if(this.canonicalIssuer.hasId(related)) {
      id = this.canonicalIssuer.getId(related);
    } else if(issuer.hasId(related)) {
      id = issuer.getId(related);
    } else {
      id = this.blankNodeInfo.get(related).hash;
    }

    // 2) Initialize a string input to the value of position.
    // Note: We use a hash object instead.
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    md.update(position);

    // 3) If position is not g, append <, the value of the predicate in quad,
    // and > to input.
    if(position !== 'g') {
      md.update(this.getRelatedPredicate(quad));
    }

    // 4) Append identifier to input.
    md.update(id);

    // 5) Return the hash that results from passing input through the hash
    // algorithm.
    return md.digest();
  }

  // 4.8) Hash N-Degree Quads
  hashNDegreeQuads(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    // Note: 2) and 3) handled within `createHashToRelated`
    const md = new MessageDigestBrowser(this.hashAlgorithm);
    const hashToRelated = this.createHashToRelated(id, issuer);

    // 4) Create an empty string, data to hash.
    // Note: We created a hash object `md` above instead.

    // 5) For each related hash to blank node list mapping in hash to related
    // blank nodes map, sorted lexicographically by related hash:
    const hashes = [...hashToRelated.keys()].sort();
    for(const hash of hashes) {
      // 5.1) Append the related hash to the data to hash.
      md.update(hash);

      // 5.2) Create a string chosen path.
      let chosenPath = '';

      // 5.3) Create an unset chosen issuer variable.
      let chosenIssuer;

      // 5.4) For each permutation of blank node list:
      const permuter = new Permuter_1(hashToRelated.get(hash));
      while(permuter.hasNext()) {
        const permutation = permuter.next();

        // 5.4.1) Create a copy of issuer, issuer copy.
        let issuerCopy = issuer.clone();

        // 5.4.2) Create a string path.
        let path = '';

        // 5.4.3) Create a recursion list, to store blank node identifiers
        // that must be recursively processed by this algorithm.
        const recursionList = [];

        // 5.4.4) For each related in permutation:
        let nextPermutation = false;
        for(const related of permutation) {
          // 5.4.4.1) If a canonical identifier has been issued for
          // related, append it to path.
          if(this.canonicalIssuer.hasId(related)) {
            path += this.canonicalIssuer.getId(related);
          } else {
            // 5.4.4.2) Otherwise:
            // 5.4.4.2.1) If issuer copy has not issued an identifier for
            // related, append related to recursion list.
            if(!issuerCopy.hasId(related)) {
              recursionList.push(related);
            }
            // 5.4.4.2.2) Use the Issue Identifier algorithm, passing
            // issuer copy and related and append the result to path.
            path += issuerCopy.getId(related);
          }

          // 5.4.4.3) If chosen path is not empty and the length of path
          // is greater than or equal to the length of chosen path and
          // path is lexicographically greater than chosen path, then
          // skip to the next permutation.
          // Note: Comparing path length to chosen path length can be optimized
          // away; only compare lexicographically.
          if(chosenPath.length !== 0 && path > chosenPath) {
            nextPermutation = true;
            break;
          }
        }

        if(nextPermutation) {
          continue;
        }

        // 5.4.5) For each related in recursion list:
        for(const related of recursionList) {
          // 5.4.5.1) Set result to the result of recursively executing
          // the Hash N-Degree Quads algorithm, passing related for
          // identifier and issuer copy for path identifier issuer.
          const result = this.hashNDegreeQuads(related, issuerCopy);

          // 5.4.5.2) Use the Issue Identifier algorithm, passing issuer
          // copy and related and append the result to path.
          path += issuerCopy.getId(related);

          // 5.4.5.3) Append <, the hash in result, and > to path.
          path += `<${result.hash}>`;

          // 5.4.5.4) Set issuer copy to the identifier issuer in
          // result.
          issuerCopy = result.issuer;

          // 5.4.5.5) If chosen path is not empty and the length of path
          // is greater than or equal to the length of chosen path and
          // path is lexicographically greater than chosen path, then
          // skip to the next permutation.
          // Note: Comparing path length to chosen path length can be optimized
          // away; only compare lexicographically.
          if(chosenPath.length !== 0 && path > chosenPath) {
            nextPermutation = true;
            break;
          }
        }

        if(nextPermutation) {
          continue;
        }

        // 5.4.6) If chosen path is empty or path is lexicographically
        // less than chosen path, set chosen path to path and chosen
        // issuer to issuer copy.
        if(chosenPath.length === 0 || path < chosenPath) {
          chosenPath = path;
          chosenIssuer = issuerCopy;
        }
      }

      // 5.5) Append chosen path to data to hash.
      md.update(chosenPath);

      // 5.6) Replace issuer, by reference, with chosen issuer.
      issuer = chosenIssuer;
    }

    // 6) Return issuer and the hash that results from passing data to hash
    // through the hash algorithm.
    return {hash: md.digest(), issuer};
  }

  // helper for modifying component during Hash First Degree Quads
  modifyFirstDegreeComponent(id, component) {
    if(component.termType !== 'BlankNode') {
      return component;
    }
    /* Note: A mistake in the URDNA2015 spec that made its way into
    implementations (and therefore must stay to avoid interop breakage)
    resulted in an assigned canonical ID, if available for
    `component.value`, not being used in place of `_:a`/`_:z`, so
    we don't use it here. */
    return {
      termType: 'BlankNode',
      value: component.value === id ? '_:a' : '_:z'
    };
  }

  // helper for getting a related predicate
  getRelatedPredicate(quad) {
    return `<${quad.predicate.value}>`;
  }

  // helper for creating hash to related blank nodes map
  createHashToRelated(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    const hashToRelated = new Map();

    // 2) Get a reference, quads, to the list of quads in the blank node to
    // quads map for the key identifier.
    const quads = this.blankNodeInfo.get(id).quads;

    // 3) For each quad in quads:
    for(const quad of quads) {
      // 3.1) For each component in quad, if component is the subject, object,
      // or graph name and it is a blank node that is not identified by
      // identifier:
      // steps 3.1.1 and 3.1.2 occur in helpers:
      this._addRelatedBlankNodeHash({
        quad, component: quad.subject, position: 's',
        id, issuer, hashToRelated
      });
      this._addRelatedBlankNodeHash({
        quad, component: quad.object, position: 'o',
        id, issuer, hashToRelated
      });
      this._addRelatedBlankNodeHash({
        quad, component: quad.graph, position: 'g',
        id, issuer, hashToRelated
      });
    }

    return hashToRelated;
  }

  _hashAndTrackBlankNode({id, hashToBlankNodes}) {
    // 5.3.1) Create a hash, hash, according to the Hash First Degree
    // Quads algorithm.
    const hash = this.hashFirstDegreeQuads(id);

    // 5.3.2) Add hash and identifier to hash to blank nodes map,
    // creating a new entry if necessary.
    const idList = hashToBlankNodes.get(hash);
    if(!idList) {
      hashToBlankNodes.set(hash, [id]);
    } else {
      idList.push(id);
    }
  }

  _addBlankNodeQuadInfo({quad, component}) {
    if(component.termType !== 'BlankNode') {
      return;
    }
    const id = component.value;
    const info = this.blankNodeInfo.get(id);
    if(info) {
      info.quads.add(quad);
    } else {
      this.blankNodeInfo.set(id, {quads: new Set([quad]), hash: null});
    }
  }

  _addRelatedBlankNodeHash(
    {quad, component, position, id, issuer, hashToRelated}) {
    if(!(component.termType === 'BlankNode' && component.value !== id)) {
      return;
    }
    // 3.1.1) Set hash to the result of the Hash Related Blank Node
    // algorithm, passing the blank node identifier for component as
    // related, quad, path identifier issuer as issuer, and position as
    // either s, o, or g based on whether component is a subject, object,
    // graph name, respectively.
    const related = component.value;
    const hash = this.hashRelatedBlankNode(related, quad, issuer, position);

    // 3.1.2) Add a mapping of hash to the blank node identifier for
    // component to hash to related blank nodes map, adding an entry as
    // necessary.
    const entries = hashToRelated.get(hash);
    if(entries) {
      entries.push(related);
    } else {
      hashToRelated.set(hash, [related]);
    }
  }

  _useCanonicalId({component}) {
    if(component.termType === 'BlankNode' &&
      !component.value.startsWith(this.canonicalIssuer.prefix)) {
      return {
        termType: 'BlankNode',
        value: this.canonicalIssuer.getId(component.value)
      };
    }
    return component;
  }
};

function _stringHashCompare$1(a, b) {
  return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
}

var URGNA2012Sync = class URDNA2012Sync extends URDNA2015Sync_1 {
  constructor() {
    super();
    this.name = 'URGNA2012';
    this.hashAlgorithm = 'sha1';
  }

  // helper for modifying component during Hash First Degree Quads
  modifyFirstDegreeComponent(id, component, key) {
    if(component.termType !== 'BlankNode') {
      return component;
    }
    if(key === 'graph') {
      return {
        termType: 'BlankNode',
        value: '_:g'
      };
    }
    return {
      termType: 'BlankNode',
      value: (component.value === id ? '_:a' : '_:z')
    };
  }

  // helper for getting a related predicate
  getRelatedPredicate(quad) {
    return quad.predicate.value;
  }

  // helper for creating hash to related blank nodes map
  createHashToRelated(id, issuer) {
    // 1) Create a hash to related blank nodes map for storing hashes that
    // identify related blank nodes.
    const hashToRelated = new Map();

    // 2) Get a reference, quads, to the list of quads in the blank node to
    // quads map for the key identifier.
    const quads = this.blankNodeInfo.get(id).quads;

    // 3) For each quad in quads:
    for(const quad of quads) {
      // 3.1) If the quad's subject is a blank node that does not match
      // identifier, set hash to the result of the Hash Related Blank Node
      // algorithm, passing the blank node identifier for subject as related,
      // quad, path identifier issuer as issuer, and p as position.
      let position;
      let related;
      if(quad.subject.termType === 'BlankNode' && quad.subject.value !== id) {
        related = quad.subject.value;
        position = 'p';
      } else if(
        quad.object.termType === 'BlankNode' && quad.object.value !== id) {
        // 3.2) Otherwise, if quad's object is a blank node that does not match
        // identifier, to the result of the Hash Related Blank Node algorithm,
        // passing the blank node identifier for object as related, quad, path
        // identifier issuer as issuer, and r as position.
        related = quad.object.value;
        position = 'r';
      } else {
        // 3.3) Otherwise, continue to the next quad.
        continue;
      }
      // 3.4) Add a mapping of hash to the blank node identifier for the
      // component that matched (subject or object) to hash to related blank
      // nodes map, adding an entry as necessary.
      const hash = this.hashRelatedBlankNode(related, quad, issuer, position);
      const entries = hashToRelated.get(hash);
      if(entries) {
        entries.push(related);
      } else {
        hashToRelated.set(hash, [related]);
      }
    }

    return hashToRelated;
  }
};

var _nodeResolve_empty = {};

var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': _nodeResolve_empty
});

var debugUtil = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(_nodeResolve_empty$1);

// optional native support
let rdfCanonizeNative;
try {
  rdfCanonizeNative = debugUtil;
} catch(e) {}

const api = {};
var lib = api;

// expose helpers
api.NQuads = NQuads_1;
api.IdentifierIssuer = IdentifierIssuer_1;

/**
 * Get or set native API.
 *
 * @param api the native API.
 *
 * @return the currently set native API.
 */
api._rdfCanonizeNative = function(api) {
  if(api) {
    rdfCanonizeNative = api;
  }
  return rdfCanonizeNative;
};

/**
 * Asynchronously canonizes an RDF dataset.
 *
 * @param dataset the dataset to canonize.
 * @param options the options to use:
 *          algorithm the canonicalization algorithm to use, `URDNA2015` or
 *            `URGNA2012`.
 *          [useNative] use native implementation (default: false).
 *
 * @return a Promise that resolves to the canonicalized RDF Dataset.
 */
api.canonize = async function(dataset, options) {
  // back-compat with legacy dataset
  if(!Array.isArray(dataset)) {
    dataset = api.NQuads.legacyDatasetToQuads(dataset);
  }

  if(options.useNative) {
    if(!rdfCanonizeNative) {
      throw new Error('rdf-canonize-native not available');
    }
    // TODO: convert native algorithm to Promise-based async
    return new Promise((resolve, reject) =>
      rdfCanonizeNative.canonize(dataset, options, (err, canonical) =>
        err ? reject(err) : resolve(canonical)));
  }

  if(options.algorithm === 'URDNA2015') {
    return new URDNA2015_1(options).main(dataset);
  }
  if(options.algorithm === 'URGNA2012') {
    return new URGNA2012(options).main(dataset);
  }
  if(!('algorithm' in options)) {
    throw new Error('No RDF Dataset Canonicalization algorithm specified.');
  }
  throw new Error(
    'Invalid RDF Dataset Canonicalization algorithm: ' + options.algorithm);
};

/**
 * This method is no longer available in the public API, it is for testing
 * only. It synchronously canonizes an RDF dataset and does not work in the
 * browser.
 *
 * @param dataset the dataset to canonize.
 * @param options the options to use:
 *          algorithm the canonicalization algorithm to use, `URDNA2015` or
 *            `URGNA2012`.
 *          [useNative] use native implementation (default: false).
 *
 * @return the RDF dataset in canonical form.
 */
api._canonizeSync = function(dataset, options) {
  // back-compat with legacy dataset
  if(!Array.isArray(dataset)) {
    dataset = api.NQuads.legacyDatasetToQuads(dataset);
  }

  if(options.useNative) {
    if(rdfCanonizeNative) {
      return rdfCanonizeNative.canonizeSync(dataset, options);
    }
    throw new Error('rdf-canonize-native not available');
  }
  if(options.algorithm === 'URDNA2015') {
    return new URDNA2015Sync_1(options).main(dataset);
  }
  if(options.algorithm === 'URGNA2012') {
    return new URGNA2012Sync(options).main(dataset);
  }
  if(!('algorithm' in options)) {
    throw new Error('No RDF Dataset Canonicalization algorithm specified.');
  }
  throw new Error(
    'Invalid RDF Dataset Canonicalization algorithm: ' + options.algorithm);
};

/**
 * An implementation of the RDF Dataset Normalization specification.
 *
 * @author Dave Longley
 *
 * Copyright 2010-2021 Digital Bazaar, Inc.
 */
var rdfCanonize = lib;

/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

const api$1 = {};
var types = api$1;

/**
 * Returns true if the given value is an Array.
 *
 * @param v the value to check.
 *
 * @return true if the value is an Array, false if not.
 */
api$1.isArray = Array.isArray;

/**
 * Returns true if the given value is a Boolean.
 *
 * @param v the value to check.
 *
 * @return true if the value is a Boolean, false if not.
 */
api$1.isBoolean = v => (typeof v === 'boolean' ||
  Object.prototype.toString.call(v) === '[object Boolean]');

/**
 * Returns true if the given value is a double.
 *
 * @param v the value to check.
 *
 * @return true if the value is a double, false if not.
 */
api$1.isDouble = v => api$1.isNumber(v) &&
  (String(v).indexOf('.') !== -1 || Math.abs(v) >= 1e21);

/**
 * Returns true if the given value is an empty Object.
 *
 * @param v the value to check.
 *
 * @return true if the value is an empty Object, false if not.
 */
api$1.isEmptyObject = v => api$1.isObject(v) && Object.keys(v).length === 0;

/**
 * Returns true if the given value is a Number.
 *
 * @param v the value to check.
 *
 * @return true if the value is a Number, false if not.
 */
api$1.isNumber = v => (typeof v === 'number' ||
  Object.prototype.toString.call(v) === '[object Number]');

/**
 * Returns true if the given value is numeric.
 *
 * @param v the value to check.
 *
 * @return true if the value is numeric, false if not.
 */
api$1.isNumeric = v => !isNaN(parseFloat(v)) && isFinite(v);

/**
 * Returns true if the given value is an Object.
 *
 * @param v the value to check.
 *
 * @return true if the value is an Object, false if not.
 */
api$1.isObject = v => Object.prototype.toString.call(v) === '[object Object]';

/**
 * Returns true if the given value is a String.
 *
 * @param v the value to check.
 *
 * @return true if the value is a String, false if not.
 */
api$1.isString = v => (typeof v === 'string' ||
  Object.prototype.toString.call(v) === '[object String]');

/**
 * Returns true if the given value is undefined.
 *
 * @param v the value to check.
 *
 * @return true if the value is undefined, false if not.
 */
api$1.isUndefined = v => typeof v === 'undefined';

const api$2 = {};
var graphTypes = api$2;

/**
 * Returns true if the given value is a subject with properties.
 *
 * @param v the value to check.
 *
 * @return true if the value is a subject with properties, false if not.
 */
api$2.isSubject = v => {
  // Note: A value is a subject if all of these hold true:
  // 1. It is an Object.
  // 2. It is not a @value, @set, or @list.
  // 3. It has more than 1 key OR any existing key is not @id.
  if(types.isObject(v) &&
    !(('@value' in v) || ('@set' in v) || ('@list' in v))) {
    const keyCount = Object.keys(v).length;
    return (keyCount > 1 || !('@id' in v));
  }
  return false;
};

/**
 * Returns true if the given value is a subject reference.
 *
 * @param v the value to check.
 *
 * @return true if the value is a subject reference, false if not.
 */
api$2.isSubjectReference = v =>
  // Note: A value is a subject reference if all of these hold true:
  // 1. It is an Object.
  // 2. It has a single key: @id.
  (types.isObject(v) && Object.keys(v).length === 1 && ('@id' in v));

/**
 * Returns true if the given value is a @value.
 *
 * @param v the value to check.
 *
 * @return true if the value is a @value, false if not.
 */
api$2.isValue = v =>
  // Note: A value is a @value if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @value property.
  types.isObject(v) && ('@value' in v);

/**
 * Returns true if the given value is a @list.
 *
 * @param v the value to check.
 *
 * @return true if the value is a @list, false if not.
 */
api$2.isList = v =>
  // Note: A value is a @list if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @list property.
  types.isObject(v) && ('@list' in v);

/**
 * Returns true if the given value is a @graph.
 *
 * @return true if the value is a @graph, false if not.
 */
api$2.isGraph = v => {
  // Note: A value is a graph if all of these hold true:
  // 1. It is an object.
  // 2. It has an `@graph` key.
  // 3. It may have '@id' or '@index'
  return types.isObject(v) &&
    '@graph' in v &&
    Object.keys(v)
      .filter(key => key !== '@id' && key !== '@index').length === 1;
};

/**
 * Returns true if the given value is a simple @graph.
 *
 * @return true if the value is a simple @graph, false if not.
 */
api$2.isSimpleGraph = v => {
  // Note: A value is a simple graph if all of these hold true:
  // 1. It is an object.
  // 2. It has an `@graph` key.
  // 3. It has only 1 key or 2 keys where one of them is `@index`.
  return api$2.isGraph(v) && !('@id' in v);
};

/**
 * Returns true if the given value is a blank node.
 *
 * @param v the value to check.
 *
 * @return true if the value is a blank node, false if not.
 */
api$2.isBlankNode = v => {
  // Note: A value is a blank node if all of these hold true:
  // 1. It is an Object.
  // 2. If it has an @id key its value begins with '_:'.
  // 3. It has no keys OR is not a @value, @set, or @list.
  if(types.isObject(v)) {
    if('@id' in v) {
      return (v['@id'].indexOf('_:') === 0);
    }
    return (Object.keys(v).length === 0 ||
      !(('@value' in v) || ('@set' in v) || ('@list' in v)));
  }
  return false;
};

/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

var JsonLdError_1 = class JsonLdError extends Error {
  /**
   * Creates a JSON-LD Error.
   *
   * @param msg the error message.
   * @param type the error type.
   * @param details the error details.
   */
  constructor(
    message = 'An unspecified JSON-LD error occurred.',
    name = 'jsonld.Error',
    details = {}) {
    super(message);
    this.name = name;
    this.message = message;
    this.details = details;
  }
};

// TODO: move `IdentifierIssuer` to its own package
const IdentifierIssuer = rdfCanonize.IdentifierIssuer;


// constants
const REGEX_LINK_HEADERS = /(?:<[^>]*?>|"[^"]*?"|[^,])+/g;
const REGEX_LINK_HEADER = /\s*<([^>]*?)>\s*(?:;\s*(.*))?/;
const REGEX_LINK_HEADER_PARAMS =
  /(.*?)=(?:(?:"([^"]*?)")|([^"]*?))\s*(?:(?:;\s*)|$)/g;

const DEFAULTS = {
  headers: {
    accept: 'application/ld+json, application/json'
  }
};

const api$3 = {};
var util = api$3;
api$3.IdentifierIssuer = IdentifierIssuer;

/**
 * Clones an object, array, Map, Set, or string/number. If a typed JavaScript
 * object is given, such as a Date, it will be converted to a string.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
api$3.clone = function(value) {
  if(value && typeof value === 'object') {
    let rval;
    if(types.isArray(value)) {
      rval = [];
      for(let i = 0; i < value.length; ++i) {
        rval[i] = api$3.clone(value[i]);
      }
    } else if(value instanceof Map) {
      rval = new Map();
      for(const [k, v] of value) {
        rval.set(k, api$3.clone(v));
      }
    } else if(value instanceof Set) {
      rval = new Set();
      for(const v of value) {
        rval.add(api$3.clone(v));
      }
    } else if(types.isObject(value)) {
      rval = {};
      for(const key in value) {
        rval[key] = api$3.clone(value[key]);
      }
    } else {
      rval = value.toString();
    }
    return rval;
  }
  return value;
};

/**
 * Ensure a value is an array. If the value is an array, it is returned.
 * Otherwise, it is wrapped in an array.
 *
 * @param value the value to return as an array.
 *
 * @return the value as an array.
 */
api$3.asArray = function(value) {
  return Array.isArray(value) ? value : [value];
};

/**
 * Builds an HTTP headers object for making a JSON-LD request from custom
 * headers and asserts the `accept` header isn't overridden.
 *
 * @param headers an object of headers with keys as header names and values
 *          as header values.
 *
 * @return an object of headers with a valid `accept` header.
 */
api$3.buildHeaders = (headers = {}) => {
  const hasAccept = Object.keys(headers).some(
    h => h.toLowerCase() === 'accept');

  if(hasAccept) {
    throw new RangeError(
      'Accept header may not be specified; only "' +
      DEFAULTS.headers.accept + '" is supported.');
  }

  return Object.assign({Accept: DEFAULTS.headers.accept}, headers);
};

/**
 * Parses a link header. The results will be key'd by the value of "rel".
 *
 * Link: <http://json-ld.org/contexts/person.jsonld>;
 * rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"
 *
 * Parses as: {
 *   'http://www.w3.org/ns/json-ld#context': {
 *     target: http://json-ld.org/contexts/person.jsonld,
 *     type: 'application/ld+json'
 *   }
 * }
 *
 * If there is more than one "rel" with the same IRI, then entries in the
 * resulting map for that "rel" will be arrays.
 *
 * @param header the link header to parse.
 */
api$3.parseLinkHeader = header => {
  const rval = {};
  // split on unbracketed/unquoted commas
  const entries = header.match(REGEX_LINK_HEADERS);
  for(let i = 0; i < entries.length; ++i) {
    let match = entries[i].match(REGEX_LINK_HEADER);
    if(!match) {
      continue;
    }
    const result = {target: match[1]};
    const params = match[2];
    while((match = REGEX_LINK_HEADER_PARAMS.exec(params))) {
      result[match[1]] = (match[2] === undefined) ? match[3] : match[2];
    }
    const rel = result['rel'] || '';
    if(Array.isArray(rval[rel])) {
      rval[rel].push(result);
    } else if(rval.hasOwnProperty(rel)) {
      rval[rel] = [rval[rel], result];
    } else {
      rval[rel] = result;
    }
  }
  return rval;
};

/**
 * Throws an exception if the given value is not a valid @type value.
 *
 * @param v the value to check.
 */
api$3.validateTypeValue = (v, isFrame) => {
  if(types.isString(v)) {
    return;
  }

  if(types.isArray(v) && v.every(vv => types.isString(vv))) {
    return;
  }
  if(isFrame && types.isObject(v)) {
    switch(Object.keys(v).length) {
      case 0:
        // empty object is wildcard
        return;
      case 1:
        // default entry is all strings
        if('@default' in v &&
          api$3.asArray(v['@default']).every(vv => types.isString(vv))) {
          return;
        }
    }
  }

  throw new JsonLdError_1(
    'Invalid JSON-LD syntax; "@type" value must a string, an array of ' +
    'strings, an empty object, ' +
    'or a default object.', 'jsonld.SyntaxError',
    {code: 'invalid type value', value: v});
};

/**
 * Returns true if the given subject has the given property.
 *
 * @param subject the subject to check.
 * @param property the property to look for.
 *
 * @return true if the subject has the given property, false if not.
 */
api$3.hasProperty = (subject, property) => {
  if(subject.hasOwnProperty(property)) {
    const value = subject[property];
    return (!types.isArray(value) || value.length > 0);
  }
  return false;
};

/**
 * Determines if the given value is a property of the given subject.
 *
 * @param subject the subject to check.
 * @param property the property to check.
 * @param value the value to check.
 *
 * @return true if the value exists, false if not.
 */
api$3.hasValue = (subject, property, value) => {
  if(api$3.hasProperty(subject, property)) {
    let val = subject[property];
    const isList = graphTypes.isList(val);
    if(types.isArray(val) || isList) {
      if(isList) {
        val = val['@list'];
      }
      for(let i = 0; i < val.length; ++i) {
        if(api$3.compareValues(value, val[i])) {
          return true;
        }
      }
    } else if(!types.isArray(value)) {
      // avoid matching the set of values with an array value parameter
      return api$3.compareValues(value, val);
    }
  }
  return false;
};

/**
 * Adds a value to a subject. If the value is an array, all values in the
 * array will be added.
 *
 * @param subject the subject to add the value to.
 * @param property the property that relates the value to the subject.
 * @param value the value to add.
 * @param [options] the options to use:
 *        [propertyIsArray] true if the property is always an array, false
 *          if not (default: false).
 *        [valueIsArray] true if the value to be added should be preserved as
 *          an array (lists) (default: false).
 *        [allowDuplicate] true to allow duplicates, false not to (uses a
 *          simple shallow comparison of subject ID or value) (default: true).
 *        [prependValue] false to prepend value to any existing values.
 *          (default: false)
 */
api$3.addValue = (subject, property, value, options) => {
  options = options || {};
  if(!('propertyIsArray' in options)) {
    options.propertyIsArray = false;
  }
  if(!('valueIsArray' in options)) {
    options.valueIsArray = false;
  }
  if(!('allowDuplicate' in options)) {
    options.allowDuplicate = true;
  }
  if(!('prependValue' in options)) {
    options.prependValue = false;
  }

  if(options.valueIsArray) {
    subject[property] = value;
  } else if(types.isArray(value)) {
    if(value.length === 0 && options.propertyIsArray &&
      !subject.hasOwnProperty(property)) {
      subject[property] = [];
    }
    if(options.prependValue) {
      value = value.concat(subject[property]);
      subject[property] = [];
    }
    for(let i = 0; i < value.length; ++i) {
      api$3.addValue(subject, property, value[i], options);
    }
  } else if(subject.hasOwnProperty(property)) {
    // check if subject already has value if duplicates not allowed
    const hasValue = (!options.allowDuplicate &&
      api$3.hasValue(subject, property, value));

    // make property an array if value not present or always an array
    if(!types.isArray(subject[property]) &&
      (!hasValue || options.propertyIsArray)) {
      subject[property] = [subject[property]];
    }

    // add new value
    if(!hasValue) {
      if(options.prependValue) {
        subject[property].unshift(value);
      } else {
        subject[property].push(value);
      }
    }
  } else {
    // add new value as set or single value
    subject[property] = options.propertyIsArray ? [value] : value;
  }
};

/**
 * Gets all of the values for a subject's property as an array.
 *
 * @param subject the subject.
 * @param property the property.
 *
 * @return all of the values for a subject's property as an array.
 */
api$3.getValues = (subject, property) => [].concat(subject[property] || []);

/**
 * Removes a property from a subject.
 *
 * @param subject the subject.
 * @param property the property.
 */
api$3.removeProperty = (subject, property) => {
  delete subject[property];
};

/**
 * Removes a value from a subject.
 *
 * @param subject the subject.
 * @param property the property that relates the value to the subject.
 * @param value the value to remove.
 * @param [options] the options to use:
 *          [propertyIsArray] true if the property is always an array, false
 *            if not (default: false).
 */
api$3.removeValue = (subject, property, value, options) => {
  options = options || {};
  if(!('propertyIsArray' in options)) {
    options.propertyIsArray = false;
  }

  // filter out value
  const values = api$3.getValues(subject, property).filter(
    e => !api$3.compareValues(e, value));

  if(values.length === 0) {
    api$3.removeProperty(subject, property);
  } else if(values.length === 1 && !options.propertyIsArray) {
    subject[property] = values[0];
  } else {
    subject[property] = values;
  }
};

/**
 * Relabels all blank nodes in the given JSON-LD input.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [issuer] an IdentifierIssuer to use to label blank nodes.
 */
api$3.relabelBlankNodes = (input, options) => {
  options = options || {};
  const issuer = options.issuer || new IdentifierIssuer('_:b');
  return _labelBlankNodes(issuer, input);
};

/**
 * Compares two JSON-LD values for equality. Two JSON-LD values will be
 * considered equal if:
 *
 * 1. They are both primitives of the same type and value.
 * 2. They are both @values with the same @value, @type, @language,
 *   and @index, OR
 * 3. They both have @ids they are the same.
 *
 * @param v1 the first value.
 * @param v2 the second value.
 *
 * @return true if v1 and v2 are considered equal, false if not.
 */
api$3.compareValues = (v1, v2) => {
  // 1. equal primitives
  if(v1 === v2) {
    return true;
  }

  // 2. equal @values
  if(graphTypes.isValue(v1) && graphTypes.isValue(v2) &&
    v1['@value'] === v2['@value'] &&
    v1['@type'] === v2['@type'] &&
    v1['@language'] === v2['@language'] &&
    v1['@index'] === v2['@index']) {
    return true;
  }

  // 3. equal @ids
  if(types.isObject(v1) &&
    ('@id' in v1) &&
    types.isObject(v2) &&
    ('@id' in v2)) {
    return v1['@id'] === v2['@id'];
  }

  return false;
};

/**
 * Compares two strings first based on length and then lexicographically.
 *
 * @param a the first string.
 * @param b the second string.
 *
 * @return -1 if a < b, 1 if a > b, 0 if a === b.
 */
api$3.compareShortestLeast = (a, b) => {
  if(a.length < b.length) {
    return -1;
  }
  if(b.length < a.length) {
    return 1;
  }
  if(a === b) {
    return 0;
  }
  return (a < b) ? -1 : 1;
};

/**
 * Labels the blank nodes in the given value using the given IdentifierIssuer.
 *
 * @param issuer the IdentifierIssuer to use.
 * @param element the element with blank nodes to rename.
 *
 * @return the element.
 */
function _labelBlankNodes(issuer, element) {
  if(types.isArray(element)) {
    for(let i = 0; i < element.length; ++i) {
      element[i] = _labelBlankNodes(issuer, element[i]);
    }
  } else if(graphTypes.isList(element)) {
    element['@list'] = _labelBlankNodes(issuer, element['@list']);
  } else if(types.isObject(element)) {
    // relabel blank node
    if(graphTypes.isBlankNode(element)) {
      element['@id'] = issuer.getId(element['@id']);
    }

    // recursively apply to all keys
    const keys = Object.keys(element).sort();
    for(let ki = 0; ki < keys.length; ++ki) {
      const key = keys[ki];
      if(key !== '@id') {
        element[key] = _labelBlankNodes(issuer, element[key]);
      }
    }
  }

  return element;
}

/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

const RDF$1 = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

var constants = {
  // TODO: Deprecated and will be removed later. Use LINK_HEADER_CONTEXT.
  LINK_HEADER_REL: 'http://www.w3.org/ns/json-ld#context',

  LINK_HEADER_CONTEXT: 'http://www.w3.org/ns/json-ld#context',

  RDF: RDF$1,
  RDF_LIST: RDF$1 + 'List',
  RDF_FIRST: RDF$1 + 'first',
  RDF_REST: RDF$1 + 'rest',
  RDF_NIL: RDF$1 + 'nil',
  RDF_TYPE: RDF$1 + 'type',
  RDF_PLAIN_LITERAL: RDF$1 + 'PlainLiteral',
  RDF_XML_LITERAL: RDF$1 + 'XMLLiteral',
  RDF_JSON_LITERAL: RDF$1 + 'JSON',
  RDF_OBJECT: RDF$1 + 'object',
  RDF_LANGSTRING: RDF$1 + 'langString',

  XSD,
  XSD_BOOLEAN: XSD + 'boolean',
  XSD_DOUBLE: XSD + 'double',
  XSD_INTEGER: XSD + 'integer',
  XSD_STRING: XSD + 'string',
};

/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */

var RequestQueue_1 = class RequestQueue {
  /**
   * Creates a simple queue for requesting documents.
   */
  constructor() {
    this._requests = {};
  }

  wrapLoader(loader) {
    const self = this;
    self._loader = loader;
    return function(/* url */) {
      return self.add.apply(self, arguments);
    };
  }

  async add(url) {
    let promise = this._requests[url];
    if(promise) {
      // URL already queued, wait for it to load
      return Promise.resolve(promise);
    }

    // queue URL and load it
    promise = this._requests[url] = this._loader(url);

    try {
      return await promise;
    } finally {
      delete this._requests[url];
    }
  }
};

const api$4 = {};
var url = api$4;

// define URL parser
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// with local jsonld.js modifications
api$4.parsers = {
  simple: {
    // RFC 3986 basic parts
    keys: [
      'href', 'scheme', 'authority', 'path', 'query', 'fragment'
    ],
    /* eslint-disable-next-line max-len */
    regex: /^(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/
  },
  full: {
    keys: [
      'href', 'protocol', 'scheme', 'authority', 'auth', 'user', 'password',
      'hostname', 'port', 'path', 'directory', 'file', 'query', 'fragment'
    ],
    /* eslint-disable-next-line max-len */
    regex: /^(([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?(?:(((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};
api$4.parse = (str, parser) => {
  const parsed = {};
  const o = api$4.parsers[parser || 'full'];
  const m = o.regex.exec(str);
  let i = o.keys.length;
  while(i--) {
    parsed[o.keys[i]] = (m[i] === undefined) ? null : m[i];
  }

  // remove default ports in found in URLs
  if((parsed.scheme === 'https' && parsed.port === '443') ||
    (parsed.scheme === 'http' && parsed.port === '80')) {
    parsed.href = parsed.href.replace(':' + parsed.port, '');
    parsed.authority = parsed.authority.replace(':' + parsed.port, '');
    parsed.port = null;
  }

  parsed.normalizedPath = api$4.removeDotSegments(parsed.path);
  return parsed;
};

/**
 * Prepends a base IRI to the given relative IRI.
 *
 * @param base the base IRI.
 * @param iri the relative IRI.
 *
 * @return the absolute IRI.
 */
api$4.prependBase = (base, iri) => {
  // skip IRI processing
  if(base === null) {
    return iri;
  }
  // already an absolute IRI
  if(api$4.isAbsolute(iri)) {
    return iri;
  }

  // parse base if it is a string
  if(!base || types.isString(base)) {
    base = api$4.parse(base || '');
  }

  // parse given IRI
  const rel = api$4.parse(iri);

  // per RFC3986 5.2.2
  const transform = {
    protocol: base.protocol || ''
  };

  if(rel.authority !== null) {
    transform.authority = rel.authority;
    transform.path = rel.path;
    transform.query = rel.query;
  } else {
    transform.authority = base.authority;

    if(rel.path === '') {
      transform.path = base.path;
      if(rel.query !== null) {
        transform.query = rel.query;
      } else {
        transform.query = base.query;
      }
    } else {
      if(rel.path.indexOf('/') === 0) {
        // IRI represents an absolute path
        transform.path = rel.path;
      } else {
        // merge paths
        let path = base.path;

        // append relative path to the end of the last directory from base
        path = path.substr(0, path.lastIndexOf('/') + 1);
        if((path.length > 0 || base.authority) && path.substr(-1) !== '/') {
          path += '/';
        }
        path += rel.path;

        transform.path = path;
      }
      transform.query = rel.query;
    }
  }

  if(rel.path !== '') {
    // remove slashes and dots in path
    transform.path = api$4.removeDotSegments(transform.path);
  }

  // construct URL
  let rval = transform.protocol;
  if(transform.authority !== null) {
    rval += '//' + transform.authority;
  }
  rval += transform.path;
  if(transform.query !== null) {
    rval += '?' + transform.query;
  }
  if(rel.fragment !== null) {
    rval += '#' + rel.fragment;
  }

  // handle empty base
  if(rval === '') {
    rval = './';
  }

  return rval;
};

/**
 * Removes a base IRI from the given absolute IRI.
 *
 * @param base the base IRI.
 * @param iri the absolute IRI.
 *
 * @return the relative IRI if relative to base, otherwise the absolute IRI.
 */
api$4.removeBase = (base, iri) => {
  // skip IRI processing
  if(base === null) {
    return iri;
  }

  if(!base || types.isString(base)) {
    base = api$4.parse(base || '');
  }

  // establish base root
  let root = '';
  if(base.href !== '') {
    root += (base.protocol || '') + '//' + (base.authority || '');
  } else if(iri.indexOf('//')) {
    // support network-path reference with empty base
    root += '//';
  }

  // IRI not relative to base
  if(iri.indexOf(root) !== 0) {
    return iri;
  }

  // remove root from IRI and parse remainder
  const rel = api$4.parse(iri.substr(root.length));

  // remove path segments that match (do not remove last segment unless there
  // is a hash or query)
  const baseSegments = base.normalizedPath.split('/');
  const iriSegments = rel.normalizedPath.split('/');
  const last = (rel.fragment || rel.query) ? 0 : 1;
  while(baseSegments.length > 0 && iriSegments.length > last) {
    if(baseSegments[0] !== iriSegments[0]) {
      break;
    }
    baseSegments.shift();
    iriSegments.shift();
  }

  // use '../' for each non-matching base segment
  let rval = '';
  if(baseSegments.length > 0) {
    // don't count the last segment (if it ends with '/' last path doesn't
    // count and if it doesn't end with '/' it isn't a path)
    baseSegments.pop();
    for(let i = 0; i < baseSegments.length; ++i) {
      rval += '../';
    }
  }

  // prepend remaining segments
  rval += iriSegments.join('/');

  // add query and hash
  if(rel.query !== null) {
    rval += '?' + rel.query;
  }
  if(rel.fragment !== null) {
    rval += '#' + rel.fragment;
  }

  // handle empty base
  if(rval === '') {
    rval = './';
  }

  return rval;
};

/**
 * Removes dot segments from a URL path.
 *
 * @param path the path to remove dot segments from.
 */
api$4.removeDotSegments = path => {
  // RFC 3986 5.2.4 (reworked)

  // empty path shortcut
  if(path.length === 0) {
    return '';
  }

  const input = path.split('/');
  const output = [];

  while(input.length > 0) {
    const next = input.shift();
    const done = input.length === 0;

    if(next === '.') {
      if(done) {
        // ensure output has trailing /
        output.push('');
      }
      continue;
    }

    if(next === '..') {
      output.pop();
      if(done) {
        // ensure output has trailing /
        output.push('');
      }
      continue;
    }

    output.push(next);
  }

  // if path was absolute, ensure output has leading /
  if(path[0] === '/' && output.length > 0 && output[0] !== '') {
    output.unshift('');
  }
  if(output.length === 1 && output[0] === '') {
    return '/';
  }

  return output.join('/');
};

// TODO: time better isAbsolute/isRelative checks using full regexes:
// http://jmrware.com/articles/2009/uri_regexp/URI_regex.html

// regex to check for absolute IRI (starting scheme and ':') or blank node IRI
const isAbsoluteRegex = /^([A-Za-z][A-Za-z0-9+-.]*|_):[^\s]*$/;

/**
 * Returns true if the given value is an absolute IRI or blank node IRI, false
 * if not.
 * Note: This weak check only checks for a correct starting scheme.
 *
 * @param v the value to check.
 *
 * @return true if the value is an absolute IRI, false if not.
 */
api$4.isAbsolute = v => types.isString(v) && isAbsoluteRegex.test(v);

/**
 * Returns true if the given value is a relative IRI, false if not.
 * Note: this is a weak check.
 *
 * @param v the value to check.
 *
 * @return true if the value is a relative IRI, false if not.
 */
api$4.isRelative = v => types.isString(v);

const {parseLinkHeader, buildHeaders} = util;
const {LINK_HEADER_CONTEXT} = constants;


const {prependBase} = url;

const REGEX_LINK_HEADER$1 = /(^|(\r\n))link:/i;

/**
 * Creates a built-in XMLHttpRequest document loader.
 *
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          headers: an object (map) of headers which will be passed as request
 *            headers for the requested document. Accept is not allowed.
 *          [xhr]: the XMLHttpRequest API to use.
 *
 * @return the XMLHttpRequest document loader.
 */
var xhr = ({
  secure,
  headers = {},
  xhr
} = {headers: {}}) => {
  headers = buildHeaders(headers);
  const queue = new RequestQueue_1();
  return queue.wrapLoader(loader);

  async function loader(url) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      throw new JsonLdError_1(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url});
    }
    if(secure && url.indexOf('https') !== 0) {
      throw new JsonLdError_1(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url});
    }

    let req;
    try {
      req = await _get(xhr, url, headers);
    } catch(e) {
      throw new JsonLdError_1(
        'URL could not be dereferenced, an error occurred.',
        'jsonld.LoadDocumentError',
        {code: 'loading document failed', url, cause: e});
    }

    if(req.status >= 400) {
      throw new JsonLdError_1(
        'URL could not be dereferenced: ' + req.statusText,
        'jsonld.LoadDocumentError', {
          code: 'loading document failed',
          url,
          httpStatusCode: req.status
        });
    }

    let doc = {contextUrl: null, documentUrl: url, document: req.response};
    let alternate = null;

    // handle Link Header (avoid unsafe header warning by existence testing)
    const contentType = req.getResponseHeader('Content-Type');
    let linkHeader;
    if(REGEX_LINK_HEADER$1.test(req.getAllResponseHeaders())) {
      linkHeader = req.getResponseHeader('Link');
    }
    if(linkHeader && contentType !== 'application/ld+json') {
      // only 1 related link header permitted
      const linkHeaders = parseLinkHeader(linkHeader);
      const linkedContext = linkHeaders[LINK_HEADER_CONTEXT];
      if(Array.isArray(linkedContext)) {
        throw new JsonLdError_1(
          'URL could not be dereferenced, it has more than one ' +
          'associated HTTP Link Header.',
          'jsonld.InvalidUrl',
          {code: 'multiple context link headers', url});
      }
      if(linkedContext) {
        doc.contextUrl = linkedContext.target;
      }

      // "alternate" link header is a redirect
      alternate = linkHeaders['alternate'];
      if(alternate &&
        alternate.type == 'application/ld+json' &&
        !(contentType || '').match(/^application\/(\w*\+)?json$/)) {
        doc = await loader(prependBase(url, alternate.target));
      }
    }

    return doc;
  }
};

function _get(xhr, url, headers) {
  xhr = xhr || XMLHttpRequest;
  const req = new xhr();
  return new Promise((resolve, reject) => {
    req.onload = () => resolve(req);
    req.onerror = err => reject(err);
    req.open('GET', url, true);
    for(const k in headers) {
      req.setRequestHeader(k, headers[k]);
    }
    req.send();
  });
}

const api$5 = {};
var platformBrowser = api$5;

/**
 * Setup browser document loaders.
 *
 * @param jsonld the jsonld api.
 */
api$5.setupDocumentLoaders = function(jsonld) {
  if(typeof XMLHttpRequest !== 'undefined') {
    jsonld.documentLoaders.xhr = xhr;
    // use xhr document loader by default
    jsonld.useDocumentLoader('xhr');
  }
};

/**
 * Setup browser globals.
 *
 * @param jsonld the jsonld api.
 */
api$5.setupGlobals = function(jsonld) {
  // setup browser global JsonLdProcessor
  if(typeof globalThis.JsonLdProcessor === 'undefined') {
    Object.defineProperty(globalThis, 'JsonLdProcessor', {
      writable: true,
      enumerable: false,
      configurable: true,
      value: jsonld.JsonLdProcessor
    });
  }
};

var iterator = function (Yallist) {
  Yallist.prototype[Symbol.iterator] = function* () {
    for (let walker = this.head; walker; walker = walker.next) {
      yield walker.value;
    }
  };
};

var yallist = Yallist;

Yallist.Node = Node$1;
Yallist.create = Yallist;

function Yallist (list) {
  var self = this;
  if (!(self instanceof Yallist)) {
    self = new Yallist();
  }

  self.tail = null;
  self.head = null;
  self.length = 0;

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item);
    });
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i]);
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next;
  var prev = node.prev;

  if (next) {
    next.prev = prev;
  }

  if (prev) {
    prev.next = next;
  }

  if (node === this.head) {
    this.head = next;
  }
  if (node === this.tail) {
    this.tail = prev;
  }

  node.list.length--;
  node.next = null;
  node.prev = null;
  node.list = null;

  return next
};

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node);
  }

  var head = this.head;
  node.list = this;
  node.next = head;
  if (head) {
    head.prev = node;
  }

  this.head = node;
  if (!this.tail) {
    this.tail = node;
  }
  this.length++;
};

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node);
  }

  var tail = this.tail;
  node.list = this;
  node.prev = tail;
  if (tail) {
    tail.next = node;
  }

  this.tail = node;
  if (!this.head) {
    this.head = node;
  }
  this.length++;
};

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i]);
  }
  return this.length
};

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i]);
  }
  return this.length
};

Yallist.prototype.pop = function () {
  if (!this.tail) {
    return undefined
  }

  var res = this.tail.value;
  this.tail = this.tail.prev;
  if (this.tail) {
    this.tail.next = null;
  } else {
    this.head = null;
  }
  this.length--;
  return res
};

Yallist.prototype.shift = function () {
  if (!this.head) {
    return undefined
  }

  var res = this.head.value;
  this.head = this.head.next;
  if (this.head) {
    this.head.prev = null;
  } else {
    this.tail = null;
  }
  this.length--;
  return res
};

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this;
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this);
    walker = walker.next;
  }
};

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this;
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this);
    walker = walker.prev;
  }
};

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next;
  }
  if (i === n && walker !== null) {
    return walker.value
  }
};

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev;
  }
  if (i === n && walker !== null) {
    return walker.value
  }
};

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this;
  var res = new Yallist();
  for (var walker = this.head; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this));
    walker = walker.next;
  }
  return res
};

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this;
  var res = new Yallist();
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this));
    walker = walker.prev;
  }
  return res
};

Yallist.prototype.reduce = function (fn, initial) {
  var acc;
  var walker = this.head;
  if (arguments.length > 1) {
    acc = initial;
  } else if (this.head) {
    walker = this.head.next;
    acc = this.head.value;
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i);
    walker = walker.next;
  }

  return acc
};

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc;
  var walker = this.tail;
  if (arguments.length > 1) {
    acc = initial;
  } else if (this.tail) {
    walker = this.tail.prev;
    acc = this.tail.value;
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i);
    walker = walker.prev;
  }

  return acc
};

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length);
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value;
    walker = walker.next;
  }
  return arr
};

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length);
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value;
    walker = walker.prev;
  }
  return arr
};

Yallist.prototype.slice = function (from, to) {
  to = to || this.length;
  if (to < 0) {
    to += this.length;
  }
  from = from || 0;
  if (from < 0) {
    from += this.length;
  }
  var ret = new Yallist();
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0;
  }
  if (to > this.length) {
    to = this.length;
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next;
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value);
  }
  return ret
};

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length;
  if (to < 0) {
    to += this.length;
  }
  from = from || 0;
  if (from < 0) {
    from += this.length;
  }
  var ret = new Yallist();
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0;
  }
  if (to > this.length) {
    to = this.length;
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev;
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value);
  }
  return ret
};

Yallist.prototype.splice = function (start, deleteCount, ...nodes) {
  if (start > this.length) {
    start = this.length - 1;
  }
  if (start < 0) {
    start = this.length + start;
  }

  for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
    walker = walker.next;
  }

  var ret = [];
  for (var i = 0; walker && i < deleteCount; i++) {
    ret.push(walker.value);
    walker = this.removeNode(walker);
  }
  if (walker === null) {
    walker = this.tail;
  }

  if (walker !== this.head && walker !== this.tail) {
    walker = walker.prev;
  }

  for (var i = 0; i < nodes.length; i++) {
    walker = insert(this, walker, nodes[i]);
  }
  return ret;
};

Yallist.prototype.reverse = function () {
  var head = this.head;
  var tail = this.tail;
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev;
    walker.prev = walker.next;
    walker.next = p;
  }
  this.head = tail;
  this.tail = head;
  return this
};

function insert (self, node, value) {
  var inserted = node === self.head ?
    new Node$1(value, null, node, self) :
    new Node$1(value, node, node.next, self);

  if (inserted.next === null) {
    self.tail = inserted;
  }
  if (inserted.prev === null) {
    self.head = inserted;
  }

  self.length++;

  return inserted
}

function push (self, item) {
  self.tail = new Node$1(item, self.tail, null, self);
  if (!self.head) {
    self.head = self.tail;
  }
  self.length++;
}

function unshift (self, item) {
  self.head = new Node$1(item, null, self.head, self);
  if (!self.tail) {
    self.tail = self.head;
  }
  self.length++;
}

function Node$1 (value, prev, next, list) {
  if (!(this instanceof Node$1)) {
    return new Node$1(value, prev, next, list)
  }

  this.list = list;
  this.value = value;

  if (prev) {
    prev.next = this;
    this.prev = prev;
  } else {
    this.prev = null;
  }

  if (next) {
    next.prev = this;
    this.next = next;
  } else {
    this.next = null;
  }
}

try {
  // add if support for Symbol.iterator is present
  iterator(Yallist);
} catch (er) {}

// A linked list to keep track of recently-used-ness


const MAX = Symbol('max');
const LENGTH = Symbol('length');
const LENGTH_CALCULATOR = Symbol('lengthCalculator');
const ALLOW_STALE = Symbol('allowStale');
const MAX_AGE = Symbol('maxAge');
const DISPOSE = Symbol('dispose');
const NO_DISPOSE_ON_SET = Symbol('noDisposeOnSet');
const LRU_LIST = Symbol('lruList');
const CACHE = Symbol('cache');
const UPDATE_AGE_ON_GET = Symbol('updateAgeOnGet');

const naiveLength = () => 1;

// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
class LRUCache {
  constructor (options) {
    if (typeof options === 'number')
      options = { max: options };

    if (!options)
      options = {};

    if (options.max && (typeof options.max !== 'number' || options.max < 0))
      throw new TypeError('max must be a non-negative number')
    // Kind of weird to have a default max of Infinity, but oh well.
    const max = this[MAX] = options.max || Infinity;

    const lc = options.length || naiveLength;
    this[LENGTH_CALCULATOR] = (typeof lc !== 'function') ? naiveLength : lc;
    this[ALLOW_STALE] = options.stale || false;
    if (options.maxAge && typeof options.maxAge !== 'number')
      throw new TypeError('maxAge must be a number')
    this[MAX_AGE] = options.maxAge || 0;
    this[DISPOSE] = options.dispose;
    this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
    this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
    this.reset();
  }

  // resize the cache when the max changes.
  set max (mL) {
    if (typeof mL !== 'number' || mL < 0)
      throw new TypeError('max must be a non-negative number')

    this[MAX] = mL || Infinity;
    trim(this);
  }
  get max () {
    return this[MAX]
  }

  set allowStale (allowStale) {
    this[ALLOW_STALE] = !!allowStale;
  }
  get allowStale () {
    return this[ALLOW_STALE]
  }

  set maxAge (mA) {
    if (typeof mA !== 'number')
      throw new TypeError('maxAge must be a non-negative number')

    this[MAX_AGE] = mA;
    trim(this);
  }
  get maxAge () {
    return this[MAX_AGE]
  }

  // resize the cache when the lengthCalculator changes.
  set lengthCalculator (lC) {
    if (typeof lC !== 'function')
      lC = naiveLength;

    if (lC !== this[LENGTH_CALCULATOR]) {
      this[LENGTH_CALCULATOR] = lC;
      this[LENGTH] = 0;
      this[LRU_LIST].forEach(hit => {
        hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
        this[LENGTH] += hit.length;
      });
    }
    trim(this);
  }
  get lengthCalculator () { return this[LENGTH_CALCULATOR] }

  get length () { return this[LENGTH] }
  get itemCount () { return this[LRU_LIST].length }

  rforEach (fn, thisp) {
    thisp = thisp || this;
    for (let walker = this[LRU_LIST].tail; walker !== null;) {
      const prev = walker.prev;
      forEachStep(this, fn, walker, thisp);
      walker = prev;
    }
  }

  forEach (fn, thisp) {
    thisp = thisp || this;
    for (let walker = this[LRU_LIST].head; walker !== null;) {
      const next = walker.next;
      forEachStep(this, fn, walker, thisp);
      walker = next;
    }
  }

  keys () {
    return this[LRU_LIST].toArray().map(k => k.key)
  }

  values () {
    return this[LRU_LIST].toArray().map(k => k.value)
  }

  reset () {
    if (this[DISPOSE] &&
        this[LRU_LIST] &&
        this[LRU_LIST].length) {
      this[LRU_LIST].forEach(hit => this[DISPOSE](hit.key, hit.value));
    }

    this[CACHE] = new Map(); // hash of items by key
    this[LRU_LIST] = new yallist(); // list of items in order of use recency
    this[LENGTH] = 0; // length of items in the list
  }

  dump () {
    return this[LRU_LIST].map(hit =>
      isStale(this, hit) ? false : {
        k: hit.key,
        v: hit.value,
        e: hit.now + (hit.maxAge || 0)
      }).toArray().filter(h => h)
  }

  dumpLru () {
    return this[LRU_LIST]
  }

  set (key, value, maxAge) {
    maxAge = maxAge || this[MAX_AGE];

    if (maxAge && typeof maxAge !== 'number')
      throw new TypeError('maxAge must be a number')

    const now = maxAge ? Date.now() : 0;
    const len = this[LENGTH_CALCULATOR](value, key);

    if (this[CACHE].has(key)) {
      if (len > this[MAX]) {
        del(this, this[CACHE].get(key));
        return false
      }

      const node = this[CACHE].get(key);
      const item = node.value;

      // dispose of the old one before overwriting
      // split out into 2 ifs for better coverage tracking
      if (this[DISPOSE]) {
        if (!this[NO_DISPOSE_ON_SET])
          this[DISPOSE](key, item.value);
      }

      item.now = now;
      item.maxAge = maxAge;
      item.value = value;
      this[LENGTH] += len - item.length;
      item.length = len;
      this.get(key);
      trim(this);
      return true
    }

    const hit = new Entry(key, value, len, now, maxAge);

    // oversized objects fall out of cache automatically.
    if (hit.length > this[MAX]) {
      if (this[DISPOSE])
        this[DISPOSE](key, value);

      return false
    }

    this[LENGTH] += hit.length;
    this[LRU_LIST].unshift(hit);
    this[CACHE].set(key, this[LRU_LIST].head);
    trim(this);
    return true
  }

  has (key) {
    if (!this[CACHE].has(key)) return false
    const hit = this[CACHE].get(key).value;
    return !isStale(this, hit)
  }

  get (key) {
    return get(this, key, true)
  }

  peek (key) {
    return get(this, key, false)
  }

  pop () {
    const node = this[LRU_LIST].tail;
    if (!node)
      return null

    del(this, node);
    return node.value
  }

  del (key) {
    del(this, this[CACHE].get(key));
  }

  load (arr) {
    // reset the cache
    this.reset();

    const now = Date.now();
    // A previous serialized cache has the most recent items first
    for (let l = arr.length - 1; l >= 0; l--) {
      const hit = arr[l];
      const expiresAt = hit.e || 0;
      if (expiresAt === 0)
        // the item was created without expiration in a non aged cache
        this.set(hit.k, hit.v);
      else {
        const maxAge = expiresAt - now;
        // dont add already expired items
        if (maxAge > 0) {
          this.set(hit.k, hit.v, maxAge);
        }
      }
    }
  }

  prune () {
    this[CACHE].forEach((value, key) => get(this, key, false));
  }
}

const get = (self, key, doUse) => {
  const node = self[CACHE].get(key);
  if (node) {
    const hit = node.value;
    if (isStale(self, hit)) {
      del(self, node);
      if (!self[ALLOW_STALE])
        return undefined
    } else {
      if (doUse) {
        if (self[UPDATE_AGE_ON_GET])
          node.value.now = Date.now();
        self[LRU_LIST].unshiftNode(node);
      }
    }
    return hit.value
  }
};

const isStale = (self, hit) => {
  if (!hit || (!hit.maxAge && !self[MAX_AGE]))
    return false

  const diff = Date.now() - hit.now;
  return hit.maxAge ? diff > hit.maxAge
    : self[MAX_AGE] && (diff > self[MAX_AGE])
};

const trim = self => {
  if (self[LENGTH] > self[MAX]) {
    for (let walker = self[LRU_LIST].tail;
      self[LENGTH] > self[MAX] && walker !== null;) {
      // We know that we're about to delete this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      const prev = walker.prev;
      del(self, walker);
      walker = prev;
    }
  }
};

const del = (self, node) => {
  if (node) {
    const hit = node.value;
    if (self[DISPOSE])
      self[DISPOSE](hit.key, hit.value);

    self[LENGTH] -= hit.length;
    self[CACHE].delete(hit.key);
    self[LRU_LIST].removeNode(node);
  }
};

class Entry {
  constructor (key, value, length, now, maxAge) {
    this.key = key;
    this.value = value;
    this.length = length;
    this.now = now;
    this.maxAge = maxAge || 0;
  }
}

const forEachStep = (self, fn, node, thisp) => {
  let hit = node.value;
  if (isStale(self, hit)) {
    del(self, node);
    if (!self[ALLOW_STALE])
      hit = undefined;
  }
  if (hit)
    fn.call(thisp, hit.value, hit.key, self);
};

var lruCache = LRUCache;

const MAX_ACTIVE_CONTEXTS = 10;

var ResolvedContext_1 = class ResolvedContext {
  /**
   * Creates a ResolvedContext.
   *
   * @param document the context document.
   */
  constructor({document}) {
    this.document = document;
    // TODO: enable customization of processed context cache
    // TODO: limit based on size of processed contexts vs. number of them
    this.cache = new lruCache({max: MAX_ACTIVE_CONTEXTS});
  }

  getProcessed(activeCtx) {
    return this.cache.get(activeCtx);
  }

  setProcessed(activeCtx, processedCtx) {
    this.cache.set(activeCtx, processedCtx);
  }
};

const {
  isArray: _isArray,
  isObject: _isObject,
  isString: _isString,
} = types;
const {
  asArray: _asArray
} = util;
const {prependBase: prependBase$1} = url;



const MAX_CONTEXT_URLS = 10;

var ContextResolver_1 = class ContextResolver {
  /**
   * Creates a ContextResolver.
   *
   * @param sharedCache a shared LRU cache with `get` and `set` APIs.
   */
  constructor({sharedCache}) {
    this.perOpCache = new Map();
    this.sharedCache = sharedCache;
  }

  async resolve({
    activeCtx, context, documentLoader, base, cycles = new Set()
  }) {
    // process `@context`
    if(context && _isObject(context) && context['@context']) {
      context = context['@context'];
    }

    // context is one or more contexts
    context = _asArray(context);

    // resolve each context in the array
    const allResolved = [];
    for(const ctx of context) {
      if(_isString(ctx)) {
        // see if `ctx` has been resolved before...
        let resolved = this._get(ctx);
        if(!resolved) {
          // not resolved yet, resolve
          resolved = await this._resolveRemoteContext(
            {activeCtx, url: ctx, documentLoader, base, cycles});
        }

        // add to output and continue
        if(_isArray(resolved)) {
          allResolved.push(...resolved);
        } else {
          allResolved.push(resolved);
        }
        continue;
      }
      if(ctx === null) {
        // handle `null` context, nothing to cache
        allResolved.push(new ResolvedContext_1({document: null}));
        continue;
      }
      if(!_isObject(ctx)) {
        _throwInvalidLocalContext(context);
      }
      // context is an object, get/create `ResolvedContext` for it
      const key = JSON.stringify(ctx);
      let resolved = this._get(key);
      if(!resolved) {
        // create a new static `ResolvedContext` and cache it
        resolved = new ResolvedContext_1({document: ctx});
        this._cacheResolvedContext({key, resolved, tag: 'static'});
      }
      allResolved.push(resolved);
    }

    return allResolved;
  }

  _get(key) {
    // get key from per operation cache; no `tag` is used with this cache so
    // any retrieved context will always be the same during a single operation
    let resolved = this.perOpCache.get(key);
    if(!resolved) {
      // see if the shared cache has a `static` entry for this URL
      const tagMap = this.sharedCache.get(key);
      if(tagMap) {
        resolved = tagMap.get('static');
        if(resolved) {
          this.perOpCache.set(key, resolved);
        }
      }
    }
    return resolved;
  }

  _cacheResolvedContext({key, resolved, tag}) {
    this.perOpCache.set(key, resolved);
    if(tag !== undefined) {
      let tagMap = this.sharedCache.get(key);
      if(!tagMap) {
        tagMap = new Map();
        this.sharedCache.set(key, tagMap);
      }
      tagMap.set(tag, resolved);
    }
    return resolved;
  }

  async _resolveRemoteContext({activeCtx, url, documentLoader, base, cycles}) {
    // resolve relative URL and fetch context
    url = prependBase$1(base, url);
    const {context, remoteDoc} = await this._fetchContext(
      {activeCtx, url, documentLoader, cycles});

    // update base according to remote document and resolve any relative URLs
    base = remoteDoc.documentUrl || url;
    _resolveContextUrls({context, base});

    // resolve, cache, and return context
    const resolved = await this.resolve(
      {activeCtx, context, documentLoader, base, cycles});
    this._cacheResolvedContext({key: url, resolved, tag: remoteDoc.tag});
    return resolved;
  }

  async _fetchContext({activeCtx, url, documentLoader, cycles}) {
    // check for max context URLs fetched during a resolve operation
    if(cycles.size > MAX_CONTEXT_URLS) {
      throw new JsonLdError_1(
        'Maximum number of @context URLs exceeded.',
        'jsonld.ContextUrlError',
        {
          code: activeCtx.processingMode === 'json-ld-1.0' ?
            'loading remote context failed' :
            'context overflow',
          max: MAX_CONTEXT_URLS
        });
    }

    // check for context URL cycle
    // shortcut to avoid extra work that would eventually hit the max above
    if(cycles.has(url)) {
      throw new JsonLdError_1(
        'Cyclical @context URLs detected.',
        'jsonld.ContextUrlError',
        {
          code: activeCtx.processingMode === 'json-ld-1.0' ?
            'recursive context inclusion' :
            'context overflow',
          url
        });
    }

    // track cycles
    cycles.add(url);

    let context;
    let remoteDoc;

    try {
      remoteDoc = await documentLoader(url);
      context = remoteDoc.document || null;
      // parse string context as JSON
      if(_isString(context)) {
        context = JSON.parse(context);
      }
    } catch(e) {
      throw new JsonLdError_1(
        'Dereferencing a URL did not result in a valid JSON-LD object. ' +
        'Possible causes are an inaccessible URL perhaps due to ' +
        'a same-origin policy (ensure the server uses CORS if you are ' +
        'using client-side JavaScript), too many redirects, a ' +
        'non-JSON response, or more than one HTTP Link Header was ' +
        'provided for a remote context.',
        'jsonld.InvalidUrl',
        {code: 'loading remote context failed', url, cause: e});
    }

    // ensure ctx is an object
    if(!_isObject(context)) {
      throw new JsonLdError_1(
        'Dereferencing a URL did not result in a JSON object. The ' +
        'response was valid JSON, but it was not a JSON object.',
        'jsonld.InvalidUrl', {code: 'invalid remote context', url});
    }

    // use empty context if no @context key is present
    if(!('@context' in context)) {
      context = {'@context': {}};
    } else {
      context = {'@context': context['@context']};
    }

    // append @context URL to context if given
    if(remoteDoc.contextUrl) {
      if(!_isArray(context['@context'])) {
        context['@context'] = [context['@context']];
      }
      context['@context'].push(remoteDoc.contextUrl);
    }

    return {context, remoteDoc};
  }
};

function _throwInvalidLocalContext(ctx) {
  throw new JsonLdError_1(
    'Invalid JSON-LD syntax; @context must be an object.',
    'jsonld.SyntaxError', {
      code: 'invalid local context', context: ctx
    });
}

/**
 * Resolve all relative `@context` URLs in the given context by inline
 * replacing them with absolute URLs.
 *
 * @param context the context.
 * @param base the base IRI to use to resolve relative IRIs.
 */
function _resolveContextUrls({context, base}) {
  if(!context) {
    return;
  }

  const ctx = context['@context'];

  if(_isString(ctx)) {
    context['@context'] = prependBase$1(base, ctx);
    return;
  }

  if(_isArray(ctx)) {
    for(let i = 0; i < ctx.length; ++i) {
      const element = ctx[i];
      if(_isString(element)) {
        ctx[i] = prependBase$1(base, element);
        continue;
      }
      if(_isObject(element)) {
        _resolveContextUrls({context: {'@context': element}, base});
      }
    }
    return;
  }

  if(!_isObject(ctx)) {
    // no @context URLs can be found in non-object
    return;
  }

  // ctx is an object, resolve any context URLs in terms
  for(const term in ctx) {
    _resolveContextUrls({context: ctx[term], base});
  }
}

// TODO: move `NQuads` to its own package
var NQuads = rdfCanonize.NQuads;

const {
  isArray: _isArray$1,
  isObject: _isObject$1,
  isString: _isString$1,
  isUndefined: _isUndefined
} = types;

const {
  isAbsolute: _isAbsoluteIri,
  isRelative: _isRelativeIri,
  prependBase: prependBase$2
} = url;

const {
  asArray: _asArray$1,
  compareShortestLeast: _compareShortestLeast
} = util;

const INITIAL_CONTEXT_CACHE = new Map();
const INITIAL_CONTEXT_CACHE_MAX_SIZE = 10000;
const KEYWORD_PATTERN = /^@[a-zA-Z]+$/;

const api$6 = {};
var context = api$6;

/**
 * Processes a local context and returns a new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param options the context processing options.
 * @param propagate `true` if `false`, retains any previously defined term,
 *   which can be rolled back when the descending into a new node object.
 * @param overrideProtected `false` allows protected terms to be modified.
 *
 * @return a Promise that resolves to the new active context.
 */
api$6.process = async ({
  activeCtx, localCtx, options,
  propagate = true,
  overrideProtected = false,
  cycles = new Set()
}) => {
  // normalize local context to an array of @context objects
  if(_isObject$1(localCtx) && '@context' in localCtx &&
    _isArray$1(localCtx['@context'])) {
    localCtx = localCtx['@context'];
  }
  const ctxs = _asArray$1(localCtx);

  // no contexts in array, return current active context w/o changes
  if(ctxs.length === 0) {
    return activeCtx;
  }

  // resolve contexts
  const resolved = await options.contextResolver.resolve({
    activeCtx,
    context: localCtx,
    documentLoader: options.documentLoader,
    base: options.base
  });

  // override propagate if first resolved context has `@propagate`
  if(_isObject$1(resolved[0].document) &&
    typeof resolved[0].document['@propagate'] === 'boolean') {
    // retrieve early, error checking done later
    propagate = resolved[0].document['@propagate'];
  }

  // process each context in order, update active context
  // on each iteration to ensure proper caching
  let rval = activeCtx;

  // track the previous context
  // if not propagating, make sure rval has a previous context
  if(!propagate && !rval.previousContext) {
    // clone `rval` context before updating
    rval = rval.clone();
    rval.previousContext = activeCtx;
  }

  for(const resolvedContext of resolved) {
    let {document: ctx} = resolvedContext;

    // update active context to one computed from last iteration
    activeCtx = rval;

    // reset to initial context
    if(ctx === null) {
      // We can't nullify if there are protected terms and we're
      // not allowing overrides (e.g. processing a property term scoped context)
      if(!overrideProtected &&
        Object.keys(activeCtx.protected).length !== 0) {
        const protectedMode = (options && options.protectedMode) || 'error';
        if(protectedMode === 'error') {
          throw new JsonLdError_1(
            'Tried to nullify a context with protected terms outside of ' +
            'a term definition.',
            'jsonld.SyntaxError',
            {code: 'invalid context nullification'});
        } else if(protectedMode === 'warn') {
          // FIXME: remove logging and use a handler
          console.warn('WARNING: invalid context nullification');

          // get processed context from cache if available
          const processed = resolvedContext.getProcessed(activeCtx);
          if(processed) {
            rval = activeCtx = processed;
            continue;
          }

          const oldActiveCtx = activeCtx;
          // copy all protected term definitions to fresh initial context
          rval = activeCtx = api$6.getInitialContext(options).clone();
          for(const [term, _protected] of
            Object.entries(oldActiveCtx.protected)) {
            if(_protected) {
              activeCtx.mappings[term] =
                util.clone(oldActiveCtx.mappings[term]);
            }
          }
          activeCtx.protected = util.clone(oldActiveCtx.protected);

          // cache processed result
          resolvedContext.setProcessed(oldActiveCtx, rval);
          continue;
        }
        throw new JsonLdError_1(
          'Invalid protectedMode.',
          'jsonld.SyntaxError',
          {code: 'invalid protected mode', context: localCtx, protectedMode});
      }
      rval = activeCtx = api$6.getInitialContext(options).clone();
      continue;
    }

    // get processed context from cache if available
    const processed = resolvedContext.getProcessed(activeCtx);
    if(processed) {
      rval = activeCtx = processed;
      continue;
    }

    // dereference @context key if present
    if(_isObject$1(ctx) && '@context' in ctx) {
      ctx = ctx['@context'];
    }

    // context must be an object by now, all URLs retrieved before this call
    if(!_isObject$1(ctx)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context must be an object.',
        'jsonld.SyntaxError', {code: 'invalid local context', context: ctx});
    }

    // TODO: there is likely a `previousContext` cloning optimization that
    // could be applied here (no need to copy it under certain conditions)

    // clone context before updating it
    rval = rval.clone();

    // define context mappings for keys in local context
    const defined = new Map();

    // handle @version
    if('@version' in ctx) {
      if(ctx['@version'] !== 1.1) {
        throw new JsonLdError_1(
          'Unsupported JSON-LD version: ' + ctx['@version'],
          'jsonld.UnsupportedVersion',
          {code: 'invalid @version value', context: ctx});
      }
      if(activeCtx.processingMode &&
        activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError_1(
          '@version: ' + ctx['@version'] + ' not compatible with ' +
          activeCtx.processingMode,
          'jsonld.ProcessingModeConflict',
          {code: 'processing mode conflict', context: ctx});
      }
      rval.processingMode = 'json-ld-1.1';
      rval['@version'] = ctx['@version'];
      defined.set('@version', true);
    }

    // if not set explicitly, set processingMode to "json-ld-1.1"
    rval.processingMode =
      rval.processingMode || activeCtx.processingMode;

    // handle @base
    if('@base' in ctx) {
      let base = ctx['@base'];

      if(base === null || _isAbsoluteIri(base)) ; else if(_isRelativeIri(base)) {
        base = prependBase$2(rval['@base'], base);
      } else {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; the value of "@base" in a ' +
          '@context must be an absolute IRI, a relative IRI, or null.',
          'jsonld.SyntaxError', {code: 'invalid base IRI', context: ctx});
      }

      rval['@base'] = base;
      defined.set('@base', true);
    }

    // handle @vocab
    if('@vocab' in ctx) {
      const value = ctx['@vocab'];
      if(value === null) {
        delete rval['@vocab'];
      } else if(!_isString$1(value)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else if(!_isAbsoluteIri(value) && api$6.processingMode(rval, 1.0)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be an absolute IRI.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else {
        rval['@vocab'] = _expandIri(rval, value, {vocab: true, base: true},
          undefined, undefined, options);
      }
      defined.set('@vocab', true);
    }

    // handle @language
    if('@language' in ctx) {
      const value = ctx['@language'];
      if(value === null) {
        delete rval['@language'];
      } else if(!_isString$1(value)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; the value of "@language" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError',
          {code: 'invalid default language', context: ctx});
      } else {
        rval['@language'] = value.toLowerCase();
      }
      defined.set('@language', true);
    }

    // handle @direction
    if('@direction' in ctx) {
      const value = ctx['@direction'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @direction not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context member', context: ctx});
      }
      if(value === null) {
        delete rval['@direction'];
      } else if(value !== 'ltr' && value !== 'rtl') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; the value of "@direction" in a ' +
          '@context must be null, "ltr", or "rtl".',
          'jsonld.SyntaxError',
          {code: 'invalid base direction', context: ctx});
      } else {
        rval['@direction'] = value;
      }
      defined.set('@direction', true);
    }

    // handle @propagate
    // note: we've already extracted it, here we just do error checking
    if('@propagate' in ctx) {
      const value = ctx['@propagate'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @propagate not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context entry', context: ctx});
      }
      if(typeof value !== 'boolean') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @propagate value must be a boolean.',
          'jsonld.SyntaxError',
          {code: 'invalid @propagate value', context: localCtx});
      }
      defined.set('@propagate', true);
    }

    // handle @import
    if('@import' in ctx) {
      const value = ctx['@import'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @import not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context entry', context: ctx});
      }
      if(!_isString$1(value)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @import must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid @import value', context: localCtx});
      }

      // resolve contexts
      const resolvedImport = await options.contextResolver.resolve({
        activeCtx,
        context: value,
        documentLoader: options.documentLoader,
        base: options.base
      });
      if(resolvedImport.length !== 1) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @import must reference a single context.',
          'jsonld.SyntaxError',
          {code: 'invalid remote context', context: localCtx});
      }
      const processedImport = resolvedImport[0].getProcessed(activeCtx);
      if(processedImport) {
        // Note: if the same context were used in this active context
        // as a reference context, then processed_input might not
        // be a dict.
        ctx = processedImport;
      } else {
        const importCtx = resolvedImport[0].document;
        if('@import' in importCtx) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax: ' +
            'imported context must not include @import.',
            'jsonld.SyntaxError',
            {code: 'invalid context entry', context: localCtx});
        }

        // merge ctx into importCtx and replace rval with the result
        for(const key in importCtx) {
          if(!ctx.hasOwnProperty(key)) {
            ctx[key] = importCtx[key];
          }
        }

        // Note: this could potenially conflict if the import
        // were used in the same active context as a referenced
        // context and an import. In this case, we
        // could override the cached result, but seems unlikely.
        resolvedImport[0].setProcessed(activeCtx, ctx);
      }

      defined.set('@import', true);
    }

    // handle @protected; determine whether this sub-context is declaring
    // all its terms to be "protected" (exceptions can be made on a
    // per-definition basis)
    defined.set('@protected', ctx['@protected'] || false);

    // process all other keys
    for(const key in ctx) {
      api$6.createTermDefinition({
        activeCtx: rval,
        localCtx: ctx,
        term: key,
        defined,
        options,
        overrideProtected
      });

      if(_isObject$1(ctx[key]) && '@context' in ctx[key]) {
        const keyCtx = ctx[key]['@context'];
        let process = true;
        if(_isString$1(keyCtx)) {
          const url = prependBase$2(options.base, keyCtx);
          // track processed contexts to avoid scoped context recursion
          if(cycles.has(url)) {
            process = false;
          } else {
            cycles.add(url);
          }
        }
        // parse context to validate
        if(process) {
          try {
            await api$6.process({
              activeCtx: rval.clone(),
              localCtx: ctx[key]['@context'],
              overrideProtected: true,
              options,
              cycles
            });
          } catch(e) {
            throw new JsonLdError_1(
              'Invalid JSON-LD syntax; invalid scoped context.',
              'jsonld.SyntaxError',
              {
                code: 'invalid scoped context',
                context: ctx[key]['@context'],
                term: key
              });
          }
        }
      }
    }

    // cache processed result
    resolvedContext.setProcessed(activeCtx, rval);
  }

  return rval;
};

/**
 * Creates a term definition during context processing.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context being processed.
 * @param term the term in the local context to define the mapping for.
 * @param defined a map of defining/defined keys to detect cycles and prevent
 *          double definitions.
 * @param {Object} [options] - creation options.
 * @param {string} [options.protectedMode="error"] - "error" to throw error
 *   on `@protected` constraint violation, "warn" to allow violations and
 *   signal a warning.
 * @param overrideProtected `false` allows protected terms to be modified.
 */
api$6.createTermDefinition = ({
  activeCtx,
  localCtx,
  term,
  defined,
  options,
  overrideProtected = false,
}) => {
  if(defined.has(term)) {
    // term already defined
    if(defined.get(term)) {
      return;
    }
    // cycle detected
    throw new JsonLdError_1(
      'Cyclical context definition detected.',
      'jsonld.CyclicalContext',
      {code: 'cyclic IRI mapping', context: localCtx, term});
  }

  // now defining term
  defined.set(term, false);

  // get context term value
  let value;
  if(localCtx.hasOwnProperty(term)) {
    value = localCtx[term];
  }

  if(term === '@type' &&
     _isObject$1(value) &&
     (value['@container'] || '@set') === '@set' &&
     api$6.processingMode(activeCtx, 1.1)) {

    const validKeys = ['@container', '@id', '@protected'];
    const keys = Object.keys(value);
    if(keys.length === 0 || keys.some(k => !validKeys.includes(k))) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; keywords cannot be overridden.',
        'jsonld.SyntaxError',
        {code: 'keyword redefinition', context: localCtx, term});
    }
  } else if(api$6.isKeyword(term)) {
    throw new JsonLdError_1(
      'Invalid JSON-LD syntax; keywords cannot be overridden.',
      'jsonld.SyntaxError',
      {code: 'keyword redefinition', context: localCtx, term});
  } else if(term.match(KEYWORD_PATTERN)) {
    // FIXME: remove logging and use a handler
    console.warn('WARNING: terms beginning with "@" are reserved' +
      ' for future use and ignored', {term});
    return;
  } else if(term === '') {
    throw new JsonLdError_1(
      'Invalid JSON-LD syntax; a term cannot be an empty string.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // keep reference to previous mapping for potential `@protected` check
  const previousMapping = activeCtx.mappings.get(term);

  // remove old mapping
  if(activeCtx.mappings.has(term)) {
    activeCtx.mappings.delete(term);
  }

  // convert short-hand value to object w/@id
  let simpleTerm = false;
  if(_isString$1(value) || value === null) {
    simpleTerm = true;
    value = {'@id': value};
  }

  if(!_isObject$1(value)) {
    throw new JsonLdError_1(
      'Invalid JSON-LD syntax; @context term values must be ' +
      'strings or objects.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // create new mapping
  const mapping = {};
  activeCtx.mappings.set(term, mapping);
  mapping.reverse = false;

  // make sure term definition only has expected keywords
  const validKeys = ['@container', '@id', '@language', '@reverse', '@type'];

  // JSON-LD 1.1 support
  if(api$6.processingMode(activeCtx, 1.1)) {
    validKeys.push(
      '@context', '@direction', '@index', '@nest', '@prefix', '@protected');
  }

  for(const kw in value) {
    if(!validKeys.includes(kw)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a term definition must not contain ' + kw,
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
  }

  // always compute whether term has a colon as an optimization for
  // _compactIri
  const colon = term.indexOf(':');
  mapping._termHasColon = (colon > 0);

  if('@reverse' in value) {
    if('@id' in value) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a @reverse term definition must not ' +
        'contain @id.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }
    if('@nest' in value) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a @reverse term definition must not ' +
        'contain @nest.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }
    const reverse = value['@reverse'];
    if(!_isString$1(reverse)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a @context @reverse value must be a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }

    if(!api$6.isKeyword(reverse) && reverse.match(KEYWORD_PATTERN)) {
      // FIXME: remove logging and use a handler
      console.warn('WARNING: values beginning with "@" are reserved' +
        ' for future use and ignored', {reverse});
      if(previousMapping) {
        activeCtx.mappings.set(term, previousMapping);
      } else {
        activeCtx.mappings.delete(term);
      }
      return;
    }

    // expand and add @id mapping
    const id = _expandIri(
      activeCtx, reverse, {vocab: true, base: false}, localCtx, defined,
      options);
    if(!_isAbsoluteIri(id)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a @context @reverse value must be an ' +
        'absolute IRI or a blank node identifier.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }

    mapping['@id'] = id;
    mapping.reverse = true;
  } else if('@id' in value) {
    let id = value['@id'];
    if(id && !_isString$1(id)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; a @context @id value must be an array ' +
        'of strings or a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    if(id === null) {
      // reserve a null term, which may be protected
      mapping['@id'] = null;
    } else if(!api$6.isKeyword(id) && id.match(KEYWORD_PATTERN)) {
      // FIXME: remove logging and use a handler
      console.warn('WARNING: values beginning with "@" are reserved' +
        ' for future use and ignored', {id});
      if(previousMapping) {
        activeCtx.mappings.set(term, previousMapping);
      } else {
        activeCtx.mappings.delete(term);
      }
      return;
    } else if(id !== term) {
      // expand and add @id mapping
      id = _expandIri(
        activeCtx, id, {vocab: true, base: false}, localCtx, defined, options);
      if(!_isAbsoluteIri(id) && !api$6.isKeyword(id)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; a @context @id value must be an ' +
          'absolute IRI, a blank node identifier, or a keyword.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx});
      }

      // if term has the form of an IRI it must map the same
      if(term.match(/(?::[^:])|\//)) {
        const termDefined = new Map(defined).set(term, true);
        const termIri = _expandIri(
          activeCtx, term, {vocab: true, base: false},
          localCtx, termDefined, options);
        if(termIri !== id) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; term in form of IRI must ' +
            'expand to definition.',
            'jsonld.SyntaxError',
            {code: 'invalid IRI mapping', context: localCtx});
        }
      }

      mapping['@id'] = id;
      // indicate if this term may be used as a compact IRI prefix
      mapping._prefix = (simpleTerm &&
        !mapping._termHasColon &&
        id.match(/[:\/\?#\[\]@]$/));
    }
  }

  if(!('@id' in mapping)) {
    // see if the term has a prefix
    if(mapping._termHasColon) {
      const prefix = term.substr(0, colon);
      if(localCtx.hasOwnProperty(prefix)) {
        // define parent prefix
        api$6.createTermDefinition({
          activeCtx, localCtx, term: prefix, defined, options
        });
      }

      if(activeCtx.mappings.has(prefix)) {
        // set @id based on prefix parent
        const suffix = term.substr(colon + 1);
        mapping['@id'] = activeCtx.mappings.get(prefix)['@id'] + suffix;
      } else {
        // term is an absolute IRI
        mapping['@id'] = term;
      }
    } else if(term === '@type') {
      // Special case, were we've previously determined that container is @set
      mapping['@id'] = term;
    } else {
      // non-IRIs *must* define @ids if @vocab is not available
      if(!('@vocab' in activeCtx)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; @context terms must define an @id.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx, term});
      }
      // prepend vocab to term
      mapping['@id'] = activeCtx['@vocab'] + term;
    }
  }

  // Handle term protection
  if(value['@protected'] === true ||
    (defined.get('@protected') === true && value['@protected'] !== false)) {
    activeCtx.protected[term] = true;
    mapping.protected = true;
  }

  // IRI mapping now defined
  defined.set(term, true);

  if('@type' in value) {
    let type = value['@type'];
    if(!_isString$1(type)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; an @context @type value must be a string.',
        'jsonld.SyntaxError',
        {code: 'invalid type mapping', context: localCtx});
    }

    if((type === '@json' || type === '@none')) {
      if(api$6.processingMode(activeCtx, 1.0)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; an @context @type value must not be ' +
          `"${type}" in JSON-LD 1.0 mode.`,
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
    } else if(type !== '@id' && type !== '@vocab') {
      // expand @type to full IRI
      type = _expandIri(
        activeCtx, type, {vocab: true, base: false}, localCtx, defined,
        options);
      if(!_isAbsoluteIri(type)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; an @context @type value must be an ' +
          'absolute IRI.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
      if(type.indexOf('_:') === 0) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; an @context @type value must be an IRI, ' +
          'not a blank node identifier.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
    }

    // add @type to mapping
    mapping['@type'] = type;
  }

  if('@container' in value) {
    // normalize container to an array form
    const container = _isString$1(value['@container']) ?
      [value['@container']] : (value['@container'] || []);
    const validContainers = ['@list', '@set', '@index', '@language'];
    let isValid = true;
    const hasSet = container.includes('@set');

    // JSON-LD 1.1 support
    if(api$6.processingMode(activeCtx, 1.1)) {
      validContainers.push('@graph', '@id', '@type');

      // check container length
      if(container.includes('@list')) {
        if(container.length !== 1) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; @context @container with @list must ' +
            'have no other values',
            'jsonld.SyntaxError',
            {code: 'invalid container mapping', context: localCtx});
        }
      } else if(container.includes('@graph')) {
        if(container.some(key =>
          key !== '@graph' && key !== '@id' && key !== '@index' &&
          key !== '@set')) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; @context @container with @graph must ' +
            'have no other values other than @id, @index, and @set',
            'jsonld.SyntaxError',
            {code: 'invalid container mapping', context: localCtx});
        }
      } else {
        // otherwise, container may also include @set
        isValid &= container.length <= (hasSet ? 2 : 1);
      }

      if(container.includes('@type')) {
        // If mapping does not have an @type,
        // set it to @id
        mapping['@type'] = mapping['@type'] || '@id';

        // type mapping must be either @id or @vocab
        if(!['@id', '@vocab'].includes(mapping['@type'])) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; container: @type requires @type to be ' +
            '@id or @vocab.',
            'jsonld.SyntaxError',
            {code: 'invalid type mapping', context: localCtx});
        }
      }
    } else {
      // in JSON-LD 1.0, container must not be an array (it must be a string,
      // which is one of the validContainers)
      isValid &= !_isArray$1(value['@container']);

      // check container length
      isValid &= container.length <= 1;
    }

    // check against valid containers
    isValid &= container.every(c => validContainers.includes(c));

    // @set not allowed with @list
    isValid &= !(hasSet && container.includes('@list'));

    if(!isValid) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context @container value must be ' +
        'one of the following: ' + validContainers.join(', '),
        'jsonld.SyntaxError',
        {code: 'invalid container mapping', context: localCtx});
    }

    if(mapping.reverse &&
      !container.every(c => ['@index', '@set'].includes(c))) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context @container value for a @reverse ' +
        'type definition must be @index or @set.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }

    // add @container to mapping
    mapping['@container'] = container;
  }

  // property indexing
  if('@index' in value) {
    if(!('@container' in value) || !mapping['@container'].includes('@index')) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @index without @index in @container: ' +
        `"${value['@index']}" on term "${term}".`, 'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(!_isString$1(value['@index']) || value['@index'].indexOf('@') === 0) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @index must expand to an IRI: ' +
        `"${value['@index']}" on term "${term}".`, 'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    mapping['@index'] = value['@index'];
  }

  // scoped contexts
  if('@context' in value) {
    mapping['@context'] = value['@context'];
  }

  if('@language' in value && !('@type' in value)) {
    let language = value['@language'];
    if(language !== null && !_isString$1(language)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context @language value must be ' +
        'a string or null.', 'jsonld.SyntaxError',
        {code: 'invalid language mapping', context: localCtx});
    }

    // add @language to mapping
    if(language !== null) {
      language = language.toLowerCase();
    }
    mapping['@language'] = language;
  }

  // term may be used as a prefix
  if('@prefix' in value) {
    if(term.match(/:|\//)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context @prefix used on a compact IRI term',
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(api$6.isKeyword(mapping['@id'])) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; keywords may not be used as prefixes',
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(typeof value['@prefix'] === 'boolean') {
      mapping._prefix = value['@prefix'] === true;
    } else {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context value for @prefix must be boolean',
        'jsonld.SyntaxError',
        {code: 'invalid @prefix value', context: localCtx});
    }
  }

  if('@direction' in value) {
    const direction = value['@direction'];
    if(direction !== null && direction !== 'ltr' && direction !== 'rtl') {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @direction value must be ' +
        'null, "ltr", or "rtl".',
        'jsonld.SyntaxError',
        {code: 'invalid base direction', context: localCtx});
    }
    mapping['@direction'] = direction;
  }

  if('@nest' in value) {
    const nest = value['@nest'];
    if(!_isString$1(nest) || (nest !== '@nest' && nest.indexOf('@') === 0)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; @context @nest value must be ' +
        'a string which is not a keyword other than @nest.',
        'jsonld.SyntaxError',
        {code: 'invalid @nest value', context: localCtx});
    }
    mapping['@nest'] = nest;
  }

  // disallow aliasing @context and @preserve
  const id = mapping['@id'];
  if(id === '@context' || id === '@preserve') {
    throw new JsonLdError_1(
      'Invalid JSON-LD syntax; @context and @preserve cannot be aliased.',
      'jsonld.SyntaxError', {code: 'invalid keyword alias', context: localCtx});
  }

  // Check for overriding protected terms
  if(previousMapping && previousMapping.protected && !overrideProtected) {
    // force new term to continue to be protected and see if the mappings would
    // be equal
    activeCtx.protected[term] = true;
    mapping.protected = true;
    if(!_deepCompare(previousMapping, mapping)) {
      const protectedMode = (options && options.protectedMode) || 'error';
      if(protectedMode === 'error') {
        throw new JsonLdError_1(
          `Invalid JSON-LD syntax; tried to redefine "${term}" which is a ` +
          'protected term.',
          'jsonld.SyntaxError',
          {code: 'protected term redefinition', context: localCtx, term});
      } else if(protectedMode === 'warn') {
        // FIXME: remove logging and use a handler
        console.warn('WARNING: protected term redefinition', {term});
        return;
      }
      throw new JsonLdError_1(
        'Invalid protectedMode.',
        'jsonld.SyntaxError',
        {code: 'invalid protected mode', context: localCtx, term,
          protectedMode});
    }
  }
};

/**
 * Expands a string to a full IRI. The string may be a term, a prefix, a
 * relative IRI, or an absolute IRI. The associated absolute IRI will be
 * returned.
 *
 * @param activeCtx the current active context.
 * @param value the string to expand.
 * @param relativeTo options for how to resolve relative IRIs:
 *          base: true to resolve against the base IRI, false not to.
 *          vocab: true to concatenate after @vocab, false not to.
 * @param {Object} [options] - processing options.
 *
 * @return the expanded value.
 */
api$6.expandIri = (activeCtx, value, relativeTo, options) => {
  return _expandIri(activeCtx, value, relativeTo, undefined, undefined,
    options);
};

/**
 * Expands a string to a full IRI. The string may be a term, a prefix, a
 * relative IRI, or an absolute IRI. The associated absolute IRI will be
 * returned.
 *
 * @param activeCtx the current active context.
 * @param value the string to expand.
 * @param relativeTo options for how to resolve relative IRIs:
 *          base: true to resolve against the base IRI, false not to.
 *          vocab: true to concatenate after @vocab, false not to.
 * @param localCtx the local context being processed (only given if called
 *          during context processing).
 * @param defined a map for tracking cycles in context definitions (only given
 *          if called during context processing).
 * @param {Object} [options] - processing options.
 *
 * @return the expanded value.
 */
function _expandIri(activeCtx, value, relativeTo, localCtx, defined, options) {
  // already expanded
  if(value === null || !_isString$1(value) || api$6.isKeyword(value)) {
    return value;
  }

  // ignore non-keyword things that look like a keyword
  if(value.match(KEYWORD_PATTERN)) {
    return null;
  }

  // define term dependency if not defined
  if(localCtx && localCtx.hasOwnProperty(value) &&
    defined.get(value) !== true) {
    api$6.createTermDefinition({
      activeCtx, localCtx, term: value, defined, options
    });
  }

  relativeTo = relativeTo || {};
  if(relativeTo.vocab) {
    const mapping = activeCtx.mappings.get(value);

    // value is explicitly ignored with a null mapping
    if(mapping === null) {
      return null;
    }

    if(_isObject$1(mapping) && '@id' in mapping) {
      // value is a term
      return mapping['@id'];
    }
  }

  // split value into prefix:suffix
  const colon = value.indexOf(':');
  if(colon > 0) {
    const prefix = value.substr(0, colon);
    const suffix = value.substr(colon + 1);

    // do not expand blank nodes (prefix of '_') or already-absolute
    // IRIs (suffix of '//')
    if(prefix === '_' || suffix.indexOf('//') === 0) {
      return value;
    }

    // prefix dependency not defined, define it
    if(localCtx && localCtx.hasOwnProperty(prefix)) {
      api$6.createTermDefinition({
        activeCtx, localCtx, term: prefix, defined, options
      });
    }

    // use mapping if prefix is defined
    const mapping = activeCtx.mappings.get(prefix);
    if(mapping && mapping._prefix) {
      return mapping['@id'] + suffix;
    }

    // already absolute IRI
    if(_isAbsoluteIri(value)) {
      return value;
    }
  }

  // prepend vocab
  if(relativeTo.vocab && '@vocab' in activeCtx) {
    return activeCtx['@vocab'] + value;
  }

  // prepend base
  if(relativeTo.base && '@base' in activeCtx) {
    if(activeCtx['@base']) {
      // The null case preserves value as potentially relative
      return prependBase$2(prependBase$2(options.base, activeCtx['@base']), value);
    }
  } else if(relativeTo.base) {
    return prependBase$2(options.base, value);
  }

  return value;
}

/**
 * Gets the initial context.
 *
 * @param options the options to use:
 *          [base] the document base IRI.
 *
 * @return the initial context.
 */
api$6.getInitialContext = options => {
  const key = JSON.stringify({processingMode: options.processingMode});
  const cached = INITIAL_CONTEXT_CACHE.get(key);
  if(cached) {
    return cached;
  }

  const initialContext = {
    processingMode: options.processingMode,
    mappings: new Map(),
    inverse: null,
    getInverse: _createInverseContext,
    clone: _cloneActiveContext,
    revertToPreviousContext: _revertToPreviousContext,
    protected: {}
  };
  // TODO: consider using LRU cache instead
  if(INITIAL_CONTEXT_CACHE.size === INITIAL_CONTEXT_CACHE_MAX_SIZE) {
    // clear whole cache -- assumes scenario where the cache fills means
    // the cache isn't being used very efficiently anyway
    INITIAL_CONTEXT_CACHE.clear();
  }
  INITIAL_CONTEXT_CACHE.set(key, initialContext);
  return initialContext;

  /**
   * Generates an inverse context for use in the compaction algorithm, if
   * not already generated for the given active context.
   *
   * @return the inverse context.
   */
  function _createInverseContext() {
    const activeCtx = this;

    // lazily create inverse
    if(activeCtx.inverse) {
      return activeCtx.inverse;
    }
    const inverse = activeCtx.inverse = {};

    // variables for building fast CURIE map
    const fastCurieMap = activeCtx.fastCurieMap = {};
    const irisToTerms = {};

    // handle default language
    const defaultLanguage = (activeCtx['@language'] || '@none').toLowerCase();

    // handle default direction
    const defaultDirection = activeCtx['@direction'];

    // create term selections for each mapping in the context, ordered by
    // shortest and then lexicographically least
    const mappings = activeCtx.mappings;
    const terms = [...mappings.keys()].sort(_compareShortestLeast);
    for(const term of terms) {
      const mapping = mappings.get(term);
      if(mapping === null) {
        continue;
      }

      let container = mapping['@container'] || '@none';
      container = [].concat(container).sort().join('');

      if(mapping['@id'] === null) {
        continue;
      }
      // iterate over every IRI in the mapping
      const ids = _asArray$1(mapping['@id']);
      for(const iri of ids) {
        let entry = inverse[iri];
        const isKeyword = api$6.isKeyword(iri);

        if(!entry) {
          // initialize entry
          inverse[iri] = entry = {};

          if(!isKeyword && !mapping._termHasColon) {
            // init IRI to term map and fast CURIE prefixes
            irisToTerms[iri] = [term];
            const fastCurieEntry = {iri, terms: irisToTerms[iri]};
            if(iri[0] in fastCurieMap) {
              fastCurieMap[iri[0]].push(fastCurieEntry);
            } else {
              fastCurieMap[iri[0]] = [fastCurieEntry];
            }
          }
        } else if(!isKeyword && !mapping._termHasColon) {
          // add IRI to term match
          irisToTerms[iri].push(term);
        }

        // add new entry
        if(!entry[container]) {
          entry[container] = {
            '@language': {},
            '@type': {},
            '@any': {}
          };
        }
        entry = entry[container];
        _addPreferredTerm(term, entry['@any'], '@none');

        if(mapping.reverse) {
          // term is preferred for values using @reverse
          _addPreferredTerm(term, entry['@type'], '@reverse');
        } else if(mapping['@type'] === '@none') {
          _addPreferredTerm(term, entry['@any'], '@none');
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
        } else if('@type' in mapping) {
          // term is preferred for values using specific type
          _addPreferredTerm(term, entry['@type'], mapping['@type']);
        } else if('@language' in mapping && '@direction' in mapping) {
          // term is preferred for values using specific language and direction
          const language = mapping['@language'];
          const direction = mapping['@direction'];
          if(language && direction) {
            _addPreferredTerm(term, entry['@language'],
              `${language}_${direction}`.toLowerCase());
          } else if(language) {
            _addPreferredTerm(term, entry['@language'], language.toLowerCase());
          } else if(direction) {
            _addPreferredTerm(term, entry['@language'], `_${direction}`);
          } else {
            _addPreferredTerm(term, entry['@language'], '@null');
          }
        } else if('@language' in mapping) {
          _addPreferredTerm(term, entry['@language'],
            (mapping['@language'] || '@null').toLowerCase());
        } else if('@direction' in mapping) {
          if(mapping['@direction']) {
            _addPreferredTerm(term, entry['@language'],
              `_${mapping['@direction']}`);
          } else {
            _addPreferredTerm(term, entry['@language'], '@none');
          }
        } else if(defaultDirection) {
          _addPreferredTerm(term, entry['@language'], `_${defaultDirection}`);
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
        } else {
          // add entries for no type and no language
          _addPreferredTerm(term, entry['@language'], defaultLanguage);
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
        }
      }
    }

    // build fast CURIE map
    for(const key in fastCurieMap) {
      _buildIriMap(fastCurieMap, key, 1);
    }

    return inverse;
  }

  /**
   * Runs a recursive algorithm to build a lookup map for quickly finding
   * potential CURIEs.
   *
   * @param iriMap the map to build.
   * @param key the current key in the map to work on.
   * @param idx the index into the IRI to compare.
   */
  function _buildIriMap(iriMap, key, idx) {
    const entries = iriMap[key];
    const next = iriMap[key] = {};

    let iri;
    let letter;
    for(const entry of entries) {
      iri = entry.iri;
      if(idx >= iri.length) {
        letter = '';
      } else {
        letter = iri[idx];
      }
      if(letter in next) {
        next[letter].push(entry);
      } else {
        next[letter] = [entry];
      }
    }

    for(const key in next) {
      if(key === '') {
        continue;
      }
      _buildIriMap(next, key, idx + 1);
    }
  }

  /**
   * Adds the term for the given entry if not already added.
   *
   * @param term the term to add.
   * @param entry the inverse context typeOrLanguage entry to add to.
   * @param typeOrLanguageValue the key in the entry to add to.
   */
  function _addPreferredTerm(term, entry, typeOrLanguageValue) {
    if(!entry.hasOwnProperty(typeOrLanguageValue)) {
      entry[typeOrLanguageValue] = term;
    }
  }

  /**
   * Clones an active context, creating a child active context.
   *
   * @return a clone (child) of the active context.
   */
  function _cloneActiveContext() {
    const child = {};
    child.mappings = util.clone(this.mappings);
    child.clone = this.clone;
    child.inverse = null;
    child.getInverse = this.getInverse;
    child.protected = util.clone(this.protected);
    if(this.previousContext) {
      child.previousContext = this.previousContext.clone();
    }
    child.revertToPreviousContext = this.revertToPreviousContext;
    if('@base' in this) {
      child['@base'] = this['@base'];
    }
    if('@language' in this) {
      child['@language'] = this['@language'];
    }
    if('@vocab' in this) {
      child['@vocab'] = this['@vocab'];
    }
    return child;
  }

  /**
   * Reverts any type-scoped context in this active context to the previous
   * context.
   */
  function _revertToPreviousContext() {
    if(!this.previousContext) {
      return this;
    }
    return this.previousContext.clone();
  }
};

/**
 * Gets the value for the given active context key and type, null if none is
 * set or undefined if none is set and type is '@context'.
 *
 * @param ctx the active context.
 * @param key the context key.
 * @param [type] the type of value to get (eg: '@id', '@type'), if not
 *          specified gets the entire entry for a key, null if not found.
 *
 * @return the value, null, or undefined.
 */
api$6.getContextValue = (ctx, key, type) => {
  // invalid key
  if(key === null) {
    if(type === '@context') {
      return undefined;
    }
    return null;
  }

  // get specific entry information
  if(ctx.mappings.has(key)) {
    const entry = ctx.mappings.get(key);

    if(_isUndefined(type)) {
      // return whole entry
      return entry;
    }
    if(entry.hasOwnProperty(type)) {
      // return entry value for type
      return entry[type];
    }
  }

  // get default language
  if(type === '@language' && type in ctx) {
    return ctx[type];
  }

  // get default direction
  if(type === '@direction' && type in ctx) {
    return ctx[type];
  }

  if(type === '@context') {
    return undefined;
  }
  return null;
};

/**
 * Processing Mode check.
 *
 * @param activeCtx the current active context.
 * @param version the string or numeric version to check.
 *
 * @return boolean.
 */
api$6.processingMode = (activeCtx, version) => {
  if(version.toString() >= '1.1') {
    return !activeCtx.processingMode ||
      activeCtx.processingMode >= 'json-ld-' + version.toString();
  } else {
    return activeCtx.processingMode === 'json-ld-1.0';
  }
};

/**
 * Returns whether or not the given value is a keyword.
 *
 * @param v the value to check.
 *
 * @return true if the value is a keyword, false if not.
 */
api$6.isKeyword = v => {
  if(!_isString$1(v) || v[0] !== '@') {
    return false;
  }
  switch(v) {
    case '@base':
    case '@container':
    case '@context':
    case '@default':
    case '@direction':
    case '@embed':
    case '@explicit':
    case '@graph':
    case '@id':
    case '@included':
    case '@index':
    case '@json':
    case '@language':
    case '@list':
    case '@nest':
    case '@none':
    case '@omitDefault':
    case '@prefix':
    case '@preserve':
    case '@protected':
    case '@requireAll':
    case '@reverse':
    case '@set':
    case '@type':
    case '@value':
    case '@version':
    case '@vocab':
      return true;
  }
  return false;
};

function _deepCompare(x1, x2) {
  // compare `null` or primitive types directly
  if((!(x1 && typeof x1 === 'object')) ||
     (!(x2 && typeof x2 === 'object'))) {
    return x1 === x2;
  }
  // x1 and x2 are objects (also potentially arrays)
  const x1Array = Array.isArray(x1);
  if(x1Array !== Array.isArray(x2)) {
    return false;
  }
  if(x1Array) {
    if(x1.length !== x2.length) {
      return false;
    }
    for(let i = 0; i < x1.length; ++i) {
      if(!_deepCompare(x1[i], x2[i])) {
        return false;
      }
    }
    return true;
  }
  // x1 and x2 are non-array objects
  const k1s = Object.keys(x1);
  const k2s = Object.keys(x2);
  if(k1s.length !== k2s.length) {
    return false;
  }
  for(const k1 in x1) {
    let v1 = x1[k1];
    let v2 = x2[k1];
    // special case: `@container` can be in any order
    if(k1 === '@container') {
      if(Array.isArray(v1) && Array.isArray(v2)) {
        v1 = v1.slice().sort();
        v2 = v2.slice().sort();
      }
    }
    if(!_deepCompare(v1, v2)) {
      return false;
    }
  }
  return true;
}

const {
  isArray: _isArray$2,
  isObject: _isObject$2,
  isEmptyObject: _isEmptyObject,
  isString: _isString$2,
  isUndefined: _isUndefined$1
} = types;

const {
  isList: _isList,
  isValue: _isValue,
  isGraph: _isGraph,
  isSubject: _isSubject
} = graphTypes;

const {
  expandIri: _expandIri$1,
  getContextValue: _getContextValue,
  isKeyword: _isKeyword,
  process: _processContext,
  processingMode: _processingMode
} = context;

const {
  isAbsolute: _isAbsoluteIri$1
} = url;

const {
  addValue: _addValue,
  asArray: _asArray$2,
  getValues: _getValues,
  validateTypeValue: _validateTypeValue
} = util;

const api$7 = {};
var expand = api$7;
const REGEX_BCP47 = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;

/**
 * Recursively expands an element using the given context. Any context in
 * the element will be removed. All context URLs must have been retrieved
 * before calling this method.
 *
 * @param activeCtx the context to use.
 * @param activeProperty the property for the element, null for none.
 * @param element the element to expand.
 * @param options the expansion options.
 * @param insideList true if the element is a list, false if not.
 * @param insideIndex true if the element is inside an index container,
 *          false if not.
 * @param typeScopedContext an optional type-scoped active context for
 *          expanding values of nodes that were expressed according to
 *          a type-scoped context.
 * @param expansionMap(info) a function that can be used to custom map
 *          unmappable values (or to throw an error when they are detected);
 *          if this function returns `undefined` then the default behavior
 *          will be used.
 *
 * @return a Promise that resolves to the expanded value.
 */
api$7.expand = async ({
  activeCtx,
  activeProperty = null,
  element,
  options = {},
  insideList = false,
  insideIndex = false,
  typeScopedContext = null,
  expansionMap = () => undefined
}) => {
  // nothing to expand
  if(element === null || element === undefined) {
    return null;
  }

  // disable framing if activeProperty is @default
  if(activeProperty === '@default') {
    options = Object.assign({}, options, {isFrame: false});
  }

  if(!_isArray$2(element) && !_isObject$2(element)) {
    // drop free-floating scalars that are not in lists unless custom mapped
    if(!insideList && (activeProperty === null ||
      _expandIri$1(activeCtx, activeProperty, {vocab: true},
        options) === '@graph')) {
      const mapped = await expansionMap({
        unmappedValue: element,
        activeCtx,
        activeProperty,
        options,
        insideList
      });
      if(mapped === undefined) {
        return null;
      }
      return mapped;
    }

    // expand element according to value expansion rules
    return _expandValue({activeCtx, activeProperty, value: element, options});
  }

  // recursively expand array
  if(_isArray$2(element)) {
    let rval = [];
    const container = _getContextValue(
      activeCtx, activeProperty, '@container') || [];
    insideList = insideList || container.includes('@list');
    for(let i = 0; i < element.length; ++i) {
      // expand element
      let e = await api$7.expand({
        activeCtx,
        activeProperty,
        element: element[i],
        options,
        expansionMap,
        insideIndex,
        typeScopedContext
      });
      if(insideList && _isArray$2(e)) {
        e = {'@list': e};
      }

      if(e === null) {
        e = await expansionMap({
          unmappedValue: element[i],
          activeCtx,
          activeProperty,
          parent: element,
          index: i,
          options,
          expandedParent: rval,
          insideList
        });
        if(e === undefined) {
          continue;
        }
      }

      if(_isArray$2(e)) {
        rval = rval.concat(e);
      } else {
        rval.push(e);
      }
    }
    return rval;
  }

  // recursively expand object:

  // first, expand the active property
  const expandedActiveProperty = _expandIri$1(
    activeCtx, activeProperty, {vocab: true}, options);

  // Get any property-scoped context for activeProperty
  const propertyScopedCtx =
    _getContextValue(activeCtx, activeProperty, '@context');

  // second, determine if any type-scoped context should be reverted; it
  // should only be reverted when the following are all true:
  // 1. `element` is not a value or subject reference
  // 2. `insideIndex` is false
  typeScopedContext = typeScopedContext ||
    (activeCtx.previousContext ? activeCtx : null);
  let keys = Object.keys(element).sort();
  let mustRevert = !insideIndex;
  if(mustRevert && typeScopedContext && keys.length <= 2 &&
    !keys.includes('@context')) {
    for(const key of keys) {
      const expandedProperty = _expandIri$1(
        typeScopedContext, key, {vocab: true}, options);
      if(expandedProperty === '@value') {
        // value found, ensure type-scoped context is used to expand it
        mustRevert = false;
        activeCtx = typeScopedContext;
        break;
      }
      if(expandedProperty === '@id' && keys.length === 1) {
        // subject reference found, do not revert
        mustRevert = false;
        break;
      }
    }
  }

  if(mustRevert) {
    // revert type scoped context
    activeCtx = activeCtx.revertToPreviousContext();
  }

  // apply property-scoped context after reverting term-scoped context
  if(!_isUndefined$1(propertyScopedCtx)) {
    activeCtx = await _processContext({
      activeCtx,
      localCtx: propertyScopedCtx,
      propagate: true,
      overrideProtected: true,
      options
    });
  }

  // if element has a context, process it
  if('@context' in element) {
    activeCtx = await _processContext(
      {activeCtx, localCtx: element['@context'], options});
  }

  // set the type-scoped context to the context on input, for use later
  typeScopedContext = activeCtx;

  // Remember the first key found expanding to @type
  let typeKey = null;

  // look for scoped contexts on `@type`
  for(const key of keys) {
    const expandedProperty = _expandIri$1(activeCtx, key, {vocab: true}, options);
    if(expandedProperty === '@type') {
      // set scoped contexts from @type
      // avoid sorting if possible
      typeKey = typeKey || key;
      const value = element[key];
      const types =
        Array.isArray(value) ?
          (value.length > 1 ? value.slice().sort() : value) : [value];
      for(const type of types) {
        const ctx = _getContextValue(typeScopedContext, type, '@context');
        if(!_isUndefined$1(ctx)) {
          activeCtx = await _processContext({
            activeCtx,
            localCtx: ctx,
            options,
            propagate: false
          });
        }
      }
    }
  }

  // process each key and value in element, ignoring @nest content
  let rval = {};
  await _expandObject({
    activeCtx,
    activeProperty,
    expandedActiveProperty,
    element,
    expandedParent: rval,
    options,
    insideList,
    typeKey,
    typeScopedContext,
    expansionMap});

  // get property count on expanded output
  keys = Object.keys(rval);
  let count = keys.length;

  if('@value' in rval) {
    // @value must only have @language or @type
    if('@type' in rval && ('@language' in rval || '@direction' in rval)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; an element containing "@value" may not ' +
        'contain both "@type" and either "@language" or "@direction".',
        'jsonld.SyntaxError', {code: 'invalid value object', element: rval});
    }
    let validCount = count - 1;
    if('@type' in rval) {
      validCount -= 1;
    }
    if('@index' in rval) {
      validCount -= 1;
    }
    if('@language' in rval) {
      validCount -= 1;
    }
    if('@direction' in rval) {
      validCount -= 1;
    }
    if(validCount !== 0) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; an element containing "@value" may only ' +
        'have an "@index" property and either "@type" ' +
        'or either or both "@language" or "@direction".',
        'jsonld.SyntaxError', {code: 'invalid value object', element: rval});
    }
    const values = rval['@value'] === null ? [] : _asArray$2(rval['@value']);
    const types = _getValues(rval, '@type');

    // drop null @values unless custom mapped
    if(_processingMode(activeCtx, 1.1) && types.includes('@json') &&
      types.length === 1) ; else if(values.length === 0) {
      const mapped = await expansionMap({
        unmappedValue: rval,
        activeCtx,
        activeProperty,
        element,
        options,
        insideList
      });
      if(mapped !== undefined) {
        rval = mapped;
      } else {
        rval = null;
      }
    } else if(!values.every(v => (_isString$2(v) || _isEmptyObject(v))) &&
      '@language' in rval) {
      // if @language is present, @value must be a string
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; only strings may be language-tagged.',
        'jsonld.SyntaxError',
        {code: 'invalid language-tagged value', element: rval});
    } else if(!types.every(t =>
      (_isAbsoluteIri$1(t) && !(_isString$2(t) && t.indexOf('_:') === 0) ||
      _isEmptyObject(t)))) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; an element containing "@value" and "@type" ' +
        'must have an absolute IRI for the value of "@type".',
        'jsonld.SyntaxError', {code: 'invalid typed value', element: rval});
    }
  } else if('@type' in rval && !_isArray$2(rval['@type'])) {
    // convert @type to an array
    rval['@type'] = [rval['@type']];
  } else if('@set' in rval || '@list' in rval) {
    // handle @set and @list
    if(count > 1 && !(count === 2 && '@index' in rval)) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; if an element has the property "@set" ' +
        'or "@list", then it can have at most one other property that is ' +
        '"@index".', 'jsonld.SyntaxError',
        {code: 'invalid set or list object', element: rval});
    }
    // optimize away @set
    if('@set' in rval) {
      rval = rval['@set'];
      keys = Object.keys(rval);
      count = keys.length;
    }
  } else if(count === 1 && '@language' in rval) {
    // drop objects with only @language unless custom mapped
    const mapped = await expansionMap(rval, {
      unmappedValue: rval,
      activeCtx,
      activeProperty,
      element,
      options,
      insideList
    });
    if(mapped !== undefined) {
      rval = mapped;
    } else {
      rval = null;
    }
  }

  // drop certain top-level objects that do not occur in lists, unless custom
  // mapped
  if(_isObject$2(rval) &&
    !options.keepFreeFloatingNodes && !insideList &&
    (activeProperty === null || expandedActiveProperty === '@graph')) {
    // drop empty object, top-level @value/@list, or object with only @id
    if(count === 0 || '@value' in rval || '@list' in rval ||
      (count === 1 && '@id' in rval)) {
      const mapped = await expansionMap({
        unmappedValue: rval,
        activeCtx,
        activeProperty,
        element,
        options,
        insideList
      });
      if(mapped !== undefined) {
        rval = mapped;
      } else {
        rval = null;
      }
    }
  }

  return rval;
};

/**
 * Expand each key and value of element adding to result
 *
 * @param activeCtx the context to use.
 * @param activeProperty the property for the element.
 * @param expandedActiveProperty the expansion of activeProperty
 * @param element the element to expand.
 * @param expandedParent the expanded result into which to add values.
 * @param options the expansion options.
 * @param insideList true if the element is a list, false if not.
 * @param typeKey first key found expanding to @type.
 * @param typeScopedContext the context before reverting.
 * @param expansionMap(info) a function that can be used to custom map
 *          unmappable values (or to throw an error when they are detected);
 *          if this function returns `undefined` then the default behavior
 *          will be used.
 */
async function _expandObject({
  activeCtx,
  activeProperty,
  expandedActiveProperty,
  element,
  expandedParent,
  options = {},
  insideList,
  typeKey,
  typeScopedContext,
  expansionMap
}) {
  const keys = Object.keys(element).sort();
  const nests = [];
  let unexpandedValue;

  // Figure out if this is the type for a JSON literal
  const isJsonType = element[typeKey] &&
    _expandIri$1(activeCtx,
      (_isArray$2(element[typeKey]) ? element[typeKey][0] : element[typeKey]),
      {vocab: true}, options) === '@json';

  for(const key of keys) {
    let value = element[key];
    let expandedValue;

    // skip @context
    if(key === '@context') {
      continue;
    }

    // expand property
    let expandedProperty = _expandIri$1(activeCtx, key, {vocab: true}, options);

    // drop non-absolute IRI keys that aren't keywords unless custom mapped
    if(expandedProperty === null ||
      !(_isAbsoluteIri$1(expandedProperty) || _isKeyword(expandedProperty))) {
      // TODO: use `await` to support async
      expandedProperty = expansionMap({
        unmappedProperty: key,
        activeCtx,
        activeProperty,
        parent: element,
        options,
        insideList,
        value,
        expandedParent
      });
      if(expandedProperty === undefined) {
        continue;
      }
    }

    if(_isKeyword(expandedProperty)) {
      if(expandedActiveProperty === '@reverse') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; a keyword cannot be used as a @reverse ' +
          'property.', 'jsonld.SyntaxError',
          {code: 'invalid reverse property map', value});
      }
      if(expandedProperty in expandedParent &&
         expandedProperty !== '@included' &&
         expandedProperty !== '@type') {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; colliding keywords detected.',
          'jsonld.SyntaxError',
          {code: 'colliding keywords', keyword: expandedProperty});
      }
    }

    // syntax error if @id is not a string
    if(expandedProperty === '@id') {
      if(!_isString$2(value)) {
        if(!options.isFrame) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; "@id" value must a string.',
            'jsonld.SyntaxError', {code: 'invalid @id value', value});
        }
        if(_isObject$2(value)) {
          // empty object is a wildcard
          if(!_isEmptyObject(value)) {
            throw new JsonLdError_1(
              'Invalid JSON-LD syntax; "@id" value an empty object or array ' +
              'of strings, if framing',
              'jsonld.SyntaxError', {code: 'invalid @id value', value});
          }
        } else if(_isArray$2(value)) {
          if(!value.every(v => _isString$2(v))) {
            throw new JsonLdError_1(
              'Invalid JSON-LD syntax; "@id" value an empty object or array ' +
              'of strings, if framing',
              'jsonld.SyntaxError', {code: 'invalid @id value', value});
          }
        } else {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; "@id" value an empty object or array ' +
            'of strings, if framing',
            'jsonld.SyntaxError', {code: 'invalid @id value', value});
        }
      }

      _addValue(
        expandedParent, '@id',
        _asArray$2(value).map(v =>
          _isString$2(v) ? _expandIri$1(activeCtx, v, {base: true}, options) : v),
        {propertyIsArray: options.isFrame});
      continue;
    }

    if(expandedProperty === '@type') {
      // if framing, can be a default object, but need to expand
      // key to determine that
      if(_isObject$2(value)) {
        value = Object.fromEntries(Object.entries(value).map(([k, v]) => [
          _expandIri$1(typeScopedContext, k, {vocab: true}),
          _asArray$2(v).map(vv =>
            _expandIri$1(typeScopedContext, vv, {base: true, vocab: true})
          )
        ]));
      }
      _validateTypeValue(value, options.isFrame);
      _addValue(
        expandedParent, '@type',
        _asArray$2(value).map(v =>
          _isString$2(v) ?
            _expandIri$1(typeScopedContext, v,
              {base: true, vocab: true}, options) : v),
        {propertyIsArray: options.isFrame});
      continue;
    }

    // Included blocks are treated as an array of separate object nodes sharing
    // the same referencing active_property.
    // For 1.0, it is skipped as are other unknown keywords
    if(expandedProperty === '@included' && _processingMode(activeCtx, 1.1)) {
      const includedResult = _asArray$2(await api$7.expand({
        activeCtx,
        activeProperty,
        element: value,
        options,
        expansionMap
      }));

      // Expanded values must be node objects
      if(!includedResult.every(v => _isSubject(v))) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; ' +
          'values of @included must expand to node objects.',
          'jsonld.SyntaxError', {code: 'invalid @included value', value});
      }

      _addValue(
        expandedParent, '@included', includedResult, {propertyIsArray: true});
      continue;
    }

    // @graph must be an array or an object
    if(expandedProperty === '@graph' &&
      !(_isObject$2(value) || _isArray$2(value))) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; "@graph" value must not be an ' +
        'object or an array.',
        'jsonld.SyntaxError', {code: 'invalid @graph value', value});
    }

    if(expandedProperty === '@value') {
      // capture value for later
      // "colliding keywords" check prevents this from being set twice
      unexpandedValue = value;
      if(isJsonType && _processingMode(activeCtx, 1.1)) {
        // no coercion to array, and retain all values
        expandedParent['@value'] = value;
      } else {
        _addValue(
          expandedParent, '@value', value, {propertyIsArray: options.isFrame});
      }
      continue;
    }

    // @language must be a string
    // it should match BCP47
    if(expandedProperty === '@language') {
      if(value === null) {
        // drop null @language values, they expand as if they didn't exist
        continue;
      }
      if(!_isString$2(value) && !options.isFrame) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; "@language" value must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid language-tagged string', value});
      }
      // ensure language value is lowercase
      value = _asArray$2(value).map(v => _isString$2(v) ? v.toLowerCase() : v);

      // ensure language tag matches BCP47
      for(const lang of value) {
        if(_isString$2(lang) && !lang.match(REGEX_BCP47)) {
          console.warn(`@language must be valid BCP47: ${lang}`);
        }
      }

      _addValue(
        expandedParent, '@language', value, {propertyIsArray: options.isFrame});
      continue;
    }

    // @direction must be "ltr" or "rtl"
    if(expandedProperty === '@direction') {
      if(!_isString$2(value) && !options.isFrame) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; "@direction" value must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid base direction', value});
      }

      value = _asArray$2(value);

      // ensure direction is "ltr" or "rtl"
      for(const dir of value) {
        if(_isString$2(dir) && dir !== 'ltr' && dir !== 'rtl') {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; "@direction" must be "ltr" or "rtl".',
            'jsonld.SyntaxError',
            {code: 'invalid base direction', value});
        }
      }

      _addValue(
        expandedParent, '@direction', value,
        {propertyIsArray: options.isFrame});
      continue;
    }

    // @index must be a string
    if(expandedProperty === '@index') {
      if(!_isString$2(value)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; "@index" value must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid @index value', value});
      }
      _addValue(expandedParent, '@index', value);
      continue;
    }

    // @reverse must be an object
    if(expandedProperty === '@reverse') {
      if(!_isObject$2(value)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; "@reverse" value must be an object.',
          'jsonld.SyntaxError', {code: 'invalid @reverse value', value});
      }

      expandedValue = await api$7.expand({
        activeCtx,
        activeProperty:
        '@reverse',
        element: value,
        options,
        expansionMap
      });
      // properties double-reversed
      if('@reverse' in expandedValue) {
        for(const property in expandedValue['@reverse']) {
          _addValue(
            expandedParent, property, expandedValue['@reverse'][property],
            {propertyIsArray: true});
        }
      }

      // FIXME: can this be merged with code below to simplify?
      // merge in all reversed properties
      let reverseMap = expandedParent['@reverse'] || null;
      for(const property in expandedValue) {
        if(property === '@reverse') {
          continue;
        }
        if(reverseMap === null) {
          reverseMap = expandedParent['@reverse'] = {};
        }
        _addValue(reverseMap, property, [], {propertyIsArray: true});
        const items = expandedValue[property];
        for(let ii = 0; ii < items.length; ++ii) {
          const item = items[ii];
          if(_isValue(item) || _isList(item)) {
            throw new JsonLdError_1(
              'Invalid JSON-LD syntax; "@reverse" value must not be a ' +
              '@value or an @list.', 'jsonld.SyntaxError',
              {code: 'invalid reverse property value', value: expandedValue});
          }
          _addValue(reverseMap, property, item, {propertyIsArray: true});
        }
      }

      continue;
    }

    // nested keys
    if(expandedProperty === '@nest') {
      nests.push(key);
      continue;
    }

    // use potential scoped context for key
    let termCtx = activeCtx;
    const ctx = _getContextValue(activeCtx, key, '@context');
    if(!_isUndefined$1(ctx)) {
      termCtx = await _processContext({
        activeCtx,
        localCtx: ctx,
        propagate: true,
        overrideProtected: true,
        options
      });
    }

    const container = _getContextValue(termCtx, key, '@container') || [];

    if(container.includes('@language') && _isObject$2(value)) {
      const direction = _getContextValue(termCtx, key, '@direction');
      // handle language map container (skip if value is not an object)
      expandedValue = _expandLanguageMap(termCtx, value, direction, options);
    } else if(container.includes('@index') && _isObject$2(value)) {
      // handle index container (skip if value is not an object)
      const asGraph = container.includes('@graph');
      const indexKey = _getContextValue(termCtx, key, '@index') || '@index';
      const propertyIndex = indexKey !== '@index' &&
        _expandIri$1(activeCtx, indexKey, {vocab: true}, options);

      expandedValue = await _expandIndexMap({
        activeCtx: termCtx,
        options,
        activeProperty: key,
        value,
        expansionMap,
        asGraph,
        indexKey,
        propertyIndex
      });
    } else if(container.includes('@id') && _isObject$2(value)) {
      // handle id container (skip if value is not an object)
      const asGraph = container.includes('@graph');
      expandedValue = await _expandIndexMap({
        activeCtx: termCtx,
        options,
        activeProperty: key,
        value,
        expansionMap,
        asGraph,
        indexKey: '@id'
      });
    } else if(container.includes('@type') && _isObject$2(value)) {
      // handle type container (skip if value is not an object)
      expandedValue = await _expandIndexMap({
        // since container is `@type`, revert type scoped context when expanding
        activeCtx: termCtx.revertToPreviousContext(),
        options,
        activeProperty: key,
        value,
        expansionMap,
        asGraph: false,
        indexKey: '@type'
      });
    } else {
      // recurse into @list or @set
      const isList = (expandedProperty === '@list');
      if(isList || expandedProperty === '@set') {
        let nextActiveProperty = activeProperty;
        if(isList && expandedActiveProperty === '@graph') {
          nextActiveProperty = null;
        }
        expandedValue = await api$7.expand({
          activeCtx: termCtx,
          activeProperty: nextActiveProperty,
          element: value,
          options,
          insideList: isList,
          expansionMap
        });
      } else if(
        _getContextValue(activeCtx, key, '@type') === '@json') {
        expandedValue = {
          '@type': '@json',
          '@value': value
        };
      } else {
        // recursively expand value with key as new active property
        expandedValue = await api$7.expand({
          activeCtx: termCtx,
          activeProperty: key,
          element: value,
          options,
          insideList: false,
          expansionMap
        });
      }
    }

    // drop null values if property is not @value
    if(expandedValue === null && expandedProperty !== '@value') {
      // TODO: use `await` to support async
      expandedValue = expansionMap({
        unmappedValue: value,
        expandedProperty,
        activeCtx: termCtx,
        activeProperty,
        parent: element,
        options,
        insideList,
        key,
        expandedParent
      });
      if(expandedValue === undefined) {
        continue;
      }
    }

    // convert expanded value to @list if container specifies it
    if(expandedProperty !== '@list' && !_isList(expandedValue) &&
      container.includes('@list')) {
      // ensure expanded value in @list is an array
      expandedValue = {'@list': _asArray$2(expandedValue)};
    }

    // convert expanded value to @graph if container specifies it
    // and value is not, itself, a graph
    // index cases handled above
    if(container.includes('@graph') &&
      !container.some(key => key === '@id' || key === '@index')) {
      // ensure expanded values are arrays
      expandedValue = _asArray$2(expandedValue)
        .map(v => ({'@graph': _asArray$2(v)}));
    }

    // FIXME: can this be merged with code above to simplify?
    // merge in reverse properties
    if(termCtx.mappings.has(key) && termCtx.mappings.get(key).reverse) {
      const reverseMap =
        expandedParent['@reverse'] = expandedParent['@reverse'] || {};
      expandedValue = _asArray$2(expandedValue);
      for(let ii = 0; ii < expandedValue.length; ++ii) {
        const item = expandedValue[ii];
        if(_isValue(item) || _isList(item)) {
          throw new JsonLdError_1(
            'Invalid JSON-LD syntax; "@reverse" value must not be a ' +
            '@value or an @list.', 'jsonld.SyntaxError',
            {code: 'invalid reverse property value', value: expandedValue});
        }
        _addValue(reverseMap, expandedProperty, item, {propertyIsArray: true});
      }
      continue;
    }

    // add value for property
    // special keywords handled above
    _addValue(expandedParent, expandedProperty, expandedValue, {
      propertyIsArray: true
    });
  }

  // @value must not be an object or an array (unless framing) or if @type is
  // @json
  if('@value' in expandedParent) {
    if(expandedParent['@type'] === '@json' && _processingMode(activeCtx, 1.1)) ; else if((_isObject$2(unexpandedValue) || _isArray$2(unexpandedValue)) &&
      !options.isFrame) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; "@value" value must not be an ' +
        'object or an array.',
        'jsonld.SyntaxError',
        {code: 'invalid value object value', value: unexpandedValue});
    }
  }

  // expand each nested key
  for(const key of nests) {
    const nestedValues = _isArray$2(element[key]) ? element[key] : [element[key]];
    for(const nv of nestedValues) {
      if(!_isObject$2(nv) || Object.keys(nv).some(k =>
        _expandIri$1(activeCtx, k, {vocab: true}, options) === '@value')) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; nested value must be a node object.',
          'jsonld.SyntaxError',
          {code: 'invalid @nest value', value: nv});
      }
      await _expandObject({
        activeCtx,
        activeProperty,
        expandedActiveProperty,
        element: nv,
        expandedParent,
        options,
        insideList,
        typeScopedContext,
        typeKey,
        expansionMap});
    }
  }
}

/**
 * Expands the given value by using the coercion and keyword rules in the
 * given context.
 *
 * @param activeCtx the active context to use.
 * @param activeProperty the active property the value is associated with.
 * @param value the value to expand.
 * @param {Object} [options] - processing options.
 *
 * @return the expanded value.
 */
function _expandValue({activeCtx, activeProperty, value, options}) {
  // nothing to expand
  if(value === null || value === undefined) {
    return null;
  }

  // special-case expand @id and @type (skips '@id' expansion)
  const expandedProperty = _expandIri$1(
    activeCtx, activeProperty, {vocab: true}, options);
  if(expandedProperty === '@id') {
    return _expandIri$1(activeCtx, value, {base: true}, options);
  } else if(expandedProperty === '@type') {
    return _expandIri$1(activeCtx, value, {vocab: true, base: true}, options);
  }

  // get type definition from context
  const type = _getContextValue(activeCtx, activeProperty, '@type');

  // do @id expansion (automatic for @graph)
  if((type === '@id' || expandedProperty === '@graph') && _isString$2(value)) {
    return {'@id': _expandIri$1(activeCtx, value, {base: true}, options)};
  }
  // do @id expansion w/vocab
  if(type === '@vocab' && _isString$2(value)) {
    return {
      '@id': _expandIri$1(activeCtx, value, {vocab: true, base: true}, options)
    };
  }

  // do not expand keyword values
  if(_isKeyword(expandedProperty)) {
    return value;
  }

  const rval = {};

  if(type && !['@id', '@vocab', '@none'].includes(type)) {
    // other type
    rval['@type'] = type;
  } else if(_isString$2(value)) {
    // check for language tagging for strings
    const language = _getContextValue(activeCtx, activeProperty, '@language');
    if(language !== null) {
      rval['@language'] = language;
    }
    const direction = _getContextValue(activeCtx, activeProperty, '@direction');
    if(direction !== null) {
      rval['@direction'] = direction;
    }
  }
  // do conversion of values that aren't basic JSON types to strings
  if(!['boolean', 'number', 'string'].includes(typeof value)) {
    value = value.toString();
  }
  rval['@value'] = value;

  return rval;
}

/**
 * Expands a language map.
 *
 * @param activeCtx the active context to use.
 * @param languageMap the language map to expand.
 * @param direction the direction to apply to values.
 * @param {Object} [options] - processing options.
 *
 * @return the expanded language map.
 */
function _expandLanguageMap(activeCtx, languageMap, direction, options) {
  const rval = [];
  const keys = Object.keys(languageMap).sort();
  for(const key of keys) {
    const expandedKey = _expandIri$1(activeCtx, key, {vocab: true}, options);
    let val = languageMap[key];
    if(!_isArray$2(val)) {
      val = [val];
    }
    for(const item of val) {
      if(item === null) {
        // null values are allowed (8.5) but ignored (3.1)
        continue;
      }
      if(!_isString$2(item)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; language map values must be strings.',
          'jsonld.SyntaxError',
          {code: 'invalid language map value', languageMap});
      }
      const val = {'@value': item};
      if(expandedKey !== '@none') {
        val['@language'] = key.toLowerCase();
      }
      if(direction) {
        val['@direction'] = direction;
      }
      rval.push(val);
    }
  }
  return rval;
}

async function _expandIndexMap(
  {activeCtx, options, activeProperty, value, expansionMap, asGraph,
    indexKey, propertyIndex}) {
  const rval = [];
  const keys = Object.keys(value).sort();
  const isTypeIndex = indexKey === '@type';
  for(let key of keys) {
    // if indexKey is @type, there may be a context defined for it
    if(isTypeIndex) {
      const ctx = _getContextValue(activeCtx, key, '@context');
      if(!_isUndefined$1(ctx)) {
        activeCtx = await _processContext({
          activeCtx,
          localCtx: ctx,
          propagate: false,
          options
        });
      }
    }

    let val = value[key];
    if(!_isArray$2(val)) {
      val = [val];
    }

    val = await api$7.expand({
      activeCtx,
      activeProperty,
      element: val,
      options,
      insideList: false,
      insideIndex: true,
      expansionMap
    });

    // expand for @type, but also for @none
    let expandedKey;
    if(propertyIndex) {
      if(key === '@none') {
        expandedKey = '@none';
      } else {
        expandedKey = _expandValue(
          {activeCtx, activeProperty: indexKey, value: key, options});
      }
    } else {
      expandedKey = _expandIri$1(activeCtx, key, {vocab: true}, options);
    }

    if(indexKey === '@id') {
      // expand document relative
      key = _expandIri$1(activeCtx, key, {base: true}, options);
    } else if(isTypeIndex) {
      key = expandedKey;
    }

    for(let item of val) {
      // If this is also a @graph container, turn items into graphs
      if(asGraph && !_isGraph(item)) {
        item = {'@graph': [item]};
      }
      if(indexKey === '@type') {
        if(expandedKey === '@none') ; else if(item['@type']) {
          item['@type'] = [key].concat(item['@type']);
        } else {
          item['@type'] = [key];
        }
      } else if(_isValue(item) &&
        !['@language', '@type', '@index'].includes(indexKey)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; Attempt to add illegal key to value ' +
          `object: "${indexKey}".`,
          'jsonld.SyntaxError',
          {code: 'invalid value object', value: item});
      } else if(propertyIndex) {
        // index is a property to be expanded, and values interpreted for that
        // property
        if(expandedKey !== '@none') {
          // expand key as a value
          _addValue(item, propertyIndex, expandedKey, {
            propertyIsArray: true,
            prependValue: true
          });
        }
      } else if(expandedKey !== '@none' && !(indexKey in item)) {
        item[indexKey] = key;
      }
      rval.push(item);
    }
  }
  return rval;
}

const {isKeyword} = context;





const api$8 = {};
var nodeMap = api$8;

/**
 * Creates a merged JSON-LD node map (node ID => node).
 *
 * @param input the expanded JSON-LD to create a node map of.
 * @param [options] the options to use:
 *          [issuer] a jsonld.IdentifierIssuer to use to label blank nodes.
 *
 * @return the node map.
 */
api$8.createMergedNodeMap = (input, options) => {
  options = options || {};

  // produce a map of all subjects and name each bnode
  const issuer = options.issuer || new util.IdentifierIssuer('_:b');
  const graphs = {'@default': {}};
  api$8.createNodeMap(input, graphs, '@default', issuer);

  // add all non-default graphs to default graph
  return api$8.mergeNodeMaps(graphs);
};

/**
 * Recursively flattens the subjects in the given JSON-LD expanded input
 * into a node map.
 *
 * @param input the JSON-LD expanded input.
 * @param graphs a map of graph name to subject map.
 * @param graph the name of the current graph.
 * @param issuer the blank node identifier issuer.
 * @param name the name assigned to the current input if it is a bnode.
 * @param list the list to append to, null for none.
 */
api$8.createNodeMap = (input, graphs, graph, issuer, name, list) => {
  // recurse through array
  if(types.isArray(input)) {
    for(const node of input) {
      api$8.createNodeMap(node, graphs, graph, issuer, undefined, list);
    }
    return;
  }

  // add non-object to list
  if(!types.isObject(input)) {
    if(list) {
      list.push(input);
    }
    return;
  }

  // add values to list
  if(graphTypes.isValue(input)) {
    if('@type' in input) {
      let type = input['@type'];
      // rename @type blank node
      if(type.indexOf('_:') === 0) {
        input['@type'] = type = issuer.getId(type);
      }
    }
    if(list) {
      list.push(input);
    }
    return;
  } else if(list && graphTypes.isList(input)) {
    const _list = [];
    api$8.createNodeMap(input['@list'], graphs, graph, issuer, name, _list);
    list.push({'@list': _list});
    return;
  }

  // Note: At this point, input must be a subject.

  // spec requires @type to be named first, so assign names early
  if('@type' in input) {
    const types = input['@type'];
    for(const type of types) {
      if(type.indexOf('_:') === 0) {
        issuer.getId(type);
      }
    }
  }

  // get name for subject
  if(types.isUndefined(name)) {
    name = graphTypes.isBlankNode(input) ?
      issuer.getId(input['@id']) : input['@id'];
  }

  // add subject reference to list
  if(list) {
    list.push({'@id': name});
  }

  // create new subject or merge into existing one
  const subjects = graphs[graph];
  const subject = subjects[name] = subjects[name] || {};
  subject['@id'] = name;
  const properties = Object.keys(input).sort();
  for(let property of properties) {
    // skip @id
    if(property === '@id') {
      continue;
    }

    // handle reverse properties
    if(property === '@reverse') {
      const referencedNode = {'@id': name};
      const reverseMap = input['@reverse'];
      for(const reverseProperty in reverseMap) {
        const items = reverseMap[reverseProperty];
        for(const item of items) {
          let itemName = item['@id'];
          if(graphTypes.isBlankNode(item)) {
            itemName = issuer.getId(itemName);
          }
          api$8.createNodeMap(item, graphs, graph, issuer, itemName);
          util.addValue(
            subjects[itemName], reverseProperty, referencedNode,
            {propertyIsArray: true, allowDuplicate: false});
        }
      }
      continue;
    }

    // recurse into graph
    if(property === '@graph') {
      // add graph subjects map entry
      if(!(name in graphs)) {
        graphs[name] = {};
      }
      api$8.createNodeMap(input[property], graphs, name, issuer);
      continue;
    }

    // recurse into included
    if(property === '@included') {
      api$8.createNodeMap(input[property], graphs, graph, issuer);
      continue;
    }

    // copy non-@type keywords
    if(property !== '@type' && isKeyword(property)) {
      if(property === '@index' && property in subject &&
        (input[property] !== subject[property] ||
        input[property]['@id'] !== subject[property]['@id'])) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; conflicting @index property detected.',
          'jsonld.SyntaxError',
          {code: 'conflicting indexes', subject});
      }
      subject[property] = input[property];
      continue;
    }

    // iterate over objects
    const objects = input[property];

    // if property is a bnode, assign it a new id
    if(property.indexOf('_:') === 0) {
      property = issuer.getId(property);
    }

    // ensure property is added for empty arrays
    if(objects.length === 0) {
      util.addValue(subject, property, [], {propertyIsArray: true});
      continue;
    }
    for(let o of objects) {
      if(property === '@type') {
        // rename @type blank nodes
        o = (o.indexOf('_:') === 0) ? issuer.getId(o) : o;
      }

      // handle embedded subject or subject reference
      if(graphTypes.isSubject(o) || graphTypes.isSubjectReference(o)) {
        // skip null @id
        if('@id' in o && !o['@id']) {
          continue;
        }

        // relabel blank node @id
        const id = graphTypes.isBlankNode(o) ?
          issuer.getId(o['@id']) : o['@id'];

        // add reference and recurse
        util.addValue(
          subject, property, {'@id': id},
          {propertyIsArray: true, allowDuplicate: false});
        api$8.createNodeMap(o, graphs, graph, issuer, id);
      } else if(graphTypes.isValue(o)) {
        util.addValue(
          subject, property, o,
          {propertyIsArray: true, allowDuplicate: false});
      } else if(graphTypes.isList(o)) {
        // handle @list
        const _list = [];
        api$8.createNodeMap(o['@list'], graphs, graph, issuer, name, _list);
        o = {'@list': _list};
        util.addValue(
          subject, property, o,
          {propertyIsArray: true, allowDuplicate: false});
      } else {
        // handle @value
        api$8.createNodeMap(o, graphs, graph, issuer, name);
        util.addValue(
          subject, property, o, {propertyIsArray: true, allowDuplicate: false});
      }
    }
  }
};

/**
 * Merge separate named graphs into a single merged graph including
 * all nodes from the default graph and named graphs.
 *
 * @param graphs a map of graph name to subject map.
 *
 * @return the merged graph map.
 */
api$8.mergeNodeMapGraphs = graphs => {
  const merged = {};
  for(const name of Object.keys(graphs).sort()) {
    for(const id of Object.keys(graphs[name]).sort()) {
      const node = graphs[name][id];
      if(!(id in merged)) {
        merged[id] = {'@id': id};
      }
      const mergedNode = merged[id];

      for(const property of Object.keys(node).sort()) {
        if(isKeyword(property) && property !== '@type') {
          // copy keywords
          mergedNode[property] = util.clone(node[property]);
        } else {
          // merge objects
          for(const value of node[property]) {
            util.addValue(
              mergedNode, property, util.clone(value),
              {propertyIsArray: true, allowDuplicate: false});
          }
        }
      }
    }
  }

  return merged;
};

api$8.mergeNodeMaps = graphs => {
  // add all non-default graphs to default graph
  const defaultGraph = graphs['@default'];
  const graphNames = Object.keys(graphs).sort();
  for(const graphName of graphNames) {
    if(graphName === '@default') {
      continue;
    }
    const nodeMap = graphs[graphName];
    let subject = defaultGraph[graphName];
    if(!subject) {
      defaultGraph[graphName] = subject = {
        '@id': graphName,
        '@graph': []
      };
    } else if(!('@graph' in subject)) {
      subject['@graph'] = [];
    }
    const graph = subject['@graph'];
    for(const id of Object.keys(nodeMap).sort()) {
      const node = nodeMap[id];
      // only add full subjects
      if(!graphTypes.isSubjectReference(node)) {
        graph.push(node);
      }
    }
  }
  return defaultGraph;
};

const {
  isSubjectReference: _isSubjectReference
} = graphTypes;

const {
  createMergedNodeMap: _createMergedNodeMap
} = nodeMap;

const api$9 = {};
var flatten = api$9;

/**
 * Performs JSON-LD flattening.
 *
 * @param input the expanded JSON-LD to flatten.
 *
 * @return the flattened output.
 */
api$9.flatten = input => {
  const defaultGraph = _createMergedNodeMap(input);

  // produce flattened output
  const flattened = [];
  const keys = Object.keys(defaultGraph).sort();
  for(let ki = 0; ki < keys.length; ++ki) {
    const node = defaultGraph[keys[ki]];
    // only add full subjects to top-level
    if(!_isSubjectReference(node)) {
      flattened.push(node);
    }
  }
  return flattened;
};

// constants
const {
  // RDF,
  RDF_LIST,
  RDF_FIRST,
  RDF_REST,
  RDF_NIL,
  RDF_TYPE,
  // RDF_PLAIN_LITERAL,
  // RDF_XML_LITERAL,
  RDF_JSON_LITERAL,
  // RDF_OBJECT,
  // RDF_LANGSTRING,

  // XSD,
  XSD_BOOLEAN,
  XSD_DOUBLE,
  XSD_INTEGER,
  XSD_STRING: XSD_STRING$1,
} = constants;

const REGEX_BCP47$1 = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;

const api$a = {};
var fromRdf = api$a;

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset the RDF dataset.
 * @param options the RDF serialization options.
 *
 * @return a Promise that resolves to the JSON-LD output.
 */
api$a.fromRDF = async (
  dataset,
  {
    useRdfType = false,
    useNativeTypes = false,
    rdfDirection = null
  }
) => {
  const defaultGraph = {};
  const graphMap = {'@default': defaultGraph};
  const referencedOnce = {};

  for(const quad of dataset) {
    // TODO: change 'name' to 'graph'
    const name = (quad.graph.termType === 'DefaultGraph') ?
      '@default' : quad.graph.value;
    if(!(name in graphMap)) {
      graphMap[name] = {};
    }
    if(name !== '@default' && !(name in defaultGraph)) {
      defaultGraph[name] = {'@id': name};
    }

    const nodeMap = graphMap[name];

    // get subject, predicate, object
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object;

    if(!(s in nodeMap)) {
      nodeMap[s] = {'@id': s};
    }
    const node = nodeMap[s];

    const objectIsNode = o.termType.endsWith('Node');
    if(objectIsNode && !(o.value in nodeMap)) {
      nodeMap[o.value] = {'@id': o.value};
    }

    if(p === RDF_TYPE && !useRdfType && objectIsNode) {
      util.addValue(node, '@type', o.value, {propertyIsArray: true});
      continue;
    }

    const value = _RDFToObject(o, useNativeTypes, rdfDirection);
    util.addValue(node, p, value, {propertyIsArray: true});

    // object may be an RDF list/partial list node but we can't know easily
    // until all triples are read
    if(objectIsNode) {
      if(o.value === RDF_NIL) {
        // track rdf:nil uniquely per graph
        const object = nodeMap[o.value];
        if(!('usages' in object)) {
          object.usages = [];
        }
        object.usages.push({
          node,
          property: p,
          value
        });
      } else if(o.value in referencedOnce) {
        // object referenced more than once
        referencedOnce[o.value] = false;
      } else {
        // keep track of single reference
        referencedOnce[o.value] = {
          node,
          property: p,
          value
        };
      }
    }
  }

  /*
  for(let name in dataset) {
    const graph = dataset[name];
    if(!(name in graphMap)) {
      graphMap[name] = {};
    }
    if(name !== '@default' && !(name in defaultGraph)) {
      defaultGraph[name] = {'@id': name};
    }
    const nodeMap = graphMap[name];
    for(let ti = 0; ti < graph.length; ++ti) {
      const triple = graph[ti];

      // get subject, predicate, object
      const s = triple.subject.value;
      const p = triple.predicate.value;
      const o = triple.object;

      if(!(s in nodeMap)) {
        nodeMap[s] = {'@id': s};
      }
      const node = nodeMap[s];

      const objectIsId = (o.type === 'IRI' || o.type === 'blank node');
      if(objectIsId && !(o.value in nodeMap)) {
        nodeMap[o.value] = {'@id': o.value};
      }

      if(p === RDF_TYPE && !useRdfType && objectIsId) {
        util.addValue(node, '@type', o.value, {propertyIsArray: true});
        continue;
      }

      const value = _RDFToObject(o, useNativeTypes);
      util.addValue(node, p, value, {propertyIsArray: true});

      // object may be an RDF list/partial list node but we can't know easily
      // until all triples are read
      if(objectIsId) {
        if(o.value === RDF_NIL) {
          // track rdf:nil uniquely per graph
          const object = nodeMap[o.value];
          if(!('usages' in object)) {
            object.usages = [];
          }
          object.usages.push({
            node: node,
            property: p,
            value: value
          });
        } else if(o.value in referencedOnce) {
          // object referenced more than once
          referencedOnce[o.value] = false;
        } else {
          // keep track of single reference
          referencedOnce[o.value] = {
            node: node,
            property: p,
            value: value
          };
        }
      }
    }
  }*/

  // convert linked lists to @list arrays
  for(const name in graphMap) {
    const graphObject = graphMap[name];

    // no @lists to be converted, continue
    if(!(RDF_NIL in graphObject)) {
      continue;
    }

    // iterate backwards through each RDF list
    const nil = graphObject[RDF_NIL];
    if(!nil.usages) {
      continue;
    }
    for(let usage of nil.usages) {
      let node = usage.node;
      let property = usage.property;
      let head = usage.value;
      const list = [];
      const listNodes = [];

      // ensure node is a well-formed list node; it must:
      // 1. Be referenced only once.
      // 2. Have an array for rdf:first that has 1 item.
      // 3. Have an array for rdf:rest that has 1 item.
      // 4. Have no keys other than: @id, rdf:first, rdf:rest, and,
      //   optionally, @type where the value is rdf:List.
      let nodeKeyCount = Object.keys(node).length;
      while(property === RDF_REST &&
        types.isObject(referencedOnce[node['@id']]) &&
        types.isArray(node[RDF_FIRST]) && node[RDF_FIRST].length === 1 &&
        types.isArray(node[RDF_REST]) && node[RDF_REST].length === 1 &&
        (nodeKeyCount === 3 ||
          (nodeKeyCount === 4 && types.isArray(node['@type']) &&
          node['@type'].length === 1 && node['@type'][0] === RDF_LIST))) {
        list.push(node[RDF_FIRST][0]);
        listNodes.push(node['@id']);

        // get next node, moving backwards through list
        usage = referencedOnce[node['@id']];
        node = usage.node;
        property = usage.property;
        head = usage.value;
        nodeKeyCount = Object.keys(node).length;

        // if node is not a blank node, then list head found
        if(!graphTypes.isBlankNode(node)) {
          break;
        }
      }

      // transform list into @list object
      delete head['@id'];
      head['@list'] = list.reverse();
      for(const listNode of listNodes) {
        delete graphObject[listNode];
      }
    }

    delete nil.usages;
  }

  const result = [];
  const subjects = Object.keys(defaultGraph).sort();
  for(const subject of subjects) {
    const node = defaultGraph[subject];
    if(subject in graphMap) {
      const graph = node['@graph'] = [];
      const graphObject = graphMap[subject];
      const graphSubjects = Object.keys(graphObject).sort();
      for(const graphSubject of graphSubjects) {
        const node = graphObject[graphSubject];
        // only add full subjects to top-level
        if(!graphTypes.isSubjectReference(node)) {
          graph.push(node);
        }
      }
    }
    // only add full subjects to top-level
    if(!graphTypes.isSubjectReference(node)) {
      result.push(node);
    }
  }

  return result;
};

/**
 * Converts an RDF triple object to a JSON-LD object.
 *
 * @param o the RDF triple object to convert.
 * @param useNativeTypes true to output native types, false not to.
 *
 * @return the JSON-LD object.
 */
function _RDFToObject(o, useNativeTypes, rdfDirection) {
  // convert NamedNode/BlankNode object to JSON-LD
  if(o.termType.endsWith('Node')) {
    return {'@id': o.value};
  }

  // convert literal to JSON-LD
  const rval = {'@value': o.value};

  // add language
  if(o.language) {
    rval['@language'] = o.language;
  } else {
    let type = o.datatype.value;
    if(!type) {
      type = XSD_STRING$1;
    }
    if(type === RDF_JSON_LITERAL) {
      type = '@json';
      try {
        rval['@value'] = JSON.parse(rval['@value']);
      } catch(e) {
        throw new JsonLdError_1(
          'JSON literal could not be parsed.',
          'jsonld.InvalidJsonLiteral',
          {code: 'invalid JSON literal', value: rval['@value'], cause: e});
      }
    }
    // use native types for certain xsd types
    if(useNativeTypes) {
      if(type === XSD_BOOLEAN) {
        if(rval['@value'] === 'true') {
          rval['@value'] = true;
        } else if(rval['@value'] === 'false') {
          rval['@value'] = false;
        }
      } else if(types.isNumeric(rval['@value'])) {
        if(type === XSD_INTEGER) {
          const i = parseInt(rval['@value'], 10);
          if(i.toFixed(0) === rval['@value']) {
            rval['@value'] = i;
          }
        } else if(type === XSD_DOUBLE) {
          rval['@value'] = parseFloat(rval['@value']);
        }
      }
      // do not add native type
      if(![XSD_BOOLEAN, XSD_INTEGER, XSD_DOUBLE, XSD_STRING$1].includes(type)) {
        rval['@type'] = type;
      }
    } else if(rdfDirection === 'i18n-datatype' &&
      type.startsWith('https://www.w3.org/ns/i18n#')) {
      const [, language, direction] = type.split(/[#_]/);
      if(language.length > 0) {
        rval['@language'] = language;
        if(!language.match(REGEX_BCP47$1)) {
          console.warn(`@language must be valid BCP47: ${language}`);
        }
      }
      rval['@direction'] = direction;
    } else if(type !== XSD_STRING$1) {
      rval['@type'] = type;
    }
  }

  return rval;
}

/* jshint esversion: 6 */

var canonicalize = function serialize (object) {
  if (object === null || typeof object !== 'object' || object.toJSON != null) {
    return JSON.stringify(object);
  }

  if (Array.isArray(object)) {
    return '[' + object.reduce((t, cv, ci) => {
      const comma = ci === 0 ? '' : ',';
      const value = cv === undefined || typeof cv === 'symbol' ? null : cv;
      return t + comma + serialize(value);
    }, '') + ']';
  }

  return '{' + Object.keys(object).sort().reduce((t, cv, ci) => {
    if (object[cv] === undefined ||
        typeof object[cv] === 'symbol') {
      return t;
    }
    const comma = t.length === 0 ? '' : ',';
    return t + comma + serialize(cv) + ':' + serialize(object[cv]);
  }, '') + '}';
};

const {createNodeMap} = nodeMap;
const {isKeyword: isKeyword$1} = context;





const {
  // RDF,
  // RDF_LIST,
  RDF_FIRST: RDF_FIRST$1,
  RDF_REST: RDF_REST$1,
  RDF_NIL: RDF_NIL$1,
  RDF_TYPE: RDF_TYPE$1,
  // RDF_PLAIN_LITERAL,
  // RDF_XML_LITERAL,
  RDF_JSON_LITERAL: RDF_JSON_LITERAL$1,
  // RDF_OBJECT,
  RDF_LANGSTRING: RDF_LANGSTRING$1,

  // XSD,
  XSD_BOOLEAN: XSD_BOOLEAN$1,
  XSD_DOUBLE: XSD_DOUBLE$1,
  XSD_INTEGER: XSD_INTEGER$1,
  XSD_STRING: XSD_STRING$2,
} = constants;

const {
  isAbsolute: _isAbsoluteIri$2
} = url;

const api$b = {};
var toRdf = api$b;

/**
 * Outputs an RDF dataset for the expanded JSON-LD input.
 *
 * @param input the expanded JSON-LD input.
 * @param options the RDF serialization options.
 *
 * @return the RDF dataset.
 */
api$b.toRDF = (input, options) => {
  // create node map for default graph (and any named graphs)
  const issuer = new util.IdentifierIssuer('_:b');
  const nodeMap = {'@default': {}};
  createNodeMap(input, nodeMap, '@default', issuer);

  const dataset = [];
  const graphNames = Object.keys(nodeMap).sort();
  for(const graphName of graphNames) {
    let graphTerm;
    if(graphName === '@default') {
      graphTerm = {termType: 'DefaultGraph', value: ''};
    } else if(_isAbsoluteIri$2(graphName)) {
      if(graphName.startsWith('_:')) {
        graphTerm = {termType: 'BlankNode'};
      } else {
        graphTerm = {termType: 'NamedNode'};
      }
      graphTerm.value = graphName;
    } else {
      // skip relative IRIs (not valid RDF)
      continue;
    }
    _graphToRDF(dataset, nodeMap[graphName], graphTerm, issuer, options);
  }

  return dataset;
};

/**
 * Adds RDF quads for a particular graph to the given dataset.
 *
 * @param dataset the dataset to append RDF quads to.
 * @param graph the graph to create RDF quads for.
 * @param graphTerm the graph term for each quad.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param options the RDF serialization options.
 *
 * @return the array of RDF triples for the given graph.
 */
function _graphToRDF(dataset, graph, graphTerm, issuer, options) {
  const ids = Object.keys(graph).sort();
  for(const id of ids) {
    const node = graph[id];
    const properties = Object.keys(node).sort();
    for(let property of properties) {
      const items = node[property];
      if(property === '@type') {
        property = RDF_TYPE$1;
      } else if(isKeyword$1(property)) {
        continue;
      }

      for(const item of items) {
        // RDF subject
        const subject = {
          termType: id.startsWith('_:') ? 'BlankNode' : 'NamedNode',
          value: id
        };

        // skip relative IRI subjects (not valid RDF)
        if(!_isAbsoluteIri$2(id)) {
          continue;
        }

        // RDF predicate
        const predicate = {
          termType: property.startsWith('_:') ? 'BlankNode' : 'NamedNode',
          value: property
        };

        // skip relative IRI predicates (not valid RDF)
        if(!_isAbsoluteIri$2(property)) {
          continue;
        }

        // skip blank node predicates unless producing generalized RDF
        if(predicate.termType === 'BlankNode' &&
          !options.produceGeneralizedRdf) {
          continue;
        }

        // convert list, value or node object to triple
        const object =
          _objectToRDF(item, issuer, dataset, graphTerm, options.rdfDirection);
        // skip null objects (they are relative IRIs)
        if(object) {
          dataset.push({
            subject,
            predicate,
            object,
            graph: graphTerm
          });
        }
      }
    }
  }
}

/**
 * Converts a @list value into linked list of blank node RDF quads
 * (an RDF collection).
 *
 * @param list the @list value.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param dataset the array of quads to append to.
 * @param graphTerm the graph term for each quad.
 *
 * @return the head of the list.
 */
function _listToRDF(list, issuer, dataset, graphTerm, rdfDirection) {
  const first = {termType: 'NamedNode', value: RDF_FIRST$1};
  const rest = {termType: 'NamedNode', value: RDF_REST$1};
  const nil = {termType: 'NamedNode', value: RDF_NIL$1};

  const last = list.pop();
  // Result is the head of the list
  const result = last ? {termType: 'BlankNode', value: issuer.getId()} : nil;
  let subject = result;

  for(const item of list) {
    const object = _objectToRDF(item, issuer, dataset, graphTerm, rdfDirection);
    const next = {termType: 'BlankNode', value: issuer.getId()};
    dataset.push({
      subject,
      predicate: first,
      object,
      graph: graphTerm
    });
    dataset.push({
      subject,
      predicate: rest,
      object: next,
      graph: graphTerm
    });
    subject = next;
  }

  // Tail of list
  if(last) {
    const object = _objectToRDF(last, issuer, dataset, graphTerm, rdfDirection);
    dataset.push({
      subject,
      predicate: first,
      object,
      graph: graphTerm
    });
    dataset.push({
      subject,
      predicate: rest,
      object: nil,
      graph: graphTerm
    });
  }

  return result;
}

/**
 * Converts a JSON-LD value object to an RDF literal or a JSON-LD string,
 * node object to an RDF resource, or adds a list.
 *
 * @param item the JSON-LD value or node object.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param dataset the dataset to append RDF quads to.
 * @param graphTerm the graph term for each quad.
 *
 * @return the RDF literal or RDF resource.
 */
function _objectToRDF(item, issuer, dataset, graphTerm, rdfDirection) {
  const object = {};

  // convert value object to RDF
  if(graphTypes.isValue(item)) {
    object.termType = 'Literal';
    object.value = undefined;
    object.datatype = {
      termType: 'NamedNode'
    };
    let value = item['@value'];
    const datatype = item['@type'] || null;

    // convert to XSD/JSON datatypes as appropriate
    if(datatype === '@json') {
      object.value = canonicalize(value);
      object.datatype.value = RDF_JSON_LITERAL$1;
    } else if(types.isBoolean(value)) {
      object.value = value.toString();
      object.datatype.value = datatype || XSD_BOOLEAN$1;
    } else if(types.isDouble(value) || datatype === XSD_DOUBLE$1) {
      if(!types.isDouble(value)) {
        value = parseFloat(value);
      }
      // canonical double representation
      object.value = value.toExponential(15).replace(/(\d)0*e\+?/, '$1E');
      object.datatype.value = datatype || XSD_DOUBLE$1;
    } else if(types.isNumber(value)) {
      object.value = value.toFixed(0);
      object.datatype.value = datatype || XSD_INTEGER$1;
    } else if(rdfDirection === 'i18n-datatype' &&
      '@direction' in item) {
      const datatype = 'https://www.w3.org/ns/i18n#' +
        (item['@language'] || '') +
        `_${item['@direction']}`;
      object.datatype.value = datatype;
      object.value = value;
    } else if('@language' in item) {
      object.value = value;
      object.datatype.value = datatype || RDF_LANGSTRING$1;
      object.language = item['@language'];
    } else {
      object.value = value;
      object.datatype.value = datatype || XSD_STRING$2;
    }
  } else if(graphTypes.isList(item)) {
    const _list =
      _listToRDF(item['@list'], issuer, dataset, graphTerm, rdfDirection);
    object.termType = _list.termType;
    object.value = _list.value;
  } else {
    // convert string/node object to RDF
    const id = types.isObject(item) ? item['@id'] : item;
    object.termType = id.startsWith('_:') ? 'BlankNode' : 'NamedNode';
    object.value = id;
  }

  // skip relative IRIs, not valid RDF
  if(object.termType === 'NamedNode' && !_isAbsoluteIri$2(object.value)) {
    return null;
  }

  return object;
}

const {isKeyword: isKeyword$2} = context;





const {
  createNodeMap: _createNodeMap,
  mergeNodeMapGraphs: _mergeNodeMapGraphs
} = nodeMap;

const api$c = {};
var frame = api$c;

/**
 * Performs JSON-LD `merged` framing.
 *
 * @param input the expanded JSON-LD to frame.
 * @param frame the expanded JSON-LD frame to use.
 * @param options the framing options.
 *
 * @return the framed output.
 */
api$c.frameMergedOrDefault = (input, frame, options) => {
  // create framing state
  const state = {
    options,
    embedded: false,
    graph: '@default',
    graphMap: {'@default': {}},
    subjectStack: [],
    link: {},
    bnodeMap: {}
  };

  // produce a map of all graphs and name each bnode
  // FIXME: currently uses subjects from @merged graph only
  const issuer = new util.IdentifierIssuer('_:b');
  _createNodeMap(input, state.graphMap, '@default', issuer);
  if(options.merged) {
    state.graphMap['@merged'] = _mergeNodeMapGraphs(state.graphMap);
    state.graph = '@merged';
  }
  state.subjects = state.graphMap[state.graph];

  // frame the subjects
  const framed = [];
  api$c.frame(state, Object.keys(state.subjects).sort(), frame, framed);

  // If pruning blank nodes, find those to prune
  if(options.pruneBlankNodeIdentifiers) {
    // remove all blank nodes appearing only once, done in compaction
    options.bnodesToClear =
      Object.keys(state.bnodeMap).filter(id => state.bnodeMap[id].length === 1);
  }

  // remove @preserve from results
  options.link = {};
  return _cleanupPreserve(framed, options);
};

/**
 * Frames subjects according to the given frame.
 *
 * @param state the current framing state.
 * @param subjects the subjects to filter.
 * @param frame the frame.
 * @param parent the parent subject or top-level array.
 * @param property the parent property, initialized to null.
 */
api$c.frame = (state, subjects, frame, parent, property = null) => {
  // validate the frame
  _validateFrame(frame);
  frame = frame[0];

  // get flags for current frame
  const options = state.options;
  const flags = {
    embed: _getFrameFlag(frame, options, 'embed'),
    explicit: _getFrameFlag(frame, options, 'explicit'),
    requireAll: _getFrameFlag(frame, options, 'requireAll')
  };

  // get link for current graph
  if(!state.link.hasOwnProperty(state.graph)) {
    state.link[state.graph] = {};
  }
  const link = state.link[state.graph];

  // filter out subjects that match the frame
  const matches = _filterSubjects(state, subjects, frame, flags);

  // add matches to output
  const ids = Object.keys(matches).sort();
  for(const id of ids) {
    const subject = matches[id];

    /* Note: In order to treat each top-level match as a compartmentalized
    result, clear the unique embedded subjects map when the property is null,
    which only occurs at the top-level. */
    if(property === null) {
      state.uniqueEmbeds = {[state.graph]: {}};
    } else {
      state.uniqueEmbeds[state.graph] = state.uniqueEmbeds[state.graph] || {};
    }

    if(flags.embed === '@link' && id in link) {
      // TODO: may want to also match an existing linked subject against
      // the current frame ... so different frames could produce different
      // subjects that are only shared in-memory when the frames are the same

      // add existing linked subject
      _addFrameOutput(parent, property, link[id]);
      continue;
    }

    // start output for subject
    const output = {'@id': id};
    if(id.indexOf('_:') === 0) {
      util.addValue(state.bnodeMap, id, output, {propertyIsArray: true});
    }
    link[id] = output;

    // validate @embed
    if((flags.embed === '@first' || flags.embed === '@last') && state.is11) {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; invalid value of @embed.',
        'jsonld.SyntaxError', {code: 'invalid @embed value', frame});
    }

    if(!state.embedded && state.uniqueEmbeds[state.graph].hasOwnProperty(id)) {
      // skip adding this node object to the top level, as it was
      // already included in another node object
      continue;
    }

    // if embed is @never or if a circular reference would be created by an
    // embed, the subject cannot be embedded, just add the reference;
    // note that a circular reference won't occur when the embed flag is
    // `@link` as the above check will short-circuit before reaching this point
    if(state.embedded &&
      (flags.embed === '@never' ||
      _createsCircularReference(subject, state.graph, state.subjectStack))) {
      _addFrameOutput(parent, property, output);
      continue;
    }

    // if only the first (or once) should be embedded
    if(state.embedded &&
       (flags.embed == '@first' || flags.embed == '@once') &&
       state.uniqueEmbeds[state.graph].hasOwnProperty(id)) {
      _addFrameOutput(parent, property, output);
      continue;
    }

    // if only the last match should be embedded
    if(flags.embed === '@last') {
      // remove any existing embed
      if(id in state.uniqueEmbeds[state.graph]) {
        _removeEmbed(state, id);
      }
    }

    state.uniqueEmbeds[state.graph][id] = {parent, property};

    // push matching subject onto stack to enable circular embed checks
    state.subjectStack.push({subject, graph: state.graph});

    // subject is also the name of a graph
    if(id in state.graphMap) {
      let recurse = false;
      let subframe = null;
      if(!('@graph' in frame)) {
        recurse = state.graph !== '@merged';
        subframe = {};
      } else {
        subframe = frame['@graph'][0];
        recurse = !(id === '@merged' || id === '@default');
        if(!types.isObject(subframe)) {
          subframe = {};
        }
      }

      if(recurse) {
        // recurse into graph
        api$c.frame(
          {...state, graph: id, embedded: false},
          Object.keys(state.graphMap[id]).sort(), [subframe], output, '@graph');
      }
    }

    // if frame has @included, recurse over its sub-frame
    if('@included' in frame) {
      api$c.frame(
        {...state, embedded: false},
        subjects, frame['@included'], output, '@included');
    }

    // iterate over subject properties
    for(const prop of Object.keys(subject).sort()) {
      // copy keywords to output
      if(isKeyword$2(prop)) {
        output[prop] = util.clone(subject[prop]);

        if(prop === '@type') {
          // count bnode values of @type
          for(const type of subject['@type']) {
            if(type.indexOf('_:') === 0) {
              util.addValue(
                state.bnodeMap, type, output, {propertyIsArray: true});
            }
          }
        }
        continue;
      }

      // explicit is on and property isn't in the frame, skip processing
      if(flags.explicit && !(prop in frame)) {
        continue;
      }

      // add objects
      for(const o of subject[prop]) {
        const subframe = (prop in frame ?
          frame[prop] : _createImplicitFrame(flags));

        // recurse into list
        if(graphTypes.isList(o)) {
          const subframe =
            (frame[prop] && frame[prop][0] && frame[prop][0]['@list']) ?
              frame[prop][0]['@list'] :
              _createImplicitFrame(flags);

          // add empty list
          const list = {'@list': []};
          _addFrameOutput(output, prop, list);

          // add list objects
          const src = o['@list'];
          for(const oo of src) {
            if(graphTypes.isSubjectReference(oo)) {
              // recurse into subject reference
              api$c.frame(
                {...state, embedded: true},
                [oo['@id']], subframe, list, '@list');
            } else {
              // include other values automatically
              _addFrameOutput(list, '@list', util.clone(oo));
            }
          }
        } else if(graphTypes.isSubjectReference(o)) {
          // recurse into subject reference
          api$c.frame(
            {...state, embedded: true},
            [o['@id']], subframe, output, prop);
        } else if(_valueMatch(subframe[0], o)) {
          // include other values, if they match
          _addFrameOutput(output, prop, util.clone(o));
        }
      }
    }

    // handle defaults
    for(const prop of Object.keys(frame).sort()) {
      // skip keywords
      if(prop === '@type') {
        if(!types.isObject(frame[prop][0]) ||
           !('@default' in frame[prop][0])) {
          continue;
        }
        // allow through default types
      } else if(isKeyword$2(prop)) {
        continue;
      }

      // if omit default is off, then include default values for properties
      // that appear in the next frame but are not in the matching subject
      const next = frame[prop][0] || {};
      const omitDefaultOn = _getFrameFlag(next, options, 'omitDefault');
      if(!omitDefaultOn && !(prop in output)) {
        let preserve = '@null';
        if('@default' in next) {
          preserve = util.clone(next['@default']);
        }
        if(!types.isArray(preserve)) {
          preserve = [preserve];
        }
        output[prop] = [{'@preserve': preserve}];
      }
    }

    // if embed reverse values by finding nodes having this subject as a value
    // of the associated property
    for(const reverseProp of Object.keys(frame['@reverse'] || {}).sort()) {
      const subframe = frame['@reverse'][reverseProp];
      for(const subject of Object.keys(state.subjects)) {
        const nodeValues =
          util.getValues(state.subjects[subject], reverseProp);
        if(nodeValues.some(v => v['@id'] === id)) {
          // node has property referencing this subject, recurse
          output['@reverse'] = output['@reverse'] || {};
          util.addValue(
            output['@reverse'], reverseProp, [], {propertyIsArray: true});
          api$c.frame(
            {...state, embedded: true},
            [subject], subframe, output['@reverse'][reverseProp],
            property);
        }
      }
    }

    // add output to parent
    _addFrameOutput(parent, property, output);

    // pop matching subject from circular ref-checking stack
    state.subjectStack.pop();
  }
};

/**
 * Replace `@null` with `null`, removing it from arrays.
 *
 * @param input the framed, compacted output.
 * @param options the framing options used.
 *
 * @return the resulting output.
 */
api$c.cleanupNull = (input, options) => {
  // recurse through arrays
  if(types.isArray(input)) {
    const noNulls = input.map(v => api$c.cleanupNull(v, options));
    return noNulls.filter(v => v); // removes nulls from array
  }

  if(input === '@null') {
    return null;
  }

  if(types.isObject(input)) {
    // handle in-memory linked nodes
    if('@id' in input) {
      const id = input['@id'];
      if(options.link.hasOwnProperty(id)) {
        const idx = options.link[id].indexOf(input);
        if(idx !== -1) {
          // already visited
          return options.link[id][idx];
        }
        // prevent circular visitation
        options.link[id].push(input);
      } else {
        // prevent circular visitation
        options.link[id] = [input];
      }
    }

    for(const key in input) {
      input[key] = api$c.cleanupNull(input[key], options);
    }
  }
  return input;
};

/**
 * Creates an implicit frame when recursing through subject matches. If
 * a frame doesn't have an explicit frame for a particular property, then
 * a wildcard child frame will be created that uses the same flags that the
 * parent frame used.
 *
 * @param flags the current framing flags.
 *
 * @return the implicit frame.
 */
function _createImplicitFrame(flags) {
  const frame = {};
  for(const key in flags) {
    if(flags[key] !== undefined) {
      frame['@' + key] = [flags[key]];
    }
  }
  return [frame];
}

/**
 * Checks the current subject stack to see if embedding the given subject
 * would cause a circular reference.
 *
 * @param subjectToEmbed the subject to embed.
 * @param graph the graph the subject to embed is in.
 * @param subjectStack the current stack of subjects.
 *
 * @return true if a circular reference would be created, false if not.
 */
function _createsCircularReference(subjectToEmbed, graph, subjectStack) {
  for(let i = subjectStack.length - 1; i >= 0; --i) {
    const subject = subjectStack[i];
    if(subject.graph === graph &&
      subject.subject['@id'] === subjectToEmbed['@id']) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the frame flag value for the given flag name.
 *
 * @param frame the frame.
 * @param options the framing options.
 * @param name the flag name.
 *
 * @return the flag value.
 */
function _getFrameFlag(frame, options, name) {
  const flag = '@' + name;
  let rval = (flag in frame ? frame[flag][0] : options[name]);
  if(name === 'embed') {
    // default is "@last"
    // backwards-compatibility support for "embed" maps:
    // true => "@last"
    // false => "@never"
    if(rval === true) {
      rval = '@once';
    } else if(rval === false) {
      rval = '@never';
    } else if(rval !== '@always' && rval !== '@never' && rval !== '@link' &&
      rval !== '@first' && rval !== '@last' && rval !== '@once') {
      throw new JsonLdError_1(
        'Invalid JSON-LD syntax; invalid value of @embed.',
        'jsonld.SyntaxError', {code: 'invalid @embed value', frame});
    }
  }
  return rval;
}

/**
 * Validates a JSON-LD frame, throwing an exception if the frame is invalid.
 *
 * @param frame the frame to validate.
 */
function _validateFrame(frame) {
  if(!types.isArray(frame) || frame.length !== 1 || !types.isObject(frame[0])) {
    throw new JsonLdError_1(
      'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
      'jsonld.SyntaxError', {frame});
  }

  if('@id' in frame[0]) {
    for(const id of util.asArray(frame[0]['@id'])) {
      // @id must be wildcard or an IRI
      if(!(types.isObject(id) || url.isAbsolute(id)) ||
        (types.isString(id) && id.indexOf('_:') === 0)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; invalid @id in frame.',
          'jsonld.SyntaxError', {code: 'invalid frame', frame});
      }
    }
  }

  if('@type' in frame[0]) {
    for(const type of util.asArray(frame[0]['@type'])) {
      // @id must be wildcard or an IRI
      if(!(types.isObject(type) || url.isAbsolute(type)) ||
        (types.isString(type) && type.indexOf('_:') === 0)) {
        throw new JsonLdError_1(
          'Invalid JSON-LD syntax; invalid @type in frame.',
          'jsonld.SyntaxError', {code: 'invalid frame', frame});
      }
    }
  }
}

/**
 * Returns a map of all of the subjects that match a parsed frame.
 *
 * @param state the current framing state.
 * @param subjects the set of subjects to filter.
 * @param frame the parsed frame.
 * @param flags the frame flags.
 *
 * @return all of the matched subjects.
 */
function _filterSubjects(state, subjects, frame, flags) {
  // filter subjects in @id order
  const rval = {};
  for(const id of subjects) {
    const subject = state.graphMap[state.graph][id];
    if(_filterSubject(state, subject, frame, flags)) {
      rval[id] = subject;
    }
  }
  return rval;
}

/**
 * Returns true if the given subject matches the given frame.
 *
 * Matches either based on explicit type inclusion where the node has any
 * type listed in the frame. If the frame has empty types defined matches
 * nodes not having a @type. If the frame has a type of {} defined matches
 * nodes having any type defined.
 *
 * Otherwise, does duck typing, where the node must have all of the
 * properties defined in the frame.
 *
 * @param state the current framing state.
 * @param subject the subject to check.
 * @param frame the frame to check.
 * @param flags the frame flags.
 *
 * @return true if the subject matches, false if not.
 */
function _filterSubject(state, subject, frame, flags) {
  // check ducktype
  let wildcard = true;
  let matchesSome = false;

  for(const key in frame) {
    let matchThis = false;
    const nodeValues = util.getValues(subject, key);
    const isEmpty = util.getValues(frame, key).length === 0;

    if(key === '@id') {
      // match on no @id or any matching @id, including wildcard
      if(types.isEmptyObject(frame['@id'][0] || {})) {
        matchThis = true;
      } else if(frame['@id'].length >= 0) {
        matchThis = frame['@id'].includes(nodeValues[0]);
      }
      if(!flags.requireAll) {
        return matchThis;
      }
    } else if(key === '@type') {
      // check @type (object value means 'any' type,
      // fall through to ducktyping)
      wildcard = false;
      if(isEmpty) {
        if(nodeValues.length > 0) {
          // don't match on no @type
          return false;
        }
        matchThis = true;
      } else if(frame['@type'].length === 1 &&
        types.isEmptyObject(frame['@type'][0])) {
        // match on wildcard @type if there is a type
        matchThis = nodeValues.length > 0;
      } else {
        // match on a specific @type
        for(const type of frame['@type']) {
          if(types.isObject(type) && '@default' in type) {
            // match on default object
            matchThis = true;
          } else {
            matchThis = matchThis || nodeValues.some(tt => tt === type);
          }
        }
      }
      if(!flags.requireAll) {
        return matchThis;
      }
    } else if(isKeyword$2(key)) {
      continue;
    } else {
      // Force a copy of this frame entry so it can be manipulated
      const thisFrame = util.getValues(frame, key)[0];
      let hasDefault = false;
      if(thisFrame) {
        _validateFrame([thisFrame]);
        hasDefault = '@default' in thisFrame;
      }

      // no longer a wildcard pattern if frame has any non-keyword properties
      wildcard = false;

      // skip, but allow match if node has no value for property, and frame has
      // a default value
      if(nodeValues.length === 0 && hasDefault) {
        continue;
      }

      // if frame value is empty, don't match if subject has any value
      if(nodeValues.length > 0 && isEmpty) {
        return false;
      }

      if(thisFrame === undefined) {
        // node does not match if values is not empty and the value of property
        // in frame is match none.
        if(nodeValues.length > 0) {
          return false;
        }
        matchThis = true;
      } else {
        if(graphTypes.isList(thisFrame)) {
          const listValue = thisFrame['@list'][0];
          if(graphTypes.isList(nodeValues[0])) {
            const nodeListValues = nodeValues[0]['@list'];

            if(graphTypes.isValue(listValue)) {
              // match on any matching value
              matchThis = nodeListValues.some(lv => _valueMatch(listValue, lv));
            } else if(graphTypes.isSubject(listValue) ||
              graphTypes.isSubjectReference(listValue)) {
              matchThis = nodeListValues.some(lv => _nodeMatch(
                state, listValue, lv, flags));
            }
          }
        } else if(graphTypes.isValue(thisFrame)) {
          matchThis = nodeValues.some(nv => _valueMatch(thisFrame, nv));
        } else if(graphTypes.isSubjectReference(thisFrame)) {
          matchThis =
            nodeValues.some(nv => _nodeMatch(state, thisFrame, nv, flags));
        } else if(types.isObject(thisFrame)) {
          matchThis = nodeValues.length > 0;
        } else {
          matchThis = false;
        }
      }
    }

    // all non-defaulted values must match if requireAll is set
    if(!matchThis && flags.requireAll) {
      return false;
    }

    matchesSome = matchesSome || matchThis;
  }

  // return true if wildcard or subject matches some properties
  return wildcard || matchesSome;
}

/**
 * Removes an existing embed.
 *
 * @param state the current framing state.
 * @param id the @id of the embed to remove.
 */
function _removeEmbed(state, id) {
  // get existing embed
  const embeds = state.uniqueEmbeds[state.graph];
  const embed = embeds[id];
  const parent = embed.parent;
  const property = embed.property;

  // create reference to replace embed
  const subject = {'@id': id};

  // remove existing embed
  if(types.isArray(parent)) {
    // replace subject with reference
    for(let i = 0; i < parent.length; ++i) {
      if(util.compareValues(parent[i], subject)) {
        parent[i] = subject;
        break;
      }
    }
  } else {
    // replace subject with reference
    const useArray = types.isArray(parent[property]);
    util.removeValue(parent, property, subject, {propertyIsArray: useArray});
    util.addValue(parent, property, subject, {propertyIsArray: useArray});
  }

  // recursively remove dependent dangling embeds
  const removeDependents = id => {
    // get embed keys as a separate array to enable deleting keys in map
    const ids = Object.keys(embeds);
    for(const next of ids) {
      if(next in embeds && types.isObject(embeds[next].parent) &&
        embeds[next].parent['@id'] === id) {
        delete embeds[next];
        removeDependents(next);
      }
    }
  };
  removeDependents(id);
}

/**
 * Removes the @preserve keywords from expanded result of framing.
 *
 * @param input the framed, framed output.
 * @param options the framing options used.
 *
 * @return the resulting output.
 */
function _cleanupPreserve(input, options) {
  // recurse through arrays
  if(types.isArray(input)) {
    return input.map(value => _cleanupPreserve(value, options));
  }

  if(types.isObject(input)) {
    // remove @preserve
    if('@preserve' in input) {
      return input['@preserve'][0];
    }

    // skip @values
    if(graphTypes.isValue(input)) {
      return input;
    }

    // recurse through @lists
    if(graphTypes.isList(input)) {
      input['@list'] = _cleanupPreserve(input['@list'], options);
      return input;
    }

    // handle in-memory linked nodes
    if('@id' in input) {
      const id = input['@id'];
      if(options.link.hasOwnProperty(id)) {
        const idx = options.link[id].indexOf(input);
        if(idx !== -1) {
          // already visited
          return options.link[id][idx];
        }
        // prevent circular visitation
        options.link[id].push(input);
      } else {
        // prevent circular visitation
        options.link[id] = [input];
      }
    }

    // recurse through properties
    for(const prop in input) {
      // potentially remove the id, if it is an unreference bnode
      if(prop === '@id' && options.bnodesToClear.includes(input[prop])) {
        delete input['@id'];
        continue;
      }

      input[prop] = _cleanupPreserve(input[prop], options);
    }
  }
  return input;
}

/**
 * Adds framing output to the given parent.
 *
 * @param parent the parent to add to.
 * @param property the parent property.
 * @param output the output to add.
 */
function _addFrameOutput(parent, property, output) {
  if(types.isObject(parent)) {
    util.addValue(parent, property, output, {propertyIsArray: true});
  } else {
    parent.push(output);
  }
}

/**
 * Node matches if it is a node, and matches the pattern as a frame.
 *
 * @param state the current framing state.
 * @param pattern used to match value
 * @param value to check
 * @param flags the frame flags.
 */
function _nodeMatch(state, pattern, value, flags) {
  if(!('@id' in value)) {
    return false;
  }
  const nodeObject = state.subjects[value['@id']];
  return nodeObject && _filterSubject(state, nodeObject, pattern, flags);
}

/**
 * Value matches if it is a value and matches the value pattern
 *
 * * `pattern` is empty
 * * @values are the same, or `pattern[@value]` is a wildcard, and
 * * @types are the same or `value[@type]` is not null
 *   and `pattern[@type]` is `{}`, or `value[@type]` is null
 *   and `pattern[@type]` is null or `[]`, and
 * * @languages are the same or `value[@language]` is not null
 *   and `pattern[@language]` is `{}`, or `value[@language]` is null
 *   and `pattern[@language]` is null or `[]`.
 *
 * @param pattern used to match value
 * @param value to check
 */
function _valueMatch(pattern, value) {
  const v1 = value['@value'];
  const t1 = value['@type'];
  const l1 = value['@language'];
  const v2 = pattern['@value'] ?
    (types.isArray(pattern['@value']) ?
      pattern['@value'] : [pattern['@value']]) :
    [];
  const t2 = pattern['@type'] ?
    (types.isArray(pattern['@type']) ?
      pattern['@type'] : [pattern['@type']]) :
    [];
  const l2 = pattern['@language'] ?
    (types.isArray(pattern['@language']) ?
      pattern['@language'] : [pattern['@language']]) :
    [];

  if(v2.length === 0 && t2.length === 0 && l2.length === 0) {
    return true;
  }
  if(!(v2.includes(v1) || types.isEmptyObject(v2[0]))) {
    return false;
  }
  if(!(!t1 && t2.length === 0 || t2.includes(t1) || t1 &&
    types.isEmptyObject(t2[0]))) {
    return false;
  }
  if(!(!l1 && l2.length === 0 || l2.includes(l1) || l1 &&
    types.isEmptyObject(l2[0]))) {
    return false;
  }
  return true;
}

const {
  isArray: _isArray$3,
  isObject: _isObject$3,
  isString: _isString$3,
  isUndefined: _isUndefined$2
} = types;

const {
  isList: _isList$1,
  isValue: _isValue$1,
  isGraph: _isGraph$1,
  isSimpleGraph: _isSimpleGraph,
  isSubjectReference: _isSubjectReference$1
} = graphTypes;

const {
  expandIri: _expandIri$2,
  getContextValue: _getContextValue$1,
  isKeyword: _isKeyword$1,
  process: _processContext$1,
  processingMode: _processingMode$1
} = context;

const {
  removeBase: _removeBase,
  prependBase: _prependBase
} = url;

const {
  addValue: _addValue$1,
  asArray: _asArray$3,
  compareShortestLeast: _compareShortestLeast$1
} = util;

const api$d = {};
var compact = api$d;

/**
 * Recursively compacts an element using the given active context. All values
 * must be in expanded form before this method is called.
 *
 * @param activeCtx the active context to use.
 * @param activeProperty the compacted property associated with the element
 *          to compact, null for none.
 * @param element the element to compact.
 * @param options the compaction options.
 * @param compactionMap the compaction map to use.
 *
 * @return a promise that resolves to the compacted value.
 */
api$d.compact = async ({
  activeCtx,
  activeProperty = null,
  element,
  options = {},
  compactionMap = () => undefined
}) => {
  // recursively compact array
  if(_isArray$3(element)) {
    let rval = [];
    for(let i = 0; i < element.length; ++i) {
      // compact, dropping any null values unless custom mapped
      let compacted = await api$d.compact({
        activeCtx,
        activeProperty,
        element: element[i],
        options,
        compactionMap
      });
      if(compacted === null) {
        compacted = await compactionMap({
          unmappedValue: element[i],
          activeCtx,
          activeProperty,
          parent: element,
          index: i,
          options
        });
        if(compacted === undefined) {
          continue;
        }
      }
      rval.push(compacted);
    }
    if(options.compactArrays && rval.length === 1) {
      // use single element if no container is specified
      const container = _getContextValue$1(
        activeCtx, activeProperty, '@container') || [];
      if(container.length === 0) {
        rval = rval[0];
      }
    }
    return rval;
  }

  // use any scoped context on activeProperty
  const ctx = _getContextValue$1(activeCtx, activeProperty, '@context');
  if(!_isUndefined$2(ctx)) {
    activeCtx = await _processContext$1({
      activeCtx,
      localCtx: ctx,
      propagate: true,
      overrideProtected: true,
      options
    });
  }

  // recursively compact object
  if(_isObject$3(element)) {
    if(options.link && '@id' in element &&
      options.link.hasOwnProperty(element['@id'])) {
      // check for a linked element to reuse
      const linked = options.link[element['@id']];
      for(let i = 0; i < linked.length; ++i) {
        if(linked[i].expanded === element) {
          return linked[i].compacted;
        }
      }
    }

    // do value compaction on @values and subject references
    if(_isValue$1(element) || _isSubjectReference$1(element)) {
      const rval =
        api$d.compactValue({activeCtx, activeProperty, value: element, options});
      if(options.link && _isSubjectReference$1(element)) {
        // store linked element
        if(!(options.link.hasOwnProperty(element['@id']))) {
          options.link[element['@id']] = [];
        }
        options.link[element['@id']].push({expanded: element, compacted: rval});
      }
      return rval;
    }

    // if expanded property is @list and we're contained within a list
    // container, recursively compact this item to an array
    if(_isList$1(element)) {
      const container = _getContextValue$1(
        activeCtx, activeProperty, '@container') || [];
      if(container.includes('@list')) {
        return api$d.compact({
          activeCtx,
          activeProperty,
          element: element['@list'],
          options,
          compactionMap
        });
      }
    }

    // FIXME: avoid misuse of active property as an expanded property?
    const insideReverse = (activeProperty === '@reverse');

    const rval = {};

    // original context before applying property-scoped and local contexts
    const inputCtx = activeCtx;

    // revert to previous context, if there is one,
    // and element is not a value object or a node reference
    if(!_isValue$1(element) && !_isSubjectReference$1(element)) {
      activeCtx = activeCtx.revertToPreviousContext();
    }

    // apply property-scoped context after reverting term-scoped context
    const propertyScopedCtx =
      _getContextValue$1(inputCtx, activeProperty, '@context');
    if(!_isUndefined$2(propertyScopedCtx)) {
      activeCtx = await _processContext$1({
        activeCtx,
        localCtx: propertyScopedCtx,
        propagate: true,
        overrideProtected: true,
        options
      });
    }

    if(options.link && '@id' in element) {
      // store linked element
      if(!options.link.hasOwnProperty(element['@id'])) {
        options.link[element['@id']] = [];
      }
      options.link[element['@id']].push({expanded: element, compacted: rval});
    }

    // apply any context defined on an alias of @type
    // if key is @type and any compacted value is a term having a local
    // context, overlay that context
    let types = element['@type'] || [];
    if(types.length > 1) {
      types = Array.from(types).sort();
    }
    // find all type-scoped contexts based on current context, prior to
    // updating it
    const typeContext = activeCtx;
    for(const type of types) {
      const compactedType = api$d.compactIri(
        {activeCtx: typeContext, iri: type, relativeTo: {vocab: true}});

      // Use any type-scoped context defined on this value
      const ctx = _getContextValue$1(inputCtx, compactedType, '@context');
      if(!_isUndefined$2(ctx)) {
        activeCtx = await _processContext$1({
          activeCtx,
          localCtx: ctx,
          options,
          propagate: false
        });
      }
    }

    // process element keys in order
    const keys = Object.keys(element).sort();
    for(const expandedProperty of keys) {
      const expandedValue = element[expandedProperty];

      // compact @id
      if(expandedProperty === '@id') {
        let compactedValue = _asArray$3(expandedValue).map(
          expandedIri => api$d.compactIri({
            activeCtx,
            iri: expandedIri,
            relativeTo: {vocab: false},
            base: options.base
          }));
        if(compactedValue.length === 1) {
          compactedValue = compactedValue[0];
        }

        // use keyword alias and add value
        const alias = api$d.compactIri(
          {activeCtx, iri: '@id', relativeTo: {vocab: true}});

        rval[alias] = compactedValue;
        continue;
      }

      // compact @type(s)
      if(expandedProperty === '@type') {
        // resolve type values against previous context
        let compactedValue = _asArray$3(expandedValue).map(
          expandedIri => api$d.compactIri({
            activeCtx: inputCtx,
            iri: expandedIri,
            relativeTo: {vocab: true}
          }));
        if(compactedValue.length === 1) {
          compactedValue = compactedValue[0];
        }

        // use keyword alias and add value
        const alias = api$d.compactIri(
          {activeCtx, iri: '@type', relativeTo: {vocab: true}});
        const container = _getContextValue$1(
          activeCtx, alias, '@container') || [];

        // treat as array for @type if @container includes @set
        const typeAsSet =
          container.includes('@set') &&
          _processingMode$1(activeCtx, 1.1);
        const isArray =
          typeAsSet || (_isArray$3(compactedValue) && expandedValue.length === 0);
        _addValue$1(rval, alias, compactedValue, {propertyIsArray: isArray});
        continue;
      }

      // handle @reverse
      if(expandedProperty === '@reverse') {
        // recursively compact expanded value
        const compactedValue = await api$d.compact({
          activeCtx,
          activeProperty: '@reverse',
          element: expandedValue,
          options,
          compactionMap
        });

        // handle double-reversed properties
        for(const compactedProperty in compactedValue) {
          if(activeCtx.mappings.has(compactedProperty) &&
            activeCtx.mappings.get(compactedProperty).reverse) {
            const value = compactedValue[compactedProperty];
            const container = _getContextValue$1(
              activeCtx, compactedProperty, '@container') || [];
            const useArray = (
              container.includes('@set') || !options.compactArrays);
            _addValue$1(
              rval, compactedProperty, value, {propertyIsArray: useArray});
            delete compactedValue[compactedProperty];
          }
        }

        if(Object.keys(compactedValue).length > 0) {
          // use keyword alias and add value
          const alias = api$d.compactIri({
            activeCtx,
            iri: expandedProperty,
            relativeTo: {vocab: true}
          });
          _addValue$1(rval, alias, compactedValue);
        }

        continue;
      }

      if(expandedProperty === '@preserve') {
        // compact using activeProperty
        const compactedValue = await api$d.compact({
          activeCtx,
          activeProperty,
          element: expandedValue,
          options,
          compactionMap
        });

        if(!(_isArray$3(compactedValue) && compactedValue.length === 0)) {
          _addValue$1(rval, expandedProperty, compactedValue);
        }
        continue;
      }

      // handle @index property
      if(expandedProperty === '@index') {
        // drop @index if inside an @index container
        const container = _getContextValue$1(
          activeCtx, activeProperty, '@container') || [];
        if(container.includes('@index')) {
          continue;
        }

        // use keyword alias and add value
        const alias = api$d.compactIri({
          activeCtx,
          iri: expandedProperty,
          relativeTo: {vocab: true}
        });
        _addValue$1(rval, alias, expandedValue);
        continue;
      }

      // skip array processing for keywords that aren't
      // @graph, @list, or @included
      if(expandedProperty !== '@graph' && expandedProperty !== '@list' &&
        expandedProperty !== '@included' &&
        _isKeyword$1(expandedProperty)) {
        // use keyword alias and add value as is
        const alias = api$d.compactIri({
          activeCtx,
          iri: expandedProperty,
          relativeTo: {vocab: true}
        });
        _addValue$1(rval, alias, expandedValue);
        continue;
      }

      // Note: expanded value must be an array due to expansion algorithm.
      if(!_isArray$3(expandedValue)) {
        throw new JsonLdError_1(
          'JSON-LD expansion error; expanded value must be an array.',
          'jsonld.SyntaxError');
      }

      // preserve empty arrays
      if(expandedValue.length === 0) {
        const itemActiveProperty = api$d.compactIri({
          activeCtx,
          iri: expandedProperty,
          value: expandedValue,
          relativeTo: {vocab: true},
          reverse: insideReverse
        });
        const nestProperty = activeCtx.mappings.has(itemActiveProperty) ?
          activeCtx.mappings.get(itemActiveProperty)['@nest'] : null;
        let nestResult = rval;
        if(nestProperty) {
          _checkNestProperty(activeCtx, nestProperty, options);
          if(!_isObject$3(rval[nestProperty])) {
            rval[nestProperty] = {};
          }
          nestResult = rval[nestProperty];
        }
        _addValue$1(
          nestResult, itemActiveProperty, expandedValue, {
            propertyIsArray: true
          });
      }

      // recusively process array values
      for(const expandedItem of expandedValue) {
        // compact property and get container type
        const itemActiveProperty = api$d.compactIri({
          activeCtx,
          iri: expandedProperty,
          value: expandedItem,
          relativeTo: {vocab: true},
          reverse: insideReverse
        });

        // if itemActiveProperty is a @nest property, add values to nestResult,
        // otherwise rval
        const nestProperty = activeCtx.mappings.has(itemActiveProperty) ?
          activeCtx.mappings.get(itemActiveProperty)['@nest'] : null;
        let nestResult = rval;
        if(nestProperty) {
          _checkNestProperty(activeCtx, nestProperty, options);
          if(!_isObject$3(rval[nestProperty])) {
            rval[nestProperty] = {};
          }
          nestResult = rval[nestProperty];
        }

        const container = _getContextValue$1(
          activeCtx, itemActiveProperty, '@container') || [];

        // get simple @graph or @list value if appropriate
        const isGraph = _isGraph$1(expandedItem);
        const isList = _isList$1(expandedItem);
        let inner;
        if(isList) {
          inner = expandedItem['@list'];
        } else if(isGraph) {
          inner = expandedItem['@graph'];
        }

        // recursively compact expanded item
        let compactedItem = await api$d.compact({
          activeCtx,
          activeProperty: itemActiveProperty,
          element: (isList || isGraph) ? inner : expandedItem,
          options,
          compactionMap
        });

        // handle @list
        if(isList) {
          // ensure @list value is an array
          if(!_isArray$3(compactedItem)) {
            compactedItem = [compactedItem];
          }

          if(!container.includes('@list')) {
            // wrap using @list alias
            compactedItem = {
              [api$d.compactIri({
                activeCtx,
                iri: '@list',
                relativeTo: {vocab: true}
              })]: compactedItem
            };

            // include @index from expanded @list, if any
            if('@index' in expandedItem) {
              compactedItem[api$d.compactIri({
                activeCtx,
                iri: '@index',
                relativeTo: {vocab: true}
              })] = expandedItem['@index'];
            }
          } else {
            _addValue$1(nestResult, itemActiveProperty, compactedItem, {
              valueIsArray: true,
              allowDuplicate: true
            });
            continue;
          }
        }

        // Graph object compaction cases
        if(isGraph) {
          if(container.includes('@graph') && (container.includes('@id') ||
            container.includes('@index') && _isSimpleGraph(expandedItem))) {
            // get or create the map object
            let mapObject;
            if(nestResult.hasOwnProperty(itemActiveProperty)) {
              mapObject = nestResult[itemActiveProperty];
            } else {
              nestResult[itemActiveProperty] = mapObject = {};
            }

            // index on @id or @index or alias of @none
            const key = (container.includes('@id') ?
              expandedItem['@id'] : expandedItem['@index']) ||
              api$d.compactIri({activeCtx, iri: '@none',
                relativeTo: {vocab: true}});
            // add compactedItem to map, using value of `@id` or a new blank
            // node identifier

            _addValue$1(
              mapObject, key, compactedItem, {
                propertyIsArray:
                  (!options.compactArrays || container.includes('@set'))
              });
          } else if(container.includes('@graph') &&
            _isSimpleGraph(expandedItem)) {
            // container includes @graph but not @id or @index and value is a
            // simple graph object add compact value
            // if compactedItem contains multiple values, it is wrapped in
            // `@included`
            if(_isArray$3(compactedItem) && compactedItem.length > 1) {
              compactedItem = {'@included': compactedItem};
            }
            _addValue$1(
              nestResult, itemActiveProperty, compactedItem, {
                propertyIsArray:
                  (!options.compactArrays || container.includes('@set'))
              });
          } else {
            // wrap using @graph alias, remove array if only one item and
            // compactArrays not set
            if(_isArray$3(compactedItem) && compactedItem.length === 1 &&
              options.compactArrays) {
              compactedItem = compactedItem[0];
            }
            compactedItem = {
              [api$d.compactIri({
                activeCtx,
                iri: '@graph',
                relativeTo: {vocab: true}
              })]: compactedItem
            };

            // include @id from expanded graph, if any
            if('@id' in expandedItem) {
              compactedItem[api$d.compactIri({
                activeCtx,
                iri: '@id',
                relativeTo: {vocab: true}
              })] = expandedItem['@id'];
            }

            // include @index from expanded graph, if any
            if('@index' in expandedItem) {
              compactedItem[api$d.compactIri({
                activeCtx,
                iri: '@index',
                relativeTo: {vocab: true}
              })] = expandedItem['@index'];
            }
            _addValue$1(
              nestResult, itemActiveProperty, compactedItem, {
                propertyIsArray:
                  (!options.compactArrays || container.includes('@set'))
              });
          }
        } else if(container.includes('@language') ||
          container.includes('@index') || container.includes('@id') ||
          container.includes('@type')) {
          // handle language and index maps
          // get or create the map object
          let mapObject;
          if(nestResult.hasOwnProperty(itemActiveProperty)) {
            mapObject = nestResult[itemActiveProperty];
          } else {
            nestResult[itemActiveProperty] = mapObject = {};
          }

          let key;
          if(container.includes('@language')) {
          // if container is a language map, simplify compacted value to
          // a simple string
            if(_isValue$1(compactedItem)) {
              compactedItem = compactedItem['@value'];
            }
            key = expandedItem['@language'];
          } else if(container.includes('@index')) {
            const indexKey = _getContextValue$1(
              activeCtx, itemActiveProperty, '@index') || '@index';
            const containerKey = api$d.compactIri(
              {activeCtx, iri: indexKey, relativeTo: {vocab: true}});
            if(indexKey === '@index') {
              key = expandedItem['@index'];
              delete compactedItem[containerKey];
            } else {
              let others;
              [key, ...others] = _asArray$3(compactedItem[indexKey] || []);
              if(!_isString$3(key)) {
                // Will use @none if it isn't a string.
                key = null;
              } else {
                switch(others.length) {
                  case 0:
                    delete compactedItem[indexKey];
                    break;
                  case 1:
                    compactedItem[indexKey] = others[0];
                    break;
                  default:
                    compactedItem[indexKey] = others;
                    break;
                }
              }
            }
          } else if(container.includes('@id')) {
            const idKey = api$d.compactIri({activeCtx, iri: '@id',
              relativeTo: {vocab: true}});
            key = compactedItem[idKey];
            delete compactedItem[idKey];
          } else if(container.includes('@type')) {
            const typeKey = api$d.compactIri({
              activeCtx,
              iri: '@type',
              relativeTo: {vocab: true}
            });
            let types;
            [key, ...types] = _asArray$3(compactedItem[typeKey] || []);
            switch(types.length) {
              case 0:
                delete compactedItem[typeKey];
                break;
              case 1:
                compactedItem[typeKey] = types[0];
                break;
              default:
                compactedItem[typeKey] = types;
                break;
            }

            // If compactedItem contains a single entry
            // whose key maps to @id, recompact without @type
            if(Object.keys(compactedItem).length === 1 &&
              '@id' in expandedItem) {
              compactedItem = await api$d.compact({
                activeCtx,
                activeProperty: itemActiveProperty,
                element: {'@id': expandedItem['@id']},
                options,
                compactionMap
              });
            }
          }

          // if compacting this value which has no key, index on @none
          if(!key) {
            key = api$d.compactIri({activeCtx, iri: '@none',
              relativeTo: {vocab: true}});
          }
          // add compact value to map object using key from expanded value
          // based on the container type
          _addValue$1(
            mapObject, key, compactedItem, {
              propertyIsArray: container.includes('@set')
            });
        } else {
          // use an array if: compactArrays flag is false,
          // @container is @set or @list , value is an empty
          // array, or key is @graph
          const isArray = (!options.compactArrays ||
            container.includes('@set') || container.includes('@list') ||
            (_isArray$3(compactedItem) && compactedItem.length === 0) ||
            expandedProperty === '@list' || expandedProperty === '@graph');

          // add compact value
          _addValue$1(
            nestResult, itemActiveProperty, compactedItem,
            {propertyIsArray: isArray});
        }
      }
    }

    return rval;
  }

  // only primitives remain which are already compact
  return element;
};

/**
 * Compacts an IRI or keyword into a term or prefix if it can be. If the
 * IRI has an associated value it may be passed.
 *
 * @param activeCtx the active context to use.
 * @param iri the IRI to compact.
 * @param value the value to check or null.
 * @param relativeTo options for how to compact IRIs:
 *          vocab: true to split after @vocab, false not to.
 * @param reverse true if a reverse property is being compacted, false if not.
 * @param base the absolute URL to use for compacting document-relative IRIs.
 *
 * @return the compacted term, prefix, keyword alias, or the original IRI.
 */
api$d.compactIri = ({
  activeCtx,
  iri,
  value = null,
  relativeTo = {vocab: false},
  reverse = false,
  base = null
}) => {
  // can't compact null
  if(iri === null) {
    return iri;
  }

  // if context is from a property term scoped context composed with a
  // type-scoped context, then use the previous context instead
  if(activeCtx.isPropertyTermScoped && activeCtx.previousContext) {
    activeCtx = activeCtx.previousContext;
  }

  const inverseCtx = activeCtx.getInverse();

  // if term is a keyword, it may be compacted to a simple alias
  if(_isKeyword$1(iri) &&
    iri in inverseCtx &&
    '@none' in inverseCtx[iri] &&
    '@type' in inverseCtx[iri]['@none'] &&
    '@none' in inverseCtx[iri]['@none']['@type']) {
    return inverseCtx[iri]['@none']['@type']['@none'];
  }

  // use inverse context to pick a term if iri is relative to vocab
  if(relativeTo.vocab && iri in inverseCtx) {
    const defaultLanguage = activeCtx['@language'] || '@none';

    // prefer @index if available in value
    const containers = [];
    if(_isObject$3(value) && '@index' in value && !('@graph' in value)) {
      containers.push('@index', '@index@set');
    }

    // if value is a preserve object, use its value
    if(_isObject$3(value) && '@preserve' in value) {
      value = value['@preserve'][0];
    }

    // prefer most specific container including @graph, prefering @set
    // variations
    if(_isGraph$1(value)) {
      // favor indexmap if the graph is indexed
      if('@index' in value) {
        containers.push(
          '@graph@index', '@graph@index@set', '@index', '@index@set');
      }
      // favor idmap if the graph is has an @id
      if('@id' in value) {
        containers.push(
          '@graph@id', '@graph@id@set');
      }
      containers.push('@graph', '@graph@set', '@set');
      // allow indexmap if the graph is not indexed
      if(!('@index' in value)) {
        containers.push(
          '@graph@index', '@graph@index@set', '@index', '@index@set');
      }
      // allow idmap if the graph does not have an @id
      if(!('@id' in value)) {
        containers.push('@graph@id', '@graph@id@set');
      }
    } else if(_isObject$3(value) && !_isValue$1(value)) {
      containers.push('@id', '@id@set', '@type', '@set@type');
    }

    // defaults for term selection based on type/language
    let typeOrLanguage = '@language';
    let typeOrLanguageValue = '@null';

    if(reverse) {
      typeOrLanguage = '@type';
      typeOrLanguageValue = '@reverse';
      containers.push('@set');
    } else if(_isList$1(value)) {
      // choose the most specific term that works for all elements in @list
      // only select @list containers if @index is NOT in value
      if(!('@index' in value)) {
        containers.push('@list');
      }
      const list = value['@list'];
      if(list.length === 0) {
        // any empty list can be matched against any term that uses the
        // @list container regardless of @type or @language
        typeOrLanguage = '@any';
        typeOrLanguageValue = '@none';
      } else {
        let commonLanguage = (list.length === 0) ? defaultLanguage : null;
        let commonType = null;
        for(let i = 0; i < list.length; ++i) {
          const item = list[i];
          let itemLanguage = '@none';
          let itemType = '@none';
          if(_isValue$1(item)) {
            if('@direction' in item) {
              const lang = (item['@language'] || '').toLowerCase();
              const dir = item['@direction'];
              itemLanguage = `${lang}_${dir}`;
            } else if('@language' in item) {
              itemLanguage = item['@language'].toLowerCase();
            } else if('@type' in item) {
              itemType = item['@type'];
            } else {
              // plain literal
              itemLanguage = '@null';
            }
          } else {
            itemType = '@id';
          }
          if(commonLanguage === null) {
            commonLanguage = itemLanguage;
          } else if(itemLanguage !== commonLanguage && _isValue$1(item)) {
            commonLanguage = '@none';
          }
          if(commonType === null) {
            commonType = itemType;
          } else if(itemType !== commonType) {
            commonType = '@none';
          }
          // there are different languages and types in the list, so choose
          // the most generic term, no need to keep iterating the list
          if(commonLanguage === '@none' && commonType === '@none') {
            break;
          }
        }
        commonLanguage = commonLanguage || '@none';
        commonType = commonType || '@none';
        if(commonType !== '@none') {
          typeOrLanguage = '@type';
          typeOrLanguageValue = commonType;
        } else {
          typeOrLanguageValue = commonLanguage;
        }
      }
    } else {
      if(_isValue$1(value)) {
        if('@language' in value && !('@index' in value)) {
          containers.push('@language', '@language@set');
          typeOrLanguageValue = value['@language'];
          const dir = value['@direction'];
          if(dir) {
            typeOrLanguageValue = `${typeOrLanguageValue}_${dir}`;
          }
        } else if('@direction' in value && !('@index' in value)) {
          typeOrLanguageValue = `_${value['@direction']}`;
        } else if('@type' in value) {
          typeOrLanguage = '@type';
          typeOrLanguageValue = value['@type'];
        }
      } else {
        typeOrLanguage = '@type';
        typeOrLanguageValue = '@id';
      }
      containers.push('@set');
    }

    // do term selection
    containers.push('@none');

    // an index map can be used to index values using @none, so add as a low
    // priority
    if(_isObject$3(value) && !('@index' in value)) {
      // allow indexing even if no @index present
      containers.push('@index', '@index@set');
    }

    // values without type or language can use @language map
    if(_isValue$1(value) && Object.keys(value).length === 1) {
      // allow indexing even if no @index present
      containers.push('@language', '@language@set');
    }

    const term = _selectTerm(
      activeCtx, iri, value, containers, typeOrLanguage, typeOrLanguageValue);
    if(term !== null) {
      return term;
    }
  }

  // no term match, use @vocab if available
  if(relativeTo.vocab) {
    if('@vocab' in activeCtx) {
      // determine if vocab is a prefix of the iri
      const vocab = activeCtx['@vocab'];
      if(iri.indexOf(vocab) === 0 && iri !== vocab) {
        // use suffix as relative iri if it is not a term in the active context
        const suffix = iri.substr(vocab.length);
        if(!activeCtx.mappings.has(suffix)) {
          return suffix;
        }
      }
    }
  }

  // no term or @vocab match, check for possible CURIEs
  let choice = null;
  // TODO: make FastCurieMap a class with a method to do this lookup
  const partialMatches = [];
  let iriMap = activeCtx.fastCurieMap;
  // check for partial matches of against `iri`, which means look until
  // iri.length - 1, not full length
  const maxPartialLength = iri.length - 1;
  for(let i = 0; i < maxPartialLength && iri[i] in iriMap; ++i) {
    iriMap = iriMap[iri[i]];
    if('' in iriMap) {
      partialMatches.push(iriMap[''][0]);
    }
  }
  // check partial matches in reverse order to prefer longest ones first
  for(let i = partialMatches.length - 1; i >= 0; --i) {
    const entry = partialMatches[i];
    const terms = entry.terms;
    for(const term of terms) {
      // a CURIE is usable if:
      // 1. it has no mapping, OR
      // 2. value is null, which means we're not compacting an @value, AND
      //   the mapping matches the IRI
      const curie = term + ':' + iri.substr(entry.iri.length);
      const isUsableCurie = (activeCtx.mappings.get(term)._prefix &&
        (!activeCtx.mappings.has(curie) ||
        (value === null && activeCtx.mappings.get(curie)['@id'] === iri)));

      // select curie if it is shorter or the same length but lexicographically
      // less than the current choice
      if(isUsableCurie && (choice === null ||
        _compareShortestLeast$1(curie, choice) < 0)) {
        choice = curie;
      }
    }
  }

  // return chosen curie
  if(choice !== null) {
    return choice;
  }

  // If iri could be confused with a compact IRI using a term in this context,
  // signal an error
  for(const [term, td] of activeCtx.mappings) {
    if(td && td._prefix && iri.startsWith(term + ':')) {
      throw new JsonLdError_1(
        `Absolute IRI "${iri}" confused with prefix "${term}".`,
        'jsonld.SyntaxError',
        {code: 'IRI confused with prefix', context: activeCtx});
    }
  }

  // compact IRI relative to base
  if(!relativeTo.vocab) {
    if('@base' in activeCtx) {
      if(!activeCtx['@base']) {
        // The None case preserves rval as potentially relative
        return iri;
      } else {
        return _removeBase(_prependBase(base, activeCtx['@base']), iri);
      }
    } else {
      return _removeBase(base, iri);
    }
  }

  // return IRI as is
  return iri;
};

/**
 * Performs value compaction on an object with '@value' or '@id' as the only
 * property.
 *
 * @param activeCtx the active context.
 * @param activeProperty the active property that points to the value.
 * @param value the value to compact.
 * @param {Object} [options] - processing options.
 *
 * @return the compaction result.
 */
api$d.compactValue = ({activeCtx, activeProperty, value, options}) => {
  // value is a @value
  if(_isValue$1(value)) {
    // get context rules
    const type = _getContextValue$1(activeCtx, activeProperty, '@type');
    const language = _getContextValue$1(activeCtx, activeProperty, '@language');
    const direction = _getContextValue$1(activeCtx, activeProperty, '@direction');
    const container =
      _getContextValue$1(activeCtx, activeProperty, '@container') || [];

    // whether or not the value has an @index that must be preserved
    const preserveIndex = '@index' in value && !container.includes('@index');

    // if there's no @index to preserve ...
    if(!preserveIndex && type !== '@none') {
      // matching @type or @language specified in context, compact value
      if(value['@type'] === type) {
        return value['@value'];
      }
      if('@language' in value && value['@language'] === language &&
         '@direction' in value && value['@direction'] === direction) {
        return value['@value'];
      }
      if('@language' in value && value['@language'] === language) {
        return value['@value'];
      }
      if('@direction' in value && value['@direction'] === direction) {
        return value['@value'];
      }
    }

    // return just the value of @value if all are true:
    // 1. @value is the only key or @index isn't being preserved
    // 2. there is no default language or @value is not a string or
    //   the key has a mapping with a null @language
    const keyCount = Object.keys(value).length;
    const isValueOnlyKey = (keyCount === 1 ||
      (keyCount === 2 && '@index' in value && !preserveIndex));
    const hasDefaultLanguage = ('@language' in activeCtx);
    const isValueString = _isString$3(value['@value']);
    const hasNullMapping = (activeCtx.mappings.has(activeProperty) &&
      activeCtx.mappings.get(activeProperty)['@language'] === null);
    if(isValueOnlyKey &&
      type !== '@none' &&
      (!hasDefaultLanguage || !isValueString || hasNullMapping)) {
      return value['@value'];
    }

    const rval = {};

    // preserve @index
    if(preserveIndex) {
      rval[api$d.compactIri({
        activeCtx,
        iri: '@index',
        relativeTo: {vocab: true}
      })] = value['@index'];
    }

    if('@type' in value) {
      // compact @type IRI
      rval[api$d.compactIri({
        activeCtx,
        iri: '@type',
        relativeTo: {vocab: true}
      })] = api$d.compactIri(
        {activeCtx, iri: value['@type'], relativeTo: {vocab: true}});
    } else if('@language' in value) {
      // alias @language
      rval[api$d.compactIri({
        activeCtx,
        iri: '@language',
        relativeTo: {vocab: true}
      })] = value['@language'];
    }

    if('@direction' in value) {
      // alias @direction
      rval[api$d.compactIri({
        activeCtx,
        iri: '@direction',
        relativeTo: {vocab: true}
      })] = value['@direction'];
    }

    // alias @value
    rval[api$d.compactIri({
      activeCtx,
      iri: '@value',
      relativeTo: {vocab: true}
    })] = value['@value'];

    return rval;
  }

  // value is a subject reference
  const expandedProperty = _expandIri$2(activeCtx, activeProperty, {vocab: true},
    options);
  const type = _getContextValue$1(activeCtx, activeProperty, '@type');
  const compacted = api$d.compactIri({
    activeCtx,
    iri: value['@id'],
    relativeTo: {vocab: type === '@vocab'},
    base: options.base});

  // compact to scalar
  if(type === '@id' || type === '@vocab' || expandedProperty === '@graph') {
    return compacted;
  }

  return {
    [api$d.compactIri({
      activeCtx,
      iri: '@id',
      relativeTo: {vocab: true}
    })]: compacted
  };
};

/**
 * Picks the preferred compaction term from the given inverse context entry.
 *
 * @param activeCtx the active context.
 * @param iri the IRI to pick the term for.
 * @param value the value to pick the term for.
 * @param containers the preferred containers.
 * @param typeOrLanguage either '@type' or '@language'.
 * @param typeOrLanguageValue the preferred value for '@type' or '@language'.
 *
 * @return the preferred term.
 */
function _selectTerm(
  activeCtx, iri, value, containers, typeOrLanguage, typeOrLanguageValue) {
  if(typeOrLanguageValue === null) {
    typeOrLanguageValue = '@null';
  }

  // preferences for the value of @type or @language
  const prefs = [];

  // determine prefs for @id based on whether or not value compacts to a term
  if((typeOrLanguageValue === '@id' || typeOrLanguageValue === '@reverse') &&
    _isObject$3(value) && '@id' in value) {
    // prefer @reverse first
    if(typeOrLanguageValue === '@reverse') {
      prefs.push('@reverse');
    }
    // try to compact value to a term
    const term = api$d.compactIri(
      {activeCtx, iri: value['@id'], relativeTo: {vocab: true}});
    if(activeCtx.mappings.has(term) &&
      activeCtx.mappings.get(term) &&
      activeCtx.mappings.get(term)['@id'] === value['@id']) {
      // prefer @vocab
      prefs.push.apply(prefs, ['@vocab', '@id']);
    } else {
      // prefer @id
      prefs.push.apply(prefs, ['@id', '@vocab']);
    }
  } else {
    prefs.push(typeOrLanguageValue);

    // consider direction only
    const langDir = prefs.find(el => el.includes('_'));
    if(langDir) {
      // consider _dir portion
      prefs.push(langDir.replace(/^[^_]+_/, '_'));
    }
  }
  prefs.push('@none');

  const containerMap = activeCtx.inverse[iri];
  for(const container of containers) {
    // if container not available in the map, continue
    if(!(container in containerMap)) {
      continue;
    }

    const typeOrLanguageValueMap = containerMap[container][typeOrLanguage];
    for(const pref of prefs) {
      // if type/language option not available in the map, continue
      if(!(pref in typeOrLanguageValueMap)) {
        continue;
      }

      // select term
      return typeOrLanguageValueMap[pref];
    }
  }

  return null;
}

/**
 * The value of `@nest` in the term definition must either be `@nest`, or a term
 * which resolves to `@nest`.
 *
 * @param activeCtx the active context.
 * @param nestProperty a term in the active context or `@nest`.
 * @param {Object} [options] - processing options.
 */
function _checkNestProperty(activeCtx, nestProperty, options) {
  if(_expandIri$2(activeCtx, nestProperty, {vocab: true}, options) !== '@nest') {
    throw new JsonLdError_1(
      'JSON-LD compact error; nested property must have an @nest value ' +
      'resolving to @nest.',
      'jsonld.SyntaxError', {code: 'invalid @nest value'});
  }
}

/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

var JsonLdProcessor = jsonld => {
  class JsonLdProcessor {
    toString() {
      return '[object JsonLdProcessor]';
    }
  }
  Object.defineProperty(JsonLdProcessor, 'prototype', {
    writable: false,
    enumerable: false
  });
  Object.defineProperty(JsonLdProcessor.prototype, 'constructor', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: JsonLdProcessor
  });

  // The Web IDL test harness will check the number of parameters defined in
  // the functions below. The number of parameters must exactly match the
  // required (non-optional) parameters of the JsonLdProcessor interface as
  // defined here:
  // https://www.w3.org/TR/json-ld-api/#the-jsonldprocessor-interface

  JsonLdProcessor.compact = function(input, ctx) {
    if(arguments.length < 2) {
      return Promise.reject(
        new TypeError('Could not compact, too few arguments.'));
    }
    return jsonld.compact(input, ctx);
  };
  JsonLdProcessor.expand = function(input) {
    if(arguments.length < 1) {
      return Promise.reject(
        new TypeError('Could not expand, too few arguments.'));
    }
    return jsonld.expand(input);
  };
  JsonLdProcessor.flatten = function(input) {
    if(arguments.length < 1) {
      return Promise.reject(
        new TypeError('Could not flatten, too few arguments.'));
    }
    return jsonld.flatten(input);
  };

  return JsonLdProcessor;
};

/**
 * A JavaScript implementation of the JSON-LD API.
 *
 * @author Dave Longley
 *
 * @license BSD 3-Clause License
 * Copyright (c) 2011-2019 Digital Bazaar, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the Digital Bazaar, Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */




const IdentifierIssuer$1 = util.IdentifierIssuer;




const {expand: _expand} = expand;
const {flatten: _flatten} = flatten;
const {fromRDF: _fromRDF} = fromRdf;
const {toRDF: _toRDF} = toRdf;

const {
  frameMergedOrDefault: _frameMergedOrDefault,
  cleanupNull: _cleanupNull
} = frame;

const {
  isArray: _isArray$4,
  isObject: _isObject$4,
  isString: _isString$4
} = types;

const {
  isSubjectReference: _isSubjectReference$2,
} = graphTypes;

const {
  expandIri: _expandIri$3,
  getInitialContext: _getInitialContext,
  process: _processContext$2,
  processingMode: _processingMode$2
} = context;

const {
  compact: _compact,
  compactIri: _compactIri
} = compact;

const {
  createNodeMap: _createNodeMap$1,
  createMergedNodeMap: _createMergedNodeMap$1,
  mergeNodeMaps: _mergeNodeMaps
} = nodeMap;

/* eslint-disable indent */
// attaches jsonld API to the given object
const wrapper = function(jsonld) {

/** Registered RDF dataset parsers hashed by content-type. */
const _rdfParsers = {};

// resolved context cache
// TODO: consider basing max on context size rather than number
const RESOLVED_CONTEXT_CACHE_MAX_SIZE = 100;
const _resolvedContextCache = new lruCache({max: RESOLVED_CONTEXT_CACHE_MAX_SIZE});

/* Core API */

/**
 * Performs JSON-LD compaction.
 *
 * @param input the JSON-LD input to compact.
 * @param ctx the context to compact with.
 * @param [options] options to use:
 *          [base] the base IRI to use.
 *          [compactArrays] true to compact arrays to single values when
 *            appropriate, false not to (default: true).
 *          [compactToRelative] true to compact IRIs to be relative to document
 *            base, false to keep absolute (default: true)
 *          [graph] true to always output a top-level graph (default: false).
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false.
 *          [documentLoader(url, options)] the document loader.
 *          [expansionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 *          [framing] true if compaction is occuring during a framing operation.
 *          [compactionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the compacted output.
 */
jsonld.compact = async function(input, ctx, options) {
  if(arguments.length < 2) {
    throw new TypeError('Could not compact, too few arguments.');
  }

  if(ctx === null) {
    throw new JsonLdError_1(
      'The compaction context must not be null.',
      'jsonld.CompactError', {code: 'invalid local context'});
  }

  // nothing to compact
  if(input === null) {
    return null;
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    compactArrays: true,
    compactToRelative: true,
    graph: false,
    skipExpansion: false,
    link: false,
    issuer: new IdentifierIssuer$1('_:b'),
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });
  if(options.link) {
    // force skip expansion when linking, "link" is not part of the public
    // API, it should only be called from framing
    options.skipExpansion = true;
  }
  if(!options.compactToRelative) {
    delete options.base;
  }

  // expand input
  let expanded;
  if(options.skipExpansion) {
    expanded = input;
  } else {
    expanded = await jsonld.expand(input, options);
  }

  // process context
  const activeCtx = await jsonld.processContext(
    _getInitialContext(options), ctx, options);

  // do compaction
  let compacted = await _compact({
    activeCtx,
    element: expanded,
    options,
    compactionMap: options.compactionMap
  });

  // perform clean up
  if(options.compactArrays && !options.graph && _isArray$4(compacted)) {
    if(compacted.length === 1) {
      // simplify to a single item
      compacted = compacted[0];
    } else if(compacted.length === 0) {
      // simplify to an empty object
      compacted = {};
    }
  } else if(options.graph && _isObject$4(compacted)) {
    // always use array if graph option is on
    compacted = [compacted];
  }

  // follow @context key
  if(_isObject$4(ctx) && '@context' in ctx) {
    ctx = ctx['@context'];
  }

  // build output context
  ctx = util.clone(ctx);
  if(!_isArray$4(ctx)) {
    ctx = [ctx];
  }
  // remove empty contexts
  const tmp = ctx;
  ctx = [];
  for(let i = 0; i < tmp.length; ++i) {
    if(!_isObject$4(tmp[i]) || Object.keys(tmp[i]).length > 0) {
      ctx.push(tmp[i]);
    }
  }

  // remove array if only one context
  const hasContext = (ctx.length > 0);
  if(ctx.length === 1) {
    ctx = ctx[0];
  }

  // add context and/or @graph
  if(_isArray$4(compacted)) {
    // use '@graph' keyword
    const graphAlias = _compactIri({
      activeCtx, iri: '@graph', relativeTo: {vocab: true}
    });
    const graph = compacted;
    compacted = {};
    if(hasContext) {
      compacted['@context'] = ctx;
    }
    compacted[graphAlias] = graph;
  } else if(_isObject$4(compacted) && hasContext) {
    // reorder keys so @context is first
    const graph = compacted;
    compacted = {'@context': ctx};
    for(const key in graph) {
      compacted[key] = graph[key];
    }
  }

  return compacted;
};

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD input to expand.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [keepFreeFloatingNodes] true to keep free-floating nodes,
 *            false not to, defaults to false.
 *          [documentLoader(url, options)] the document loader.
 *          [expansionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the expanded output.
 */
jsonld.expand = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not expand, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    keepFreeFloatingNodes: false,
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });
  if(options.expansionMap === false) {
    options.expansionMap = undefined;
  }

  // build set of objects that may have @contexts to resolve
  const toResolve = {};

  // build set of contexts to process prior to expansion
  const contextsToProcess = [];

  // if an `expandContext` has been given ensure it gets resolved
  if('expandContext' in options) {
    const expandContext = util.clone(options.expandContext);
    if(_isObject$4(expandContext) && '@context' in expandContext) {
      toResolve.expandContext = expandContext;
    } else {
      toResolve.expandContext = {'@context': expandContext};
    }
    contextsToProcess.push(toResolve.expandContext);
  }

  // if input is a string, attempt to dereference remote document
  let defaultBase;
  if(!_isString$4(input)) {
    // input is not a URL, do not need to retrieve it first
    toResolve.input = util.clone(input);
  } else {
    // load remote doc
    const remoteDoc = await jsonld.get(input, options);
    defaultBase = remoteDoc.documentUrl;
    toResolve.input = remoteDoc.document;
    if(remoteDoc.contextUrl) {
      // context included in HTTP link header and must be resolved
      toResolve.remoteContext = {'@context': remoteDoc.contextUrl};
      contextsToProcess.push(toResolve.remoteContext);
    }
  }

  // set default base
  if(!('base' in options)) {
    options.base = defaultBase || '';
  }

  // process any additional contexts
  let activeCtx = _getInitialContext(options);
  for(const localCtx of contextsToProcess) {
    activeCtx = await _processContext$2({activeCtx, localCtx, options});
  }

  // expand resolved input
  let expanded = await _expand({
    activeCtx,
    element: toResolve.input,
    options,
    expansionMap: options.expansionMap
  });

  // optimize away @graph with no other properties
  if(_isObject$4(expanded) && ('@graph' in expanded) &&
    Object.keys(expanded).length === 1) {
    expanded = expanded['@graph'];
  } else if(expanded === null) {
    expanded = [];
  }

  // normalize to an array
  if(!_isArray$4(expanded)) {
    expanded = [expanded];
  }

  return expanded;
};

/**
 * Performs JSON-LD flattening.
 *
 * @param input the JSON-LD to flatten.
 * @param ctx the context to use to compact the flattened output, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the flattened output.
 */
jsonld.flatten = async function(input, ctx, options) {
  if(arguments.length < 1) {
    return new TypeError('Could not flatten, too few arguments.');
  }

  if(typeof ctx === 'function') {
    ctx = null;
  } else {
    ctx = ctx || null;
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // expand input
  const expanded = await jsonld.expand(input, options);

  // do flattening
  const flattened = _flatten(expanded);

  if(ctx === null) {
    // no compaction required
    return flattened;
  }

  // compact result (force @graph option to true, skip expansion)
  options.graph = true;
  options.skipExpansion = true;
  const compacted = await jsonld.compact(flattened, ctx, options);

  return compacted;
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the JSON-LD input to frame.
 * @param frame the JSON-LD frame to use.
 * @param [options] the framing options.
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [embed] default @embed flag: '@last', '@always', '@never', '@link'
 *            (default: '@last').
 *          [explicit] default @explicit flag (default: false).
 *          [requireAll] default @requireAll flag (default: true).
 *          [omitDefault] default @omitDefault flag (default: false).
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the framed output.
 */
jsonld.frame = async function(input, frame, options) {
  if(arguments.length < 2) {
    throw new TypeError('Could not frame, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    embed: '@once',
    explicit: false,
    requireAll: false,
    omitDefault: false,
    bnodesToClear: [],
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // if frame is a string, attempt to dereference remote document
  if(_isString$4(frame)) {
    // load remote doc
    const remoteDoc = await jsonld.get(frame, options);
    frame = remoteDoc.document;

    if(remoteDoc.contextUrl) {
      // inject link header @context into frame
      let ctx = frame['@context'];
      if(!ctx) {
        ctx = remoteDoc.contextUrl;
      } else if(_isArray$4(ctx)) {
        ctx.push(remoteDoc.contextUrl);
      } else {
        ctx = [ctx, remoteDoc.contextUrl];
      }
      frame['@context'] = ctx;
    }
  }

  const frameContext = frame ? frame['@context'] || {} : {};

  // process context
  const activeCtx = await jsonld.processContext(
    _getInitialContext(options), frameContext, options);

  // mode specific defaults
  if(!options.hasOwnProperty('omitGraph')) {
    options.omitGraph = _processingMode$2(activeCtx, 1.1);
  }
  if(!options.hasOwnProperty('pruneBlankNodeIdentifiers')) {
    options.pruneBlankNodeIdentifiers = _processingMode$2(activeCtx, 1.1);
  }

  // expand input
  const expanded = await jsonld.expand(input, options);

  // expand frame
  const opts = {...options};
  opts.isFrame = true;
  opts.keepFreeFloatingNodes = true;
  const expandedFrame = await jsonld.expand(frame, opts);

  // if the unexpanded frame includes a key expanding to @graph, frame the
  // default graph, otherwise, the merged graph
  const frameKeys = Object.keys(frame)
    .map(key => _expandIri$3(activeCtx, key, {vocab: true}));
  opts.merged = !frameKeys.includes('@graph');
  opts.is11 = _processingMode$2(activeCtx, 1.1);

  // do framing
  const framed = _frameMergedOrDefault(expanded, expandedFrame, opts);

  opts.graph = !options.omitGraph;
  opts.skipExpansion = true;
  opts.link = {};
  opts.framing = true;
  let compacted = await jsonld.compact(framed, frameContext, opts);

  // replace @null with null, compacting arrays
  opts.link = {};
  compacted = _cleanupNull(compacted, opts);

  return compacted;
};

/**
 * **Experimental**
 *
 * Links a JSON-LD document's nodes in memory.
 *
 * @param input the JSON-LD document to link.
 * @param [ctx] the JSON-LD context to apply.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the linked output.
 */
jsonld.link = async function(input, ctx, options) {
  // API matches running frame with a wildcard frame and embed: '@link'
  // get arguments
  const frame = {};
  if(ctx) {
    frame['@context'] = ctx;
  }
  frame['@embed'] = '@link';
  return jsonld.frame(input, frame, options);
};

/**
 * Performs RDF dataset normalization on the given input. The input is JSON-LD
 * unless the 'inputFormat' option is used. The output is an RDF dataset
 * unless the 'format' option is used.
 *
 * @param input the input to normalize as JSON-LD or as a format specified by
 *          the 'inputFormat' option.
 * @param [options] the options to use:
 *          [algorithm] the normalization algorithm to use, `URDNA2015` or
 *            `URGNA2012` (default: `URDNA2015`).
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false.
 *          [inputFormat] the format if input is not JSON-LD:
 *            'application/n-quads' for N-Quads.
 *          [format] the format if output is a string:
 *            'application/n-quads' for N-Quads.
 *          [documentLoader(url, options)] the document loader.
 *          [useNative] true to use a native canonize algorithm
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the normalized output.
 */
jsonld.normalize = jsonld.canonize = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not canonize, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    algorithm: 'URDNA2015',
    skipExpansion: false,
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });
  if('inputFormat' in options) {
    if(options.inputFormat !== 'application/n-quads' &&
      options.inputFormat !== 'application/nquads') {
      throw new JsonLdError_1(
        'Unknown canonicalization input format.',
        'jsonld.CanonizeError');
    }
    // TODO: `await` for async parsers
    const parsedInput = NQuads.parse(input);

    // do canonicalization
    return rdfCanonize.canonize(parsedInput, options);
  }

  // convert to RDF dataset then do normalization
  const opts = {...options};
  delete opts.format;
  opts.produceGeneralizedRdf = false;
  const dataset = await jsonld.toRDF(input, opts);

  // do canonicalization
  return rdfCanonize.canonize(dataset, options);
};

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset a serialized string of RDF in a format specified by the
 *          format option or an RDF dataset to convert.
 * @param [options] the options to use:
 *          [format] the format if dataset param must first be parsed:
 *            'application/n-quads' for N-Quads (default).
 *          [rdfParser] a custom RDF-parser to use to parse the dataset.
 *          [useRdfType] true to use rdf:type, false to use @type
 *            (default: false).
 *          [useNativeTypes] true to convert XSD types into native types
 *            (boolean, integer, double), false not to (default: false).
 *
 * @return a Promise that resolves to the JSON-LD document.
 */
jsonld.fromRDF = async function(dataset, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert from RDF, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    format: _isString$4(dataset) ? 'application/n-quads' : undefined
  });

  const {format} = options;
  let {rdfParser} = options;

  // handle special format
  if(format) {
    // check supported formats
    rdfParser = rdfParser || _rdfParsers[format];
    if(!rdfParser) {
      throw new JsonLdError_1(
        'Unknown input format.',
        'jsonld.UnknownFormat', {format});
    }
  } else {
    // no-op parser, assume dataset already parsed
    rdfParser = () => dataset;
  }

  // rdfParser must be synchronous or return a promise, no callback support
  const parsedDataset = await rdfParser(dataset);
  return _fromRDF(parsedDataset, options);
};

/**
 * Outputs the RDF dataset found in the given JSON-LD object.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false.
 *          [format] the format to use to output a string:
 *            'application/n-quads' for N-Quads.
 *          [produceGeneralizedRdf] true to output generalized RDF, false
 *            to produce only standard RDF (default: false).
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the RDF dataset.
 */
jsonld.toRDF = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert to RDF, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    skipExpansion: false,
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // TODO: support toRDF custom map?
  let expanded;
  if(options.skipExpansion) {
    expanded = input;
  } else {
    // expand input
    expanded = await jsonld.expand(input, options);
  }

  // output RDF dataset
  const dataset = _toRDF(expanded, options);
  if(options.format) {
    if(options.format === 'application/n-quads' ||
      options.format === 'application/nquads') {
      return NQuads.serialize(dataset);
    }
    throw new JsonLdError_1(
      'Unknown output format.',
      'jsonld.UnknownFormat', {format: options.format});
  }

  return dataset;
};

/**
 * **Experimental**
 *
 * Recursively flattens the nodes in the given JSON-LD input into a merged
 * map of node ID => node. All graphs will be merged into the default graph.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [issuer] a jsonld.IdentifierIssuer to use to label blank nodes.
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the merged node map.
 */
jsonld.createNodeMap = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not create node map, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString$4(input) ? input : '',
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // expand input
  const expanded = await jsonld.expand(input, options);

  return _createMergedNodeMap$1(expanded, options);
};

/**
 * **Experimental**
 *
 * Merges two or more JSON-LD documents into a single flattened document.
 *
 * @param docs the JSON-LD documents to merge together.
 * @param ctx the context to use to compact the merged result, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [issuer] a jsonld.IdentifierIssuer to use to label blank nodes.
 *          [mergeNodes] true to merge properties for nodes with the same ID,
 *            false to ignore new properties for nodes with the same ID once
 *            the ID has been defined; note that this may not prevent merging
 *            new properties where a node is in the `object` position
 *            (default: true).
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the merged output.
 */
jsonld.merge = async function(docs, ctx, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not merge, too few arguments.');
  }
  if(!_isArray$4(docs)) {
    throw new TypeError('Could not merge, "docs" must be an array.');
  }

  if(typeof ctx === 'function') {
    ctx = null;
  } else {
    ctx = ctx || null;
  }

  // set default options
  options = _setDefaults(options, {
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // expand all documents
  const expanded = await Promise.all(docs.map(doc => {
    const opts = {...options};
    return jsonld.expand(doc, opts);
  }));

  let mergeNodes = true;
  if('mergeNodes' in options) {
    mergeNodes = options.mergeNodes;
  }

  const issuer = options.issuer || new IdentifierIssuer$1('_:b');
  const graphs = {'@default': {}};

  for(let i = 0; i < expanded.length; ++i) {
    // uniquely relabel blank nodes
    const doc = util.relabelBlankNodes(expanded[i], {
      issuer: new IdentifierIssuer$1('_:b' + i + '-')
    });

    // add nodes to the shared node map graphs if merging nodes, to a
    // separate graph set if not
    const _graphs = (mergeNodes || i === 0) ? graphs : {'@default': {}};
    _createNodeMap$1(doc, _graphs, '@default', issuer);

    if(_graphs !== graphs) {
      // merge document graphs but don't merge existing nodes
      for(const graphName in _graphs) {
        const _nodeMap = _graphs[graphName];
        if(!(graphName in graphs)) {
          graphs[graphName] = _nodeMap;
          continue;
        }
        const nodeMap = graphs[graphName];
        for(const key in _nodeMap) {
          if(!(key in nodeMap)) {
            nodeMap[key] = _nodeMap[key];
          }
        }
      }
    }
  }

  // add all non-default graphs to default graph
  const defaultGraph = _mergeNodeMaps(graphs);

  // produce flattened output
  const flattened = [];
  const keys = Object.keys(defaultGraph).sort();
  for(let ki = 0; ki < keys.length; ++ki) {
    const node = defaultGraph[keys[ki]];
    // only add full subjects to top-level
    if(!_isSubjectReference$2(node)) {
      flattened.push(node);
    }
  }

  if(ctx === null) {
    return flattened;
  }

  // compact result (force @graph option to true, skip expansion)
  options.graph = true;
  options.skipExpansion = true;
  const compacted = await jsonld.compact(flattened, ctx, options);

  return compacted;
};

/**
 * The default document loader for external documents.
 *
 * @param url the URL to load.
 *
 * @return a promise that resolves to the remote document.
 */
Object.defineProperty(jsonld, 'documentLoader', {
  get: () => jsonld._documentLoader,
  set: v => jsonld._documentLoader = v
});
// default document loader not implemented
jsonld.documentLoader = async url => {
  throw new JsonLdError_1(
    'Could not retrieve a JSON-LD document from the URL. URL ' +
    'dereferencing not implemented.', 'jsonld.LoadDocumentError',
    {code: 'loading document failed', url});
};

/**
 * Gets a remote JSON-LD document using the default document loader or
 * one given in the passed options.
 *
 * @param url the URL to fetch.
 * @param [options] the options to use:
 *          [documentLoader] the document loader to use.
 *
 * @return a Promise that resolves to the retrieved remote document.
 */
jsonld.get = async function(url, options) {
  let load;
  if(typeof options.documentLoader === 'function') {
    load = options.documentLoader;
  } else {
    load = jsonld.documentLoader;
  }

  const remoteDoc = await load(url);

  try {
    if(!remoteDoc.document) {
      throw new JsonLdError_1(
        'No remote document found at the given URL.',
        'jsonld.NullRemoteDocument');
    }
    if(_isString$4(remoteDoc.document)) {
      remoteDoc.document = JSON.parse(remoteDoc.document);
    }
  } catch(e) {
    throw new JsonLdError_1(
      'Could not retrieve a JSON-LD document from the URL.',
      'jsonld.LoadDocumentError', {
        code: 'loading document failed',
        cause: e,
        remoteDoc
      });
  }

  return remoteDoc;
};

/**
 * Processes a local context, resolving any URLs as necessary, and returns a
 * new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param [options] the options to use:
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the new active context.
 */
jsonld.processContext = async function(
  activeCtx, localCtx, options) {
  // set default options
  options = _setDefaults(options, {
    base: '',
    contextResolver: new ContextResolver_1(
      {sharedCache: _resolvedContextCache})
  });

  // return initial context early for null context
  if(localCtx === null) {
    return _getInitialContext(options);
  }

  // get URLs in localCtx
  localCtx = util.clone(localCtx);
  if(!(_isObject$4(localCtx) && '@context' in localCtx)) {
    localCtx = {'@context': localCtx};
  }

  return _processContext$2({activeCtx, localCtx, options});
};

// backwards compatibility
jsonld.getContextValue = context.getContextValue;

/**
 * Document loaders.
 */
jsonld.documentLoaders = {};

/**
 * Assigns the default document loader for external document URLs to a built-in
 * default. Supported types currently include: 'xhr' and 'node'.
 *
 * @param type the type to set.
 * @param [params] the parameters required to use the document loader.
 */
jsonld.useDocumentLoader = function(type) {
  if(!(type in jsonld.documentLoaders)) {
    throw new JsonLdError_1(
      'Unknown document loader type: "' + type + '"',
      'jsonld.UnknownDocumentLoader',
      {type});
  }

  // set document loader
  jsonld.documentLoader = jsonld.documentLoaders[type].apply(
    jsonld, Array.prototype.slice.call(arguments, 1));
};

/**
 * Registers an RDF dataset parser by content-type, for use with
 * jsonld.fromRDF. An RDF dataset parser will always be given one parameter,
 * a string of input. An RDF dataset parser can be synchronous or
 * asynchronous (by returning a promise).
 *
 * @param contentType the content-type for the parser.
 * @param parser(input) the parser function (takes a string as a parameter
 *          and either returns an RDF dataset or a Promise that resolves to one.
 */
jsonld.registerRDFParser = function(contentType, parser) {
  _rdfParsers[contentType] = parser;
};

/**
 * Unregisters an RDF dataset parser by content-type.
 *
 * @param contentType the content-type for the parser.
 */
jsonld.unregisterRDFParser = function(contentType) {
  delete _rdfParsers[contentType];
};

// register the N-Quads RDF parser
jsonld.registerRDFParser('application/n-quads', NQuads.parse);
jsonld.registerRDFParser('application/nquads', NQuads.parse);

/* URL API */
jsonld.url = url;

/* Utility API */
jsonld.util = util;
// backwards compatibility
Object.assign(jsonld, util);

// reexpose API as jsonld.promises for backwards compatability
jsonld.promises = jsonld;

// backwards compatibility
jsonld.RequestQueue = RequestQueue_1;

/* WebIDL API */
jsonld.JsonLdProcessor = JsonLdProcessor(jsonld);

platformBrowser.setupGlobals(jsonld);
platformBrowser.setupDocumentLoaders(jsonld);

function _setDefaults(options, {
  documentLoader = jsonld.documentLoader,
  ...defaults
}) {
  return Object.assign({}, {documentLoader}, defaults, options);
}

// end of jsonld API `wrapper` factory
return jsonld;
};

// external APIs:

// used to generate a new jsonld API instance
const factory = function() {
  return wrapper(function() {
    return factory();
  });
};

// wrap the main jsonld API instance
wrapper(factory);
// export API
var jsonld = factory;

var createClass = createCommonjsModule(function (module) {
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}

module.exports = _createClass, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _createClass = /*@__PURE__*/getDefaultExportFromCjs(createClass);

var classCallCheck = createCommonjsModule(function (module) {
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

module.exports = _classCallCheck, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _classCallCheck = /*@__PURE__*/getDefaultExportFromCjs(classCallCheck);

var assertThisInitialized = createCommonjsModule(function (module) {
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

module.exports = _assertThisInitialized, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _assertThisInitialized = /*@__PURE__*/getDefaultExportFromCjs(assertThisInitialized);

var setPrototypeOf = createCommonjsModule(function (module) {
function _setPrototypeOf(o, p) {
  module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
  return _setPrototypeOf(o, p);
}

module.exports = _setPrototypeOf, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var inherits = createCommonjsModule(function (module) {
function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(subClass, "prototype", {
    writable: false
  });
  if (superClass) setPrototypeOf(subClass, superClass);
}

module.exports = _inherits, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _inherits = /*@__PURE__*/getDefaultExportFromCjs(inherits);

var _typeof_1 = createCommonjsModule(function (module) {
function _typeof(obj) {
  "@babel/helpers - typeof";

  return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(obj);
}

module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _typeof = /*@__PURE__*/getDefaultExportFromCjs(_typeof_1);

var possibleConstructorReturn = createCommonjsModule(function (module) {
var _typeof = _typeof_1["default"];



function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }

  return assertThisInitialized(self);
}

module.exports = _possibleConstructorReturn, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _possibleConstructorReturn = /*@__PURE__*/getDefaultExportFromCjs(possibleConstructorReturn);

var getPrototypeOf = createCommonjsModule(function (module) {
function _getPrototypeOf(o) {
  module.exports = _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
  return _getPrototypeOf(o);
}

module.exports = _getPrototypeOf, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _getPrototypeOf = /*@__PURE__*/getDefaultExportFromCjs(getPrototypeOf);

var defineProperty = createCommonjsModule(function (module) {
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _defineProperty = /*@__PURE__*/getDefaultExportFromCjs(defineProperty);

/**
* Class orders
*/
var ClassOrder = {
  'Literal': 1,
  'Collection': 3,
  'Graph': 4,
  'NamedNode': 5,
  'BlankNode': 6,
  'Variable': 7
};

/**
 * The superclass of all RDF Statement objects, that is
 * NamedNode, Literal, BlankNode, etc.
 * Should not be instantiated directly.
 * Also called Term.
 * @link https://rdf.js.org/data-model-spec/#term-interface
 * @class Node
 */
var Node$2 = /*#__PURE__*/function () {
  // Specified in './node.ts' to prevent circular dependency
  // Specified in './node.ts' to prevent circular dependency

  /** The type of node */

  /** The class order for this node */

  /** The node's value */
  function Node(value) {
    _classCallCheck(this, Node);

    _defineProperty(this, "termType", void 0);

    _defineProperty(this, "classOrder", void 0);

    _defineProperty(this, "value", void 0);

    this.value = value;
  }
  /**
   * Creates the substituted node for this one, according to the specified bindings
   * @param bindings - Bindings of identifiers to nodes
   */


  _createClass(Node, [{
    key: "substitute",
    value: function substitute(bindings) {
      console.log('@@@ node substitute' + this);
      return this;
    }
    /**
     * Compares this node with another
     * @see {equals} to check if two nodes are equal
     * @param other - The other node
     */

  }, {
    key: "compareTerm",
    value: function compareTerm(other) {
      if (this.classOrder < other.classOrder) {
        return -1;
      }

      if (this.classOrder > other.classOrder) {
        return +1;
      }

      if (this.value < other.value) {
        return -1;
      }

      if (this.value > other.value) {
        return +1;
      }

      return 0;
    }
    /**
     * Compares whether the two nodes are equal
     * @param other The other node
     */

  }, {
    key: "equals",
    value: function equals(other) {
      if (!other) {
        return false;
      }

      return this.termType === other.termType && this.value === other.value;
    }
    /**
     * Creates a hash for this node
     * @deprecated use {rdfFactory.id} instead if possible
     */

  }, {
    key: "hashString",
    value: function hashString() {
      return this.toCanonical();
    }
    /**
     * Compares whether this node is the same as the other one
     * @param other - Another node
     */

  }, {
    key: "sameTerm",
    value: function sameTerm(other) {
      return this.equals(other);
    }
    /**
     * Creates a canonical string representation of this node
     */

  }, {
    key: "toCanonical",
    value: function toCanonical() {
      return this.toNT();
    }
    /**
     * Creates a n-triples string representation of this node
     */

  }, {
    key: "toNT",
    value: function toNT() {
      return this.toString();
    }
    /**
     * Creates a n-quads string representation of this node
     */

  }, {
    key: "toNQ",
    value: function toNQ() {
      return this.toNT();
    }
    /**
     * Creates a string representation of this node
     */

  }, {
    key: "toString",
    value: function toString() {
      throw new Error('Node.toString() is abstract - see the subclasses instead');
    }
  }]);

  return Node;
}();

_defineProperty(Node$2, "fromValue", void 0);

_defineProperty(Node$2, "toJS", void 0);

var NamedNodeTermType = "NamedNode";
var BlankNodeTermType = "BlankNode";
var LiteralTermType = "Literal";
var VariableTermType = "Variable";
var DefaultGraphTermType = "DefaultGraph"; // Non-RDF/JS types:

var CollectionTermType = "Collection";
var EmptyTermType = "Empty";
var GraphTermType = "Graph";
var HTMLContentType = "text/html";
var JSONLDContentType = "application/ld+json";
var N3ContentType = "text/n3";
var N3LegacyContentType = "application/n3";
var NQuadsAltContentType = "application/nquads";
var NQuadsContentType = "application/n-quads";
var NTriplesContentType = "application/n-triples";
var RDFXMLContentType = "application/rdf+xml";
var SPARQLUpdateContentType = "application/sparql-update";
var SPARQLUpdateSingleMatchContentType = "application/sparql-update-single-match";
var TurtleContentType = "text/turtle";
var TurtleLegacyContentType = "application/x-turtle";
var XHTMLContentType = "application/xhtml+xml";
/**
 * A valid mime type header
 */

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
 * An RDF blank node is a Node without a URI
 * @link https://rdf.js.org/data-model-spec/#blanknode-interface
 */
var BlankNode = /*#__PURE__*/function (_Node) {
  _inherits(BlankNode, _Node);

  var _super = _createSuper(BlankNode);

  /**
   * Initializes this node
   * @param [id] The identifier for the blank node
   */
  function BlankNode(id) {
    var _this;

    _classCallCheck(this, BlankNode);

    _this = _super.call(this, BlankNode.getId(id));

    _defineProperty(_assertThisInitialized(_this), "termType", BlankNodeTermType);

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.BlankNode);

    _defineProperty(_assertThisInitialized(_this), "isBlank", 1);

    _defineProperty(_assertThisInitialized(_this), "isVar", 1);

    return _this;
  }
  /**
   * The identifier for the blank node
   */


  _createClass(BlankNode, [{
    key: "id",
    get: function get() {
      return this.value;
    },
    set: function set(value) {
      this.value = value;
    }
  }, {
    key: "compareTerm",
    value: function compareTerm(other) {
      if (this.classOrder < other.classOrder) {
        return -1;
      }

      if (this.classOrder > other.classOrder) {
        return +1;
      }

      if (this.id < other.id) {
        return -1;
      }

      if (this.id > other.id) {
        return +1;
      }

      return 0;
    }
    /**
     * Gets a copy of this blank node in the specified formula
     * @param formula The formula
     */

  }, {
    key: "copy",
    value: function copy(formula) {
      // depends on the formula
      var bnodeNew = new BlankNode();
      formula.copyTo(this, bnodeNew);
      return bnodeNew;
    }
  }, {
    key: "toCanonical",
    value: function toCanonical() {
      return BlankNode.NTAnonymousNodePrefix + this.value;
    }
  }, {
    key: "toString",
    value: function toString() {
      return BlankNode.NTAnonymousNodePrefix + this.id;
    }
  }], [{
    key: "getId",
    value:
    /**
     * The next unique identifier for blank nodes
     */
    function getId(id) {
      if (id) {
        if (typeof id !== 'string') {
          console.log('Bad blank id:', id);
          throw new Error('Bad id argument to new blank node: ' + id);
        }

        if (id.includes('#')) {
          // Is a URI with hash fragment
          var fragments = id.split('#');
          return fragments[fragments.length - 1];
        }

        return id;
      }

      return 'n' + BlankNode.nextId++;
    }
  }]);

  return BlankNode;
}(Node$2);

_defineProperty(BlankNode, "nextId", 0);

_defineProperty(BlankNode, "NTAnonymousNodePrefix", '_:');

/** Retrieve the value of a term, or self if already a string. */
function termValue(node) {
  if (typeof node === 'string') {
    return node;
  }

  return node.value;
}

/** TypeGuard for RDFLib Statements */
function isStatement(obj) {
  return _typeof(obj) === 'object' && obj !== null && 'subject' in obj;
}
/** TypeGuard for RDFlib Stores */

function isStore(obj) {
  return _typeof(obj) === 'object' && obj !== null && 'statements' in obj;
}
/** TypeGuard for RDFLib Collections */

function isCollection(obj) {
  return isTerm(obj) && obj.termType === CollectionTermType;
}
/** TypeGuard for valid RDFlib Object types, also allows Collections */

function isRDFlibObject(obj) {
  return obj && Object.prototype.hasOwnProperty.call(obj, 'termType') && (obj.termType === NamedNodeTermType || obj.termType === VariableTermType || obj.termType === BlankNodeTermType || obj.termType === CollectionTermType || obj.termType === LiteralTermType || obj.termType === GraphTermType);
}
/** TypeGuard for RDFLib Variables */

function isVariable(obj) {
  return isTerm(obj) && obj.termType === VariableTermType;
}
/** TypeGuard for RDF/JS spec Terms */

function isTerm(obj) {
  return _typeof(obj) === 'object' && obj !== null && 'termType' in obj;
}
/** TypeGuard for RDF/JS spec Literals */

function isLiteral(value) {
  return value.termType === LiteralTermType;
}
/** TypeGuard for RDF/JS spec Quads */

function isQuad(obj) {
  return _typeof(obj) === "object" && obj !== null && 'subject' in obj && 'predicate' in obj && 'object' in obj;
}
/** TypeGuard for RDF/JS spec NamedNodes */

function isNamedNode(obj) {
  return isTerm(obj) && obj.termType === 'NamedNode';
}
/** TypeGuard for RDF/JS spec BlankNodes */

function isBlankNode(obj) {
  return isTerm(obj) && 'termType' in obj && obj.termType === 'BlankNode';
}
/** TypeGuard for valid RDF/JS spec Subject types */

function isSubject(obj) {
  return isTerm(obj) && (obj.termType === NamedNodeTermType || obj.termType === VariableTermType || obj.termType === BlankNodeTermType);
}
/** TypeGuard for valid RDF/JS spec Predicate types */

function isPredicate(obj) {
  return isTerm(obj) && (obj.termType === NamedNodeTermType || obj.termType === VariableTermType);
}
/** TypeGuard for valid RDF/JS spec Object types */

function isRDFObject(obj) {
  return isTerm(obj) && (obj.termType === NamedNodeTermType || obj.termType === VariableTermType || obj.termType === BlankNodeTermType || obj.termType === LiteralTermType);
}
/** TypeGuard for valid RDF/JS Graph types */

function isGraph(obj) {
  return isTerm(obj) && (obj.termType === NamedNodeTermType || obj.termType === VariableTermType || obj.termType === BlankNodeTermType || obj.termType === DefaultGraphTermType);
}

function _createSuper$1(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$1(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$1() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
/**
 * A named (IRI) RDF node
 */

var NamedNode = /*#__PURE__*/function (_Node) {
  _inherits(NamedNode, _Node);

  var _super = _createSuper$1(NamedNode);

  /**
   * Create a named (IRI) RDF Node
   * @constructor
   * @param iri - The IRI for this node
   */
  function NamedNode(iri) {
    var _this;

    _classCallCheck(this, NamedNode);

    _this = _super.call(this, termValue(iri));

    _defineProperty(_assertThisInitialized(_this), "termType", NamedNodeTermType);

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.NamedNode);

    if (!_this.value) {
      throw new Error('Missing IRI for NamedNode');
    }

    if (!_this.value.includes(':')) {
      throw new Error('NamedNode IRI "' + iri + '" must be absolute.');
    }

    if (_this.value.includes(' ')) {
      var message = 'Error: NamedNode IRI "' + iri + '" must not contain unencoded spaces.';
      throw new Error(message);
    }

    return _this;
  }
  /**
   * Returns an $rdf node for the containing directory, ending in slash.
   */


  _createClass(NamedNode, [{
    key: "dir",
    value: function dir() {
      var str = this.value.split('#')[0];
      var p = str.slice(0, -1).lastIndexOf('/');
      var q = str.indexOf('//');
      if (q >= 0 && p < q + 2 || p < 0) return null;
      return new NamedNode(str.slice(0, p + 1));
    }
    /**
     * Returns an NN for the whole web site, ending in slash.
     * Contrast with the "origin" which does NOT have a trailing slash
     */

  }, {
    key: "site",
    value: function site() {
      var str = this.value.split('#')[0];
      var p = str.indexOf('//');
      if (p < 0) throw new Error('This URI does not have a web site part (origin)');
      var q = str.indexOf('/', p + 2);

      if (q < 0) {
        return new NamedNode(str.slice(0) + '/'); // Add slash to a bare origin
      } else {
        return new NamedNode(str.slice(0, q + 1));
      }
    }
    /**
     * Creates the fetchable named node for the document.
     * Removes everything from the # anchor tag.
     */

  }, {
    key: "doc",
    value: function doc() {
      if (this.value.indexOf('#') < 0) {
        return this;
      } else {
        return new NamedNode(this.value.split('#')[0]);
      }
    }
    /**
     * Returns the URI including <brackets>
     */

  }, {
    key: "toString",
    value: function toString() {
      return '<' + this.value + '>';
    }
    /** The local identifier with the document */

  }, {
    key: "id",
    value: function id() {
      return this.value.split('#')[1];
    }
    /** Alias for value, favored by Tim */

  }, {
    key: "uri",
    get: function get() {
      return this.value;
    },
    set: function set(uri) {
      this.value = uri;
    }
    /**
     * Creates a named node from the specified input value
     * @param value - An input value
     */

  }], [{
    key: "fromValue",
    value: function fromValue(value) {
      if (typeof value === 'undefined' || value === null) {
        return value;
      }

      if (isTerm(value)) {
        return value;
      }

      return new NamedNode(value);
    }
  }]);

  return NamedNode;
}(Node$2);

var XSD$1 = {
  boolean: new NamedNode('http://www.w3.org/2001/XMLSchema#boolean'),
  dateTime: new NamedNode('http://www.w3.org/2001/XMLSchema#dateTime'),
  decimal: new NamedNode('http://www.w3.org/2001/XMLSchema#decimal'),
  double: new NamedNode('http://www.w3.org/2001/XMLSchema#double'),
  integer: new NamedNode('http://www.w3.org/2001/XMLSchema#integer'),
  langString: new NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'),
  string: new NamedNode('http://www.w3.org/2001/XMLSchema#string')
};

function _createSuper$2(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$2(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$2() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
 * An RDF literal, containing some value which isn't expressed as an IRI.
 * @link https://rdf.js.org/data-model-spec/#literal-interface
 */
var Literal = /*#__PURE__*/function (_Node) {
  _inherits(Literal, _Node);

  var _super = _createSuper$2(Literal);

  /**
   * The literal's datatype as a named node
   */

  /**
   * The language for the literal
   */

  /**
   * Initializes a literal
   * @param value - The literal's lexical value
   * @param language - The language for the literal. Defaults to ''.
   * @param datatype - The literal's datatype as a named node. Defaults to xsd:string.
   */
  function Literal(value, language, datatype) {
    var _this;

    _classCallCheck(this, Literal);

    _this = _super.call(this, value);

    _defineProperty(_assertThisInitialized(_this), "termType", LiteralTermType);

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.Literal);

    _defineProperty(_assertThisInitialized(_this), "datatype", XSD$1.string);

    _defineProperty(_assertThisInitialized(_this), "isVar", 0);

    _defineProperty(_assertThisInitialized(_this), "language", '');

    if (language) {
      _this.language = language;
      _this.datatype = XSD$1.langString;
    } else if (datatype) {
      _this.datatype = NamedNode.fromValue(datatype);
    } else {
      _this.datatype = XSD$1.string;
    }

    return _this;
  }
  /**
   * Gets a copy of this literal
   */


  _createClass(Literal, [{
    key: "copy",
    value: function copy() {
      return new Literal(this.value, this.lang, this.datatype);
    }
    /**
     * Gets whether two literals are the same
     * @param other The other statement
     */

  }, {
    key: "equals",
    value: function equals(other) {
      if (!other) {
        return false;
      }

      return this.termType === other.termType && this.value === other.value && this.language === other.language && (!this.datatype && !other.datatype || this.datatype && this.datatype.equals(other.datatype));
    }
    /**
     * The language for the literal
     * @deprecated use {language} instead
     */

  }, {
    key: "lang",
    get: function get() {
      return this.language;
    },
    set: function set(language) {
      this.language = language || '';
    }
  }, {
    key: "toNT",
    value: function toNT() {
      return Literal.toNT(this);
    }
    /** Serializes a literal to an N-Triples string */

  }, {
    key: "toString",
    value: function toString() {
      return '' + this.value;
    }
    /**
     * Builds a literal node from a boolean value
     * @param value - The value
     */

  }], [{
    key: "toNT",
    value: function toNT(literal) {
      if (typeof literal.value === 'number') {
        return '' + literal.value;
      } else if (typeof literal.value !== 'string') {
        throw new Error('Value of RDF literal is not string or number: ' + literal.value);
      }

      var str = literal.value; // #x22 ("), #x5C (\), #x0A (\n) and #xD (\r) are disallowed and need to be replaced
      // see https://www.w3.org/TR/n-triples/#grammar-production-STRING_LITERAL_QUOTE

      str = str.replace(/\\/g, '\\\\');
      str = str.replace(/\"/g, '\\"');
      str = str.replace(/\n/g, '\\n');
      str = str.replace(/\r/g, '\\r');
      str = '"' + str + '"';

      if (literal.language) {
        str += '@' + literal.language;
      } else if (!literal.datatype.equals(XSD$1.string)) {
        // Only add datatype if it's not a string
        str += '^^' + literal.datatype.toCanonical();
      }

      return str;
    }
  }, {
    key: "fromBoolean",
    value: function fromBoolean(value) {
      var strValue = value ? '1' : '0';
      return new Literal(strValue, null, XSD$1.boolean);
    }
    /**
     * Builds a literal node from a date value
     * @param value The value
     */

  }, {
    key: "fromDate",
    value: function fromDate(value) {
      if (!(value instanceof Date)) {
        throw new TypeError('Invalid argument to Literal.fromDate()');
      }

      var d2 = function d2(x) {
        return ('' + (100 + x)).slice(1, 3);
      };

      var date = '' + value.getUTCFullYear() + '-' + d2(value.getUTCMonth() + 1) + '-' + d2(value.getUTCDate()) + 'T' + d2(value.getUTCHours()) + ':' + d2(value.getUTCMinutes()) + ':' + d2(value.getUTCSeconds()) + 'Z';
      return new Literal(date, null, XSD$1.dateTime);
    }
    /**
     * Builds a literal node from a number value
     * @param value - The value
     */

  }, {
    key: "fromNumber",
    value: function fromNumber(value) {
      if (typeof value !== 'number') {
        throw new TypeError('Invalid argument to Literal.fromNumber()');
      }

      var datatype;
      var strValue = value.toString();

      if (strValue.indexOf('e') < 0 && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
        datatype = Number.isInteger(value) ? XSD$1.integer : XSD$1.decimal;
      } else {
        datatype = XSD$1.double;
      }

      return new Literal(strValue, null, datatype);
    }
    /**
     * Builds a literal node from an input value
     * @param value - The input value
     */

  }, {
    key: "fromValue",
    value: function fromValue(value) {
      if (isLiteral(value)) {
        return value;
      }

      switch (_typeof(value)) {
        case 'object':
          if (value instanceof Date) {
            return Literal.fromDate(value);
          }

        case 'boolean':
          return Literal.fromBoolean(value);

        case 'number':
          return Literal.fromNumber(value);

        case 'string':
          return new Literal(value);
      }

      throw new Error("Can't make literal from " + value + ' of type ' + _typeof(value));
    }
  }]);

  return Literal;
}(Node$2);

function _createSuper$3(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$3(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$3() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
 * Creates an RDF Node from a native javascript value.
 * RDF Nodes are returned unchanged, undefined returned as itself.
 * Arrays return Collections.
 * Strings, numbers and booleans return Literals.
 * @param value {Node|Date|String|Number|Boolean|Undefined}
 * @return {Node|Collection}
 */
function fromValue(value) {
  if (typeof value === 'undefined' || value === null) {
    return value;
  }

  if (isTerm(value)) {
    // a Node subclass or a Collection
    return value;
  }

  if (Array.isArray(value)) {
    return new Collection(value);
  }

  return Literal.fromValue(value);
}
/**
 * A collection of other RDF nodes
 *
 * Use generic T to control the contents of the array.
 */

var Collection = /*#__PURE__*/function (_Node) {
  _inherits(Collection, _Node);

  var _super = _createSuper$3(Collection);

  /**
   * The nodes in this collection
   */
  function Collection(initial) {
    var _this;

    _classCallCheck(this, Collection);

    _this = _super.call(this, (BlankNode.nextId++).toString());

    _defineProperty(_assertThisInitialized(_this), "termType", CollectionTermType);

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.Collection);

    _defineProperty(_assertThisInitialized(_this), "closed", false);

    _defineProperty(_assertThisInitialized(_this), "compareTerm", BlankNode.prototype.compareTerm);

    _defineProperty(_assertThisInitialized(_this), "elements", []);

    _defineProperty(_assertThisInitialized(_this), "isVar", 0);

    if (initial && initial.length > 0) {
      initial.forEach(function (element) {
        _this.elements.push(fromValue(element));
      });
    }

    return _this;
  }

  _createClass(Collection, [{
    key: "id",
    get: function get() {
      return this.value;
    },
    set: function set(value) {
      this.value = value;
    }
    /**
     * Appends an element to this collection
     * @param element - The new element
     */

  }, {
    key: "append",
    value: function append(element) {
      return this.elements.push(element);
    }
    /**
     * Closes this collection
     */

  }, {
    key: "close",
    value: function close() {
      this.closed = true;
      return this.closed;
    }
    /**
     * Removes the first element from the collection (and return it)
     */

  }, {
    key: "shift",
    value: function shift() {
      return this.elements.shift();
    }
    /**
     * Creates a new Collection with the substituting bindings applied
     * @param bindings - The bindings to substitute
     */

  }, {
    key: "substitute",
    value: function substitute(bindings) {
      var elementsCopy = this.elements.map(function (ea) {
        return ea.substitute(bindings);
      });
      return new Collection(elementsCopy);
    }
  }, {
    key: "toNT",
    value: function toNT() {
      return Collection.toNT(this);
    }
  }, {
    key: "toString",
    value:
    /**
     * Serializes the collection to a string.
     * Surrounded by (parentheses) and separated by spaces.
     */
    function toString() {
      return '(' + this.elements.join(' ') + ')';
    }
    /**
     * Prepends the specified element to the collection's front
     * @param element - The element to prepend
     */

  }, {
    key: "unshift",
    value: function unshift(element) {
      return this.elements.unshift(element);
    }
  }], [{
    key: "toNT",
    value: function toNT(collection) {
      return BlankNode.NTAnonymousNodePrefix + collection.id;
    }
  }]);

  return Collection;
}(Node$2);

_defineProperty(Collection, "termType", CollectionTermType);

function apply(fn, ...args) {
  return (...callArgs) => fn(...args, ...callArgs);
}
function initialParams(fn) {
  return function(...args) {
    var callback = args.pop();
    return fn.call(this, args, callback);
  };
}
var hasQueueMicrotask = typeof queueMicrotask === "function" && queueMicrotask;
var hasSetImmediate = typeof setImmediate === "function" && setImmediate;
var hasNextTick = typeof process === "object" && typeof process.nextTick === "function";
function fallback(fn) {
  setTimeout(fn, 0);
}
function wrap(defer) {
  return (fn, ...args) => defer(() => fn(...args));
}
var _defer;
if (hasQueueMicrotask) {
  _defer = queueMicrotask;
} else if (hasSetImmediate) {
  _defer = setImmediate;
} else if (hasNextTick) {
  _defer = process.nextTick;
} else {
  _defer = fallback;
}
var setImmediate$1 = wrap(_defer);
function asyncify(func) {
  if (isAsync(func)) {
    return function(...args) {
      const callback = args.pop();
      const promise = func.apply(this, args);
      return handlePromise(promise, callback);
    };
  }
  return initialParams(function(args, callback) {
    var result;
    try {
      result = func.apply(this, args);
    } catch (e) {
      return callback(e);
    }
    if (result && typeof result.then === "function") {
      return handlePromise(result, callback);
    } else {
      callback(null, result);
    }
  });
}
function handlePromise(promise, callback) {
  return promise.then((value) => {
    invokeCallback(callback, null, value);
  }, (err) => {
    invokeCallback(callback, err && err.message ? err : new Error(err));
  });
}
function invokeCallback(callback, error, value) {
  try {
    callback(error, value);
  } catch (err) {
    setImmediate$1((e) => {
      throw e;
    }, err);
  }
}
function isAsync(fn) {
  return fn[Symbol.toStringTag] === "AsyncFunction";
}
function isAsyncGenerator(fn) {
  return fn[Symbol.toStringTag] === "AsyncGenerator";
}
function isAsyncIterable(obj) {
  return typeof obj[Symbol.asyncIterator] === "function";
}
function wrapAsync(asyncFn) {
  if (typeof asyncFn !== "function")
    throw new Error("expected a function");
  return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
}
function awaitify(asyncFn, arity = asyncFn.length) {
  if (!arity)
    throw new Error("arity is undefined");
  function awaitable(...args) {
    if (typeof args[arity - 1] === "function") {
      return asyncFn.apply(this, args);
    }
    return new Promise((resolve, reject2) => {
      args[arity - 1] = (err, ...cbArgs) => {
        if (err)
          return reject2(err);
        resolve(cbArgs.length > 1 ? cbArgs : cbArgs[0]);
      };
      asyncFn.apply(this, args);
    });
  }
  return awaitable;
}
function applyEach(eachfn) {
  return function applyEach2(fns, ...callArgs) {
    const go = awaitify(function(callback) {
      var that = this;
      return eachfn(fns, (fn, cb) => {
        wrapAsync(fn).apply(that, callArgs.concat(cb));
      }, callback);
    });
    return go;
  };
}
function _asyncMap(eachfn, arr, iteratee, callback) {
  arr = arr || [];
  var results = [];
  var counter = 0;
  var _iteratee = wrapAsync(iteratee);
  return eachfn(arr, (value, _, iterCb) => {
    var index2 = counter++;
    _iteratee(value, (err, v) => {
      results[index2] = v;
      iterCb(err);
    });
  }, (err) => {
    callback(err, results);
  });
}
function isArrayLike(value) {
  return value && typeof value.length === "number" && value.length >= 0 && value.length % 1 === 0;
}
const breakLoop = {};
function once(fn) {
  function wrapper(...args) {
    if (fn === null)
      return;
    var callFn = fn;
    fn = null;
    callFn.apply(this, args);
  }
  Object.assign(wrapper, fn);
  return wrapper;
}
function getIterator(coll) {
  return coll[Symbol.iterator] && coll[Symbol.iterator]();
}
function createArrayIterator(coll) {
  var i = -1;
  var len = coll.length;
  return function next() {
    return ++i < len ? {value: coll[i], key: i} : null;
  };
}
function createES2015Iterator(iterator) {
  var i = -1;
  return function next() {
    var item = iterator.next();
    if (item.done)
      return null;
    i++;
    return {value: item.value, key: i};
  };
}
function createObjectIterator(obj) {
  var okeys = obj ? Object.keys(obj) : [];
  var i = -1;
  var len = okeys.length;
  return function next() {
    var key = okeys[++i];
    if (key === "__proto__") {
      return next();
    }
    return i < len ? {value: obj[key], key} : null;
  };
}
function createIterator(coll) {
  if (isArrayLike(coll)) {
    return createArrayIterator(coll);
  }
  var iterator = getIterator(coll);
  return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
}
function onlyOnce(fn) {
  return function(...args) {
    if (fn === null)
      throw new Error("Callback was already called.");
    var callFn = fn;
    fn = null;
    callFn.apply(this, args);
  };
}
function asyncEachOfLimit(generator, limit, iteratee, callback) {
  let done = false;
  let canceled = false;
  let awaiting = false;
  let running = 0;
  let idx = 0;
  function replenish() {
    if (running >= limit || awaiting || done)
      return;
    awaiting = true;
    generator.next().then(({value, done: iterDone}) => {
      if (canceled || done)
        return;
      awaiting = false;
      if (iterDone) {
        done = true;
        if (running <= 0) {
          callback(null);
        }
        return;
      }
      running++;
      iteratee(value, idx, iterateeCallback);
      idx++;
      replenish();
    }).catch(handleError);
  }
  function iterateeCallback(err, result) {
    running -= 1;
    if (canceled)
      return;
    if (err)
      return handleError(err);
    if (err === false) {
      done = true;
      canceled = true;
      return;
    }
    if (result === breakLoop || done && running <= 0) {
      done = true;
      return callback(null);
    }
    replenish();
  }
  function handleError(err) {
    if (canceled)
      return;
    awaiting = false;
    done = true;
    callback(err);
  }
  replenish();
}
var eachOfLimit = (limit) => {
  return (obj, iteratee, callback) => {
    callback = once(callback);
    if (limit <= 0) {
      throw new RangeError("concurrency limit cannot be less than 1");
    }
    if (!obj) {
      return callback(null);
    }
    if (isAsyncGenerator(obj)) {
      return asyncEachOfLimit(obj, limit, iteratee, callback);
    }
    if (isAsyncIterable(obj)) {
      return asyncEachOfLimit(obj[Symbol.asyncIterator](), limit, iteratee, callback);
    }
    var nextElem = createIterator(obj);
    var done = false;
    var canceled = false;
    var running = 0;
    var looping = false;
    function iterateeCallback(err, value) {
      if (canceled)
        return;
      running -= 1;
      if (err) {
        done = true;
        callback(err);
      } else if (err === false) {
        done = true;
        canceled = true;
      } else if (value === breakLoop || done && running <= 0) {
        done = true;
        return callback(null);
      } else if (!looping) {
        replenish();
      }
    }
    function replenish() {
      looping = true;
      while (running < limit && !done) {
        var elem = nextElem();
        if (elem === null) {
          done = true;
          if (running <= 0) {
            callback(null);
          }
          return;
        }
        running += 1;
        iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
      }
      looping = false;
    }
    replenish();
  };
};
function eachOfLimit$1(coll, limit, iteratee, callback) {
  return eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
}
var eachOfLimit$2 = awaitify(eachOfLimit$1, 4);
function eachOfArrayLike(coll, iteratee, callback) {
  callback = once(callback);
  var index2 = 0, completed = 0, {length} = coll, canceled = false;
  if (length === 0) {
    callback(null);
  }
  function iteratorCallback(err, value) {
    if (err === false) {
      canceled = true;
    }
    if (canceled === true)
      return;
    if (err) {
      callback(err);
    } else if (++completed === length || value === breakLoop) {
      callback(null);
    }
  }
  for (; index2 < length; index2++) {
    iteratee(coll[index2], index2, onlyOnce(iteratorCallback));
  }
}
function eachOfGeneric(coll, iteratee, callback) {
  return eachOfLimit$2(coll, Infinity, iteratee, callback);
}
function eachOf(coll, iteratee, callback) {
  var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
  return eachOfImplementation(coll, wrapAsync(iteratee), callback);
}
var eachOf$1 = awaitify(eachOf, 3);
function map(coll, iteratee, callback) {
  return _asyncMap(eachOf$1, coll, iteratee, callback);
}
var map$1 = awaitify(map, 3);
var applyEach$1 = applyEach(map$1);
function eachOfSeries(coll, iteratee, callback) {
  return eachOfLimit$2(coll, 1, iteratee, callback);
}
var eachOfSeries$1 = awaitify(eachOfSeries, 3);
function mapSeries(coll, iteratee, callback) {
  return _asyncMap(eachOfSeries$1, coll, iteratee, callback);
}
var mapSeries$1 = awaitify(mapSeries, 3);
var applyEachSeries = applyEach(mapSeries$1);
const PROMISE_SYMBOL = Symbol("promiseCallback");
function promiseCallback() {
  let resolve, reject2;
  function callback(err, ...args) {
    if (err)
      return reject2(err);
    resolve(args.length > 1 ? args : args[0]);
  }
  callback[PROMISE_SYMBOL] = new Promise((res, rej) => {
    resolve = res, reject2 = rej;
  });
  return callback;
}
function auto(tasks, concurrency, callback) {
  if (typeof concurrency !== "number") {
    callback = concurrency;
    concurrency = null;
  }
  callback = once(callback || promiseCallback());
  var numTasks = Object.keys(tasks).length;
  if (!numTasks) {
    return callback(null);
  }
  if (!concurrency) {
    concurrency = numTasks;
  }
  var results = {};
  var runningTasks = 0;
  var canceled = false;
  var hasError = false;
  var listeners = Object.create(null);
  var readyTasks = [];
  var readyToCheck = [];
  var uncheckedDependencies = {};
  Object.keys(tasks).forEach((key) => {
    var task = tasks[key];
    if (!Array.isArray(task)) {
      enqueueTask(key, [task]);
      readyToCheck.push(key);
      return;
    }
    var dependencies = task.slice(0, task.length - 1);
    var remainingDependencies = dependencies.length;
    if (remainingDependencies === 0) {
      enqueueTask(key, task);
      readyToCheck.push(key);
      return;
    }
    uncheckedDependencies[key] = remainingDependencies;
    dependencies.forEach((dependencyName) => {
      if (!tasks[dependencyName]) {
        throw new Error("async.auto task `" + key + "` has a non-existent dependency `" + dependencyName + "` in " + dependencies.join(", "));
      }
      addListener(dependencyName, () => {
        remainingDependencies--;
        if (remainingDependencies === 0) {
          enqueueTask(key, task);
        }
      });
    });
  });
  checkForDeadlocks();
  processQueue();
  function enqueueTask(key, task) {
    readyTasks.push(() => runTask(key, task));
  }
  function processQueue() {
    if (canceled)
      return;
    if (readyTasks.length === 0 && runningTasks === 0) {
      return callback(null, results);
    }
    while (readyTasks.length && runningTasks < concurrency) {
      var run = readyTasks.shift();
      run();
    }
  }
  function addListener(taskName, fn) {
    var taskListeners = listeners[taskName];
    if (!taskListeners) {
      taskListeners = listeners[taskName] = [];
    }
    taskListeners.push(fn);
  }
  function taskComplete(taskName) {
    var taskListeners = listeners[taskName] || [];
    taskListeners.forEach((fn) => fn());
    processQueue();
  }
  function runTask(key, task) {
    if (hasError)
      return;
    var taskCallback = onlyOnce((err, ...result) => {
      runningTasks--;
      if (err === false) {
        canceled = true;
        return;
      }
      if (result.length < 2) {
        [result] = result;
      }
      if (err) {
        var safeResults = {};
        Object.keys(results).forEach((rkey) => {
          safeResults[rkey] = results[rkey];
        });
        safeResults[key] = result;
        hasError = true;
        listeners = Object.create(null);
        if (canceled)
          return;
        callback(err, safeResults);
      } else {
        results[key] = result;
        taskComplete(key);
      }
    });
    runningTasks++;
    var taskFn = wrapAsync(task[task.length - 1]);
    if (task.length > 1) {
      taskFn(results, taskCallback);
    } else {
      taskFn(taskCallback);
    }
  }
  function checkForDeadlocks() {
    var currentTask;
    var counter = 0;
    while (readyToCheck.length) {
      currentTask = readyToCheck.pop();
      counter++;
      getDependents(currentTask).forEach((dependent) => {
        if (--uncheckedDependencies[dependent] === 0) {
          readyToCheck.push(dependent);
        }
      });
    }
    if (counter !== numTasks) {
      throw new Error("async.auto cannot execute tasks due to a recursive dependency");
    }
  }
  function getDependents(taskName) {
    var result = [];
    Object.keys(tasks).forEach((key) => {
      const task = tasks[key];
      if (Array.isArray(task) && task.indexOf(taskName) >= 0) {
        result.push(key);
      }
    });
    return result;
  }
  return callback[PROMISE_SYMBOL];
}
var FN_ARGS = /^(?:async\s+)?(?:function)?\s*\w*\s*\(\s*([^)]+)\s*\)(?:\s*{)/;
var ARROW_FN_ARGS = /^(?:async\s+)?\(?\s*([^)=]+)\s*\)?(?:\s*=>)/;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /(=.+)?(\s*)$/;
function stripComments(string) {
  let stripped = "";
  let index2 = 0;
  let endBlockComment = string.indexOf("*/");
  while (index2 < string.length) {
    if (string[index2] === "/" && string[index2 + 1] === "/") {
      let endIndex = string.indexOf("\n", index2);
      index2 = endIndex === -1 ? string.length : endIndex;
    } else if (endBlockComment !== -1 && string[index2] === "/" && string[index2 + 1] === "*") {
      let endIndex = string.indexOf("*/", index2);
      if (endIndex !== -1) {
        index2 = endIndex + 2;
        endBlockComment = string.indexOf("*/", index2);
      } else {
        stripped += string[index2];
        index2++;
      }
    } else {
      stripped += string[index2];
      index2++;
    }
  }
  return stripped;
}
function parseParams(func) {
  const src = stripComments(func.toString());
  let match = src.match(FN_ARGS);
  if (!match) {
    match = src.match(ARROW_FN_ARGS);
  }
  if (!match)
    throw new Error("could not parse args in autoInject\nSource:\n" + src);
  let [, args] = match;
  return args.replace(/\s/g, "").split(FN_ARG_SPLIT).map((arg) => arg.replace(FN_ARG, "").trim());
}
function autoInject(tasks, callback) {
  var newTasks = {};
  Object.keys(tasks).forEach((key) => {
    var taskFn = tasks[key];
    var params;
    var fnIsAsync = isAsync(taskFn);
    var hasNoDeps = !fnIsAsync && taskFn.length === 1 || fnIsAsync && taskFn.length === 0;
    if (Array.isArray(taskFn)) {
      params = [...taskFn];
      taskFn = params.pop();
      newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
    } else if (hasNoDeps) {
      newTasks[key] = taskFn;
    } else {
      params = parseParams(taskFn);
      if (taskFn.length === 0 && !fnIsAsync && params.length === 0) {
        throw new Error("autoInject task functions require explicit parameters.");
      }
      if (!fnIsAsync)
        params.pop();
      newTasks[key] = params.concat(newTask);
    }
    function newTask(results, taskCb) {
      var newArgs = params.map((name) => results[name]);
      newArgs.push(taskCb);
      wrapAsync(taskFn)(...newArgs);
    }
  });
  return auto(newTasks, callback);
}
class DLL {
  constructor() {
    this.head = this.tail = null;
    this.length = 0;
  }
  removeLink(node) {
    if (node.prev)
      node.prev.next = node.next;
    else
      this.head = node.next;
    if (node.next)
      node.next.prev = node.prev;
    else
      this.tail = node.prev;
    node.prev = node.next = null;
    this.length -= 1;
    return node;
  }
  empty() {
    while (this.head)
      this.shift();
    return this;
  }
  insertAfter(node, newNode) {
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next)
      node.next.prev = newNode;
    else
      this.tail = newNode;
    node.next = newNode;
    this.length += 1;
  }
  insertBefore(node, newNode) {
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev)
      node.prev.next = newNode;
    else
      this.head = newNode;
    node.prev = newNode;
    this.length += 1;
  }
  unshift(node) {
    if (this.head)
      this.insertBefore(this.head, node);
    else
      setInitial(this, node);
  }
  push(node) {
    if (this.tail)
      this.insertAfter(this.tail, node);
    else
      setInitial(this, node);
  }
  shift() {
    return this.head && this.removeLink(this.head);
  }
  pop() {
    return this.tail && this.removeLink(this.tail);
  }
  toArray() {
    return [...this];
  }
  *[Symbol.iterator]() {
    var cur = this.head;
    while (cur) {
      yield cur.data;
      cur = cur.next;
    }
  }
  remove(testFn) {
    var curr = this.head;
    while (curr) {
      var {next} = curr;
      if (testFn(curr)) {
        this.removeLink(curr);
      }
      curr = next;
    }
    return this;
  }
}
function setInitial(dll, node) {
  dll.length = 1;
  dll.head = dll.tail = node;
}
function queue(worker, concurrency, payload) {
  if (concurrency == null) {
    concurrency = 1;
  } else if (concurrency === 0) {
    throw new RangeError("Concurrency must not be zero");
  }
  var _worker = wrapAsync(worker);
  var numRunning = 0;
  var workersList = [];
  const events = {
    error: [],
    drain: [],
    saturated: [],
    unsaturated: [],
    empty: []
  };
  function on(event, handler) {
    events[event].push(handler);
  }
  function once2(event, handler) {
    const handleAndRemove = (...args) => {
      off(event, handleAndRemove);
      handler(...args);
    };
    events[event].push(handleAndRemove);
  }
  function off(event, handler) {
    if (!event)
      return Object.keys(events).forEach((ev) => events[ev] = []);
    if (!handler)
      return events[event] = [];
    events[event] = events[event].filter((ev) => ev !== handler);
  }
  function trigger(event, ...args) {
    events[event].forEach((handler) => handler(...args));
  }
  var processingScheduled = false;
  function _insert(data, insertAtFront, rejectOnError, callback) {
    if (callback != null && typeof callback !== "function") {
      throw new Error("task callback must be a function");
    }
    q.started = true;
    var res, rej;
    function promiseCallback2(err, ...args) {
      if (err)
        return rejectOnError ? rej(err) : res();
      if (args.length <= 1)
        return res(args[0]);
      res(args);
    }
    var item = {
      data,
      callback: rejectOnError ? promiseCallback2 : callback || promiseCallback2
    };
    if (insertAtFront) {
      q._tasks.unshift(item);
    } else {
      q._tasks.push(item);
    }
    if (!processingScheduled) {
      processingScheduled = true;
      setImmediate$1(() => {
        processingScheduled = false;
        q.process();
      });
    }
    if (rejectOnError || !callback) {
      return new Promise((resolve, reject2) => {
        res = resolve;
        rej = reject2;
      });
    }
  }
  function _createCB(tasks) {
    return function(err, ...args) {
      numRunning -= 1;
      for (var i = 0, l = tasks.length; i < l; i++) {
        var task = tasks[i];
        var index2 = workersList.indexOf(task);
        if (index2 === 0) {
          workersList.shift();
        } else if (index2 > 0) {
          workersList.splice(index2, 1);
        }
        task.callback(err, ...args);
        if (err != null) {
          trigger("error", err, task.data);
        }
      }
      if (numRunning <= q.concurrency - q.buffer) {
        trigger("unsaturated");
      }
      if (q.idle()) {
        trigger("drain");
      }
      q.process();
    };
  }
  function _maybeDrain(data) {
    if (data.length === 0 && q.idle()) {
      setImmediate$1(() => trigger("drain"));
      return true;
    }
    return false;
  }
  const eventMethod = (name) => (handler) => {
    if (!handler) {
      return new Promise((resolve, reject2) => {
        once2(name, (err, data) => {
          if (err)
            return reject2(err);
          resolve(data);
        });
      });
    }
    off(name);
    on(name, handler);
  };
  var isProcessing = false;
  var q = {
    _tasks: new DLL(),
    *[Symbol.iterator]() {
      yield* q._tasks[Symbol.iterator]();
    },
    concurrency,
    payload,
    buffer: concurrency / 4,
    started: false,
    paused: false,
    push(data, callback) {
      if (Array.isArray(data)) {
        if (_maybeDrain(data))
          return;
        return data.map((datum) => _insert(datum, false, false, callback));
      }
      return _insert(data, false, false, callback);
    },
    pushAsync(data, callback) {
      if (Array.isArray(data)) {
        if (_maybeDrain(data))
          return;
        return data.map((datum) => _insert(datum, false, true, callback));
      }
      return _insert(data, false, true, callback);
    },
    kill() {
      off();
      q._tasks.empty();
    },
    unshift(data, callback) {
      if (Array.isArray(data)) {
        if (_maybeDrain(data))
          return;
        return data.map((datum) => _insert(datum, true, false, callback));
      }
      return _insert(data, true, false, callback);
    },
    unshiftAsync(data, callback) {
      if (Array.isArray(data)) {
        if (_maybeDrain(data))
          return;
        return data.map((datum) => _insert(datum, true, true, callback));
      }
      return _insert(data, true, true, callback);
    },
    remove(testFn) {
      q._tasks.remove(testFn);
    },
    process() {
      if (isProcessing) {
        return;
      }
      isProcessing = true;
      while (!q.paused && numRunning < q.concurrency && q._tasks.length) {
        var tasks = [], data = [];
        var l = q._tasks.length;
        if (q.payload)
          l = Math.min(l, q.payload);
        for (var i = 0; i < l; i++) {
          var node = q._tasks.shift();
          tasks.push(node);
          workersList.push(node);
          data.push(node.data);
        }
        numRunning += 1;
        if (q._tasks.length === 0) {
          trigger("empty");
        }
        if (numRunning === q.concurrency) {
          trigger("saturated");
        }
        var cb = onlyOnce(_createCB(tasks));
        _worker(data, cb);
      }
      isProcessing = false;
    },
    length() {
      return q._tasks.length;
    },
    running() {
      return numRunning;
    },
    workersList() {
      return workersList;
    },
    idle() {
      return q._tasks.length + numRunning === 0;
    },
    pause() {
      q.paused = true;
    },
    resume() {
      if (q.paused === false) {
        return;
      }
      q.paused = false;
      setImmediate$1(q.process);
    }
  };
  Object.defineProperties(q, {
    saturated: {
      writable: false,
      value: eventMethod("saturated")
    },
    unsaturated: {
      writable: false,
      value: eventMethod("unsaturated")
    },
    empty: {
      writable: false,
      value: eventMethod("empty")
    },
    drain: {
      writable: false,
      value: eventMethod("drain")
    },
    error: {
      writable: false,
      value: eventMethod("error")
    }
  });
  return q;
}
function cargo(worker, payload) {
  return queue(worker, 1, payload);
}
function cargo$1(worker, concurrency, payload) {
  return queue(worker, concurrency, payload);
}
function reduce(coll, memo, iteratee, callback) {
  callback = once(callback);
  var _iteratee = wrapAsync(iteratee);
  return eachOfSeries$1(coll, (x, i, iterCb) => {
    _iteratee(memo, x, (err, v) => {
      memo = v;
      iterCb(err);
    });
  }, (err) => callback(err, memo));
}
var reduce$1 = awaitify(reduce, 4);
function seq(...functions) {
  var _functions = functions.map(wrapAsync);
  return function(...args) {
    var that = this;
    var cb = args[args.length - 1];
    if (typeof cb == "function") {
      args.pop();
    } else {
      cb = promiseCallback();
    }
    reduce$1(_functions, args, (newargs, fn, iterCb) => {
      fn.apply(that, newargs.concat((err, ...nextargs) => {
        iterCb(err, nextargs);
      }));
    }, (err, results) => cb(err, ...results));
    return cb[PROMISE_SYMBOL];
  };
}
function compose(...args) {
  return seq(...args.reverse());
}
function mapLimit(coll, limit, iteratee, callback) {
  return _asyncMap(eachOfLimit(limit), coll, iteratee, callback);
}
var mapLimit$1 = awaitify(mapLimit, 4);
function concatLimit(coll, limit, iteratee, callback) {
  var _iteratee = wrapAsync(iteratee);
  return mapLimit$1(coll, limit, (val, iterCb) => {
    _iteratee(val, (err, ...args) => {
      if (err)
        return iterCb(err);
      return iterCb(err, args);
    });
  }, (err, mapResults) => {
    var result = [];
    for (var i = 0; i < mapResults.length; i++) {
      if (mapResults[i]) {
        result = result.concat(...mapResults[i]);
      }
    }
    return callback(err, result);
  });
}
var concatLimit$1 = awaitify(concatLimit, 4);
function concat(coll, iteratee, callback) {
  return concatLimit$1(coll, Infinity, iteratee, callback);
}
var concat$1 = awaitify(concat, 3);
function concatSeries(coll, iteratee, callback) {
  return concatLimit$1(coll, 1, iteratee, callback);
}
var concatSeries$1 = awaitify(concatSeries, 3);
function constant(...args) {
  return function(...ignoredArgs) {
    var callback = ignoredArgs.pop();
    return callback(null, ...args);
  };
}
function _createTester(check, getResult) {
  return (eachfn, arr, _iteratee, cb) => {
    var testPassed = false;
    var testResult;
    const iteratee = wrapAsync(_iteratee);
    eachfn(arr, (value, _, callback) => {
      iteratee(value, (err, result) => {
        if (err || err === false)
          return callback(err);
        if (check(result) && !testResult) {
          testPassed = true;
          testResult = getResult(true, value);
          return callback(null, breakLoop);
        }
        callback();
      });
    }, (err) => {
      if (err)
        return cb(err);
      cb(null, testPassed ? testResult : getResult(false));
    });
  };
}
function detect(coll, iteratee, callback) {
  return _createTester((bool) => bool, (res, item) => item)(eachOf$1, coll, iteratee, callback);
}
var detect$1 = awaitify(detect, 3);
function detectLimit(coll, limit, iteratee, callback) {
  return _createTester((bool) => bool, (res, item) => item)(eachOfLimit(limit), coll, iteratee, callback);
}
var detectLimit$1 = awaitify(detectLimit, 4);
function detectSeries(coll, iteratee, callback) {
  return _createTester((bool) => bool, (res, item) => item)(eachOfLimit(1), coll, iteratee, callback);
}
var detectSeries$1 = awaitify(detectSeries, 3);
function consoleFunc(name) {
  return (fn, ...args) => wrapAsync(fn)(...args, (err, ...resultArgs) => {
    if (typeof console === "object") {
      if (err) {
        if (console.error) {
          console.error(err);
        }
      } else if (console[name]) {
        resultArgs.forEach((x) => console[name](x));
      }
    }
  });
}
var dir = consoleFunc("dir");
function doWhilst(iteratee, test, callback) {
  callback = onlyOnce(callback);
  var _fn = wrapAsync(iteratee);
  var _test = wrapAsync(test);
  var results;
  function next(err, ...args) {
    if (err)
      return callback(err);
    if (err === false)
      return;
    results = args;
    _test(...args, check);
  }
  function check(err, truth) {
    if (err)
      return callback(err);
    if (err === false)
      return;
    if (!truth)
      return callback(null, ...results);
    _fn(next);
  }
  return check(null, true);
}
var doWhilst$1 = awaitify(doWhilst, 3);
function doUntil(iteratee, test, callback) {
  const _test = wrapAsync(test);
  return doWhilst$1(iteratee, (...args) => {
    const cb = args.pop();
    _test(...args, (err, truth) => cb(err, !truth));
  }, callback);
}
function _withoutIndex(iteratee) {
  return (value, index2, callback) => iteratee(value, callback);
}
function eachLimit(coll, iteratee, callback) {
  return eachOf$1(coll, _withoutIndex(wrapAsync(iteratee)), callback);
}
var each = awaitify(eachLimit, 3);
function eachLimit$1(coll, limit, iteratee, callback) {
  return eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
}
var eachLimit$2 = awaitify(eachLimit$1, 4);
function eachSeries(coll, iteratee, callback) {
  return eachLimit$2(coll, 1, iteratee, callback);
}
var eachSeries$1 = awaitify(eachSeries, 3);
function ensureAsync(fn) {
  if (isAsync(fn))
    return fn;
  return function(...args) {
    var callback = args.pop();
    var sync = true;
    args.push((...innerArgs) => {
      if (sync) {
        setImmediate$1(() => callback(...innerArgs));
      } else {
        callback(...innerArgs);
      }
    });
    fn.apply(this, args);
    sync = false;
  };
}
function every(coll, iteratee, callback) {
  return _createTester((bool) => !bool, (res) => !res)(eachOf$1, coll, iteratee, callback);
}
var every$1 = awaitify(every, 3);
function everyLimit(coll, limit, iteratee, callback) {
  return _createTester((bool) => !bool, (res) => !res)(eachOfLimit(limit), coll, iteratee, callback);
}
var everyLimit$1 = awaitify(everyLimit, 4);
function everySeries(coll, iteratee, callback) {
  return _createTester((bool) => !bool, (res) => !res)(eachOfSeries$1, coll, iteratee, callback);
}
var everySeries$1 = awaitify(everySeries, 3);
function filterArray(eachfn, arr, iteratee, callback) {
  var truthValues = new Array(arr.length);
  eachfn(arr, (x, index2, iterCb) => {
    iteratee(x, (err, v) => {
      truthValues[index2] = !!v;
      iterCb(err);
    });
  }, (err) => {
    if (err)
      return callback(err);
    var results = [];
    for (var i = 0; i < arr.length; i++) {
      if (truthValues[i])
        results.push(arr[i]);
    }
    callback(null, results);
  });
}
function filterGeneric(eachfn, coll, iteratee, callback) {
  var results = [];
  eachfn(coll, (x, index2, iterCb) => {
    iteratee(x, (err, v) => {
      if (err)
        return iterCb(err);
      if (v) {
        results.push({index: index2, value: x});
      }
      iterCb(err);
    });
  }, (err) => {
    if (err)
      return callback(err);
    callback(null, results.sort((a, b) => a.index - b.index).map((v) => v.value));
  });
}
function _filter(eachfn, coll, iteratee, callback) {
  var filter2 = isArrayLike(coll) ? filterArray : filterGeneric;
  return filter2(eachfn, coll, wrapAsync(iteratee), callback);
}
function filter(coll, iteratee, callback) {
  return _filter(eachOf$1, coll, iteratee, callback);
}
var filter$1 = awaitify(filter, 3);
function filterLimit(coll, limit, iteratee, callback) {
  return _filter(eachOfLimit(limit), coll, iteratee, callback);
}
var filterLimit$1 = awaitify(filterLimit, 4);
function filterSeries(coll, iteratee, callback) {
  return _filter(eachOfSeries$1, coll, iteratee, callback);
}
var filterSeries$1 = awaitify(filterSeries, 3);
function forever(fn, errback) {
  var done = onlyOnce(errback);
  var task = wrapAsync(ensureAsync(fn));
  function next(err) {
    if (err)
      return done(err);
    if (err === false)
      return;
    task(next);
  }
  return next();
}
var forever$1 = awaitify(forever, 2);
function groupByLimit(coll, limit, iteratee, callback) {
  var _iteratee = wrapAsync(iteratee);
  return mapLimit$1(coll, limit, (val, iterCb) => {
    _iteratee(val, (err, key) => {
      if (err)
        return iterCb(err);
      return iterCb(err, {key, val});
    });
  }, (err, mapResults) => {
    var result = {};
    var {hasOwnProperty} = Object.prototype;
    for (var i = 0; i < mapResults.length; i++) {
      if (mapResults[i]) {
        var {key} = mapResults[i];
        var {val} = mapResults[i];
        if (hasOwnProperty.call(result, key)) {
          result[key].push(val);
        } else {
          result[key] = [val];
        }
      }
    }
    return callback(err, result);
  });
}
var groupByLimit$1 = awaitify(groupByLimit, 4);
function groupBy(coll, iteratee, callback) {
  return groupByLimit$1(coll, Infinity, iteratee, callback);
}
function groupBySeries(coll, iteratee, callback) {
  return groupByLimit$1(coll, 1, iteratee, callback);
}
var log = consoleFunc("log");
function mapValuesLimit(obj, limit, iteratee, callback) {
  callback = once(callback);
  var newObj = {};
  var _iteratee = wrapAsync(iteratee);
  return eachOfLimit(limit)(obj, (val, key, next) => {
    _iteratee(val, key, (err, result) => {
      if (err)
        return next(err);
      newObj[key] = result;
      next(err);
    });
  }, (err) => callback(err, newObj));
}
var mapValuesLimit$1 = awaitify(mapValuesLimit, 4);
function mapValues(obj, iteratee, callback) {
  return mapValuesLimit$1(obj, Infinity, iteratee, callback);
}
function mapValuesSeries(obj, iteratee, callback) {
  return mapValuesLimit$1(obj, 1, iteratee, callback);
}
function memoize(fn, hasher = (v) => v) {
  var memo = Object.create(null);
  var queues = Object.create(null);
  var _fn = wrapAsync(fn);
  var memoized = initialParams((args, callback) => {
    var key = hasher(...args);
    if (key in memo) {
      setImmediate$1(() => callback(null, ...memo[key]));
    } else if (key in queues) {
      queues[key].push(callback);
    } else {
      queues[key] = [callback];
      _fn(...args, (err, ...resultArgs) => {
        if (!err) {
          memo[key] = resultArgs;
        }
        var q = queues[key];
        delete queues[key];
        for (var i = 0, l = q.length; i < l; i++) {
          q[i](err, ...resultArgs);
        }
      });
    }
  });
  memoized.memo = memo;
  memoized.unmemoized = fn;
  return memoized;
}
var _defer$1;
if (hasNextTick) {
  _defer$1 = process.nextTick;
} else if (hasSetImmediate) {
  _defer$1 = setImmediate;
} else {
  _defer$1 = fallback;
}
var nextTick = wrap(_defer$1);
var _parallel = awaitify((eachfn, tasks, callback) => {
  var results = isArrayLike(tasks) ? [] : {};
  eachfn(tasks, (task, key, taskCb) => {
    wrapAsync(task)((err, ...result) => {
      if (result.length < 2) {
        [result] = result;
      }
      results[key] = result;
      taskCb(err);
    });
  }, (err) => callback(err, results));
}, 3);
function parallel(tasks, callback) {
  return _parallel(eachOf$1, tasks, callback);
}
function parallelLimit(tasks, limit, callback) {
  return _parallel(eachOfLimit(limit), tasks, callback);
}
function queue$1(worker, concurrency) {
  var _worker = wrapAsync(worker);
  return queue((items, cb) => {
    _worker(items[0], cb);
  }, concurrency, 1);
}
class Heap {
  constructor() {
    this.heap = [];
    this.pushCount = Number.MIN_SAFE_INTEGER;
  }
  get length() {
    return this.heap.length;
  }
  empty() {
    this.heap = [];
    return this;
  }
  percUp(index2) {
    let p;
    while (index2 > 0 && smaller(this.heap[index2], this.heap[p = parent(index2)])) {
      let t = this.heap[index2];
      this.heap[index2] = this.heap[p];
      this.heap[p] = t;
      index2 = p;
    }
  }
  percDown(index2) {
    let l;
    while ((l = leftChi(index2)) < this.heap.length) {
      if (l + 1 < this.heap.length && smaller(this.heap[l + 1], this.heap[l])) {
        l = l + 1;
      }
      if (smaller(this.heap[index2], this.heap[l])) {
        break;
      }
      let t = this.heap[index2];
      this.heap[index2] = this.heap[l];
      this.heap[l] = t;
      index2 = l;
    }
  }
  push(node) {
    node.pushCount = ++this.pushCount;
    this.heap.push(node);
    this.percUp(this.heap.length - 1);
  }
  unshift(node) {
    return this.heap.push(node);
  }
  shift() {
    let [top] = this.heap;
    this.heap[0] = this.heap[this.heap.length - 1];
    this.heap.pop();
    this.percDown(0);
    return top;
  }
  toArray() {
    return [...this];
  }
  *[Symbol.iterator]() {
    for (let i = 0; i < this.heap.length; i++) {
      yield this.heap[i].data;
    }
  }
  remove(testFn) {
    let j = 0;
    for (let i = 0; i < this.heap.length; i++) {
      if (!testFn(this.heap[i])) {
        this.heap[j] = this.heap[i];
        j++;
      }
    }
    this.heap.splice(j);
    for (let i = parent(this.heap.length - 1); i >= 0; i--) {
      this.percDown(i);
    }
    return this;
  }
}
function leftChi(i) {
  return (i << 1) + 1;
}
function parent(i) {
  return (i + 1 >> 1) - 1;
}
function smaller(x, y) {
  if (x.priority !== y.priority) {
    return x.priority < y.priority;
  } else {
    return x.pushCount < y.pushCount;
  }
}
function priorityQueue(worker, concurrency) {
  var q = queue$1(worker, concurrency);
  var processingScheduled = false;
  q._tasks = new Heap();
  q.push = function(data, priority = 0, callback = () => {
  }) {
    if (typeof callback !== "function") {
      throw new Error("task callback must be a function");
    }
    q.started = true;
    if (!Array.isArray(data)) {
      data = [data];
    }
    if (data.length === 0 && q.idle()) {
      return setImmediate$1(() => q.drain());
    }
    for (var i = 0, l = data.length; i < l; i++) {
      var item = {
        data: data[i],
        priority,
        callback
      };
      q._tasks.push(item);
    }
    if (!processingScheduled) {
      processingScheduled = true;
      setImmediate$1(() => {
        processingScheduled = false;
        q.process();
      });
    }
  };
  delete q.unshift;
  return q;
}
function race(tasks, callback) {
  callback = once(callback);
  if (!Array.isArray(tasks))
    return callback(new TypeError("First argument to race must be an array of functions"));
  if (!tasks.length)
    return callback();
  for (var i = 0, l = tasks.length; i < l; i++) {
    wrapAsync(tasks[i])(callback);
  }
}
var race$1 = awaitify(race, 2);
function reduceRight(array, memo, iteratee, callback) {
  var reversed = [...array].reverse();
  return reduce$1(reversed, memo, iteratee, callback);
}
function reflect(fn) {
  var _fn = wrapAsync(fn);
  return initialParams(function reflectOn(args, reflectCallback) {
    args.push((error, ...cbArgs) => {
      let retVal = {};
      if (error) {
        retVal.error = error;
      }
      if (cbArgs.length > 0) {
        var value = cbArgs;
        if (cbArgs.length <= 1) {
          [value] = cbArgs;
        }
        retVal.value = value;
      }
      reflectCallback(null, retVal);
    });
    return _fn.apply(this, args);
  });
}
function reflectAll(tasks) {
  var results;
  if (Array.isArray(tasks)) {
    results = tasks.map(reflect);
  } else {
    results = {};
    Object.keys(tasks).forEach((key) => {
      results[key] = reflect.call(this, tasks[key]);
    });
  }
  return results;
}
function reject(eachfn, arr, _iteratee, callback) {
  const iteratee = wrapAsync(_iteratee);
  return _filter(eachfn, arr, (value, cb) => {
    iteratee(value, (err, v) => {
      cb(err, !v);
    });
  }, callback);
}
function reject$1(coll, iteratee, callback) {
  return reject(eachOf$1, coll, iteratee, callback);
}
var reject$2 = awaitify(reject$1, 3);
function rejectLimit(coll, limit, iteratee, callback) {
  return reject(eachOfLimit(limit), coll, iteratee, callback);
}
var rejectLimit$1 = awaitify(rejectLimit, 4);
function rejectSeries(coll, iteratee, callback) {
  return reject(eachOfSeries$1, coll, iteratee, callback);
}
var rejectSeries$1 = awaitify(rejectSeries, 3);
function constant$1(value) {
  return function() {
    return value;
  };
}
const DEFAULT_TIMES = 5;
const DEFAULT_INTERVAL = 0;
function retry(opts, task, callback) {
  var options = {
    times: DEFAULT_TIMES,
    intervalFunc: constant$1(DEFAULT_INTERVAL)
  };
  if (arguments.length < 3 && typeof opts === "function") {
    callback = task || promiseCallback();
    task = opts;
  } else {
    parseTimes(options, opts);
    callback = callback || promiseCallback();
  }
  if (typeof task !== "function") {
    throw new Error("Invalid arguments for async.retry");
  }
  var _task = wrapAsync(task);
  var attempt = 1;
  function retryAttempt() {
    _task((err, ...args) => {
      if (err === false)
        return;
      if (err && attempt++ < options.times && (typeof options.errorFilter != "function" || options.errorFilter(err))) {
        setTimeout(retryAttempt, options.intervalFunc(attempt - 1));
      } else {
        callback(err, ...args);
      }
    });
  }
  retryAttempt();
  return callback[PROMISE_SYMBOL];
}
function parseTimes(acc, t) {
  if (typeof t === "object") {
    acc.times = +t.times || DEFAULT_TIMES;
    acc.intervalFunc = typeof t.interval === "function" ? t.interval : constant$1(+t.interval || DEFAULT_INTERVAL);
    acc.errorFilter = t.errorFilter;
  } else if (typeof t === "number" || typeof t === "string") {
    acc.times = +t || DEFAULT_TIMES;
  } else {
    throw new Error("Invalid arguments for async.retry");
  }
}
function retryable(opts, task) {
  if (!task) {
    task = opts;
    opts = null;
  }
  let arity = opts && opts.arity || task.length;
  if (isAsync(task)) {
    arity += 1;
  }
  var _task = wrapAsync(task);
  return initialParams((args, callback) => {
    if (args.length < arity - 1 || callback == null) {
      args.push(callback);
      callback = promiseCallback();
    }
    function taskFn(cb) {
      _task(...args, cb);
    }
    if (opts)
      retry(opts, taskFn, callback);
    else
      retry(taskFn, callback);
    return callback[PROMISE_SYMBOL];
  });
}
function series(tasks, callback) {
  return _parallel(eachOfSeries$1, tasks, callback);
}
function some(coll, iteratee, callback) {
  return _createTester(Boolean, (res) => res)(eachOf$1, coll, iteratee, callback);
}
var some$1 = awaitify(some, 3);
function someLimit(coll, limit, iteratee, callback) {
  return _createTester(Boolean, (res) => res)(eachOfLimit(limit), coll, iteratee, callback);
}
var someLimit$1 = awaitify(someLimit, 4);
function someSeries(coll, iteratee, callback) {
  return _createTester(Boolean, (res) => res)(eachOfSeries$1, coll, iteratee, callback);
}
var someSeries$1 = awaitify(someSeries, 3);
function sortBy(coll, iteratee, callback) {
  var _iteratee = wrapAsync(iteratee);
  return map$1(coll, (x, iterCb) => {
    _iteratee(x, (err, criteria) => {
      if (err)
        return iterCb(err);
      iterCb(err, {value: x, criteria});
    });
  }, (err, results) => {
    if (err)
      return callback(err);
    callback(null, results.sort(comparator).map((v) => v.value));
  });
  function comparator(left, right) {
    var a = left.criteria, b = right.criteria;
    return a < b ? -1 : a > b ? 1 : 0;
  }
}
var sortBy$1 = awaitify(sortBy, 3);
function timeout(asyncFn, milliseconds, info) {
  var fn = wrapAsync(asyncFn);
  return initialParams((args, callback) => {
    var timedOut = false;
    var timer;
    function timeoutCallback() {
      var name = asyncFn.name || "anonymous";
      var error = new Error('Callback function "' + name + '" timed out.');
      error.code = "ETIMEDOUT";
      if (info) {
        error.info = info;
      }
      timedOut = true;
      callback(error);
    }
    args.push((...cbArgs) => {
      if (!timedOut) {
        callback(...cbArgs);
        clearTimeout(timer);
      }
    });
    timer = setTimeout(timeoutCallback, milliseconds);
    fn(...args);
  });
}
function range(size) {
  var result = Array(size);
  while (size--) {
    result[size] = size;
  }
  return result;
}
function timesLimit(count, limit, iteratee, callback) {
  var _iteratee = wrapAsync(iteratee);
  return mapLimit$1(range(count), limit, _iteratee, callback);
}
function times(n, iteratee, callback) {
  return timesLimit(n, Infinity, iteratee, callback);
}
function timesSeries(n, iteratee, callback) {
  return timesLimit(n, 1, iteratee, callback);
}
function transform(coll, accumulator, iteratee, callback) {
  if (arguments.length <= 3 && typeof accumulator === "function") {
    callback = iteratee;
    iteratee = accumulator;
    accumulator = Array.isArray(coll) ? [] : {};
  }
  callback = once(callback || promiseCallback());
  var _iteratee = wrapAsync(iteratee);
  eachOf$1(coll, (v, k, cb) => {
    _iteratee(accumulator, v, k, cb);
  }, (err) => callback(err, accumulator));
  return callback[PROMISE_SYMBOL];
}
function tryEach(tasks, callback) {
  var error = null;
  var result;
  return eachSeries$1(tasks, (task, taskCb) => {
    wrapAsync(task)((err, ...args) => {
      if (err === false)
        return taskCb(err);
      if (args.length < 2) {
        [result] = args;
      } else {
        result = args;
      }
      error = err;
      taskCb(err ? null : {});
    });
  }, () => callback(error, result));
}
var tryEach$1 = awaitify(tryEach);
function unmemoize(fn) {
  return (...args) => {
    return (fn.unmemoized || fn)(...args);
  };
}
function whilst(test, iteratee, callback) {
  callback = onlyOnce(callback);
  var _fn = wrapAsync(iteratee);
  var _test = wrapAsync(test);
  var results = [];
  function next(err, ...rest) {
    if (err)
      return callback(err);
    results = rest;
    if (err === false)
      return;
    _test(check);
  }
  function check(err, truth) {
    if (err)
      return callback(err);
    if (err === false)
      return;
    if (!truth)
      return callback(null, ...results);
    _fn(next);
  }
  return _test(check);
}
var whilst$1 = awaitify(whilst, 3);
function until(test, iteratee, callback) {
  const _test = wrapAsync(test);
  return whilst$1((cb) => _test((err, truth) => cb(err, !truth)), iteratee, callback);
}
function waterfall(tasks, callback) {
  callback = once(callback);
  if (!Array.isArray(tasks))
    return callback(new Error("First argument to waterfall must be an array of functions"));
  if (!tasks.length)
    return callback();
  var taskIndex = 0;
  function nextTask(args) {
    var task = wrapAsync(tasks[taskIndex++]);
    task(...args, onlyOnce(next));
  }
  function next(err, ...args) {
    if (err === false)
      return;
    if (err || taskIndex === tasks.length) {
      return callback(err, ...args);
    }
    nextTask(args);
  }
  nextTask([]);
}
var waterfall$1 = awaitify(waterfall);
var index = {
  apply,
  applyEach: applyEach$1,
  applyEachSeries,
  asyncify,
  auto,
  autoInject,
  cargo,
  cargoQueue: cargo$1,
  compose,
  concat: concat$1,
  concatLimit: concatLimit$1,
  concatSeries: concatSeries$1,
  constant,
  detect: detect$1,
  detectLimit: detectLimit$1,
  detectSeries: detectSeries$1,
  dir,
  doUntil,
  doWhilst: doWhilst$1,
  each,
  eachLimit: eachLimit$2,
  eachOf: eachOf$1,
  eachOfLimit: eachOfLimit$2,
  eachOfSeries: eachOfSeries$1,
  eachSeries: eachSeries$1,
  ensureAsync,
  every: every$1,
  everyLimit: everyLimit$1,
  everySeries: everySeries$1,
  filter: filter$1,
  filterLimit: filterLimit$1,
  filterSeries: filterSeries$1,
  forever: forever$1,
  groupBy,
  groupByLimit: groupByLimit$1,
  groupBySeries,
  log,
  map: map$1,
  mapLimit: mapLimit$1,
  mapSeries: mapSeries$1,
  mapValues,
  mapValuesLimit: mapValuesLimit$1,
  mapValuesSeries,
  memoize,
  nextTick,
  parallel,
  parallelLimit,
  priorityQueue,
  queue: queue$1,
  race: race$1,
  reduce: reduce$1,
  reduceRight,
  reflect,
  reflectAll,
  reject: reject$2,
  rejectLimit: rejectLimit$1,
  rejectSeries: rejectSeries$1,
  retry,
  retryable,
  seq,
  series,
  setImmediate: setImmediate$1,
  some: some$1,
  someLimit: someLimit$1,
  someSeries: someSeries$1,
  sortBy: sortBy$1,
  timeout,
  times,
  timesLimit,
  timesSeries,
  transform,
  tryEach: tryEach$1,
  unmemoize,
  until,
  waterfall: waterfall$1,
  whilst: whilst$1,
  all: every$1,
  allLimit: everyLimit$1,
  allSeries: everySeries$1,
  any: some$1,
  anyLimit: someLimit$1,
  anySeries: someSeries$1,
  find: detect$1,
  findLimit: detectLimit$1,
  findSeries: detectSeries$1,
  flatMap: concat$1,
  flatMapLimit: concatLimit$1,
  flatMapSeries: concatSeries$1,
  forEach: each,
  forEachSeries: eachSeries$1,
  forEachLimit: eachLimit$2,
  forEachOf: eachOf$1,
  forEachOfSeries: eachOfSeries$1,
  forEachOfLimit: eachOfLimit$2,
  inject: reduce$1,
  foldl: reduce$1,
  foldr: reduceRight,
  select: filter$1,
  selectLimit: filterLimit$1,
  selectSeries: filterSeries$1,
  wrapSync: asyncify,
  during: whilst$1,
  doDuring: doWhilst$1
};

function convertToJson(n3String, jsonCallback) {
  var jsonString;
  var n3Parser = new N3Parser();
  var n3Writer = new N3Writer({
    format: 'N-Quads'
  });
  index.waterfall([function (callback) {
    n3Parser.parse(n3String, function (error, quad, prefixes) {
      if (error) {
        callback(error);
      } else if (quad !== null) {
        n3Writer.addQuad(quad);
      } else {
        n3Writer.end(callback);
      }
    });
  }, function (result, callback) {
    try {
      jsonld.fromRDF(result, {
        format: 'application/nquads'
      }).then(function (result) {
        callback(null, result);
      });
    } catch (err) {
      callback(err);
    }
  }, function (json, callback) {
    jsonString = JSON.stringify(json);
    jsonCallback(null, jsonString);
  }], function (err, result) {
    jsonCallback(err, jsonString);
  });
}
function convertToNQuads(n3String, nquadCallback) {
  var nquadString;
  var n3Parser = new N3Parser();
  var n3Writer = new N3Writer({
    format: 'N-Quads'
  });
  index.waterfall([function (callback) {
    n3Parser.parse(n3String, function (error, triple, prefixes) {
      if (error) {
        callback(error);
      } else if (quad !== null) {
        n3Writer.addQuad(quad);
      } else {
        n3Writer.end(callback);
      }
    });
  }, function (result, callback) {
    nquadString = result;
    nquadCallback(null, nquadString);
  }], function (err, result) {
    nquadCallback(err, nquadString);
  });
}

var convert = /*#__PURE__*/Object.freeze({
  __proto__: null,
  convertToJson: convertToJson,
  convertToNQuads: convertToNQuads
});

function _createSuper$4(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$4(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$4() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
* An empty node
*/
var Empty = /*#__PURE__*/function (_Node) {
  _inherits(Empty, _Node);

  var _super = _createSuper$4(Empty);

  function Empty() {
    var _this;

    _classCallCheck(this, Empty);

    _this = _super.call(this, '');

    _defineProperty(_assertThisInitialized(_this), "termType", EmptyTermType);

    return _this;
  }

  _createClass(Empty, [{
    key: "toString",
    value: function toString() {
      return '()';
    }
  }]);

  return Empty;
}(Node$2);

var asyncToGenerator = createCommonjsModule(function (module) {
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

module.exports = _asyncToGenerator, module.exports.__esModule = true, module.exports["default"] = module.exports;
});

var _asyncToGenerator = /*@__PURE__*/getDefaultExportFromCjs(asyncToGenerator);

var runtime_1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined$1; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  define(Gp, "constructor", GeneratorFunctionPrototype);
  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  });
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined$1) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined$1;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined$1;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  define(Gp, iteratorSymbol, function() {
    return this;
  });

  define(Gp, "toString", function() {
    return "[object Generator]";
  });

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined$1;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined$1, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined$1;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined$1;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined$1;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined$1;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined$1;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   module.exports 
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, in modern engines
  // we can explicitly access globalThis. In older engines we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  if (typeof globalThis === "object") {
    globalThis.regeneratorRuntime = runtime;
  } else {
    Function("r", "regeneratorRuntime = r")(runtime);
  }
}
});

var regenerator = runtime_1;

// Prevents circular dependencies between data-factory-internal and statement
var defaultGraphURI = 'chrome:theSession';
var defaultGraphNode = new NamedNode(defaultGraphURI);

function _createSuper$5(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$5(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$5() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
/** The RDF default graph */

var DefaultGraph = /*#__PURE__*/function (_Node) {
  _inherits(DefaultGraph, _Node);

  var _super = _createSuper$5(DefaultGraph);

  function DefaultGraph() {
    var _this;

    _classCallCheck(this, DefaultGraph);

    _this = _super.call(this, '');

    _defineProperty(_assertThisInitialized(_this), "value", '');

    _defineProperty(_assertThisInitialized(_this), "termType", DefaultGraphTermType);

    _defineProperty(_assertThisInitialized(_this), "uri", defaultGraphURI);

    return _this;
  }

  _createClass(DefaultGraph, [{
    key: "toCanonical",
    value: function toCanonical() {
      return this.value;
    }
  }, {
    key: "toString",
    value: function toString() {
      return 'DefaultGraph';
    }
  }]);

  return DefaultGraph;
}(Node$2);
function isDefaultGraph(object) {
  return !!object && object.termType === DefaultGraphTermType;
}

var defaultGraph = new DefaultGraph();
/** A Statement represents an RDF Triple or Quad. */

var Statement = /*#__PURE__*/function () {
  /** The subject of the triple.  What the Statement is about. */

  /** The relationship which is asserted between the subject and object */

  /** The thing or data value which is asserted to be related to the subject */

  /**
   * The graph param is a named node of the document in which the triple when
   *  it is stored on the web.
   */

  /**
   * Construct a new statement
   *
   * @param subject - The subject of the triple.  What the fact is about
   * @param predicate - The relationship which is asserted between the subject and object
   * @param object - The thing or data value which is asserted to be related to the subject
   * @param {NamedNode} graph - The document where the triple is or was or will be stored on the web.
   *
   * The graph param is a named node of the document in which the triple when it is stored
   *  on the web. It exists because when you have read data from various places in the web,
   *  the “graph” tells you _why_ you have the triple. (At the moment, it is just the
   *  document, in future it could be an inference step)
   *
   * When you do UpdateManager.update() then the graph’s of all the statements must be the same,
   *  and give the document you are patching. In future, we may have a more
   *  powerful update() which can update more than one document.
   */
  function Statement(subject, predicate, object, graph) {
    _classCallCheck(this, Statement);

    _defineProperty(this, "subject", void 0);

    _defineProperty(this, "predicate", void 0);

    _defineProperty(this, "object", void 0);

    _defineProperty(this, "graph", void 0);

    this.subject = Node$2.fromValue(subject);
    this.predicate = Node$2.fromValue(predicate);
    this.object = Node$2.fromValue(object);
    this.graph = graph == undefined ? defaultGraph : Node$2.fromValue(graph); // property currently used by rdflib
  }
  /** Alias for graph, favored by Tim */


  _createClass(Statement, [{
    key: "why",
    get: function get() {
      return this.graph;
    },
    set: function set(g) {
      this.graph = g;
    }
    /**
     * Checks whether two statements are the same
     * @param other - The other statement
     */

  }, {
    key: "equals",
    value: function equals(other) {
      return other.subject.equals(this.subject) && other.predicate.equals(this.predicate) && other.object.equals(this.object) && other.graph.equals(this.graph);
    }
    /**
     * Creates a statement with the bindings substituted
     * @param bindings The bindings
     */

  }, {
    key: "substitute",
    value: function substitute(bindings) {
      var y = new Statement(this.subject.substitute(bindings), this.predicate.substitute(bindings), this.object.substitute(bindings), isDefaultGraph(this.graph) ? this.graph : this.graph.substitute(bindings)); // 2016

      console.log('@@@ statement substitute:' + y);
      return y;
    }
    /** Creates a canonical string representation of this statement. */

  }, {
    key: "toCanonical",
    value: function toCanonical() {
      var terms = [this.subject.toCanonical(), this.predicate.toCanonical(), this.object.toCanonical()];

      if (this.graph && this.graph.termType !== DefaultGraphTermType) {
        terms.push(this.graph.toCanonical());
      }

      return terms.join(' ') + ' .';
    }
    /** Creates a n-triples string representation of this statement */

  }, {
    key: "toNT",
    value: function toNT() {
      return [this.subject.toNT(), this.predicate.toNT(), this.object.toNT()].join(' ') + ' .';
    }
    /** Creates a n-quads string representation of this statement */

  }, {
    key: "toNQ",
    value: function toNQ() {
      return [this.subject.toNT(), this.predicate.toNT(), this.object.toNT(), isDefaultGraph(this.graph) ? '' : this.graph.toNT()].join(' ') + ' .';
    }
    /** Creates a string representation of this statement */

  }, {
    key: "toString",
    value: function toString() {
      return this.toNT();
    }
  }]);

  return Statement;
}();

/*
 * Implements URI-specific functions
 *
 * See RFC 2386
 *
 * See also:
 *   http://www.w3.org/2005/10/ajaw/uri.js
 *   http://www.w3.org/2000/10/swap/uripath.py
 *
 */
var alert = alert || console.log;
/**
 * Gets the document part of an URI
 * @param uri The URI
 */

function docpart(uri) {
  var i;
  i = uri.indexOf('#');

  if (i < 0) {
    return uri;
  } else {
    return uri.slice(0, i);
  }
}
/**
 * Gets the document part of an URI as a named node
 * @param x - The URI
 */

function document$1(x) {
  return new NamedNode(docpart(x));
}
/**
 * Gets the hostname in an URI
 * @param u The URI
 */

function hostpart(u) {
  var m = /[^\/]*\/\/([^\/]*)\//.exec(u);

  if (m) {
    return m[1];
  } else {
    return '';
  }
}
/**
 * Joins an URI with a base
 * @param given - The relative part
 * @param base - The base URI
 */

function join(given, base) {
  var baseColon, baseScheme, baseSingle;
  var colon, lastSlash, path;
  var baseHash = base.indexOf('#');

  if (baseHash > 0) {
    base = base.slice(0, baseHash);
  }

  if (given.length === 0) {
    return base;
  }

  if (given.indexOf('#') === 0) {
    return base + given;
  }

  colon = given.indexOf(':');

  if (colon >= 0) {
    return given;
  }

  baseColon = base.indexOf(':');

  if (base.length === 0) {
    return given;
  }

  if (baseColon < 0) {
    alert('Invalid base: ' + base + ' in join with given: ' + given);
    return given;
  }

  baseScheme = base.slice(0, +baseColon + 1 || 9e9);

  if (given.indexOf('//') === 0) {
    return baseScheme + given;
  }

  if (base.indexOf('//', baseColon) === baseColon + 1) {
    baseSingle = base.indexOf('/', baseColon + 3);

    if (baseSingle < 0) {
      if (base.length - baseColon - 3 > 0) {
        return base + '/' + given;
      } else {
        return baseScheme + given;
      }
    }
  } else {
    baseSingle = base.indexOf('/', baseColon + 1);

    if (baseSingle < 0) {
      if (base.length - baseColon - 1 > 0) {
        return base + '/' + given;
      } else {
        return baseScheme + given;
      }
    }
  }

  if (given.indexOf('/') === 0) {
    return base.slice(0, baseSingle) + given;
  }

  path = base.slice(baseSingle);
  lastSlash = path.lastIndexOf('/');

  if (lastSlash < 0) {
    return baseScheme + given;
  }

  if (lastSlash >= 0 && lastSlash < path.length - 1) {
    path = path.slice(0, +lastSlash + 1 || 9e9);
  }

  path += given;

  while (path.match(/[^\/]*\/\.\.\//)) {
    path = path.replace(/[^\/]*\/\.\.\//, '');
  }

  path = path.replace(/\.\//g, '');
  path = path.replace(/\/\.$/, '/');
  return base.slice(0, baseSingle) + path;
}
/**
 * Gets the protocol part of an URI
 * @param uri The URI
 */

function protocol(uri) {
  var i = uri.indexOf(':');

  if (i < 0) {
    return null;
  } else {
    return uri.slice(0, i);
  }
}
/**
 * Gets a relative uri
 * @param base The base URI
 * @param uri The absolute URI
 */

function refTo(base, uri) {
  var c, i, k, l, len, len1, n, o, p, q, ref, ref1, s;
  var commonHost = new RegExp('^[-_a-zA-Z0-9.]+:(//[^/]*)?/[^/]*$');

  if (!base) {
    return uri;
  }

  if (base === uri) {
    return '';
  }

  for (i = o = 0, len = uri.length; o < len; i = ++o) {
    var _c = uri[i];

    if (_c !== base[i]) {
      break;
    }
  }

  if (base.slice(0, i).match(commonHost)) {
    k = uri.indexOf('//');

    if (k < 0) {
      k = -2;
    }

    l = uri.indexOf('/', k + 2);

    if (uri[l + 1] !== '/' && base[l + 1] !== '/' && uri.slice(0, l) === base.slice(0, l)) {
      return uri.slice(l);
    }
  }

  if (uri[i] === '#' && base.length === i) {
    return uri.slice(i);
  }

  while (i > 0 && uri[i - 1] !== '/') {
    i--;
  }

  if (i < 3) {
    return uri;
  }

  if (base.indexOf('//', i - 2) > 0 || uri.indexOf('//', i - 2) > 0) {
    return uri;
  }

  if (base.indexOf(':', i) > 0) {
    return uri;
  }

  n = 0;
  ref = base.slice(i);

  for (p = 0, len1 = ref.length; p < len1; p++) {
    c = ref[p];

    if (c === '/') {
      n++;
    }
  }

  if (n === 0 && i < uri.length && uri[i] === '#') {
    return './' + uri.slice(i);
  }

  if (n === 0 && i === uri.length) {
    return './';
  }

  s = '';

  if (n > 0) {
    for (q = 1, ref1 = n; ref1 >= 1 ? q <= ref1 : q >= ref1; ref1 >= 1 ? ++q : --q) {
      s += '../';
    }
  }

  return s + uri.slice(i);
}

var uri = /*#__PURE__*/Object.freeze({
  __proto__: null,
  docpart: docpart,
  document: document$1,
  hostpart: hostpart,
  join: join,
  protocol: protocol,
  refTo: refTo
});

function _createSuper$6(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$6(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$6() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
* Variables are placeholders used in patterns to be matched.
* In cwm they are symbols which are the formula's list of quantified variables.
* In sparql they are not visibly URIs.  Here we compromise, by having
* a common special base URI for variables. Their names are uris,
* but the ? notation has an implicit base uri of 'varid:'
*/
var Variable = /*#__PURE__*/function (_Node) {
  _inherits(Variable, _Node);

  var _super = _createSuper$6(Variable);

  /** The base string for a variable's name */

  /** The unique identifier of this variable */

  /**
   * Initializes this variable
   * @param name The variable's name
   */
  function Variable() {
    var _this;

    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, Variable);

    _this = _super.call(this, name);

    _defineProperty(_assertThisInitialized(_this), "termType", VariableTermType);

    _defineProperty(_assertThisInitialized(_this), "base", 'varid:');

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.Variable);

    _defineProperty(_assertThisInitialized(_this), "isVar", 1);

    _defineProperty(_assertThisInitialized(_this), "uri", void 0);

    _this.base = 'varid:';
    _this.uri = join(name, _this.base);
    return _this;
  }

  _createClass(Variable, [{
    key: "equals",
    value: function equals(other) {
      if (!other) {
        return false;
      }

      return this.termType === other.termType && this.value === other.value;
    }
  }, {
    key: "hashString",
    value: function hashString() {
      return this.toString();
    }
  }, {
    key: "substitute",
    value: function substitute(bindings) {
      var ref;
      return (ref = bindings[this.toNT()]) != null ? ref : this;
    }
  }, {
    key: "toString",
    value: function toString() {
      return Variable.toString(this);
    }
  }], [{
    key: "toString",
    value: function toString(variable) {
      if (variable.uri.slice(0, variable.base.length) === variable.base) {
        return "?".concat(variable.uri.slice(variable.base.length));
      }

      return "?".concat(variable.uri);
    }
  }]);

  return Variable;
}(Node$2);

/** A set of features that may be supported by a Data Factory */
var Feature;
/**
 * Defines a DataFactory as used in rdflib, based on the RDF/JS: Data model specification,
 * but with additional extensions
 *
 * bnIndex is optional but useful.
 */

(function (Feature) {
  Feature["collections"] = "COLLECTIONS";
  Feature["defaultGraphType"] = "DEFAULT_GRAPH_TYPE";
  Feature["equalsMethod"] = "EQUALS_METHOD";
  Feature["id"] = "ID";
  Feature["identity"] = "IDENTITY";
  Feature["reversibleId"] = "REVERSIBLE_ID";
  Feature["variableType"] = "VARIABLE_TYPE";
})(Feature || (Feature = {}));

var _supports;
/**
 * Gets the default graph
 */

var _defaultGraph = new DefaultGraph();
/** A basic internal RDFlib datafactory, which does not support Collections  */


var CanonicalDataFactory = {
  supports: (_supports = {}, _defineProperty(_supports, Feature.collections, false), _defineProperty(_supports, Feature.defaultGraphType, false), _defineProperty(_supports, Feature.equalsMethod, true), _defineProperty(_supports, Feature.identity, false), _defineProperty(_supports, Feature.id, true), _defineProperty(_supports, Feature.reversibleId, false), _defineProperty(_supports, Feature.variableType, true), _supports),

  /**
   * Creates a new blank node
   * @param value - The blank node's identifier
   */
  blankNode: function blankNode(value) {
    return new BlankNode(value);
  },
  defaultGraph: function defaultGraph() {
    return _defaultGraph;
  },

  /**
   * Compares to (rdf) objects for equality.
   */
  equals: function equals(a, b) {
    if (a === b || !a || !b) {
      return true;
    }

    if (isQuad(a) || isQuad(b)) {
      if (isQuad(a) && isQuad(b)) {
        return this.equals(a.subject, b.subject) && this.equals(a.predicate, b.predicate) && this.equals(a.object, b.object) && this.equals(a.graph, b.graph);
      }

      return false;
    }

    if (isTerm(a) && isTerm(b)) {
      return this.id(a) === this.id(b);
    }

    return false;
  },

  /**
   * Generates a uniquely identifiably *idempotent* string for the given {term}.
   *
   * Equivalent to [[Term.hashString]]
   *
   * @example Use this to associate data with a term in an object
   *   { obj[id(term)] = "myData" }
   */
  id: function id(term) {
    if (!term) {
      return 'undefined';
    }

    if (isQuad(term)) {
      return this.quadToNQ(term);
    }

    switch (term.termType) {
      case DefaultGraphTermType:
        return 'defaultGraph';

      case VariableTermType:
        return Variable.toString(term);

      default:
        var nq = this.termToNQ(term);

        if (nq) {
          return nq;
        }

        throw new Error("Can't id term with type '".concat(term.termType, "'"));
    }
  },
  isQuad: function isQuad(obj) {
    return obj instanceof Statement;
  },

  /**
   * Creates a new literal node. Does some JS literal parsing for ease of use.
   * @param value - The lexical value
   * @param languageOrDatatype - Either the language or the datatype
   */
  literal: function literal(value, languageOrDatatype) {
    if (typeof value !== "string" && !languageOrDatatype) {
      return Literal.fromValue(value);
    }

    var strValue = typeof value === 'string' ? value : '' + value;

    if (typeof languageOrDatatype === 'string') {
      if (languageOrDatatype.indexOf(':') === -1) {
        return new Literal(strValue, languageOrDatatype);
      } else {
        return new Literal(strValue, null, this.namedNode(languageOrDatatype));
      }
    } else {
      return new Literal(strValue, null, languageOrDatatype);
    }
  },

  /**
   * Creates a new named node
   * @param value - The new named node
   */
  namedNode: function namedNode(value) {
    return new NamedNode(value);
  },

  /**
   * Creates a new statement
   * @param subject - The subject
   * @param predicate - The predicate
   * @param object - The object
   * @param graph - The containing graph
   */
  quad: function quad(subject, predicate, object, graph) {
    return new Statement(subject, predicate, object, graph || _defaultGraph);
  },

  /**
   * Creates a new statement
   * @param subject - The subject
   * @param predicate - The predicate
   * @param object - The object
   * @param graph - The containing graph
   */
  triple: function triple(subject, predicate, object, graph) {
    return this.quad(subject, predicate, object, graph);
  },
  quadToNQ: function quadToNQ(q) {
    return "".concat(this.termToNQ(q.subject), " ").concat(this.termToNQ(q.predicate), " ").concat(this.termToNQ(q.object), " ").concat(this.termToNQ(q.graph), " .");
  },

  /** Stringify a {term} to n-quads serialization. */
  termToNQ: function termToNQ(term) {
    var _this = this;

    switch (term.termType) {
      case BlankNodeTermType:
        return '_:' + term.value;

      case DefaultGraphTermType:
        return '';

      case EmptyTermType:
        return '<http://www.w3.org/1999/02/22-rdf-syntax-ns#nil>';

      case LiteralTermType:
        return Literal.toNT(term);

      case GraphTermType:
      case NamedNodeTermType:
        return '<' + term.value + '>';

      case CollectionTermType:
        return '(' + term.elements.map(function (t) {
          return _this.termToNQ(t);
        }).join(' ') + ')';

      default:
        throw new Error("Can't serialize nonstandard term type (was '".concat(term.termType, "')"));
    }
  },

  /** Convert an rdf object (term or quad) to n-quads serialization. */
  toNQ: function toNQ(term) {
    if (this.isQuad(term)) {
      return this.quadToNQ(term);
    }

    return this.termToNQ(term);
  },

  /**
   * Creates a new variable
   * @param name - The name for the variable
   */
  variable: function variable(name) {
    return new Variable(name);
  }
};

/**
 * A Dummy log
 * @module log
 */
var log$1 = {
  debug: function debug(x) {},
  warn: function warn(x) {},
  info: function info(x) {},
  error: function error(x) {},
  success: function success(x) {},
  msg: function msg(x) {}
};

/**
 * Gets a namespace for the specified namespace's URI
 * @param nsuri - The URI for the namespace
 * @param [factory] - The factory for creating named nodes with
 */
function Namespace(nsuri, factory) {
  var dataFactory = factory || {
    namedNode: function namedNode(value) {
      return new NamedNode(value);
    }
  };
  return function (ln) {
    return dataFactory.namedNode(nsuri + (ln || ''));
  };
}

/**
 * "Shallow freezes" an object to render it immutable.
 * Uses `Object.freeze` if available,
 * otherwise the immutability is only in the type.
 *
 * Is used to create "enum like" objects.
 *
 * @template T
 * @param {T} object the object to freeze
 * @param {Pick<ObjectConstructor, 'freeze'> = Object} oc `Object` by default,
 * 				allows to inject custom object constructor for tests
 * @returns {Readonly<T>}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
function freeze(object, oc) {
	if (oc === undefined) {
		oc = Object;
	}
	return oc && typeof oc.freeze === 'function' ? oc.freeze(object) : object
}

/**
 * Since we can not rely on `Object.assign` we provide a simplified version
 * that is sufficient for our needs.
 *
 * @param {Object} target
 * @param {Object | null | undefined} source
 *
 * @returns {Object} target
 * @throws TypeError if target is not an object
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @see https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign
 */
function assign(target, source) {
	if (target === null || typeof target !== 'object') {
		throw new TypeError('target is not an object')
	}
	for (var key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			target[key] = source[key];
		}
	}
	return target
}

/**
 * All mime types that are allowed as input to `DOMParser.parseFromString`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#Argument02 MDN
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#domparsersupportedtype WHATWG HTML Spec
 * @see DOMParser.prototype.parseFromString
 */
var MIME_TYPE = freeze({
	/**
	 * `text/html`, the only mime type that triggers treating an XML document as HTML.
	 *
	 * @see DOMParser.SupportedType.isHTML
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring WHATWG HTML Spec
	 */
	HTML: 'text/html',

	/**
	 * Helper method to check a mime type if it indicates an HTML document
	 *
	 * @param {string} [value]
	 * @returns {boolean}
	 *
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring 	 */
	isHTML: function (value) {
		return value === MIME_TYPE.HTML
	},

	/**
	 * `application/xml`, the standard mime type for XML documents.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType registration
	 * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_APPLICATION: 'application/xml',

	/**
	 * `text/html`, an alias for `application/xml`.
	 *
	 * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
	 * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_TEXT: 'text/xml',

	/**
	 * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
	 * but is parsed as an XML document.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType registration
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
	 * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
	 */
	XML_XHTML_APPLICATION: 'application/xhtml+xml',

	/**
	 * `image/svg+xml`,
	 *
	 * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
	 * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
	 * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
	 */
	XML_SVG_IMAGE: 'image/svg+xml',
});

/**
 * Namespaces that are used in this code base.
 *
 * @see http://www.w3.org/TR/REC-xml-names
 */
var NAMESPACE = freeze({
	/**
	 * The XHTML namespace.
	 *
	 * @see http://www.w3.org/1999/xhtml
	 */
	HTML: 'http://www.w3.org/1999/xhtml',

	/**
	 * Checks if `uri` equals `NAMESPACE.HTML`.
	 *
	 * @param {string} [uri]
	 *
	 * @see NAMESPACE.HTML
	 */
	isHTML: function (uri) {
		return uri === NAMESPACE.HTML
	},

	/**
	 * The SVG namespace.
	 *
	 * @see http://www.w3.org/2000/svg
	 */
	SVG: 'http://www.w3.org/2000/svg',

	/**
	 * The `xml:` namespace.
	 *
	 * @see http://www.w3.org/XML/1998/namespace
	 */
	XML: 'http://www.w3.org/XML/1998/namespace',

	/**
	 * The `xmlns:` namespace
	 *
	 * @see https://www.w3.org/2000/xmlns/
	 */
	XMLNS: 'http://www.w3.org/2000/xmlns/',
});

var assign_1 = assign;
var freeze_1 = freeze;
var MIME_TYPE_1 = MIME_TYPE;
var NAMESPACE_1 = NAMESPACE;

var conventions = {
	assign: assign_1,
	freeze: freeze_1,
	MIME_TYPE: MIME_TYPE_1,
	NAMESPACE: NAMESPACE_1
};

var NAMESPACE$1 = conventions.NAMESPACE;

/**
 * A prerequisite for `[].filter`, to drop elements that are empty
 * @param {string} input
 * @returns {boolean}
 */
function notEmptyString (input) {
	return input !== ''
}
/**
 * @see https://infra.spec.whatwg.org/#split-on-ascii-whitespace
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * @param {string} input
 * @returns {string[]} (can be empty)
 */
function splitOnASCIIWhitespace(input) {
	// U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, U+0020 SPACE
	return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : []
}

/**
 * Adds element as a key to current if it is not already present.
 *
 * @param {Record<string, boolean | undefined>} current
 * @param {string} element
 * @returns {Record<string, boolean | undefined>}
 */
function orderedSetReducer (current, element) {
	if (!current.hasOwnProperty(element)) {
		current[element] = true;
	}
	return current;
}

/**
 * @see https://infra.spec.whatwg.org/#ordered-set
 * @param {string} input
 * @returns {string[]}
 */
function toOrderedSet(input) {
	if (!input) return [];
	var list = splitOnASCIIWhitespace(input);
	return Object.keys(list.reduce(orderedSetReducer, {}))
}

/**
 * Uses `list.indexOf` to implement something like `Array.prototype.includes`,
 * which we can not rely on being available.
 *
 * @param {any[]} list
 * @returns {function(any): boolean}
 */
function arrayIncludes (list) {
	return function(element) {
		return list && list.indexOf(element) !== -1;
	}
}

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}

/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){}		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknown Class:"+Class);
		}
		pt.constructor = Class;
	}
}

// Node Types
var NodeType = {};
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {};
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else {
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
}DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException);

/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
}NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};

function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh;
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
};

_extends(LiveNodeList,NodeList);

/**
 * Objects implementing the NamedNodeMap interface are used
 * to represent collections of nodes that can be accessed by name.
 * Note that NamedNodeMap does not inherit from NodeList;
 * NamedNodeMaps are not maintained in any particular order.
 * Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index,
 * but this is simply to allow convenient enumeration of the contents of a NamedNodeMap,
 * and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
}
function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else {
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1;
		while(i<lastIndex){
			list[i] = list[++i];
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else {
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};

/**
 * The DOMImplementation interface represents an object providing methods
 * which are not dependent on any particular document.
 * Such an object is returned by the `Document.implementation` property.
 *
 * __The individual methods describe the differences compared to the specs.__
 *
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation MDN
 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490 DOM Level 1 Core (Initial)
 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-102161490 DOM Level 2 Core
 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-102161490 DOM Level 3 Core
 * @see https://dom.spec.whatwg.org/#domimplementation DOM Living Standard
 */
function DOMImplementation() {
}

DOMImplementation.prototype = {
	/**
	 * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given feature is supported.
	 * The different implementations fairly diverged in what kind of features were reported.
	 * The latest version of the spec settled to force this method to always return true, where the functionality was accurate and in use.
	 *
	 * @deprecated It is deprecated and modern browsers return true in all cases.
	 *
	 * @param {string} feature
	 * @param {string} [version]
	 * @returns {boolean} always true
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
	 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
	 */
	hasFeature: function(feature, version) {
			return true;
	},
	/**
	 * Creates an XML Document object of the specified type with its document element.
	 *
	 * __It behaves slightly different from the description in the living standard__:
	 * - There is no interface/class `XMLDocument`, it returns a `Document` instance.
	 * - `contentType`, `encoding`, `mode`, `origin`, `url` fields are currently not declared.
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string|null} namespaceURI
	 * @param {string} qualifiedName
	 * @param {DocumentType=null} doctype
	 * @returns {Document}
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM Level 2 Core (initial)
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument  DOM Level 2 Core
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocument: function(namespaceURI,  qualifiedName, doctype){
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype || null;
		if (doctype){
			doc.appendChild(doctype);
		}
		if (qualifiedName){
			var root = doc.createElementNS(namespaceURI, qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	/**
	 * Returns a doctype, with the given `qualifiedName`, `publicId`, and `systemId`.
	 *
	 * __This behavior is slightly different from the in the specs__:
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string} qualifiedName
	 * @param {string} [publicId]
	 * @param {string} [systemId]
	 * @returns {DocumentType} which can either be used with `DOMImplementation.createDocument` upon document creation
	 * 				  or can be put into the document via methods like `Node.insertBefore()` or `Node.replaceChild()`
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM Level 2 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living Standard
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocumentType: function(qualifiedName, publicId, systemId){
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId || '';
		node.systemId = systemId || '';

		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node$3() {
}
Node$3.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else {
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
	/**
	 * Look up the prefix associated to the given namespace URI, starting from this node.
	 * **The default namespace declarations are ignored by this method.**
	 * See Namespace Prefix Lookup for details on the algorithm used by this method.
	 *
	 * _Note: The implementation seems to be incomplete when compared to the algorithm described in the specs._
	 *
	 * @param {string | null} namespaceURI
	 * @returns {string | null}
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
	 * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
	 * @see https://github.com/xmldom/xmldom/issues/322
	 */
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node$3);
copy(NodeType,Node$3.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}

function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE$1.XMLNS){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value;
	}
}

function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE$1.XMLNS){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:''];
	}
}

/**
 * Updates `el.childNodes`, updating the indexed items and it's `length`.
 * Passing `newChild` means it will be appended.
 * Otherwise it's assumed that an item has been removed,
 * and `el.firstNode` and it's `.nextSibling` are used
 * to walk the current list of child nodes.
 *
 * @param {Document} doc
 * @param {Node} el
 * @param {Node} [newChild]
 * @private
 */
function _onUpdateChild (doc, el, newChild) {
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if (newChild) {
			cs[cs.length++] = newChild;
		} else {
			var child = el.firstChild;
			var i = 0;
			while (child) {
				cs[i++] = child;
				child = child.nextSibling;
			}
			cs.length = i;
			delete cs[cs.length];
		}
	}
}

/**
 * Removes the connections between `parentNode` and `child`
 * and any existing `child.previousSibling` or `child.nextSibling`.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 *
 * @param {Node} parentNode
 * @param {Node} child
 * @returns {Node} the child that was removed.
 * @private
 */
function _removeChild (parentNode, child) {
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if (previous) {
		previous.nextSibling = next;
	} else {
		parentNode.firstChild = next;
	}
	if (next) {
		next.previousSibling = previous;
	} else {
		parentNode.lastChild = previous;
	}
	child.parentNode = null;
	child.previousSibling = null;
	child.nextSibling = null;
	_onUpdateChild(parentNode.ownerDocument, parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else {
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else {
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else {
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}

/**
 * Appends `newChild` to `parentNode`.
 * If `newChild` is already connected to a `parentNode` it is first removed from it.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 * @param {Node} parentNode
 * @param {Node} newChild
 * @returns {Node}
 * @private
 */
function _appendSingleChild (parentNode, newChild) {
	if (newChild.parentNode) {
		newChild.parentNode.removeChild(newChild);
	}
	newChild.parentNode = parentNode;
	newChild.previousSibling = parentNode.lastChild;
	newChild.nextSibling = null;
	if (newChild.previousSibling) {
		newChild.previousSibling.nextSibling = newChild;
	} else {
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument, parentNode, newChild);
	return newChild;
}

Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	/**
	 * The DocumentType node of the document.
	 *
	 * @readonly
	 * @type DocumentType
	 */
	doctype :  null,
	documentElement :  null,
	_inc : 1,

	insertBefore :  function(newChild, refChild){//raises
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}

		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		});
		return rtv;
	},

	/**
	 * The `getElementsByClassName` method of `Document` interface returns an array-like object
	 * of all child elements which have **all** of the given class name(s).
	 *
	 * Returns an empty list if `classeNames` is an empty string or only contains HTML white space characters.
	 *
	 *
	 * Warning: This is a live LiveNodeList.
	 * Changes in the DOM will reflect in the array as the changes occur.
	 * If an element selected by this array no longer qualifies for the selector,
	 * it will automatically be removed. Be aware of this for iteration purposes.
	 *
	 * @param {string} classNames is a string representing the class name(s) to match; multiple class names are separated by (ASCII-)whitespace
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
	 * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
	 */
	getElementsByClassName: function(classNames) {
		var classNamesSet = toOrderedSet(classNames);
		return new LiveNodeList(this, function(base) {
			var ls = [];
			if (classNamesSet.length > 0) {
				_visitNode(base.documentElement, function(node) {
					if(node !== base && node.nodeType === ELEMENT_NODE) {
						var nodeClassNames = node.getAttribute('class');
						// can be null if the attribute does not exist
						if (nodeClassNames) {
							// before splitting and iterating just compare them for the most common case
							var matches = classNames === nodeClassNames;
							if (!matches) {
								var nodeClassNamesSet = toOrderedSet(nodeClassNames);
								matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet));
							}
							if(matches) {
								ls.push(node);
							}
						}
					}
				});
			}
			return ls;
		});
	},

	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.localName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else {
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else {
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node$3);


function Element() {
	this._nsMap = {};
}Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name);
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else {
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node$3);
function Attr() {
}Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node$3);


function CharacterData() {
}CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
};
_extends(CharacterData,Node$3);
function Text() {
}Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
};
_extends(Text,CharacterData);
function Comment() {
}Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
};
_extends(Comment,CharacterData);

function CDATASection() {
}CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
};
_extends(CDATASection,CharacterData);


function DocumentType() {
}DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node$3);

function Notation() {
}Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node$3);

function Entity() {
}Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node$3);

function EntityReference() {
}EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node$3);

function DocumentFragment() {
}DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node$3);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node$3);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
};
Node$3.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			];
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}

function needNamespaceDefine(node, isHTML, visibleNamespaces) {
	var prefix = node.prefix || '';
	var uri = node.namespaceURI;
	// According to [Namespaces in XML 1.0](https://www.w3.org/TR/REC-xml-names/#ns-using) ,
	// and more specifically https://www.w3.org/TR/REC-xml-names/#nsc-NoPrefixUndecl :
	// > In a namespace declaration for a prefix [...], the attribute value MUST NOT be empty.
	// in a similar manner [Namespaces in XML 1.1](https://www.w3.org/TR/xml-names11/#ns-using)
	// and more specifically https://www.w3.org/TR/xml-names11/#nsc-NSDeclared :
	// > [...] Furthermore, the attribute value [...] must not be an empty string.
	// so serializing empty namespace value like xmlns:ds="" would produce an invalid XML document.
	if (!uri) {
		return false;
	}
	if (prefix === "xml" && uri === NAMESPACE$1.XML || uri === NAMESPACE$1.XMLNS) {
		return false;
	}
	
	var i = visibleNamespaces.length; 
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		if (ns.prefix === prefix) {
			return ns.namespace !== uri;
		}
	}
	return true;
}
/**
 * Well-formed constraint: No < in Attribute Values
 * > The replacement text of any entity referred to directly or indirectly
 * > in an attribute value must not contain a <.
 * @see https://www.w3.org/TR/xml11/#CleanAttrVals
 * @see https://www.w3.org/TR/xml11/#NT-AttValue
 *
 * Literal whitespace other than space that appear in attribute values
 * are serialized as their entity references, so they will be preserved.
 * (In contrast to whitespace literals in the input which are normalized to spaces)
 * @see https://www.w3.org/TR/xml11/#AVNormalize
 * @see https://w3c.github.io/DOM-Parsing/#serializing-an-element-s-attributes
 */
function addSerializedAttribute(buf, qualifiedName, value) {
	buf.push(' ', qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"');
}

function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if (!visibleNamespaces) {
		visibleNamespaces = [];
	}

	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else {
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}

	switch(node.nodeType){
	case ELEMENT_NODE:
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML = NAMESPACE$1.isHTML(node.namespaceURI) || isHTML;

		var prefixedNodeName = nodeName;
		if (!isHTML && !node.prefix && node.namespaceURI) {
			var defaultNS;
			// lookup current default ns from `xmlns` attribute
			for (var ai = 0; ai < attrs.length; ai++) {
				if (attrs.item(ai).name === 'xmlns') {
					defaultNS = attrs.item(ai).value;
					break
				}
			}
			if (!defaultNS) {
				// lookup current default ns in visibleNamespaces
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi];
					if (namespace.prefix === '' && namespace.namespace === node.namespaceURI) {
						defaultNS = namespace.namespace;
						break
					}
				}
			}
			if (defaultNS !== node.namespaceURI) {
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi];
					if (namespace.namespace === node.namespaceURI) {
						if (namespace.prefix) {
							prefixedNodeName = namespace.prefix + ':' + nodeName;
						}
						break
					}
				}
			}
		}

		buf.push('<', prefixedNodeName);

		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}

		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}

		// add namespace for current node		
		if (nodeName === prefixedNodeName && needNamespaceDefine(node, isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else {
						serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					child = child.nextSibling;
				}
			}
			buf.push('</',prefixedNodeName,'>');
		}else {
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return addSerializedAttribute(buf, node.name, node.value);
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 * @see https://w3c.github.io/DOM-Parsing/#xml-serializing-a-text-node
		 */
		return buf.push(node.data
			.replace(/[<&>]/g,_xmlEncoder)
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else {
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length;
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value;
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});

		Object.defineProperty(Node$3.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},

			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;

				default:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		});
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}

		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value;
		};
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	var DocumentType_1 = DocumentType;
	var DOMException_1 = DOMException;
	var DOMImplementation_1 = DOMImplementation;
	var Element_1 = Element;
	var Node_1 = Node$3;
	var NodeList_1 = NodeList;
	var XMLSerializer_1 = XMLSerializer;
//}

var dom = {
	DocumentType: DocumentType_1,
	DOMException: DOMException_1,
	DOMImplementation: DOMImplementation_1,
	Element: Element_1,
	Node: Node_1,
	NodeList: NodeList_1,
	XMLSerializer: XMLSerializer_1
};

var entities = createCommonjsModule(function (module, exports) {
var freeze = conventions.freeze;

/**
 * The entities that are predefined in every XML document.
 *
 * @see https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-predefined-ent W3C XML 1.1
 * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-predefined-ent W3C XML 1.0
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Predefined_entities_in_XML Wikipedia
 */
exports.XML_ENTITIES = freeze({amp:'&', apos:"'", gt:'>', lt:'<', quot:'"'});

/**
 * A map of currently 241 entities that are detected in an HTML document.
 * They contain all entries from `XML_ENTITIES`.
 *
 * @see XML_ENTITIES
 * @see DOMParser.parseFromString
 * @see DOMImplementation.prototype.createHTMLDocument
 * @see https://html.spec.whatwg.org/#named-character-references WHATWG HTML(5) Spec
 * @see https://www.w3.org/TR/xml-entity-names/ W3C XML Entity Names
 * @see https://www.w3.org/TR/html4/sgml/entities.html W3C HTML4/SGML
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Character_entity_references_in_HTML Wikipedia (HTML)
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Entities_representing_special_characters_in_XHTML Wikpedia (XHTML)
 */
exports.HTML_ENTITIES = freeze({
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
});

/**
 * @deprecated use `HTML_ENTITIES` instead
 * @see HTML_ENTITIES
 */
exports.entityMap = exports.HTML_ENTITIES;
});

var NAMESPACE$2 = conventions.NAMESPACE;

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;//\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError(message, locator) {
	this.message = message;
	this.locator = locator;
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
}
ParseError.prototype = new Error();
ParseError.prototype.name = ParseError.name;

function XMLReader(){

}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {});
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
};
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if (Object.hasOwnProperty.call(entityMap, k)) {
			return entityMap[k];
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else {
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end;
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g;
	var locator = domBuilder.locator;

	var parseStack = [{currentNSMap:defaultNSMapCopy}];
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart + 2, end).replace(/[ \t\n\r]+$/g, '');
				var config = parseStack.pop();
				if(end<0){

	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase();
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else {
		        	parseStack.push(config);
		        }

				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;


				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					domBuilder.locator = locator2;
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
					domBuilder.locator = locator;
				}else {
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
				}

				if (NAMESPACE$2.isHTML(el.uri) && !el.closed) {
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder);
				} else {
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError) {
				throw e;
			}
			errorHandler.error('element parse error: '+e);
			end = -1;
		}
		if(end>start){
			start = end;
		}else {
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (el.attributeNames.hasOwnProperty(qname)) {
			errorHandler.fatalError('Attribute ' + qname + ' redefined');
		}
		el.addValue(
			qname,
			// @see https://www.w3.org/TR/xml/#AVNormalize
			// since the xmldom sax parser does not "interpret" DTD the following is not implemented:
			// - recursive replacement of (DTD) entity references
			// - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
			value.replace(/[\t\n\r]/g, ' ').replace(/&#?\w+;/g, entityReplacer),
			startIndex
		);
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else {
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="');
					attrName = source.slice(start,p);
				}
				start = p+1;
				p = source.indexOf(c,start);
				if(p>0){
					value = source.slice(start, p);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else {
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start, p);
				addAttribute(attrName, value, start);
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END;
			}else {
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1);
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value, start);
				}else {
					if(!NAMESPACE$2.isHTML(currentNSMap['']) || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!');
					}
					addAttribute(value, value, start);
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p);
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start, p);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start);
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else {//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if (!NAMESPACE$2.isHTML(currentNSMap['']) || !attrName.match(/^(?:disabled|checked|selected)$/i)) {
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!');
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!');
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName;
		}else {
			localName = qName;
			prefix = null;
			nsPrefix = qName === 'xmlns' && '';
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {};
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={});
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = NAMESPACE$2.XMLNS;
			domBuilder.startPrefixMapping(nsPrefix, value);
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = NAMESPACE$2.XML;
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || ''];

				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else {
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix);
			}
		}
	}else {
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}

		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>');
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName);
		}
		closeMap[tagName] =pos;
	}
	return pos<elStartEnd;
	//}
}
function _copy(source,target){
	for(var n in source){target[n] = source[n];}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2);
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else {
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else {
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA();
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId)
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1];
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();

			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else {//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {};
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName;
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset};
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
};



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

var XMLReader_1 = XMLReader;
var ParseError_1 = ParseError;

var sax = {
	XMLReader: XMLReader_1,
	ParseError: ParseError_1
};

var DOMImplementation$1 = dom.DOMImplementation;

var NAMESPACE$3 = conventions.NAMESPACE;

var ParseError$1 = sax.ParseError;
var XMLReader$1 = sax.XMLReader;

/**
 * Normalizes line ending according to https://www.w3.org/TR/xml11/#sec-line-ends:
 *
 * > XML parsed entities are often stored in computer files which,
 * > for editing convenience, are organized into lines.
 * > These lines are typically separated by some combination
 * > of the characters CARRIAGE RETURN (#xD) and LINE FEED (#xA).
 * >
 * > To simplify the tasks of applications, the XML processor must behave
 * > as if it normalized all line breaks in external parsed entities (including the document entity)
 * > on input, before parsing, by translating all of the following to a single #xA character:
 * >
 * > 1. the two-character sequence #xD #xA
 * > 2. the two-character sequence #xD #x85
 * > 3. the single character #x85
 * > 4. the single character #x2028
 * > 5. any #xD character that is not immediately followed by #xA or #x85.
 *
 * @param {string} input
 * @returns {string}
 */
function normalizeLineEndings(input) {
	return input
		.replace(/\r[\n\u0085]/g, '\n')
		.replace(/[\r\u0085\u2028]/g, '\n')
}

/**
 * @typedef Locator
 * @property {number} [columnNumber]
 * @property {number} [lineNumber]
 */

/**
 * @typedef DOMParserOptions
 * @property {DOMHandler} [domBuilder]
 * @property {Function} [errorHandler]
 * @property {(string) => string} [normalizeLineEndings] used to replace line endings before parsing
 * 						defaults to `normalizeLineEndings`
 * @property {Locator} [locator]
 * @property {Record<string, string>} [xmlns]
 *
 * @see normalizeLineEndings
 */

/**
 * The DOMParser interface provides the ability to parse XML or HTML source code
 * from a string into a DOM `Document`.
 *
 * _xmldom is different from the spec in that it allows an `options` parameter,
 * to override the default behavior._
 *
 * @param {DOMParserOptions} [options]
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-parsing-and-serialization
 */
function DOMParser(options){
	this.options = options ||{locator:{}};
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader$1();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML ? entities.HTML_ENTITIES : entities.XML_ENTITIES;
	if(locator){
		domBuilder.setDocumentLocator(locator);
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap[''] = NAMESPACE$3.HTML;
	}
	defaultNSMap.xml = defaultNSMap.xml || NAMESPACE$3.XML;
	var normalize = options.normalizeLineEndings || normalizeLineEndings;
	if (source && typeof source === 'string') {
		sax.parse(
			normalize(source),
			defaultNSMap,
			entityMap
		);
	} else {
		sax.errorHandler.error('invalid doc source');
	}
	return domBuilder.doc;
};
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {};
	var isCallback = errorImpl instanceof Function;
	locator = locator||{};
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg);}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation$1().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement$1(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el);
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr);
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement;
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins);
	    appendElement$1(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode);
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm);
	    appendElement$1(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt);
	        appendElement$1(this, dt);
					this.doc.doctype = dt;
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError$1(error, this.locator);
	}
};
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else {//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null};
});

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement$1 (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

var __DOMHandler = DOMHandler;
var normalizeLineEndings_1 = normalizeLineEndings;
var DOMParser_1 = DOMParser;

var domParser = {
	__DOMHandler: __DOMHandler,
	normalizeLineEndings: normalizeLineEndings_1,
	DOMParser: DOMParser_1
};

var DOMParser$1 = domParser.DOMParser;

/**
 * Utility functions for $rdf
 * @module util
 */
var string = {
  template: stringTemplate
};
function mediaTypeClass(mediaType) {
  mediaType = mediaType.split(';')[0].trim(); // remove media type parameters

  return new NamedNode('http://www.w3.org/ns/iana/media-types/' + mediaType + '#Resource');
}
function linkRelationProperty(relation) {
  return new NamedNode('http://www.w3.org/ns/iana/link-relations/relation#' + relation.trim());
}
/**
 * Adds callback functionality to an object.
 * Callback functions are indexed by a 'hook' string.
 * They return true if they want to be called again.
 * @method callbackify
 * @param obj {Object}
 * @param callbacks {Array<string>}
 */

function callbackify(obj, callbacks) {
  obj.callbacks = {};

  for (var x = callbacks.length - 1; x >= 0; x--) {
    obj.callbacks[callbacks[x]] = [];
  }

  obj.addHook = function (hook) {
    if (!obj.callbacks[hook]) {
      obj.callbacks[hook] = [];
    }
  };

  obj.addCallback = function (hook, func) {
    obj.callbacks[hook].push(func);
  };

  obj.removeCallback = function (hook, funcName) {
    for (var i = 0; i < obj.callbacks[hook].length; i++) {
      if (obj.callbacks[hook][i].name === funcName) {
        obj.callbacks[hook].splice(i, 1);
        return true;
      }
    }

    return false;
  };

  obj.insertCallback = function (hook, func) {
    obj.callbacks[hook].unshift(func);
  };

  obj.fireCallbacks = function fireCallbacks(hook, args) {
    var newCallbacks = [];
    var replaceCallbacks = [];
    var len = obj.callbacks[hook].length;
    var x;
    var callback; // log.info('!@$ Firing '+hook+' call back with length'+len)

    for (x = len - 1; x >= 0; x--) {
      // log.info('@@ Firing '+hook+' callback '+ obj.callbacks[hook][x])
      callback = obj.callbacks[hook][x];

      if (callback && callback.apply(obj, args)) {
        newCallbacks.push(callback);
      }
    }

    for (x = newCallbacks.length - 1; x >= 0; x--) {
      replaceCallbacks.push(newCallbacks[x]);
    }

    for (x = len; x < obj.callbacks[hook].length; x++) {
      replaceCallbacks.push(obj.callbacks[hook][x]);
    }

    obj.callbacks[hook] = replaceCallbacks;
  };
}
/**
 * Returns a DOM parser based on current runtime environment.
 */

function DOMParserFactory() {
  if (window.DOMParser) {
    return new DOMParser$1();
  } else if (window.ActiveXObject) {
    return new ActiveXObject('Microsoft.XMLDOM');
  } else {
    return false;
  }
} // From https://github.com/linkeddata/dokieli

function domToString(node, options) {
  options = options || {};
  var selfClosing = [];

  if (options && options.selfClosing) {
    options.selfClosing.split(' ').forEach(function (n) {
      selfClosing[n] = true;
    });
  }

  var skipAttributes = [];

  if (options && options.skipAttributes) {
    options.skipAttributes.split(' ').forEach(function (n) {
      skipAttributes[n] = true;
    });
  }

  return dumpNode(node, options, selfClosing, skipAttributes);
}
function dumpNode(node, options, selfClosing, skipAttributes) {
  var i;
  var out = '';
  var noEsc = [false];
  if (typeof node.nodeType === 'undefined') return out;

  if (node.nodeType === 1) {
    if (node.hasAttribute('class') && options && options.classWithChildText && node.matches(options.classWithChildText.class)) {
      out += node.querySelector(options.classWithChildText.element).textContent;
    } else if (!(options && options.skipNodeWithClass && node.matches('.' + options.skipNodeWithClass))) {
      var ename = node.nodeName.toLowerCase();
      out += '<' + ename;
      var attrList = [];

      for (i = node.attributes.length - 1; i >= 0; i--) {
        var atn = node.attributes[i];
        if (skipAttributes && skipAttributes.length > 0 && skipAttributes[atn.name]) continue;
        if (/^\d+$/.test(atn.name)) continue;

        if (atn.name === 'class' && options && options.replaceClassItemWith && atn.value.split(' ').indexOf(options.replaceClassItemWith.source) > -1) {
          var re = new RegExp(options.replaceClassItemWith.source, 'g');
          atn.value = atn.value.replace(re, options.replaceClassItemWith.target).trim();
        }

        if (!(atn.name === 'class' && options && options.skipClassWithValue && options.skipClassWithValue === atn.value)) {
          attrList.push(atn.name + '=\'' + atn.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&quot;') + '\'');
        }
      }

      if (attrList.length > 0) {
        if (options && options.sortAttributes) {
          attrList.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
          });
        }

        out += ' ' + attrList.join(' ');
      }

      if (selfClosing && selfClosing.ename) {
        out += ' />';
      } else {
        out += '>';
        out += ename === 'html' ? '\n  ' : '';
        noEsc.push(ename === 'style' || ename === 'script');

        for (i = 0; i < node.childNodes.length; i++) {
          out += dumpNode(node.childNodes[i]);
        }

        noEsc.pop();
        out += ename === 'body' ? '</' + ename + '>' + '\n' : '</' + ename + '>';
      }
    }
  } else if (node.nodeType === 8) {
    // FIXME: If comments are not tabbed in source, a new line is not prepended
    out += '<!--' + node.nodeValue + '-->';
  } else if (node.nodeType === 3 || node.nodeType === 4) {
    // XXX: Remove new lines which were added after DOM ready
    var nl = node.nodeValue.replace(/\n+$/, '');
    out += noEsc[noEsc.length - 1] ? nl : nl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  } else {
    console.log('Warning; Cannot handle serialising nodes of type: ' + node.nodeType);
    console.log(node);
  }

  return out;
}
function dtstamp() {
  var now = new Date();
  var year = now.getYear() + 1900;
  var month = now.getMonth() + 1;
  var day = now.getDate();
  var hour = now.getUTCHours();
  var minute = now.getUTCMinutes();
  var second = now.getSeconds();
  if (month < 10) month = '0' + month;
  if (day < 10) day = '0' + day;
  if (hour < 10) hour = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  if (second < 10) second = '0' + second;
  return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + 'Z';
}
/**
 * Compares statements (heavy comparison for repeatable canonical ordering)
 */

function heavyCompare(x, y, g, uriMap) {
  var nonBlank = function nonBlank(x) {
    return x.termType === 'BlankNode' ? null : x;
  };

  var signature = function signature(x) {
    var lis = g.statementsMatching(x).map(function (st) {
      return '' + nonBlank(st.subject) + ' ' + nonBlank(st.predicate) + ' ' + nonBlank(st.object);
    }).concat(g.statementsMatching(undefined, undefined, x).map(function (st) {
      return '' + nonBlank(st.subject) + ' ' + nonBlank(st.predicate) + ' ' + nonBlank(st.object);
    }));
    lis.sort();
    return lis.join('\n');
  };

  var comparison = Object.prototype.hasOwnProperty.call(g, "compareTerms") ? g.compareTerms(x, y) : x.compareTerm(y);

  if (x.termType === 'BlankNode' && y.termType === 'BlankNode') {
    if (comparison === 0) return 0; // Same

    if (signature(x) > signature(y)) return +1;
    if (signature(x) < signature(y)) return -1;
    return comparison; // Too bad -- this order not canonical.
    // throw "different bnodes indistinquishable for sorting"
  } else {
    if (uriMap && x.uri && y.uri) {
      return (uriMap[x.uri] || x.uri).localeCompare(uriMap[y.uri] || y.uri);
    }

    return comparison;
  }
}
function heavyCompareSPO(x, y, g, uriMap) {
  return heavyCompare(x.subject, y.subject, g, uriMap) || heavyCompare(x.predicate, y.predicate, g, uriMap) || heavyCompare(x.object, y.object, g, uriMap);
}
/**
 * Defines a simple debugging function
 * @method output
 * @param o {String}
 */

function output(o) {
  var k = document.createElement('div');
  k.textContent = o;
  document.body.appendChild(k);
}
/**
 * Returns a DOM from parsed XML.
 */

function parseXML(str, options) {
  var dparser;
  options = options || {};

  if (typeof module !== 'undefined' && module && module.exports) {
    // Node.js
    var dom = new DOMParser$1().parseFromString(str, options.contentType || 'application/xhtml+xml');
    return dom;
  } else {
    if (typeof window !== 'undefined' && window.DOMParser) {
      dparser = new window.DOMParser(); // seems to actually work
    } else {
      dparser = new DOMParser$1(); // Doc says this works
    }
  }

  return dparser.parseFromString(str, 'application/xml');
}
/**
 * Removes all statements equal to x from a
 */

function RDFArrayRemove(a, x) {
  for (var i = 0; i < a.length; i++) {
    // TODO: This used to be the following, which didnt always work..why
    // if(a[i] === x)
    if (a[i].subject.equals(x.subject) && a[i].predicate.equals(x.predicate) && a[i].object.equals(x.object) && a[i].why.equals(x.why)) {
      a.splice(i, 1);
      return;
    }
  }

  throw new Error('RDFArrayRemove: Array did not contain ' + x + ' ' + x.why);
}
function string_startswith(str, pref) {
  // missing library routines
  return str.slice(0, pref.length) === pref;
}
/**
 * C++, python style %s -> subs
 */

function stringTemplate(base, subs) {
  var baseA = base.split('%s');
  var result = '';

  for (var i = 0; i < subs.length; i++) {
    subs[i] += '';
    result += baseA[i] + subs[i];
  }

  return result + baseA.slice(subs.length).join();
} // Stack dump on errors - to pass errors back


function stackString(e) {
  var str = '' + e + '\n';

  if (!e.stack) {
    return str + 'No stack available.\n';
  }

  var lines = e.stack.toString().split('\n');
  var toprint = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (line.indexOf('ecmaunit.js') > -1) {
      // remove useless bit of traceback
      break;
    }

    if (line.charAt(0) == '(') {
      line = 'function' + line;
    }

    var chunks = line.split('@');
    toprint.push(chunks);
  } // toprint.reverse();  No - I prefer the latest at the top by the error message -tbl


  for (var i = 0; i < toprint.length; i++) {
    str += '  ' + toprint[i][1] + '\n    ' + toprint[i][0];
  }

  return str;
}

var utilsJs = /*#__PURE__*/Object.freeze({
  __proto__: null,
  log: log$1,
  uri: uri,
  string: string,
  mediaTypeClass: mediaTypeClass,
  linkRelationProperty: linkRelationProperty,
  callbackify: callbackify,
  DOMParserFactory: DOMParserFactory,
  domToString: domToString,
  dumpNode: dumpNode,
  dtstamp: dtstamp,
  heavyCompare: heavyCompare,
  heavyCompareSPO: heavyCompareSPO,
  output: output,
  parseXML: parseXML,
  RDFArrayRemove: RDFArrayRemove,
  string_startswith: string_startswith,
  stackString: stackString
});

function createXSD() {
  var localFactory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : CanonicalDataFactory;
  return {
    boolean: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
    dateTime: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime"),
    decimal: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal"),
    double: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#double"),
    integer: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    langString: localFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"),
    string: localFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
  };
}
var defaultXSD = createXSD(CanonicalDataFactory);

/**
 * Provides a way to access commonly used namespaces
 *
 * Usage:
 *
 *   ```
 *   const $rdf = require('rdflib'); //or any other RDF/JS-compatible library
 *   const ns = require('solid-namespace')($rdf);
 *   const store = $rdf.graph();
 *
 *   let me = ...;
 *   let name = store.any(me, ns.vcard(‘fn’)) || store.any(me, ns.foaf(‘name’));
 *   ```
 * @module vocab
 */
const aliases = {
  acl: 'http://www.w3.org/ns/auth/acl#',
  arg: 'http://www.w3.org/ns/pim/arg#',
  as: 'https://www.w3.org/ns/activitystreams#',
  cal: 'http://www.w3.org/2002/12/cal/ical#',
  cert: 'http://www.w3.org/ns/auth/cert#',
  contact: 'http://www.w3.org/2000/10/swap/pim/contact#',
  dc: 'http://purl.org/dc/elements/1.1/',
  dct: 'http://purl.org/dc/terms/',
  doap: 'http://usefulinc.com/ns/doap#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
  gpx: 'http://www.w3.org/ns/pim/gpx#',
  http: 'http://www.w3.org/2007/ont/http#',
  httph: 'http://www.w3.org/2007/ont/httph#',
  icalTZ: 'http://www.w3.org/2002/12/cal/icaltzd#', // Beware: not cal:
  ldp: 'http://www.w3.org/ns/ldp#',
  link: 'http://www.w3.org/2007/ont/link#',
  log: 'http://www.w3.org/2000/10/swap/log#',
  meeting: 'http://www.w3.org/ns/pim/meeting#',
  mo: 'http://purl.org/ontology/mo/',
  org: 'http://www.w3.org/ns/org#',
  owl: 'http://www.w3.org/2002/07/owl#',
  pad: 'http://www.w3.org/ns/pim/pad#',
  patch: 'http://www.w3.org/ns/pim/patch#',
  prov: 'http://www.w3.org/ns/prov#',
  qu: 'http://www.w3.org/2000/10/swap/pim/qif#',
  trip: 'http://www.w3.org/ns/pim/trip#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  rss: 'http://purl.org/rss/1.0/',
  sched: 'http://www.w3.org/ns/pim/schedule#',
  schema: 'http://schema.org/', // @@ beware confusion with documents no 303
  sioc: 'http://rdfs.org/sioc/ns#',
  solid: 'http://www.w3.org/ns/solid/terms#',
  space: 'http://www.w3.org/ns/pim/space#',
  stat: 'http://www.w3.org/ns/posix/stat#',
  tab: 'http://www.w3.org/2007/ont/link#',
  tabont: 'http://www.w3.org/2007/ont/link#',
  ui: 'http://www.w3.org/ns/ui#',
  vcard: 'http://www.w3.org/2006/vcard/ns#',
  wf: 'http://www.w3.org/2005/01/wf/flow#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  cco: 'http://www.ontologyrepository.com/CommonCoreOntologies/'
};

/**
 * @param [rdflib] {RDF} Optional RDF Library (such as rdflib.js or rdf-ext) to inject
 */
function vocab (rdf = { namedNode: u => u }) {
  const namespaces = {};
  for (const alias in aliases) {
    const expansion = aliases[alias];
    namespaces[alias] = function (localName = '') {
      return rdf.namedNode(expansion + localName)
    };
  }
  return namespaces
}
var solidNamespace = vocab;

function createSerializer(store) {
  return new Serializer(store);
}
var Serializer = /*#__PURE__*/function () {
  function Serializer(store) {
    _classCallCheck(this, Serializer);

    _defineProperty(this, "_notQNameChars", '\t\r\n !"#$%&\'()*.,+/;<=>?@[\\]^`{|}~');

    _defineProperty(this, "_notNameChars", this._notQNameChars + ':');

    _defineProperty(this, "validPrefix", new RegExp(/^[a-zA-Z][a-zA-Z0-9]*$/));

    _defineProperty(this, "forbidden1", new RegExp(/[\\"\b\f\r\v\t\n\u0080-\uffff]/gm));

    _defineProperty(this, "forbidden3", new RegExp(/[\\"\b\f\r\v\u0080-\uffff]/gm));

    this.flags = '';
    this.base = null;
    this.prefixes = []; // suggested prefixes

    this.namespaces = []; // complementary

    var nsKeys = Object.keys(solidNamespace());

    for (var i in nsKeys) {
      var uri = solidNamespace()[nsKeys[i]]('');
      var prefix = nsKeys[i];
      this.prefixes[uri] = prefix;
      this.namespaces[prefix] = uri;
    }

    this.suggestPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'); // XML code assumes this!

    this.suggestPrefix('xml', 'reserved:reservedForFutureUse'); // XML reserves xml: in the spec.

    this.namespacesUsed = []; // Count actually used and so needed in @prefixes

    this.keywords = ['a']; // The only one we generate at the moment

    this.prefixchars = 'abcdefghijklmnopqustuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.incoming = null; // Array not calculated yet

    this.formulas = []; // remebering original formulae from hashes

    this.store = store;
    this.rdfFactory = store.rdfFactory || CanonicalDataFactory;
    this.xsd = createXSD(this.rdfFactory);
  }

  _createClass(Serializer, [{
    key: "setBase",
    value: function setBase(base) {
      this.base = base;
      return this;
    }
  }, {
    key: "setFlags",
    value: function setFlags(flags) {
      this.flags = flags || '';
      return this;
    }
  }, {
    key: "toStr",
    value: function toStr(x) {
      var s = x.toNT();

      if (x.termType === 'Graph') {
        this.formulas[s] = x; // remember as reverse does not work
      }

      return s;
    }
  }, {
    key: "fromStr",
    value: function fromStr(s) {
      if (s[0] === '{') {
        var x = this.formulas[s];
        if (!x) console.log('No formula object for ' + s);
        return x;
      }

      return this.store.fromNT(s);
    }
    /**
     * Defines a set of [prefix, namespace] pairs to be uised by this Serializer instance.
     * Overrides previous prefixes if any
     * @param namespaces
     * @return {Serializer}
     */

  }, {
    key: "setNamespaces",
    value: function setNamespaces(namespaces) {
      for (var px in namespaces) {
        this.setPrefix(px, namespaces[px]);
      }

      return this;
    }
    /**
     * Defines a namespace prefix, overriding any existing prefix for that URI
     * @param prefix
     * @param uri
     */

  }, {
    key: "setPrefix",
    value: function setPrefix(prefix, uri) {
      if (prefix.slice(0, 7) === 'default') return; // Try to weed these out

      if (prefix.slice(0, 2) === 'ns') return; //  From others inferior algos

      if (!prefix || !uri) return; // empty strings not suitable
      // remove any existing prefix targeting this uri
      // for (let existingPrefix in this.namespaces) {
      //   if (this.namespaces[existingPrefix] == uri)
      //     delete this.namespaces[existingPrefix];
      // }
      // remove any existing mapping for this prefix

      for (var existingNs in this.prefixes) {
        if (this.prefixes[existingNs] == prefix) delete this.prefixes[existingNs];
      }

      this.prefixes[uri] = prefix;
      this.namespaces[prefix] = uri;
    }
    /* Accumulate Namespaces
    **
    ** These are only hints.  If two overlap, only one gets used
    ** There is therefore no guarantee in general.
    */

  }, {
    key: "suggestPrefix",
    value: function suggestPrefix(prefix, uri) {
      if (prefix.slice(0, 7) === 'default') return; // Try to weed these out

      if (prefix.slice(0, 2) === 'ns') return; //  From others inferior algos

      if (!prefix || !uri) return; // empty strings not suitable

      if (prefix in this.namespaces || uri in this.prefixes) return; // already used

      this.prefixes[uri] = prefix;
      this.namespaces[prefix] = uri;
    } // Takes a namespace -> prefix map

  }, {
    key: "suggestNamespaces",
    value: function suggestNamespaces(namespaces) {
      for (var px in namespaces) {
        this.suggestPrefix(px, namespaces[px]);
      }

      return this;
    }
  }, {
    key: "checkIntegrity",
    value: function checkIntegrity() {
      var p, ns;

      for (p in this.namespaces) {
        if (this.prefixes[this.namespaces[p]] !== p) {
          throw new Error('Serializer integity error 1: ' + p + ', ' + this.namespaces[p] + ', ' + this.prefixes[this.namespaces[p]] + '!');
        }
      }

      for (ns in this.prefixes) {
        if (this.namespaces[this.prefixes[ns]] !== ns) {
          throw new Error('Serializer integity error 2: ' + ns + ', ' + this.prefixs[ns] + ', ' + this.namespaces[this.prefixes[ns]] + '!');
        }
      }
    } // Make up an unused prefix for a random namespace

  }, {
    key: "makeUpPrefix",
    value: function makeUpPrefix(uri) {
      var p = uri;

      function canUseMethod(pp) {
        if (!this.validPrefix.test(pp)) return false; // bad format

        if (pp === 'ns') return false; // boring

        if (pp in this.namespaces) return false; // already used

        this.prefixes[uri] = pp;
        this.namespaces[pp] = uri;
        return pp;
      }

      var canUse = canUseMethod.bind(this);
      if ('#/'.indexOf(p[p.length - 1]) >= 0) p = p.slice(0, -1);
      var slash = p.lastIndexOf('/');
      if (slash >= 0) p = p.slice(slash + 1);
      var i = 0;

      while (i < p.length) {
        if (this.prefixchars.indexOf(p[i])) {
          i++;
        } else {
          break;
        }
      }

      p = p.slice(0, i);
      if (p.length < 6 && canUse(p)) return p; // exact is best

      if (canUse(p.slice(0, 3))) return p.slice(0, 3);
      if (canUse(p.slice(0, 2))) return p.slice(0, 2);
      if (canUse(p.slice(0, 4))) return p.slice(0, 4);
      if (canUse(p.slice(0, 1))) return p.slice(0, 1);
      if (canUse(p.slice(0, 5))) return p.slice(0, 5);

      if (!this.validPrefix.test(p)) {
        p = 'n'; // Otherwise the loop below may never termimnate
      }

      for (var j = 0;; j++) {
        if (canUse(p.slice(0, 3) + j)) return p.slice(0, 3) + j;
      }
    }
  }, {
    key: "rootSubjects",
    value: function rootSubjects(sts) {
      var incoming = {};
      var subjects = {};
      var allBnodes = {};
      /* This scan is to find out which nodes will have to be the roots of trees
      ** in the serialized form. This will be any symbols, and any bnodes
      ** which hve more or less than one incoming arc, and any bnodes which have
      ** one incoming arc but it is an uninterrupted loop of such nodes back to itself.
      ** This should be kept linear time with repect to the number of statements.
      ** Note it does not use any indexing of the store.
      */

      for (var i = 0; i < sts.length; i++) {
        var st = sts[i];

        var checkMentions = function checkMentions(x) {
          if (!incoming.hasOwnProperty(x)) incoming[x] = [];
          incoming[x].push(st.subject); // List of things which will cause this to be printed
        };

        var st2 = [st.subject, st.predicate, st.object];
        st2.map(function (y) {
          if (y.termType === 'BlankNode') {
            allBnodes[y.toNT()] = true;
          } else if (y.termType === 'Collection') {
            y.elements.forEach(function (z) {
              checkMentions(z); // bnodes in collections important
            });
          }
        });
        checkMentions(sts[i].object);
        var ss = subjects[this.toStr(st.subject)]; // Statements with this as subject

        if (!ss) ss = [];
        ss.push(st);
        subjects[this.toStr(st.subject)] = ss; // Make hash. @@ too slow for formula?
      }

      var roots = [];

      for (var xNT in subjects) {
        if (!subjects.hasOwnProperty(xNT)) continue;
        var y = this.fromStr(xNT);

        if (y.termType !== 'BlankNode' || !incoming[y] || incoming[y].length !== 1) {
          roots.push(y);
          continue;
        }
      }

      this.incoming = incoming; // Keep for serializing @@ Bug for nested formulas
      // Now do the scan using existing roots

      var rootsHash = {};

      for (var k = 0; k < roots.length; k++) {
        rootsHash[roots[k].toNT()] = true;
      }

      return {
        'roots': roots,
        'subjects': subjects,
        'rootsHash': rootsHash,
        'incoming': incoming
      };
    } // //////////////////////////////////////////////////////

  }, {
    key: "toN3",
    value: function toN3(f) {
      return this.statementsToN3(f.statements);
    }
  }, {
    key: "explicitURI",
    value: function explicitURI(uri$1) {
      if (this.flags.indexOf('r') < 0 && this.base) {
        uri$1 = refTo(this.base, uri$1);
      } else if (this.flags.indexOf('u') >= 0) {
        // Unicode encoding NTriples style
        uri$1 = backslashUify(uri$1);
      } else {
        uri$1 = hexify(uri$1);
      }

      return '<' + uri$1 + '>';
    }
  }, {
    key: "statementsToNTriples",
    value: function statementsToNTriples(sts) {
      var sorted = sts.slice();
      sorted.sort();
      var str = '';
      var rdfns = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
      var self = this;
      var kb = this.store;
      var factory = this.rdfFactory;

      var termToNT = function termToNT(x) {
        if (x.termType !== 'Collection') {
          return self.atomicTermToN3(x);
        }

        var list = x.elements;
        var rest = kb.sym(rdfns + 'nill');

        for (var i = list.length - 1; i >= 0; i--) {
          var bnode = factory.blankNode();
          str += termToNT(bnode) + ' ' + termToNT(kb.sym(rdfns + 'first')) + ' ' + termToNT(list[i]) + '.\n';
          str += termToNT(bnode) + ' ' + termToNT(kb.sym(rdfns + 'rest')) + ' ' + termToNT(rest) + '.\n';
          rest = bnode;
        }

        return self.atomicTermToN3(rest);
      };

      for (var i = 0; i < sorted.length; i++) {
        var st = sorted[i];
        var s = '';
        s += termToNT(st.subject) + ' ';
        s += termToNT(st.predicate) + ' ';
        s += termToNT(st.object) + ' ';

        if (this.flags.indexOf('q') >= 0) {
          // Do quads not nrtiples
          s += termToNT(st.why) + ' ';
        }

        s += '.\n';
        str += s;
      }

      return str;
    }
  }, {
    key: "statementsToN3",
    value: function statementsToN3(sts) {
      var indent = 4;
      var width = 80;
      var kb = this.store; // A URI Map alows us to put the type statemnts at the top.

      var uriMap = {
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'aaa:00'
      };

      var SPO = function SPO(x, y) {
        // Do limited canonicalization of bnodes
        return heavyCompareSPO(x, y, kb, uriMap);
      };

      sts.sort(SPO);

      if (this.base && !this.defaultNamespace) {
        this.defaultNamespace = this.base + '#';
      }

      var predMap = {};

      if (this.flags.indexOf('s') < 0) {
        predMap['http://www.w3.org/2002/07/owl#sameAs'] = '=';
      }

      if (this.flags.indexOf('t') < 0) {
        predMap['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'] = 'a';
      }

      if (this.flags.indexOf('i') < 0) {
        predMap['http://www.w3.org/2000/10/swap/log#implies'] = '=>';
      } // //////////////////////// Arrange the bits of text


      var spaces = function spaces(n) {
        var s = '';

        for (var i = 0; i < n; i++) {
          s += ' ';
        }

        return s;
      };

      var treeToLine = function treeToLine(tree) {
        var str = '';

        for (var i = 0; i < tree.length; i++) {
          var branch = tree[i];
          var s2 = typeof branch === 'string' ? branch : treeToLine(branch); // Note the space before the dot in case statement ends with 123 or colon. which is in fact allowed but be conservative.

          if (i !== 0) {
            var ch = str.slice(-1) || ' ';

            if (s2 === ',' || s2 === ';') ; else if (s2 === '.' && !'0123456789.:'.includes(ch)) ; else {
              str += ' '; // separate from previous token
            }
          }

          str += s2;
        }

        return str;
      }; // Convert a nested tree of lists and strings to a string


      var treeToString = function treeToString(tree, level) {
        var str = '';
        var lastLength = 100000;
        if (level === undefined) level = -1;

        for (var i = 0; i < tree.length; i++) {
          var branch = tree[i];

          if (typeof branch !== 'string') {
            var substr = treeToString(branch, level + 1);

            if (substr.length < 10 * (width - indent * level) && substr.indexOf('"""') < 0) {
              // Don't mess up multiline strings
              var line = treeToLine(branch);

              if (line.length < width - indent * level) {
                branch = line; //   Note! treat as string below

                substr = '';
              }
            }

            if (substr) lastLength = 10000;
            str += substr;
          }

          if (typeof branch === 'string') {
            if (branch.length === 1 && str.slice(-1) === '\n') {
              if (',.;'.indexOf(branch) >= 0) {
                str = str.slice(0, -1); // be conservative and ensure a whitespace between some chars and a final dot, as in treeToLine above

                if (branch == '.' && '0123456789.:'.includes(str.charAt(str.length - 1))) {
                  str += ' ';
                  lastLength += 1;
                }

                str += branch + '\n'; //  slip punct'n on end

                lastLength += 1;
                continue;
              }
            }

            if (lastLength < indent * level + 4 || // if new line not necessary
            lastLength + branch.length + 1 < width && ';.'.indexOf(str[str.length - 2]) < 0) {
              // or the string fits on last line
              str = str.slice(0, -1) + ' ' + branch + '\n'; // then continue on this line

              lastLength += branch.length + 1;
            } else {
              var _line = spaces(indent * level) + branch;

              str += _line + '\n';
              lastLength = _line.length;

              if (level < 0) {
                str += '\n'; // extra blank line

                lastLength = 100000; // don't touch
              }
            }
          }
        }

        return str;
      }; // //////////////////////////////////////////// Structure for N3
      // Convert a set of statements into a nested tree of lists and strings


      function statementListToTreeMethod(statements) {
        var stats = this.rootSubjects(statements);
        var roots = stats.roots;
        var results = [];

        for (var i = 0; i < roots.length; i++) {
          var root = roots[i];
          results.push(subjectTree(root, stats));
        }

        return results;
      }

      var statementListToTree = statementListToTreeMethod.bind(this); // The tree for a subject

      function subjectTree(subject, stats) {
        if (subject.termType === 'BlankNode' && !stats.incoming[subject]) {
          return objectTree(subject, stats, true).concat(['.']); // Anonymous bnode subject
        }

        return [termToN3(subject, stats)].concat([propertyTree(subject, stats)]).concat(['.']);
      } // The property tree for a single subject or anonymous node


      function propertyTreeMethod(subject, stats) {
        var results = [];
        var lastPred = null;
        var sts = stats.subjects[this.toStr(subject)] || []; // relevant statements

        if (typeof sts === 'undefined') {
          throw new Error('Cant find statements for ' + subject);
        }

        var objects = [];

        for (var i = 0; i < sts.length; i++) {
          var st = sts[i];

          if (st.predicate.uri === lastPred) {
            objects.push(',');
          } else {
            if (lastPred) {
              results = results.concat([objects]).concat([';']);
              objects = [];
            }

            results.push(predMap[st.predicate.uri] ? predMap[st.predicate.uri] : termToN3(st.predicate, stats));
          }

          lastPred = st.predicate.uri;
          objects.push(objectTree(st.object, stats));
        }

        results = results.concat([objects]);
        return results;
      }

      var propertyTree = propertyTreeMethod.bind(this);

      function objectTreeMethod(obj, stats, force) {
        if (obj.termType === 'BlankNode' && (force || stats.rootsHash[obj.toNT()] === undefined)) {
          // if not a root
          if (stats.subjects[this.toStr(obj)]) {
            return ['[', propertyTree(obj, stats), ']'];
          } else {
            return '[]';
          }
        }

        return termToN3(obj, stats);
      }

      var objectTree = objectTreeMethod.bind(this);

      function termToN3Method(expr, stats) {
        //
        var i, res;

        switch (expr.termType) {
          case 'Graph':
            res = ['{'];
            res = res.concat(statementListToTree(expr.statements));
            return res.concat(['}']);

          case 'Collection':
            res = ['('];

            for (i = 0; i < expr.elements.length; i++) {
              res.push([objectTree(expr.elements[i], stats)]);
            }

            res.push(')');
            return res;

          default:
            return this.atomicTermToN3(expr);
        }
      }

      Serializer.prototype.termToN3 = termToN3;
      var termToN3 = termToN3Method.bind(this);

      function prefixDirectivesMethod() {
        var str = '';

        if (this.defaultNamespace) {
          str += '@prefix : ' + this.explicitURI(this.defaultNamespace) + '.\n';
        }

        for (var ns in this.prefixes) {
          if (!this.prefixes.hasOwnProperty(ns)) continue;
          if (!this.namespacesUsed[ns]) continue;
          str += '@prefix ' + this.prefixes[ns] + ': ' + this.explicitURI(ns) + '.\n';
        }

        return str + '\n';
      }

      var prefixDirectives = prefixDirectivesMethod.bind(this); // Body of statementsToN3:

      var tree = statementListToTree(sts);
      return prefixDirectives() + treeToString(tree);
    } // //////////////////////////////////////////// Atomic Terms
    //  Deal with term level things and nesting with no bnode structure

  }, {
    key: "atomicTermToN3",
    value: function atomicTermToN3(expr, stats) {
      switch (expr.termType) {
        case 'BlankNode':
        case 'Variable':
          return expr.toNT();

        case 'Literal':
          var val = expr.value;

          if (typeof val !== 'string') {
            throw new TypeError('Value of RDF literal node must be a string');
          } // var val = expr.value.toString() // should be a string already


          if (expr.datatype && this.flags.indexOf('x') < 0) {
            // Supress native numbers
            switch (expr.datatype.uri) {
              case 'http://www.w3.org/2001/XMLSchema#integer':
                return val;

              case 'http://www.w3.org/2001/XMLSchema#decimal':
                // In urtle must have dot
                if (val.indexOf('.') < 0) val += '.0';
                return val;

              case 'http://www.w3.org/2001/XMLSchema#double':
                {
                  // Must force use of 'e'
                  var eNotation = val.toLowerCase().indexOf('e') > 0;
                  if (val.indexOf('.') < 0 && !eNotation) val += '.0';
                  if (!eNotation) val += 'e0';
                  return val;
                }

              case 'http://www.w3.org/2001/XMLSchema#boolean':
                return expr.value === '1' ? 'true' : 'false';
            }
          }

          var str = this.stringToN3(expr.value);

          if (expr.language) {
            str += '@' + expr.language;
          } else if (!expr.datatype.equals(this.xsd.string)) {
            str += '^^' + this.atomicTermToN3(expr.datatype, stats);
          }

          return str;

        case 'NamedNode':
          return this.symbolToN3(expr);

        default:
          throw new Error('Internal: atomicTermToN3 cannot handle ' + expr + ' of termType: ' + expr.termType);
      }
    } //  stringToN3:  String escaping for N3

  }, {
    key: "stringToN3",
    value: function stringToN3(str, flags) {
      if (!flags) flags = 'e';
      var res = '';
      var i, j, k;
      var delim;
      var forbidden;

      if (str.length > 20 && // Long enough to make sense
      str.slice(-1) !== '"' && // corner case'
      flags.indexOf('n') < 0 && ( // Force single line
      str.indexOf('\n') > 0 || str.indexOf('"') > 0)) {
        delim = '"""';
        forbidden = this.forbidden3;
      } else {
        delim = '"';
        forbidden = this.forbidden1;
      }

      for (i = 0; i < str.length;) {
        forbidden.lastIndex = 0;
        var m = forbidden.exec(str.slice(i));
        if (m == null) break;
        j = i + forbidden.lastIndex - 1;
        res += str.slice(i, j);
        var ch = str[j];

        if (ch === '"' && delim === '"""' && str.slice(j, j + 3) !== '"""') {
          res += ch;
        } else {
          k = '\b\f\r\t\v\n\\"'.indexOf(ch); // No escaping of bell (7)?

          if (k >= 0) {
            res += '\\' + 'bfrtvn\\"'[k];
          } else {
            if (flags.indexOf('e') >= 0) {
              // Unicode escaping in strings not unix style
              res += "\\u" + ('000' + ch.charCodeAt(0).toString(16).toLowerCase()).slice(-4);
            } else {
              // no 'e' flag
              res += ch;
            }
          }
        }

        i = j + 1;
      }

      return delim + res + str.slice(i) + delim;
    } //  A single symbol, either in  <> or namespace notation

  }, {
    key: "symbolToN3",
    value: function symbolToN3(x) {
      // c.f. symbolString() in notation3.py
      var uri = x.uri;
      var j = uri.indexOf('#');

      if (j < 0 && this.flags.indexOf('/') < 0) {
        j = uri.lastIndexOf('/');
      }

      if (j >= 0 && this.flags.indexOf('p') < 0 && ( // Can split at namespace but only if http[s]: URI or file: or ws[s] (why not others?)
      uri.indexOf('http') === 0 || uri.indexOf('ws') === 0 || uri.indexOf('file') === 0)) {
        var canSplit = true;

        for (var k = j + 1; k < uri.length; k++) {
          if (this._notNameChars.indexOf(uri[k]) >= 0) {
            canSplit = false;
            break;
          }
        }
        /*
              if (uri.slice(0, j + 1) === this.base + '#') { // base-relative
                if (canSplit) {
                  return ':' + uri.slice(j + 1) // assume deafult ns is local
                } else {
                  return '<#' + uri.slice(j + 1) + '>'
                }
              }
        */


        if (canSplit) {
          var localid = uri.slice(j + 1);
          var namesp = uri.slice(0, j + 1);

          if (this.defaultNamespace && this.defaultNamespace === namesp && this.flags.indexOf('d') < 0) {
            // d -> suppress default
            if (this.flags.indexOf('k') >= 0 && this.keyords.indexOf(localid) < 0) {
              return localid;
            }

            return ':' + localid;
          } // this.checkIntegrity() //  @@@ Remove when not testing


          var prefix = this.prefixes[namesp];
          if (!prefix) prefix = this.makeUpPrefix(namesp);

          if (prefix) {
            this.namespacesUsed[namesp] = true;
            return prefix + ':' + localid;
          } // Fall though if can't do qname

        }
      }

      return this.explicitURI(uri);
    } // /////////////////////////// Quad store serialization
    // @para. write  - a function taking a single string to be output
    //

  }, {
    key: "writeStore",
    value: function writeStore(write) {
      var kb = this.store;
      var fetcher = kb.fetcher;
      var session = fetcher && fetcher.appNode; // The core data

      var sources = this.store.index[3];

      for (var s in sources) {
        // -> assume we can use -> as short for log:semantics
        var source = kb.fromNT(s);
        if (session && source.equals(session)) continue;
        write('\n' + this.atomicTermToN3(source) + ' ' + this.atomicTermToN3(kb.sym('http://www.w3.org/2000/10/swap/log#semantics')) + ' { ' + this.statementsToN3(kb.statementsMatching(undefined, undefined, undefined, source)) + ' }.\n');
      } // The metadata from HTTP interactions:


      kb.statementsMatching(undefined, kb.sym('http://www.w3.org/2007/ont/link#requestedURI')).map(function (st) {
        write('\n<' + st.object.value + '> log:metadata {\n');
        var sts = kb.statementsMatching(undefined, undefined, undefined, st.subject);
        write(this.statementsToN3(this.statementsToN3(sts)));
        write('}.\n');
      }); // Inferences we have made ourselves not attributable to anyone else

      var metaSources = [];
      if (session) metaSources.push(session);
      var metadata = [];
      metaSources.map(function (source) {
        metadata = metadata.concat(kb.statementsMatching(undefined, undefined, undefined, source));
      });
      write(this.statementsToN3(metadata));
    } // ////////////////////////////////////////////// XML serialization

  }, {
    key: "statementsToXML",
    value: function statementsToXML(sts) {
      var indent = 4;
      var width = 80;
      var namespaceCounts = []; // which have been used

      namespaceCounts['http://www.w3.org/1999/02/22-rdf-syntax-ns#'] = true;
      var liPrefix = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_'; // prefix for ordered list items
      // //////////////////////// Arrange the bits of XML text

      var spaces = function spaces(n) {
        var s = '';

        for (var i = 0; i < n; i++) {
          s += ' ';
        }

        return s;
      };

      var XMLtreeToLine = function XMLtreeToLine(tree) {
        var str = '';

        for (var i = 0; i < tree.length; i++) {
          var branch = tree[i];
          var s2 = typeof branch === 'string' ? branch : XMLtreeToLine(branch);
          str += s2;
        }

        return str;
      }; // Convert a nested tree of lists and strings to a string


      var XMLtreeToString = function XMLtreeToString(tree, level) {
        var str = '';
        var line;
        var lastLength = 100000;
        if (!level) level = 0;

        for (var i = 0; i < tree.length; i++) {
          var branch = tree[i];

          if (typeof branch !== 'string') {
            var substr = XMLtreeToString(branch, level + 1);

            if (substr.length < 10 * (width - indent * level) && substr.indexOf('"""') < 0) {
              // Don't mess up multiline strings
              line = XMLtreeToLine(branch);

              if (line.length < width - indent * level) {
                branch = '   ' + line; //   @@ Hack: treat as string below

                substr = '';
              }
            }

            if (substr) lastLength = 10000;
            str += substr;
          }

          if (typeof branch === 'string') {
            if (lastLength < indent * level + 4) {
              // continue
              str = str.slice(0, -1) + ' ' + branch + '\n';
              lastLength += branch.length + 1;
            } else {
              line = spaces(indent * level) + branch;
              str += line + '\n';
              lastLength = line.length;
            }
          }
        }

        return str;
      };

      function statementListToXMLTreeMethod(statements) {
        this.suggestPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        var stats = this.rootSubjects(statements);
        var roots = stats.roots;
        var results = [];

        for (var i = 0; i < roots.length; i++) {
          var root = roots[i];
          results.push(subjectXMLTree(root, stats));
        }

        return results;
      }

      var statementListToXMLTree = statementListToXMLTreeMethod.bind(this);

      function escapeForXML(str) {
        if (typeof str === 'undefined') return '@@@undefined@@@@';
        return str.replace(/[&<"]/g, function (m) {
          switch (m[0]) {
            case '&':
              return '&amp;';

            case '<':
              return '&lt;';

            case '"':
              return '&quot;';
            // '
          }
        });
      }

      function relURIMethod(term) {
        return escapeForXML(this.base ? refTo(this.base, term.uri) : term.uri);
      }

      var relURI = relURIMethod.bind(this); // The tree for a subject

      function subjectXMLTreeMethod(subject, stats) {
        var results = [];
        var type, t, st, pred;
        var sts = stats.subjects[this.toStr(subject)]; // relevant statements

        if (typeof sts === 'undefined') {
          // empty bnode
          return propertyXMLTree(subject, stats);
        } // Sort only on the predicate, leave the order at object
        // level undisturbed.  This leaves multilingual content in
        // the order of entry (for partner literals), which helps
        // readability.
        //
        // For the predicate sort, we attempt to split the uri
        // as a hint to the sequence


        sts.sort(function (a, b) {
          var ap = a.predicate.uri;
          var bp = b.predicate.uri;

          if (ap.substring(0, liPrefix.length) === liPrefix || bp.substring(0, liPrefix.length) === liPrefix) {
            // we're only interested in sorting list items
            return ap.localeCompare(bp);
          }

          var as = ap.substring(liPrefix.length);
          var bs = bp.substring(liPrefix.length);
          var an = parseInt(as, 10);
          var bn = parseInt(bs, 10);

          if (isNaN(an) || isNaN(bn) || an !== as || bn !== bs) {
            // we only care about integers
            return ap.localeCompare(bp);
          }

          return an - bn;
        });

        for (var i = 0; i < sts.length; i++) {
          st = sts[i]; // look for a type

          if (st.predicate.uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' && !type && st.object.termType === 'NamedNode') {
            type = st.object;
            continue; // don't include it as a child element
          } // see whether predicate can be replaced with "li"


          pred = st.predicate;

          if (pred.uri.substr(0, liPrefix.length) === liPrefix) {
            var number = pred.uri.substr(liPrefix.length); // make sure these are actually numeric list items

            var intNumber = parseInt(number, 10);

            if (number === intNumber.toString()) {
              // was numeric; don't need to worry about ordering since we've already
              // sorted the statements
              pred = this.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#li');
            }
          }

          t = qname(pred);

          switch (st.object.termType) {
            case 'BlankNode':
              if (stats.incoming[st.object].length === 1) {
                // there should always be something in the incoming array for a bnode
                results = results.concat(['<' + t + ' rdf:parseType="Resource">', subjectXMLTree(st.object, stats), '</' + t + '>']);
              } else {
                results = results.concat(['<' + t + ' rdf:nodeID="' + st.object.toNT().slice(2) + '"/>']);
              }

              break;

            case 'NamedNode':
              results = results.concat(['<' + t + ' rdf:resource="' + relURI(st.object) + '"/>']);
              break;

            case 'Literal':
              results = results.concat(['<' + t + (st.object.datatype.equals(this.xsd.string) ? '' : ' rdf:datatype="' + escapeForXML(st.object.datatype.uri) + '"') + (st.object.language ? ' xml:lang="' + st.object.language + '"' : '') + '>' + escapeForXML(st.object.value) + '</' + t + '>']);
              break;

            case 'Collection':
              results = results.concat(['<' + t + ' rdf:parseType="Collection">', collectionXMLTree(st.object, stats), '</' + t + '>']);
              break;

            default:
              throw new Error("Can't serialize object of type " + st.object.termType + ' into XML');
          } // switch

        }

        var tag = type ? qname(type) : 'rdf:Description';
        var attrs = '';

        if (subject.termType === 'BlankNode') {
          if (!stats.incoming[subject] || stats.incoming[subject].length !== 1) {
            // not an anonymous bnode
            attrs = ' rdf:nodeID="' + subject.toNT().slice(2) + '"';
          }
        } else {
          attrs = ' rdf:about="' + relURI(subject) + '"';
        }

        return ['<' + tag + attrs + '>'].concat([results]).concat(['</' + tag + '>']);
      }

      var subjectXMLTree = subjectXMLTreeMethod.bind(this);

      function collectionXMLTree(subject, stats) {
        var res = [];

        for (var i = 0; i < subject.elements.length; i++) {
          res.push(subjectXMLTree(subject.elements[i], stats));
        }

        return res;
      } // The property tree for a single subject or anonymos node


      function propertyXMLTreeMethod(subject, stats) {
        var results = [];
        var sts = stats.subjects[this.toStr(subject)]; // relevant statements

        if (!sts) return results; // No relevant statements

        sts.sort();

        for (var i = 0; i < sts.length; i++) {
          var st = sts[i];

          switch (st.object.termType) {
            case 'BlankNode':
              if (stats.rootsHash[st.object.toNT()]) {
                // This bnode has been done as a root -- no content here @@ what bout first time
                results = results.concat(['<' + qname(st.predicate) + ' rdf:nodeID="' + st.object.toNT().slice(2) + '">', '</' + qname(st.predicate) + '>']);
              } else {
                results = results.concat(['<' + qname(st.predicate) + ' rdf:parseType="Resource">', propertyXMLTree(st.object, stats), '</' + qname(st.predicate) + '>']);
              }

              break;

            case 'NamedNode':
              results = results.concat(['<' + qname(st.predicate) + ' rdf:resource="' + relURI(st.object) + '"/>']);
              break;

            case 'Literal':
              results = results.concat(['<' + qname(st.predicate) + (st.object.datatype.equals(this.xsd.string) ? '' : ' rdf:datatype="' + escapeForXML(st.object.datatype.value) + '"') + (st.object.language ? ' xml:lang="' + st.object.language + '"' : '') + '>' + escapeForXML(st.object.value) + '</' + qname(st.predicate) + '>']);
              break;

            case 'Collection':
              results = results.concat(['<' + qname(st.predicate) + ' rdf:parseType="Collection">', collectionXMLTree(st.object, stats), '</' + qname(st.predicate) + '>']);
              break;

            default:
              throw new Error("Can't serialize object of type " + st.object.termType + ' into XML');
          } // switch

        }

        return results;
      }

      var propertyXMLTree = propertyXMLTreeMethod.bind(this);

      function qnameMethod(term) {
        var uri = term.uri;
        var j = uri.indexOf('#');

        if (j < 0 && this.flags.indexOf('/') < 0) {
          j = uri.lastIndexOf('/');
        }

        if (j < 0) throw new Error('Cannot make qname out of <' + uri + '>');

        for (var k = j + 1; k < uri.length; k++) {
          if (this._notNameChars.indexOf(uri[k]) >= 0) {
            throw new Error('Invalid character "' + uri[k] + '" cannot be in XML qname for URI: ' + uri);
          }
        }

        var localid = uri.slice(j + 1);
        var namesp = uri.slice(0, j + 1);

        if (this.defaultNamespace && this.defaultNamespace === namesp && this.flags.indexOf('d') < 0) {
          // d -> suppress default
          return localid;
        }

        var prefix = this.prefixes[namesp];
        if (!prefix) prefix = this.makeUpPrefix(namesp);
        namespaceCounts[namesp] = true;
        return prefix + ':' + localid;
      }

      var qname = qnameMethod.bind(this); // Body of toXML:

      var tree = statementListToXMLTree(sts);
      var str = '<rdf:RDF';

      if (this.defaultNamespace) {
        str += ' xmlns="' + escapeForXML(this.defaultNamespace) + '"';
      }

      for (var ns in namespaceCounts) {
        if (!namespaceCounts.hasOwnProperty(ns)) continue; // Rel uris in xml ns is not strictly allowed in the XMLNS spec but needed in practice often

        var ns2 = this.base && this.flags.includes('z') ? refTo(this.base, ns) : ns;
        str += '\n xmlns:' + this.prefixes[ns] + '="' + escapeForXML(ns2) + '"';
      }

      str += '>';
      var tree2 = [str, tree, '</rdf:RDF>']; // @@ namespace declrations

      return XMLtreeToString(tree2, -1);
    } // End @@ body

  }]);

  return Serializer;
}(); // String escaping utilities

function hexify(str) {
  // also used in parser
  return encodeURI(str);
}

function backslashUify(str) {
  var res = '';
  var k;

  for (var i = 0; i < str.length; i++) {
    k = str.charCodeAt(i);

    if (k > 65535) {
      res += "\\U" + ('00000000' + k.toString(16)).slice(-8); // convert to upper?
    } else if (k > 126) {
      res += "\\u" + ('0000' + k.toString(16)).slice(-4);
    } else {
      res += str[i];
    }
  }

  return res;
}

/**
 * Serialize to the appropriate format
 */
function serialize(
/** The graph or nodes that should be serialized */
target,
/** The store */
kb, base,
/**
 * The mime type.
 * Defaults to Turtle.
 */
contentType, callback, options) {
  base = base || (target === null || target === void 0 ? void 0 : target.value);
  var opts = options || {};
  contentType = contentType || TurtleContentType; // text/n3 if complex?

  var documentString = undefined;

  try {
    var sz = createSerializer(kb);
    if (opts.flags) sz.setFlags(opts.flags);
    var newSts = kb.statementsMatching(undefined, undefined, undefined, target);
    var n3String; // If an IndexedFormula, use the namespaces from the given graph as suggestions

    if ('namespaces' in kb) {
      sz.suggestNamespaces(kb.namespaces);
    } // use the provided options.namespaces are mandatory prefixes


    if (opts.namespaces) {
      sz.setNamespaces(opts.namespaces);
    }

    sz.setBase(base);

    switch (contentType) {
      case RDFXMLContentType:
        documentString = sz.statementsToXML(newSts);
        return executeCallback(null, documentString);

      case N3ContentType:
      case N3LegacyContentType:
        documentString = sz.statementsToN3(newSts);
        return executeCallback(null, documentString);

      case TurtleContentType:
      case TurtleLegacyContentType:
        sz.setFlags('si'); // Suppress = for sameAs and => for implies

        documentString = sz.statementsToN3(newSts);
        return executeCallback(null, documentString);

      case NTriplesContentType:
        sz.setFlags('deinprstux'); // Suppress nice parts of N3 to make ntriples

        documentString = sz.statementsToNTriples(newSts);
        return executeCallback(null, documentString);

      case JSONLDContentType:
        sz.setFlags('deinprstux'); // Use adapters to connect to incmpatible parser

        n3String = sz.statementsToNTriples(newSts); // n3String = sz.statementsToN3(newSts)

        convertToJson(n3String, callback);
        break;

      case NQuadsContentType:
      case NQuadsAltContentType:
        // @@@ just outpout the quads? Does not work for collections
        sz.setFlags('deinprstux q'); // Suppress nice parts of N3 to make ntriples

        documentString = sz.statementsToNTriples(newSts); // q in flag means actually quads

        return executeCallback(null, documentString);
      // n3String = sz.statementsToN3(newSts)
      // documentString = convert.convertToNQuads(n3String, callback)
      // break

      default:
        throw new Error('Serialize: Content-type ' + contentType + ' not supported for data write.');
    }
  } catch (err) {
    if (callback) {
      // @ts-ignore
      return callback(err, undefined);
    }

    throw err; // Don't hide problems from caller in sync mode
  }

  function executeCallback(err, result) {
    if (callback) {
      callback(err, result);
      return;
    } else {
      return result;
    }
  }
}

var appliedFactoryMethods = ['blankNode', 'defaultGraph', 'literal', 'namedNode', 'quad', 'variable', 'supports'];
var rdf = {
  first: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
  rest: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
  nil: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'
};
/**
 * Expands an array of Terms to a set of statements representing the rdf:list.
 * @param rdfFactory - The factory to use
 * @param subject - The iri of the first list item.
 * @param data - The terms to expand into the list.
 * @return The {data} as a set of statements.
 */

function arrayToStatements(rdfFactory, subject, data) {
  var statements = [];
  data.reduce(function (id, _listObj, i, listData) {
    statements.push(rdfFactory.quad(id, rdfFactory.namedNode(rdf.first), listData[i]));
    var nextNode;

    if (i < listData.length - 1) {
      nextNode = rdfFactory.blankNode();
      statements.push(rdfFactory.quad(id, rdfFactory.namedNode(rdf.rest), nextNode));
    } else {
      statements.push(rdfFactory.quad(id, rdfFactory.namedNode(rdf.rest), rdfFactory.namedNode(rdf.nil)));
    }

    return nextNode;
  }, subject);
  return statements;
}
function ArrayIndexOf(arr, item) {
  var i = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var length = arr.length;
  if (i < 0) i = length + i;

  for (; i < length; i++) {
    if (arr[i] === item) {
      return i;
    }
  }

  return -1;
}

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _createSuper$7(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$7(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$7() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/**
 * A formula, or store of RDF statements
 */
var Formula = /*#__PURE__*/function (_Node) {
  _inherits(Formula, _Node);

  var _super = _createSuper$7(Formula);

  /**
   * The accompanying fetcher instance.
   *
   * Is set by the fetcher when initialized.
   */

  /**
   * A namespace for the specified namespace's URI
   * @param nsuri The URI for the namespace
   */

  /** The factory used to generate statements and terms */

  /**
   * Initializes this formula
   * @constructor
   * @param statements - Initial array of statements
   * @param constraints - initial array of constraints
   * @param initBindings - initial bindings used in Query
   * @param optional - optional
   * @param opts
   * @param opts.rdfFactory - The rdf factory that should be used by the store
  */
  function Formula() {
    var _this;

    var statements = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var constraints = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var initBindings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var optional = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    var opts = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    _classCallCheck(this, Formula);

    _this = _super.call(this, '');
    _this.statements = statements;
    _this.constraints = constraints;
    _this.initBindings = initBindings;
    _this.optional = optional;

    _defineProperty(_assertThisInitialized(_this), "termType", GraphTermType);

    _defineProperty(_assertThisInitialized(_this), "classOrder", ClassOrder.Graph);

    _defineProperty(_assertThisInitialized(_this), "fetcher", void 0);

    _defineProperty(_assertThisInitialized(_this), "isVar", 0);

    _defineProperty(_assertThisInitialized(_this), "ns", Namespace);

    _defineProperty(_assertThisInitialized(_this), "rdfFactory", void 0);

    _this.rdfFactory = opts && opts.rdfFactory || CanonicalDataFactory; // Enable default factory methods on this while preserving factory context.

    var _iterator = _createForOfIteratorHelper(appliedFactoryMethods),
        _step;

    try {
      var _loop = function _loop() {
        var factoryMethod = _step.value;

        _this[factoryMethod] = function () {
          var _this$rdfFactory;

          return (_this$rdfFactory = _this.rdfFactory)[factoryMethod].apply(_this$rdfFactory, arguments);
        };
      };

      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        _loop();
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return _this;
  }
  /** Add a statement from its parts
   * @param subject - the first part of the statement
   * @param predicate - the second part of the statement
   * @param object - the third part of the statement
   * @param graph - the last part of the statement
   */


  _createClass(Formula, [{
    key: "add",
    value: function add(subject, predicate, object, graph) {
      var _this2 = this;

      if (arguments.length === 1) {
        subject.forEach(function (st) {
          return _this2.add(st.subject, st.predicate, st.object, st.graph);
        });
      }

      return this.statements.push(this.rdfFactory.quad(subject, predicate, object, graph));
    }
    /** Add a statment object
     * @param {Statement} statement - An existing constructed statement to add
     */

  }, {
    key: "addStatement",
    value: function addStatement(statement) {
      return this.add(statement);
    }
    /**
     * Shortcut for adding blankNodes
     * @param [id]
     */

  }, {
    key: "bnode",
    value: function bnode(id) {
      return this.rdfFactory.blankNode(id);
    }
    /**
     * Adds all the statements to this formula
     * @param statements - A collection of statements
     */

  }, {
    key: "addAll",
    value: function addAll(statements) {
      var _this3 = this;

      statements.forEach(function (quad) {
        _this3.add(quad.subject, quad.predicate, quad.object, quad.graph);
      });
    }
    /** Follow link from one node, using one wildcard, looking for one
    *
    * For example, any(me, knows, null, profile)  - a person I know accoring to my profile .
    * any(me, knows, null, null)  - a person I know accoring to anything in store .
    * any(null, knows, me, null)  - a person who know me accoring to anything in store .
    *
    * @param s - A node to search for as subject, or if null, a wildcard
    * @param p - A node to search for as predicate, or if null, a wildcard
    * @param o - A node to search for as object, or if null, a wildcard
    * @param g - A node to search for as graph, or if null, a wildcard
    * @returns A node which match the wildcard position, or null
    */

  }, {
    key: "any",
    value: function any(s, p, o, g) {
      var st = this.anyStatementMatching(s, p, o, g);

      if (st == null) {
        return null;
      } else if (s == null) {
        return st.subject;
      } else if (p == null) {
        return st.predicate;
      } else if (o == null) {
        return st.object;
      }

      return null;
    }
    /**
     * Gets the value of a node that matches the specified pattern
     * @param s The subject
     * @param p The predicate
     * @param o The object
     * @param g The graph that contains the statement
     */

  }, {
    key: "anyValue",
    value: function anyValue(s, p, o, g) {
      var y = this.any(s, p, o, g);
      return y ? y.value : void 0;
    }
    /**
     * Gets the first JavaScript object equivalent to a node based on the specified pattern
     * @param s The subject
     * @param p The predicate
     * @param o The object
     * @param g The graph that contains the statement
     */

  }, {
    key: "anyJS",
    value: function anyJS(s, p, o, g) {
      var y = this.any(s, p, o, g);
      return y ? Node$2.toJS(y) : void 0;
    }
    /**
     * Gets the first statement that matches the specified pattern
     */

  }, {
    key: "anyStatementMatching",
    value: function anyStatementMatching(s, p, o, g) {
      var x = this.statementsMatching(s, p, o, g, true);

      if (!x || x.length === 0) {
        return undefined;
      }

      return x[0];
    }
    /**
     * Returns a unique index-safe identifier for the given term.
     *
     * Falls back to the rdflib hashString implementation if the given factory doesn't support id.
     */

  }, {
    key: "id",
    value: function id(term) {
      return this.rdfFactory.id(term);
    }
    /**
     * Search the Store
     * This is really a teaching method as to do this properly you would use IndexedFormula
     *
     * @param s - A node to search for as subject, or if null, a wildcard
     * @param p - A node to search for as predicate, or if null, a wildcard
     * @param o - A node to search for as object, or if null, a wildcard
     * @param g - A node to search for as graph, or if null, a wildcard
     * @param justOne - flag - stop when found one rather than get all of them?
     * @returns {Array<Node>} - An array of nodes which match the wildcard position
     */

  }, {
    key: "statementsMatching",
    value: function statementsMatching(s, p, o, g, justOne) {
      var sts = this.statements.filter(function (st) {
        return (!s || s.equals(st.subject)) && (!p || p.equals(st.predicate)) && (!o || o.equals(st.object)) && (!g || g.equals(st.graph));
      });

      if (justOne) {
        return sts.length === 0 ? [] : [sts[0]];
      }

      return sts;
    }
    /**
     * Finds the types in the list which have no *stored* subtypes
     * These are a set of classes which provide by themselves complete
     * information -- the other classes are redundant for those who
     * know the class DAG.
     * @param types A map of the types
     */

  }, {
    key: "bottomTypeURIs",
    value: function bottomTypeURIs(types) {
      var bots;
      var bottom;
      var elt;
      var i;
      var len;
      var ref;
      var subs;
      var v;
      bots = [];

      for (var _k in types) {
        if (!types.hasOwnProperty(_k)) continue;
        v = types[_k];
        subs = this.each(void 0, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), this.rdfFactory.namedNode(_k));
        bottom = true;
        i = 0;

        for (len = subs.length; i < len; i++) {
          elt = subs[i];
          ref = elt.uri;

          if (ref in types) {
            // the subclass is one we know
            bottom = false;
            break;
          }
        }

        if (bottom) {
          bots[_k] = v;
        }
      }

      return bots;
    }
    /** Creates a new collection */

  }, {
    key: "collection",
    value: function collection() {
      return new Collection();
    }
    /** Follow links from one node, using one wildcard.
    *
    * For example, each(me, knows, null, profile)  - people I know accoring to my profile .
    * each(me, knows, null, null)  - people I know accoring to anything in store .
    * each(null, knows, me, null)  - people who know me accoring to anything in store .
    *
    * @param s - A node to search for as subject, or if null, a wildcard
    * @param p - A node to search for as predicate, or if null, a wildcard
    * @param o - A node to search for as object, or if null, a wildcard
    * @param g - A node to search for as graph, or if null, a wildcard
    * @returns {Array<Node>} - An array of nodes which match the wildcard position
    */

  }, {
    key: "each",
    value: function each(s, p, o, g) {
      var results = [];
      var sts = this.statementsMatching(s, p, o, g, false);

      if (s == null) {
        for (var i = 0, len = sts.length; i < len; i++) {
          results.push(sts[i].subject);
        }
      } else if (p == null) {
        for (var l = 0, len1 = sts.length; l < len1; l++) {
          results.push(sts[l].predicate);
        }
      } else if (o == null) {
        for (var m = 0, len2 = sts.length; m < len2; m++) {
          results.push(sts[m].object);
        }
      } else if (g == null) {
        for (var _q = 0, len3 = sts.length; _q < len3; _q++) {
          results.push(new NamedNode(sts[_q].graph.value));
        }
      }

      return results;
    }
    /**
     * Test whether this formula is equals to {other}
     * @param other - The other formula
     */

  }, {
    key: "equals",
    value: function equals(other) {
      if (!other) {
        return false;
      }

      return this.hashString() === other.hashString();
    }
    /**
     * For thisClass or any subclass, anything which has it is its type
     * or is the object of something which has the type as its range, or subject
     * of something which has the type as its domain
     * We don't bother doing subproperty (yet?)as it doesn't seeem to be used
     * much.
     * Get all the Classes of which we can RDFS-infer the subject is a member
     * @return a hash of URIs
     */

  }, {
    key: "findMembersNT",
    value: function findMembersNT(thisClass) {
      var len2;
      var len4;
      var m;
      var members;
      var pred;
      var ref;
      var ref1;
      var ref2;
      var ref3;
      var ref4;
      var ref5;
      var seeds;
      var st;
      var u;
      seeds = {};
      seeds[thisClass.toNT()] = true;
      members = {};
      ref = this.transitiveClosure(seeds, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), true);

      for (var t in ref) {
        if (!ref.hasOwnProperty(t)) continue;
        ref1 = this.statementsMatching(void 0, this.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), this.fromNT(t));

        for (var i = 0, len = ref1.length; i < len; i++) {
          st = ref1[i];
          members[st.subject.toNT()] = st;
        }

        ref2 = this.each(void 0, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'), this.fromNT(t));

        for (var l = 0, len1 = ref2.length; l < len1; l++) {
          pred = ref2[l];
          ref3 = this.statementsMatching(void 0, pred);

          for (m = 0, len2 = ref3.length; m < len2; m++) {
            st = ref3[m];
            members[st.subject.toNT()] = st;
          }
        }

        ref4 = this.each(void 0, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#range'), this.fromNT(t));

        for (var _q2 = 0, len3 = ref4.length; _q2 < len3; _q2++) {
          pred = ref4[_q2];
          ref5 = this.statementsMatching(void 0, pred);

          for (u = 0, len4 = ref5.length; u < len4; u++) {
            st = ref5[u];
            members[st.object.toNT()] = st;
          }
        }
      }

      return members;
    }
    /**
     * For thisClass or any subclass, anything which has it is its type
     * or is the object of something which has the type as its range, or subject
     * of something which has the type as its domain
     * We don't bother doing subproperty (yet?)as it doesn't seeem to be used
     * much.
     * Get all the Classes of which we can RDFS-infer the subject is a member
     * @param subject - A named node
     */

  }, {
    key: "findMemberURIs",
    value: function findMemberURIs(subject) {
      return this.NTtoURI(this.findMembersNT(subject));
    }
    /**
     * Get all the Classes of which we can RDFS-infer the subject is a superclass
     * Returns a hash table where key is NT of type and value is statement why we
     * think so.
     * Does NOT return terms, returns URI strings.
     * We use NT representations in this version because they handle blank nodes.
     */

  }, {
    key: "findSubClassesNT",
    value: function findSubClassesNT(subject) {
      var types = {};
      types[subject.toNT()] = true;
      return this.transitiveClosure(types, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), true);
    }
    /**
     * Get all the Classes of which we can RDFS-infer the subject is a subclass
     * @param {RDFlibNamedNode} subject - The thing whose classes are to be found
     * @returns a hash table where key is NT of type and value is statement why we
     * think so.
     * Does NOT return terms, returns URI strings.
     * We use NT representations in this version because they handle blank nodes.
     */

  }, {
    key: "findSuperClassesNT",
    value: function findSuperClassesNT(subject) {
      var types = {};
      types[subject.toNT()] = true;
      return this.transitiveClosure(types, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), false);
    }
    /**
     * Get all the Classes of which we can RDFS-infer the subject is a member
     * todo: This will loop is there is a class subclass loop (Sublass loops are
     * not illegal)
     * @param {RDFlibNamedNode} subject - The thing whose classes are to be found
     * @returns a hash table where key is NT of type and value is statement why we think so.
     * Does NOT return terms, returns URI strings.
     * We use NT representations in this version because they handle blank nodes.
     */

  }, {
    key: "findTypesNT",
    value: function findTypesNT(subject) {
      var domain;
      var range;
      var rdftype;
      var ref;
      var ref1;
      var ref2;
      var ref3;
      var st;
      var types;
      rdftype = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
      types = [];
      ref = this.statementsMatching(subject, void 0, void 0);

      for (var i = 0, len = ref.length; i < len; i++) {
        st = ref[i];

        if (st.predicate.uri === rdftype) {
          types[st.object.toNT()] = st;
        } else {
          ref1 = this.each(st.predicate, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'));

          for (var l = 0, len1 = ref1.length; l < len1; l++) {
            range = ref1[l];
            types[range.toNT()] = st;
          }
        }
      }

      ref2 = this.statementsMatching(void 0, void 0, subject);

      for (var m = 0, len2 = ref2.length; m < len2; m++) {
        st = ref2[m];
        ref3 = this.each(st.predicate, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#range'));

        for (var _q3 = 0, len3 = ref3.length; _q3 < len3; _q3++) {
          domain = ref3[_q3];
          types[domain.toNT()] = st;
        }
      }

      return this.transitiveClosure(types, this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), false);
    }
    /**
     * Get all the Classes of which we can RDFS-infer the subject is a member
     * todo: This will loop is there is a class subclass loop (Sublass loops are
     * not illegal)
     * Returns a hash table where key is NT of type and value is statement why we
     * think so.
     * Does NOT return terms, returns URI strings.
     * We use NT representations in this version because they handle blank nodes.
     * @param subject - A subject node
     */

  }, {
    key: "findTypeURIs",
    value: function findTypeURIs(subject) {
      return this.NTtoURI(this.findTypesNT(subject));
    }
    /** Trace statements which connect directly, or through bnodes
     *
     * @param subject - The node to start looking for statments
     * @param doc - The document to be searched, or null to search all documents
     * @returns an array of statements, duplicate statements are suppresssed.
     */

  }, {
    key: "connectedStatements",
    value: function connectedStatements(subject, doc, excludePredicateURIs) {
      excludePredicateURIs = excludePredicateURIs || [];
      var todo = [subject];
      var done = {};
      var doneArcs = {};
      var result = [];
      var self = this;

      var follow = function follow(x) {
        var queue = function queue(x) {
          if (x.termType === 'BlankNode' && !done[x.value]) {
            done[x.value] = true;
            todo.push(x);
          }
        };

        var sts = self.statementsMatching(null, null, x, doc).concat(self.statementsMatching(x, null, null, doc));
        sts = sts.filter(function (st) {
          if (excludePredicateURIs[st.predicate.value]) return false;
          var hash = st.toNT();
          if (doneArcs[hash]) return false;
          doneArcs[hash] = true;
          return true;
        });
        sts.forEach(function (st) {
          queue(st.subject);
          queue(st.object);
        });
        result = result.concat(sts);
      };

      while (todo.length) {
        follow(todo.shift());
      } // console.log('' + result.length + ' statements about ' + subject)


      return result;
    }
    /**
     * Creates a new empty formula
     *
     * @param _features - Not applicable, but necessary for typing to pass
     */

  }, {
    key: "formula",
    value: function formula(_features) {
      return new Formula();
    }
    /**
     * Transforms an NTriples string format into a Node.
     * The blank node bit should not be used on program-external values; designed
     * for internal work such as storing a blank node id in an HTML attribute.
     * This will only parse the strings generated by the various toNT() methods.
     */

  }, {
    key: "fromNT",
    value: function fromNT(str) {
      var dt, k, lang;

      switch (str[0]) {
        case '<':
          return this.sym(str.slice(1, -1));

        case '"':
          lang = void 0;
          dt = void 0;
          k = str.lastIndexOf('"');

          if (k < str.length - 1) {
            if (str[k + 1] === '@') {
              lang = str.slice(k + 2);
            } else if (str.slice(k + 1, k + 3) === '^^') {
              dt = this.fromNT(str.slice(k + 3));
            } else {
              throw new Error("Can't convert string from NT: " + str);
            }
          }

          str = str.slice(1, k);
          str = str.replace(/\\"/g, '"');
          str = str.replace(/\\n/g, '\n');
          str = str.replace(/\\\\/g, '\\');
          return this.rdfFactory.literal(str, lang || dt);

        case '_':
          return this.rdfFactory.blankNode(str.slice(2));

        case '?':
          return new Variable(str.slice(1));
      }

      throw new Error("Can't convert from NT: " + str);
    }
    /** Returns true if this formula holds the specified statement(s) */

  }, {
    key: "holds",
    value: function holds(s, p, o, g) {
      var i;

      if (arguments.length === 1) {
        if (!s) {
          return true;
        }

        if (s instanceof Array) {
          for (i = 0; i < s.length; i++) {
            if (!this.holds(s[i])) {
              return false;
            }
          }

          return true;
        } else if (isStatement(s)) {
          return this.holds(s.subject, s.predicate, s.object, s.graph);
        } else if (s.statements) {
          return this.holds(s.statements);
        }
      }

      var st = this.anyStatementMatching(s, p, o, g);
      return st != null;
    }
    /**
     * Returns true if this formula holds the specified {statement}
     */

  }, {
    key: "holdsStatement",
    value: function holdsStatement(statement) {
      return this.holds(statement.subject, statement.predicate, statement.object, statement.graph);
    }
    /**
     * Used by the n3parser to generate list elements
     * @param values - The values of the collection
     * @param context - The store
     * @return {BlankNode|Collection} - The term for the statement
     */

  }, {
    key: "list",
    value: function list(values, context) {
      if (context.rdfFactory.supports["COLLECTIONS"]) {
        var collection = context.rdfFactory.collection();
        values.forEach(function (val) {
          collection.append(val);
        });
        return collection;
      } else {
        var node = context.rdfFactory.blankNode();

        var _statements = arrayToStatements(context.rdfFactory, node, values);

        context.addAll(_statements);
        return node;
      }
    }
    /**
     * Transform a collection of NTriple URIs into their URI strings
     * @param t - Some iterable collection of NTriple URI strings
     * @return A collection of the URIs as strings
     * todo: explain why it is important to go through NT
     */

  }, {
    key: "NTtoURI",
    value: function NTtoURI(t) {
      var k, v;
      var uris = {};

      for (k in t) {
        if (!t.hasOwnProperty(k)) continue;
        v = t[k];

        if (k[0] === '<') {
          uris[k.slice(1, -1)] = v;
        }
      }

      return uris;
    }
    /**
     * Serializes this formula
     * @param base - The base string
     * @param contentType - The content type of the syntax to use
     * @param provenance - The provenance URI
     * @param options  - options to pass to the serializer, as defined in serialize method
     */

  }, {
    key: "serialize",
    value: function serialize$1(base, contentType, provenance, options) {
      // delegate the graph serialization to the implementation in ./serialize
      return serialize(provenance, this, base, contentType, undefined, options);
    }
    /**
     * Creates a new formula with the substituting bindings applied
     * @param bindings - The bindings to substitute
     */

  }, {
    key: "substitute",
    value: function substitute(bindings) {
      var statementsCopy = this.statements.map(function (ea) {
        return ea.substitute(bindings);
      });
      console.log('Formula subs statmnts:' + statementsCopy);
      var y = new Formula();
      y.addAll(statementsCopy);
      console.log('indexed-form subs formula:' + y);
      return y;
    }
  }, {
    key: "sym",
    value: function sym(uri, name) {
      if (name) {
        throw new Error('This feature (kb.sym with 2 args) is removed. Do not assume prefix mappings.');
      }

      return this.rdfFactory.namedNode(uri);
    }
    /**
     * Gets the node matching the specified pattern. Throws when no match could be made.
     * @param s - The subject
     * @param p - The predicate
     * @param o - The object
     * @param g - The graph that contains the statement
     */

  }, {
    key: "the",
    value: function the(s, p, o, g) {
      var x = this.any(s, p, o, g);

      if (x == null) {
        log$1.error('No value found for the() {' + s + ' ' + p + ' ' + o + '}.');
      }

      return x;
    }
    /**
     * RDFS Inference
     * These are hand-written implementations of a backward-chaining reasoner
     * over the RDFS axioms.
     * @param seeds - A hash of NTs of classes to start with
     * @param predicate - The property to trace though
     * @param inverse - Trace inverse direction
     */

  }, {
    key: "transitiveClosure",
    value: function transitiveClosure(seeds, predicate, inverse) {
      var elt, i, len, s, sups, t;
      var agenda = {};
      Object.assign(agenda, seeds); // make a copy

      var done = {}; // classes we have looked up

      while (true) {
        t = function () {
          for (var p in agenda) {
            if (!agenda.hasOwnProperty(p)) continue;
            return p;
          }
        }();

        if (t == null) {
          return done;
        }

        sups = inverse ? this.each(void 0, predicate, this.fromNT(t)) : this.each(this.fromNT(t), predicate);

        for (i = 0, len = sups.length; i < len; i++) {
          elt = sups[i];
          s = elt.toNT();

          if (s in done) {
            continue;
          }

          if (s in agenda) {
            continue;
          }

          agenda[s] = agenda[t];
        }

        done[t] = agenda[t];
        delete agenda[t];
      }
    }
    /**
     * Finds the types in the list which have no *stored* supertypes
     * We exclude the universal class, owl:Things and rdf:Resource, as it is
     * information-free.
     * @param types - The types
     */

  }, {
    key: "topTypeURIs",
    value: function topTypeURIs(types) {
      var i;
      var j;
      var k;
      var len;
      var n;
      var ref;
      var tops;
      var v;
      tops = [];

      for (k in types) {
        if (!types.hasOwnProperty(k)) continue;
        v = types[k];
        n = 0;
        ref = this.each(this.rdfFactory.namedNode(k), this.rdfFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'));

        for (i = 0, len = ref.length; i < len; i++) {
          j = ref[i];

          if (j.uri !== 'http://www.w3.org/2000/01/rdf-schema#Resource') {
            n++;
            break;
          }
        }

        if (!n) {
          tops[k] = v;
        }
      }

      if (tops['http://www.w3.org/2000/01/rdf-schema#Resource']) {
        delete tops['http://www.w3.org/2000/01/rdf-schema#Resource'];
      }

      if (tops['http://www.w3.org/2002/07/owl#Thing']) {
        delete tops['http://www.w3.org/2002/07/owl#Thing'];
      }

      return tops;
    }
    /**
     * Serializes this formula to a string
     */

  }, {
    key: "toString",
    value: function toString() {
      return '{' + this.statements.join('\n') + '}';
    }
    /**
     * Gets a new variable
     * @param name - The variable's name
     */

  }, {
    key: "variable",
    value: function variable(name) {
      return new Variable(name);
    }
    /**
     * Gets the number of statements in this formula that matches the specified pattern
     * @param s - The subject
     * @param p - The predicate
     * @param o - The object
     * @param g - The graph that contains the statement
     */

  }, {
    key: "whether",
    value: function whether(s, p, o, g) {
      return this.statementsMatching(s, p, o, g, false).length;
    }
  }]);

  return Formula;
}(Node$2);

// This file attaches all functionality to Node

/**
 * Creates an RDF Node from a native javascript value.
 * RDF Nodes are returned unchanged, undefined returned as itself.
 * @method fromValue
 * @static
 * @param value {Node|Date|String|Number|Boolean|Undefined}
 * @return {Node|Collection}
 */
Node$2.fromValue = fromValue;
var ns = {
  xsd: Namespace('http://www.w3.org/2001/XMLSchema#')
};
/**
 * Gets the javascript object equivalent to a node
 * @param term The RDF node
 */

Node$2.toJS = function (term) {
  if (isCollection(term)) {
    return term.elements.map(Node$2.toJS); // Array node (not standard RDFJS)
  }

  if (!isLiteral(term)) return term;

  if (term.datatype.equals(ns.xsd('boolean'))) {
    return term.value === '1' || term.value === 'true';
  }

  if (term.datatype.equals(ns.xsd('dateTime')) || term.datatype.equals(ns.xsd('date'))) {
    return new Date(term.value);
  }

  if (term.datatype.equals(ns.xsd('integer')) || term.datatype.equals(ns.xsd('float')) || term.datatype.equals(ns.xsd('decimal'))) {
    return Number(term.value);
  }

  return term.value;
};

/**
 * Query class, for tracking queries the user has in the UI.
 */

var Query = /*#__PURE__*/_createClass(function Query(name, id) {
  _classCallCheck(this, Query);

  this.pat = new IndexedFormula(); // The pattern to search for

  this.vars = []; // Used by UI code but not in query.js
  //    this.orderBy = [] // Not used yet

  this.name = name;
  this.id = id;
});
/**
 * This function will match a pattern to the current Store
 *
 * The callback function is called whenever a match is found
 * When fetcher is supplied this will be called to load from the web
 * any new nodes as they are discovered.  This will cause the query to traverse the
 * graph of linked data, sometimes called "Link Following Query"
 *
 * @param myQuery - a knowledgebase containing a pattern to use as query
 * @param callback - whenever the pattern in myQuery is met this is called with
 *  the new bindings as parameter
 * @param fetcher? - If and only if,  you want link following, give a fetcher
 *                which has been created for the quadstore being queried.
 * @param onDone -  callback when query finished
 */

function indexedFormulaQuery(myQuery, callback, fetcher, onDone) {
  /** Debug strings
  */
  function bindingDebug(b) {
    var str = '';
    var v;

    for (v in b) {
      if (b.hasOwnProperty(v)) {
        str += '    ' + v + ' -> ' + b[v];
      }
    }

    return str;
  }

  function bindingsDebug(nbs) {
    var str = 'Bindings: ';
    var i;
    var n = nbs.length;

    for (i = 0; i < n; i++) {
      str += bindingDebug(nbs[i][0]) + ';\n\t';
    }

    return str;
  } // bindingsDebug

  /** Unification
   *
   * Unification finds all bindings such that when the binding is applied
   * to one term it is equal to the other.
   * @returns {Arrray}-  a list of bindings, where a binding is an associative array
   *  mapping variuable to value.
   */


  function unifyTerm(self, other, bindings, formula) {
    var actual = bindings[self];

    if (actual === undefined) {
      // Not mapped
      if (self.isVar) {
        var b = [];
        b[self] = other;
        return [[b, null]]; // Match
      }

      actual = self;
    }

    if (!actual.complexType) {
      if (formula.redirections[actual]) {
        actual = formula.redirections[actual];
      }

      if (formula.redirections[other]) {
        other = formula.redirections[other];
      }

      if (actual.equals(other) || actual.uri && actual.uri === defaultGraphURI) {
        // Used to mean 'any graph' in a query
        return [[[], null]];
      }

      return [];
    }

    if (self instanceof Array) {
      if (!(other instanceof Array)) {
        return [];
      }

      return unifyContents(self, other, bindings);
    }

    throw new Error('query.js: oops - code not written yet'); // return undefined;  // for lint - no jslint objects to unreachables
    //    return actual.unifyContents(other, bindings)
  } // unifyTerm


  function unifyContents(self, other, bindings, formula) {
    var nbs2;

    if (self.length !== other.length) {
      return []; // no way
    }

    if (!self.length) {
      return [[[], null]]; // Success
    }

    var nbs = unifyTerm(self[0], other[0], bindings, formula);

    if (nbs.length === 0) {
      return nbs;
    }

    var res = [];
    var i;
    var n = nbs.length;
    var nb;
    var j;
    var m;
    var v;
    var nb2;
    var bindings2;

    for (i = 0; i < n; i++) {
      // for each possibility from the first term
      nb = nbs[i][0]; // new bindings

      bindings2 = [];

      for (v in nb) {
        if (nb.hasOwnProperty(v)) {
          bindings2[v] = nb[v]; // copy
        }
      }

      for (v in bindings) {
        if (bindings.hasOwnProperty(v)) {
          bindings2[v] = bindings[v]; // copy
        }
      }

      nbs2 = unifyContents(self.slice(1), other.slice(1), bindings2, formula);
      m = nbs2.length;

      for (j = 0; j < m; j++) {
        nb2 = nbs2[j][0]; // @@@@ no idea whether this is used or right

        for (v in nb) {
          if (nb.hasOwnProperty(v)) {
            nb2[v] = nb[v];
          }
        }

        res.push([nb2, null]);
      }
    }

    return res;
  } // unifyContents
  //  Matching
  //
  // Matching finds all bindings such that when the binding is applied
  // to one term it is equal to the other term.  We only match formulae.

  /** if x is not in the bindings array, return the var; otherwise, return the bindings **/


  function bind(x, binding) {
    var y = binding[x];

    if (y === undefined) {
      return x;
    }

    return y;
  } // When there are OPTIONAL clauses, we must return bindings without them if none of them
  // succeed. However, if any of them do succeed, we should not.  (This is what branchCount()
  // tracked. The problem currently is (2011/7) that when several optionals exist, and they
  // all match, multiple sets of bindings are returned, each with one optional filled in.)


  function union(a, b) {
    var c = {};
    var x;

    for (x in a) {
      if (a.hasOwnProperty(x)) {
        c[x] = a[x];
      }
    }

    for (x in b) {
      if (b.hasOwnProperty(x)) {
        c[x] = b[x];
      }
    }

    return c;
  }

  function OptionalBranchJunction(originalCallback, trunkBindings) {
    this.trunkBindings = trunkBindings;
    this.originalCallback = originalCallback;
    this.branches = []; // this.results = []; // result[i] is an array of bindings for branch i
    // this.done = {};  // done[i] means all/any results are in for branch i
    // this.count = {}

    return this;
  }

  OptionalBranchJunction.prototype.checkAllDone = function () {
    var i;

    for (i = 0; i < this.branches.length; i++) {
      if (!this.branches[i].done) {
        return;
      }
    }

    log$1.debug('OPTIONAL BIDNINGS ALL DONE:');
    this.doCallBacks(this.branches.length - 1, this.trunkBindings);
  }; // Recrursively generate the cross product of the bindings


  OptionalBranchJunction.prototype.doCallBacks = function (b, bindings) {
    var j;

    if (b < 0) {
      return this.originalCallback(bindings);
    }

    for (j = 0; j < this.branches[b].results.length; j++) {
      this.doCallBacks(b - 1, union(bindings, this.branches[b].results[j]));
    }
  }; // A mandatory branch is the normal one, where callbacks
  // are made immediately and no junction is needed.
  // Might be useful for onFinsihed callback for query API.


  function MandatoryBranch(callback, onDone) {
    this.count = 0;
    this.success = false;
    this.done = false; // this.results = []

    this.callback = callback;
    this.onDone = onDone; // this.junction = junction
    // junction.branches.push(this)

    return this;
  }

  MandatoryBranch.prototype.reportMatch = function (bindings) {
    // log.error("@@@@ query.js 1"); // @@
    this.callback(bindings);
    this.success = true;
  };

  MandatoryBranch.prototype.reportDone = function () {
    this.done = true;
    log$1.info('Mandatory query branch finished.***');

    if (this.onDone !== undefined) {
      this.onDone();
    }
  }; // An optional branch hoards its results.


  var OptionalBranch = function OptionalBranch(junction) {
    this.count = 0;
    this.done = false;
    this.results = [];
    this.junction = junction;
    junction.branches.push(this);
    return this;
  };

  OptionalBranch.prototype.reportMatch = function (bindings) {
    this.results.push(bindings);
  };

  OptionalBranch.prototype.reportDone = function () {
    log$1.debug('Optional branch finished - results.length = ' + this.results.length);

    if (this.results.length === 0) {
      // This is what optional means: if no hits,
      this.results.push({}); // mimic success, but with no bindings

      log$1.debug("Optional branch FAILED - that's OK.");
    }

    this.done = true;
    this.junction.checkAllDone();
  };
  /** prepare -- sets the index of the item to the possible matches
   * @param f - formula
   * @param item - an Statement, possibly w/ vars in it
   * @param bindings - Bindings so far
   * @returns false if the query fails -- there are no items that match
  */


  function prepare(f, item, bindings) {
    var terms, termIndex, i, ind;
    item.nvars = 0;
    item.index = null; // if (!f.statements) log.warn("@@@ prepare: f is "+f)
    //    log.debug("Prepare: f has "+ f.statements.length)
    // log.debug("Prepare: Kb size "+f.statements.length+" Preparing "+item)

    terms = [item.subject, item.predicate, item.object, item.why];
    ind = [f.subjectIndex, f.predicateIndex, f.objectIndex, f.whyIndex];

    for (i = 0; i < 4; i++) {
      var t = terms[i]; // console.log("  Prepare (" + t + ") "+(t in bindings))

      if (t.uri && t.uri === defaultGraphURI) ; else if (t.isVar && !(bindings[t] !== undefined)) {
        item.nvars++;
      } else {
        t = bind(terms[i], bindings); // returns the RDF binding if bound, otherwise itself
        // if (terms[i]!=bind(terms[i],bindings) alert("Term: "+terms[i]+"Binding: "+bind(terms[i], bindings))

        if (f.redirections[f.id(t)]) {
          t = f.redirections[f.id(t)]; // redirect
        }

        termIndex = ind[i][f.id(t)];

        if (!termIndex) {
          item.index = [];
          return false; // Query line cannot match
        }

        if (item.index === null || item.index.length > termIndex.length) {
          // Find smallest index
          item.index = termIndex;
        }
      }
    }

    if (item.index === null) {
      // All 4 are variables?
      item.index = f.statements;
    }

    return true;
  } // prepare

  /** sorting function -- negative if self is easier **/
  // We always prefer to start with a URI to be able to browse a graph
  // this is why we put off items with more variables till later.


  function easiestQuery(self, other) {
    if (self.nvars !== other.nvars) {
      return self.nvars - other.nvars;
    }

    return self.index.length - other.index.length;
  }

  var matchIndex = 0; // index

  /** matches a pattern formula against the knowledge base, e.g. to find matches for table-view
  *
  * @param f - knowledge base formula
  * @param g - pattern formula (may have vars)
  * @param bindingsSoFar  - bindings accumulated in matching to date
  * @param level - spaces to indent stuff also lets you know what level of recursion you're at
  * @param fetcher - function (term, requestedBy) If you want link following
  * @param localCallback - function(bindings, pattern, branch) called on sucess
  * @returns nothing
  *
  * Will fetch linked data from the web iff the knowledge base an associated source fetcher (f.fetcher)
  ***/

  var match = function match(f, g, bindingsSoFar, level, fetcher, localCallback, branch) {
    log$1.debug('Match begins, Branch count now: ' + branch.count + ' for ' + branch.pattern_debug); // log.debug("match: f has "+f.statements.length+", g has "+g.statements.length)

    var pattern = g.statements;

    if (pattern.length === 0) {
      // when it's satisfied all the pattern triples
      log$1.debug('FOUND MATCH WITH BINDINGS:' + bindingDebug(bindingsSoFar));

      if (g.optional.length === 0) {
        branch.reportMatch(bindingsSoFar);
      } else {
        log$1.debug('OPTIONAL: ' + g.optional);
        var junction = new OptionalBranchJunction(callback, bindingsSoFar); // @@ won't work with nested optionals? nest callbacks

        var br = [];
        var b;

        for (b = 0; b < g.optional.length; b++) {
          br[b] = new OptionalBranch(junction); // Allocate branches to prevent premature ending

          br[b].pattern_debug = g.optional[b]; // for diagnotics only
        }

        for (b = 0; b < g.optional.length; b++) {
          br[b].count = br[b].count + 1; // Count how many matches we have yet to complete

          match(f, g.optional[b], bindingsSoFar, '', fetcher, callback, br[b]);
        }
      }

      branch.count--;
      log$1.debug('Match ends -- success , Branch count now: ' + branch.count + ' for ' + branch.pattern_debug);
      return; // Success
    }

    var item;
    var i;
    var n = pattern.length; // log.debug(level + "Match "+n+" left, bs so far:"+bindingDebug(bindingsSoFar))
    // Follow links from variables in query

    if (fetcher) {
      // Fetcher is used to fetch URIs, function first term is a URI term, second is the requester
      var id = 'match' + matchIndex++;

      var fetchResource = function fetchResource(requestedTerm, id) {
        var docuri = requestedTerm.uri.split('#')[0];
        fetcher.nowOrWhenFetched(docuri, undefined, function (ok, body, xhr) {
          if (!ok) {
            console.log('Error following link to <' + requestedTerm.uri + '> in query: ' + body);
          }

          match(f, g, bindingsSoFar, level, fetcher, // match not match2 to look up any others necessary.
          localCallback, branch);
        });
      };

      for (i = 0; i < n; i++) {
        item = pattern[i]; // for each of the triples in the query

        if (bindingsSoFar[item.subject] !== undefined && bindingsSoFar[item.subject].uri && fetcher && fetcher.getState(docpart(bindingsSoFar[item.subject].uri)) === 'unrequested') {
          // fetch the subject info and return to id
          fetchResource(bindingsSoFar[item.subject], id);
          return; // only look up one per line this time, but we will come back again though match
        }

        if (bindingsSoFar[item.object] !== undefined && bindingsSoFar[item.object].uri && fetcher && fetcher.getState(docpart(bindingsSoFar[item.object].uri)) === 'unrequested') {
          fetchResource(bindingsSoFar[item.object], id);
          return;
        }
      }
    } // if fetcher


    match2(f, g, bindingsSoFar, level, fetcher, localCallback, branch);
  }; // match


  var constraintsSatisfied = function constraintsSatisfied(bindings, constraints) {
    var res = true;
    var x;
    var test;

    for (x in bindings) {
      if (bindings.hasOwnProperty(x)) {
        if (constraints[x]) {
          test = constraints[x].test;

          if (test && !test(bindings[x])) {
            res = false;
          }
        }
      }
    }

    return res;
  };
  /** match2 -- stuff after the fetch **/


  var match2 = function match2(f, g, bindingsSoFar, level, fetcher, callback, branch) {
    // post fetch
    var pattern = g.statements;
    var n = pattern.length;
    var i;
    var k;
    var nk;
    var v;
    var bindings2;
    var newBindings1;
    var item;

    for (i = 0; i < n; i++) {
      // For each statement left in the query, run prepare
      item = pattern[i]; // log.info('match2: item=' + item + ', bindingsSoFar=' + bindingDebug(bindingsSoFar))

      prepare(f, item, bindingsSoFar); // if (item.index) console.log('     item.index.length ' + item.index.length)
    }

    pattern.sort(easiestQuery);
    item = pattern[0]; // log.debug("Sorted pattern:\n"+pattern)

    var rest = f.formula();
    rest.optional = g.optional;
    rest.constraints = g.constraints;
    rest.statements = pattern.slice(1); // No indexes: we will not query g.

    log$1.debug(level + 'match2 searching ' + item.index.length + ' for ' + item + '; bindings so far=' + bindingDebug(bindingsSoFar)); // var results = []

    var c;
    var nc = item.index.length;
    var nbs1;
    var st;
    var onward = 0; // var x

    for (c = 0; c < nc; c++) {
      // For each candidate statement
      st = item.index[c]; // for each statement in the item's index, spawn a new match with that binding

      nbs1 = unifyContents([item.subject, item.predicate, item.object, item.why], [st.subject, st.predicate, st.object, st.why], bindingsSoFar, f);
      log$1.info(level + ' From first: ' + nbs1.length + ': ' + bindingsDebug(nbs1));
      nk = nbs1.length; // branch.count += nk
      // log.debug("Branch count bumped "+nk+" to: "+branch.count)

      for (k = 0; k < nk; k++) {
        // For each way that statement binds
        bindings2 = [];
        newBindings1 = nbs1[k][0];

        if (!constraintsSatisfied(newBindings1, g.constraints)) {
          // branch.count--
          log$1.debug('Branch count CS: ' + branch.count);
        } else {
          for (v in newBindings1) {
            if (newBindings1.hasOwnProperty(v)) {
              bindings2[v] = newBindings1[v]; // copy
            }
          }

          for (v in bindingsSoFar) {
            if (bindingsSoFar.hasOwnProperty(v)) {
              bindings2[v] = bindingsSoFar[v]; // copy
            }
          }

          branch.count++; // Count how many matches we have yet to complete

          onward++;
          match(f, rest, bindings2, level + '  ', fetcher, callback, branch); // call match
        }
      }
    }

    branch.count--;

    if (onward === 0) {
      log$1.debug('Match2 fails completely on ' + item);
    }

    log$1.debug('Match2 ends, Branch count: ' + branch.count + ' for ' + branch.pattern_debug);

    if (branch.count === 0) {
      log$1.debug('Branch finished.');
      branch.reportDone();
    }
  }; // match2
  // ////////////////////////// Body of query()  ///////////////////////


  var f = this;
  log$1.debug('Query on ' + this.statements.length);
  var trunck = new MandatoryBranch(callback, onDone);
  trunck.count++; // count one branch to complete at the moment

  if (myQuery.sync) {
    match(f, myQuery.pat, myQuery.pat.initBindings, '', fetcher, callback, trunck);
  } else {
    // Give up thread: Allow other activities to run
    setTimeout(function () {
      match(f, myQuery.pat, myQuery.pat.initBindings, '', fetcher, callback, trunck);
    }, 0);
  } // returns nothing; callback does the work

} // query

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _createForOfIteratorHelper$1(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _createSuper$8(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$8(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$8() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var owlNamespaceURI = 'http://www.w3.org/2002/07/owl#';
// Handle Functional Property

function handleFP(formula, subj, pred, obj) {
  var o1 = formula.any(subj, pred, undefined);

  if (!o1) {
    return false; // First time with this value
  } // log.warn("Equating "+o1.uri+" and "+obj.uri + " because FP "+pred.uri);  //@@


  formula.equate(o1, obj);
  return true;
} // handleFP
// Handle Inverse Functional Property


function handleIFP(formula, subj, pred, obj) {
  var s1 = formula.any(undefined, pred, obj);

  if (!s1) {
    return false; // First time with this value
  } // log.warn("Equating "+s1.uri+" and "+subj.uri + " because IFP "+pred.uri);  //@@


  formula.equate(s1, subj);
  return true;
} // handleIFP


function handleRDFType(formula, subj, pred, obj, why) {
  //@ts-ignore this method does not seem to exist in this library
  if (formula.typeCallback) {
    formula.typeCallback(formula, obj, why);
  }

  var x = formula.classActions[formula.id(obj)];
  var done = false;

  if (x) {
    for (var i = 0; i < x.length; i++) {
      done = done || x[i](formula, subj, pred, obj, why);
    }
  }

  return done; // statement given is not needed if true
}
/**
 * Indexed Formula aka Store
 */


var IndexedFormula = /*#__PURE__*/function (_Formula) {
  _inherits(IndexedFormula, _Formula);

  var _super = _createSuper$8(IndexedFormula);

  // IN future - allow pass array of statements to constructor

  /**
   * An UpdateManager initialised to this store
   */

  /**
   * Dictionary of namespace prefixes
   */

  /** Map of iri predicates to functions to call when adding { s type X } */

  /** Map of iri predicates to functions to call when getting statement with {s X o} */

  /** Redirect to lexically smaller equivalent symbol */

  /** Reverse mapping to redirection: aliases for this */

  /** Redirections we got from HTTP */

  /** Array of statements with this X as subject */

  /** Array of statements with this X as predicate */

  /** Array of statements with this X as object */

  /** Array of statements with X as provenance */

  /** Function to remove quads from the store arrays with */

  /** Callbacks which are triggered after a statement has been added to the store */

  /**
   * Creates a new formula
   * @param features - What sort of automatic processing to do? Array of string
   * @param features.sameAs - Smush together A and B nodes whenever { A sameAs B }
   * @param opts
   * @param [opts.rdfFactory] - The data factory that should be used by the store
   * @param [opts.rdfArrayRemove] - Function which removes statements from the store
   * @param [opts.dataCallback] - Callback when a statement is added to the store, will not trigger when adding duplicates
   */
  function IndexedFormula(features) {
    var _this;

    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, IndexedFormula);

    _this = _super.call(this, undefined, undefined, undefined, undefined, opts);

    _defineProperty(_assertThisInitialized(_this), "updater", void 0);

    _defineProperty(_assertThisInitialized(_this), "namespaces", void 0);

    _defineProperty(_assertThisInitialized(_this), "classActions", void 0);

    _defineProperty(_assertThisInitialized(_this), "propertyActions", void 0);

    _defineProperty(_assertThisInitialized(_this), "redirections", void 0);

    _defineProperty(_assertThisInitialized(_this), "aliases", void 0);

    _defineProperty(_assertThisInitialized(_this), "HTTPRedirects", void 0);

    _defineProperty(_assertThisInitialized(_this), "subjectIndex", void 0);

    _defineProperty(_assertThisInitialized(_this), "predicateIndex", void 0);

    _defineProperty(_assertThisInitialized(_this), "objectIndex", void 0);

    _defineProperty(_assertThisInitialized(_this), "whyIndex", void 0);

    _defineProperty(_assertThisInitialized(_this), "index", void 0);

    _defineProperty(_assertThisInitialized(_this), "features", void 0);

    _defineProperty(_assertThisInitialized(_this), "_universalVariables", void 0);

    _defineProperty(_assertThisInitialized(_this), "_existentialVariables", void 0);

    _defineProperty(_assertThisInitialized(_this), "rdfArrayRemove", void 0);

    _defineProperty(_assertThisInitialized(_this), "dataCallbacks", void 0);

    _this.propertyActions = {};
    _this.classActions = {};
    _this.redirections = [];
    _this.aliases = [];
    _this.HTTPRedirects = [];
    _this.subjectIndex = [];
    _this.predicateIndex = [];
    _this.objectIndex = [];
    _this.whyIndex = [];
    _this.index = [_this.subjectIndex, _this.predicateIndex, _this.objectIndex, _this.whyIndex];
    _this.namespaces = {}; // Dictionary of namespace prefixes

    _this.features = features || [// By default, devs do not expect these features.
      // See https://github.com/linkeddata/rdflib.js/issues/458
      //      'sameAs',
      //      'InverseFunctionalProperty',
      //      'FunctionalProperty',
    ];
    _this.rdfArrayRemove = opts.rdfArrayRemove || RDFArrayRemove;

    if (opts.dataCallback) {
      _this.dataCallbacks = [opts.dataCallback];
    }

    _this.initPropertyActions(_this.features);

    return _this;
  }
  /**
   * Gets the URI of the default graph
   */


  _createClass(IndexedFormula, [{
    key: "substitute",
    value:
    /**
     * Gets this graph with the bindings substituted
     * @param bindings The bindings
     */
    function substitute(bindings) {
      var statementsCopy = this.statements.map(function (ea) {
        return ea.substitute(bindings);
      });
      var y = new IndexedFormula();
      y.add(statementsCopy);
      return y;
    }
    /**
     * Add a callback which will be triggered after a statement has been added to the store.
     * @param cb
     */

  }, {
    key: "addDataCallback",
    value: function addDataCallback(cb) {
      if (!this.dataCallbacks) {
        this.dataCallbacks = [];
      }

      this.dataCallbacks.push(cb);
    }
    /**
     * Apply a set of statements to be deleted and to be inserted
     *
     * @param patch - The set of statements to be deleted and to be inserted
     * @param target - The name of the document to patch
     * @param patchCallback - Callback to be called when patching is complete
     */

  }, {
    key: "applyPatch",
    value: function applyPatch(patch, target, patchCallback) {
      var targetKB = this;
      var ds;
      var binding = null;

      function doPatch(onDonePatch) {
        if (patch['delete']) {
          ds = patch['delete']; // console.log(bindingDebug(binding))
          // console.log('ds before substitute: ' + ds)

          if (binding) ds = ds.substitute(binding); // console.log('applyPatch: delete: ' + ds)

          ds = ds.statements;
          var bad = [];
          var ds2 = ds.map(function (st) {
            // Find the actual statements in the store
            var sts = targetKB.statementsMatching(st.subject, st.predicate, st.object, target);

            if (sts.length === 0) {
              // log.info("NOT FOUND deletable " + st)
              bad.push(st);
              return null;
            } else {
              // log.info("Found deletable " + st)
              return sts[0];
            }
          });

          if (bad.length) {
            // console.log('Could not find to delete ' + bad.length + 'statements')
            // console.log('despite ' + targetKB.statementsMatching(bad[0].subject, bad[0].predicate)[0])
            return patchCallback('Could not find to delete: ' + bad.join('\n or '));
          }

          ds2.map(function (st) {
            targetKB.remove(st);
          });
        }

        if (patch['insert']) {
          // log.info("doPatch insert "+patch['insert'])
          ds = patch['insert'];
          if (binding) ds = ds.substitute(binding);
          ds = ds.statements;
          ds.map(function (st) {
            st.graph = target;
            targetKB.add(st.subject, st.predicate, st.object, st.graph);
          });
        }

        onDonePatch();
      }

      if (patch.where) {
        // log.info("Processing WHERE: " + patch.where + '\n')
        var query = new Query('patch');
        query.pat = patch.where;
        query.pat.statements.map(function (st) {
          st.graph = namedNode(target.value);
        }); //@ts-ignore TODO: add sync property to Query when converting Query to typescript

        query.sync = true;
        var bindingsFound = [];
        targetKB.query(query, function onBinding(binding) {
          bindingsFound.push(binding); // console.log('   got a binding: ' + bindingDebug(binding))
        }, targetKB.fetcher, function onDone() {
          if (bindingsFound.length === 0) {
            return patchCallback('No match found to be patched:' + patch.where);
          }

          if (bindingsFound.length > 1) {
            return patchCallback('Patch ambiguous. No patch done.');
          }

          binding = bindingsFound[0];
          doPatch(patchCallback);
        });
      } else {
        doPatch(patchCallback);
      }
    }
    /**
     * N3 allows for declaring blank nodes, this function enables that support
     *
     * @param x The blank node to be declared, supported in N3
     */

  }, {
    key: "declareExistential",
    value: function declareExistential(x) {
      if (!this._existentialVariables) this._existentialVariables = [];

      this._existentialVariables.push(x);

      return x;
    }
    /**
     * @param features
     */

  }, {
    key: "initPropertyActions",
    value: function initPropertyActions(features) {
      // If the predicate is #type, use handleRDFType to create a typeCallback on the object
      this.propertyActions[this.rdfFactory.id(this.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'))] = [handleRDFType]; // Assumption: these terms are not redirected @@fixme

      if (ArrayIndexOf(features, 'sameAs') >= 0) {
        this.propertyActions[this.rdfFactory.id(this.rdfFactory.namedNode("".concat(owlNamespaceURI, "sameAs")))] = [function (formula, subj, pred, obj, why) {
          // log.warn("Equating "+subj.uri+" sameAs "+obj.uri);  //@@
          formula.equate(subj, obj);
          return true; // true if statement given is NOT needed in the store
        }]; // sameAs -> equate & don't add to index
      }

      if (ArrayIndexOf(features, 'InverseFunctionalProperty') >= 0) {
        this.classActions[this.rdfFactory.id(this.rdfFactory.namedNode("".concat(owlNamespaceURI, "InverseFunctionalProperty")))] = [function (formula, subj, pred, obj, addFn) {
          // yes subj not pred!
          return formula.newPropertyAction(subj, handleIFP);
        }]; // IFP -> handleIFP, do add to index
      }

      if (ArrayIndexOf(features, 'FunctionalProperty') >= 0) {
        this.classActions[this.rdfFactory.id(this.rdfFactory.namedNode("".concat(owlNamespaceURI, "FunctionalProperty")))] = [function (formula, subj, proj, obj, addFn) {
          return formula.newPropertyAction(subj, handleFP);
        }]; // FP => handleFP, do add to index
      }
    }
    /** @deprecated Use {add} instead */

  }, {
    key: "addStatement",
    value: function addStatement(st) {
      this.add(st.subject, st.predicate, st.object, st.graph);
      return this.statements.length;
    }
    /**
     * Adds a triple (quad) to the store.
     *
     * @param subj - The thing about which the fact a relationship is asserted.
     *        Also accepts a statement or an array of Statements.
     * @param pred - The relationship which is asserted
     * @param obj - The object of the relationship, e.g. another thing or a value. If passed a string, this will become a literal.
     * @param why - The document in which the triple (S,P,O) was or will be stored on the web
     * @returns The statement added to the store, or the store
     */

  }, {
    key: "add",
    value: function add(subj, pred, obj, why) {
      var i;

      if (arguments.length === 1) {
        if (subj instanceof Array) {
          for (i = 0; i < subj.length; i++) {
            this.add(subj[i]);
          }
        } else if (isQuad(subj)) {
          this.add(subj.subject, subj.predicate, subj.object, subj.graph);
        } else if (isStore(subj)) {
          this.add(subj.statements);
        }

        return this;
      }

      var actions;
      var st;

      if (!why) {
        // system generated
        why = this.fetcher ? this.fetcher.appNode : this.rdfFactory.defaultGraph();
      }

      if (typeof subj == 'string') {
        subj = this.rdfFactory.namedNode(subj);
      }

      pred = Node$2.fromValue(pred);
      var objNode = Node$2.fromValue(obj);
      why = Node$2.fromValue(why);

      if (!isSubject(subj)) {
        throw new Error('Subject is not a subject type');
      }

      if (!isPredicate(pred)) {
        throw new Error("Predicate ".concat(pred, " is not a predicate type"));
      }

      if (!isRDFlibObject(objNode)) {
        throw new Error("Object ".concat(objNode, " is not an object type"));
      }

      if (!isGraph(why)) {
        throw new Error("Why is not a graph type");
      } //@ts-ignore This is not used internally


      if (this.predicateCallback) {
        //@ts-ignore This is not used internally
        this.predicateCallback(this, pred, why);
      } // Action return true if the statement does not need to be added


      var predHash = this.id(this.canon(pred));
      actions = this.propertyActions[predHash]; // Predicate hash

      var done = false;

      if (actions) {
        // alert('type: '+typeof actions +' @@ actions='+actions)
        for (i = 0; i < actions.length; i++) {
          done = done || actions[i](this, subj, pred, objNode, why);
        }
      }

      if (this.holds(subj, pred, objNode, why)) {
        // Takes time but saves duplicates
        // console.log('rdflib: Ignoring dup! {' + subj + ' ' + pred + ' ' + obj + ' ' + why + '}')
        return null; // @@better to return self in all cases?
      } // If we are tracking provenance, every thing should be loaded into the store
      // if (done) return this.rdfFactory.quad(subj, pred, obj, why)
      // Don't put it in the store
      // still return this statement for owl:sameAs input


      var hash = [this.id(this.canon(subj)), predHash, this.id(this.canon(objNode)), this.id(this.canon(why))]; // @ts-ignore this will fail if you pass a collection and the factory does not allow Collections

      st = this.rdfFactory.quad(subj, pred, objNode, why);

      for (i = 0; i < 4; i++) {
        var ix = this.index[i];
        var h = hash[i];

        if (!ix[h]) {
          ix[h] = [];
        }

        ix[h].push(st); // Set of things with this as subject, etc
      } // log.debug("ADDING    {"+subj+" "+pred+" "+objNode+"} "+why)


      this.statements.push(st);

      if (this.dataCallbacks) {
        var _iterator = _createForOfIteratorHelper$1(this.dataCallbacks),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var callback = _step.value;
            callback(st);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return st;
    }
    /**
     * Returns the symbol with canonical URI as smushed
     * @param term - An RDF node
     */

  }, {
    key: "canon",
    value: function canon(term) {
      if (!term) {
        // @@ TODO Should improve this to return proper value - doing this to keep it backward compatible
        return term;
      }

      var y = this.redirections[this.id(term)];

      if (y) {
        return y;
      }

      switch (term.termType) {
        case BlankNodeTermType:
          return new BlankNode(term.value);

        case CollectionTermType:
          return term;
        // non-RDF/JS type, should just need to cast

        case DefaultGraphTermType:
          return new DefaultGraph();

        case EmptyTermType:
          // non-RDF/JS type, should just need to cast
          return term;

        case GraphTermType:
          // non-RDF/JS type, should just need to cast
          return term;

        case LiteralTermType:
          return new Literal(term.value, term.language, term.datatype);

        case NamedNodeTermType:
          return new NamedNode(term.value);

        case VariableTermType:
          return new Variable(term.value);

        default:
          throw new Error("Term Type not recognized for canonization: ".concat(term.termType));
      }
    }
    /**
     * Checks this formula for consistency
     */

  }, {
    key: "check",
    value: function check() {
      this.checkStatementList(this.statements);

      for (var p = 0; p < 4; p++) {
        var ix = this.index[p];

        for (var key in ix) {
          if (ix.hasOwnProperty(key)) {
            // @ts-ignore should this pass an array or a single statement? checkStateMentsList expects an array.
            this.checkStatementList(ix[key], p);
          }
        }
      }
    }
    /**
     * Checks a list of statements for consistency
     * @param sts - The list of statements to check
     * @param from - An index with the array ['subject', 'predicate', 'object', 'why']
     */

  }, {
    key: "checkStatementList",
    value: function checkStatementList(sts, from) {
      if (from === undefined) {
        from = 0;
      }

      var names = ['subject', 'predicate', 'object', 'why'];
      var origin = ' found in ' + names[from] + ' index.';
      var st;

      for (var j = 0; j < sts.length; j++) {
        st = sts[j];
        var term = [st.subject, st.predicate, st.object, st.graph];

        var arrayContains = function arrayContains(a, x) {
          for (var i = 0; i < a.length; i++) {
            if (a[i].subject.equals(x.subject) && a[i].predicate.equals(x.predicate) && a[i].object.equals(x.object) && a[i].why.equals(x.graph)) {
              return true;
            }
          }
        };

        for (var p = 0; p < 4; p++) {
          var c = this.canon(term[p]);
          var h = this.id(c);

          if (!this.index[p][h]) ; else {
            if (!arrayContains(this.index[p][h], st)) ;
          }
        }

        if (!arrayContains(this.statements, st)) {
          throw new Error('Statement list does not statement ' + st + '@' + st.graph + origin);
        }
      }
    }
    /**
     * Closes this formula (and return it)
     */

  }, {
    key: "close",
    value: function close() {
      return this;
    }
  }, {
    key: "compareTerms",
    value: function compareTerms(u1, u2) {
      // Keep compatibility with downstream classOrder changes
      if (Object.prototype.hasOwnProperty.call(u1, "compareTerm")) {
        return u1.compareTerm(u2);
      }

      if (ClassOrder[u1.termType] < ClassOrder[u2.termType]) {
        return -1;
      }

      if (ClassOrder[u1.termType] > ClassOrder[u2.termType]) {
        return +1;
      }

      if (u1.value < u2.value) {
        return -1;
      }

      if (u1.value > u2.value) {
        return +1;
      }

      return 0;
    }
    /**
     * replaces @template with @target and add appropriate triples
     * removes no triples by default and is a one-direction replication
     * @param template node to copy
     * @param target node to copy to
     * @param flags Whether or not to do a two-directional copy and/or delete triples
     */

  }, {
    key: "copyTo",
    value: function copyTo(template, target, flags) {
      if (!flags) flags = [];
      var statList = this.statementsMatching(template);

      if (ArrayIndexOf(flags, 'two-direction') !== -1) {
        statList.concat(this.statementsMatching(undefined, undefined, template));
      }

      for (var i = 0; i < statList.length; i++) {
        var st = statList[i];

        switch (st.object.termType) {
          case 'NamedNode':
            this.add(target, st.predicate, st.object);
            break;

          case 'Literal':
          case 'BlankNode': // @ts-ignore Collections can appear here

          case 'Collection':
            // @ts-ignore Possible bug: copy is not available on Collections
            this.add(target, st.predicate, st.object.copy(this));
        }

        if (ArrayIndexOf(flags, 'delete') !== -1) {
          this.remove(st);
        }
      }
    }
    /**
     * Simplify graph in store when we realize two identifiers are equivalent
     * We replace the bigger with the smaller.
     * @param u1in The first node
     * @param u2in The second node
     */

  }, {
    key: "equate",
    value: function equate(u1in, u2in) {
      // log.warn("Equating "+u1+" and "+u2); // @@
      // @@JAMBO Must canonicalize the uris to prevent errors from a=b=c
      // 03-21-2010
      var u1 = this.canon(u1in);
      var u2 = this.canon(u2in);
      var d = this.compareTerms(u1, u2);

      if (!d) {
        return true; // No information in {a = a}
      } // var big
      // var small


      if (d < 0) {
        // u1 less than u2
        return this.replaceWith(u2, u1);
      } else {
        return this.replaceWith(u1, u2);
      }
    }
    /**
     * Creates a new empty indexed formula
     * Only applicable for IndexedFormula, but TypeScript won't allow a subclass to override a property
     * @param features The list of features
     */

  }, {
    key: "formula",
    value: function formula(features) {
      return new IndexedFormula(features);
    }
    /**
     * Returns the number of statements contained in this IndexedFormula.
     * (Getter proxy to this.statements).
     * Usage:
     *    ```
     *    var kb = rdf.graph()
     *    kb.length  // -> 0
     *    ```
     * @returns {Number}
     */

  }, {
    key: "length",
    get: function get() {
      return this.statements.length;
    }
    /**
     * Returns any quads matching the given arguments.
     * Standard RDFJS spec method for Source objects, implemented as an
     * alias to `statementsMatching()`
     * @param subject The subject
     * @param predicate The predicate
     * @param object The object
     * @param graph The graph that contains the statement
     */

  }, {
    key: "match",
    value: function match(subject, predicate, object, graph) {
      return this.statementsMatching(Node$2.fromValue(subject), Node$2.fromValue(predicate), Node$2.fromValue(object), Node$2.fromValue(graph));
    }
    /**
     * Find out whether a given URI is used as symbol in the formula
     * @param uri The URI to look for
     */

  }, {
    key: "mentionsURI",
    value: function mentionsURI(uri) {
      var hash = '<' + uri + '>';
      return !!this.subjectIndex[hash] || !!this.objectIndex[hash] || !!this.predicateIndex[hash];
    }
    /**
     * Existentials are BNodes - something exists without naming
     * @param uri An URI
     */

  }, {
    key: "newExistential",
    value: function newExistential(uri) {
      if (!uri) return this.bnode();
      var x = this.sym(uri); // @ts-ignore x should be blanknode, but is namedNode.

      return this.declareExistential(x);
    }
    /**
     * Adds a new property action
     * @param pred the predicate that the function should be triggered on
     * @param action the function that should trigger
     */

  }, {
    key: "newPropertyAction",
    value: function newPropertyAction(pred, action) {
      // log.debug("newPropertyAction:  "+pred)
      var hash = this.id(pred);

      if (!this.propertyActions[hash]) {
        this.propertyActions[hash] = [];
      }

      this.propertyActions[hash].push(action); // Now apply the function to to statements already in the store

      var toBeFixed = this.statementsMatching(undefined, pred, undefined);
      var done = false;

      for (var i = 0; i < toBeFixed.length; i++) {
        // NOT optimized - sort toBeFixed etc
        done = done || action(this, toBeFixed[i].subject, pred, toBeFixed[i].object);
      }

      return done;
    }
    /**
     * Creates a new universal node
     * Universals are Variables
     * @param uri An URI
     */

  }, {
    key: "newUniversal",
    value: function newUniversal(uri) {
      var x = this.sym(uri);
      if (!this._universalVariables) this._universalVariables = [];

      this._universalVariables.push(x);

      return x;
    } // convenience function used by N3 parser

  }, {
    key: "variable",
    value: function variable(name) {
      return new Variable(name);
    }
    /**
     * Find an unused id for a file being edited: return a symbol
     * (Note: Slow iff a lot of them -- could be O(log(k)) )
     * @param doc A document named node
     */

  }, {
    key: "nextSymbol",
    value: function nextSymbol(doc) {
      for (var i = 0;; i++) {
        var uri = doc.value + '#n' + i;
        if (!this.mentionsURI(uri)) return this.sym(uri);
      }
    }
    /**
     * Query this store asynchronously, return bindings in callback
     *
     * @param myQuery The query to be run
     * @param callback Function to call when bindings
     * @param Fetcher | null  If you want the query to do link following
     * @param onDone OBSOLETE - do not use this // @@ Why not ?? Called when query complete
     */

  }, {
    key: "query",
    value: function query(myQuery, callback, fetcher, onDone) {
      return indexedFormulaQuery.call(this, myQuery, callback, fetcher, onDone);
    }
    /**
     * Query this store synchronously and return bindings
     *
     * @param myQuery The query to be run
     */

  }, {
    key: "querySync",
    value: function querySync(myQuery) {
      var results = [];

      function saveBinginds(bindings) {
        results.push(bindings);
      }

      function onDone() {
        done = true;
      }

      var done = false; // @ts-ignore TODO: Add .sync to Query

      myQuery.sync = true;
      indexedFormulaQuery.call(this, myQuery, saveBinginds, null, onDone);

      if (!done) {
        throw new Error('Sync query should have called done function');
      }

      return results;
    }
    /**
     * Removes one or multiple statement(s) from this formula
     * @param st - A Statement or array of Statements to remove
     */

  }, {
    key: "remove",
    value: function remove(st) {
      if (st instanceof Array) {
        for (var i = 0; i < st.length; i++) {
          this.remove(st[i]);
        }

        return this;
      }

      if (isStore(st)) {
        return this.remove(st.statements);
      }

      var sts = this.statementsMatching(st.subject, st.predicate, st.object, st.graph);

      if (!sts.length) {
        throw new Error('Statement to be removed is not on store: ' + st);
      }

      this.removeStatement(sts[0]);
      return this;
    }
    /**
     * Removes all statements in a doc
     * @param doc - The document / graph
     */

  }, {
    key: "removeDocument",
    value: function removeDocument(doc) {
      var sts = this.statementsMatching(undefined, undefined, undefined, doc).slice(); // Take a copy as this is the actual index

      for (var i = 0; i < sts.length; i++) {
        this.removeStatement(sts[i]);
      }

      return this;
    }
    /**
     * Remove all statements matching args (within limit) *
     * @param subj The subject
     * @param pred The predicate
     * @param obj The object
     * @param why The graph that contains the statement
     * @param limit The number of statements to remove
     */

  }, {
    key: "removeMany",
    value: function removeMany(subj, pred, obj, why, limit) {
      // log.debug("entering removeMany w/ subj,pred,obj,why,limit = " + subj +", "+ pred+", " + obj+", " + why+", " + limit)
      var sts = this.statementsMatching(subj, pred, obj, why, false); // This is a subtle bug that occurred in updateCenter.js too.
      // The fact is, this.statementsMatching returns this.whyIndex instead of a copy of it
      // but for perfromance consideration, it's better to just do that
      // so make a copy here.

      var statements = [];

      for (var i = 0; i < sts.length; i++) {
        statements.push(sts[i]);
      }

      if (limit) statements = statements.slice(0, limit);

      for (i = 0; i < statements.length; i++) {
        this.remove(statements[i]);
      }
    }
    /**
     * Remove all matching statements
     * @param subject The subject
     * @param predicate The predicate
     * @param object The object
     * @param graph The graph that contains the statement
     */

  }, {
    key: "removeMatches",
    value: function removeMatches(subject, predicate, object, graph) {
      this.removeStatements(this.statementsMatching(subject, predicate, object, graph));
      return this;
    }
    /**
     * Remove a particular statement object from the store
     *
     * @param st - a statement which is already in the store and indexed.
     *        Make sure you only use this for these.
     *        Otherwise, you should use remove() above.
     */

  }, {
    key: "removeStatement",
    value: function removeStatement(st) {
      // log.debug("entering remove w/ st=" + st)
      var term = [st.subject, st.predicate, st.object, st.graph];

      for (var p = 0; p < 4; p++) {
        var c = this.canon(term[p]);
        var h = this.id(c);

        if (!this.index[p][h]) ; else {
          this.rdfArrayRemove(this.index[p][h], st);
        }
      }

      this.rdfArrayRemove(this.statements, st);
      return this;
    }
    /**
     * Removes statements
     * @param sts The statements to remove
     */

  }, {
    key: "removeStatements",
    value: function removeStatements(sts) {
      for (var i = 0; i < sts.length; i++) {
        this.remove(sts[i]);
      }

      return this;
    }
    /**
     * Replace big with small, obsoleted with obsoleting.
     */

  }, {
    key: "replaceWith",
    value: function replaceWith(big, small) {
      // log.debug("Replacing "+big+" with "+small) // this.id(@@
      var oldhash = this.id(big);
      var newhash = this.id(small);

      var moveIndex = function moveIndex(ix) {
        var oldlist = ix[oldhash];

        if (!oldlist) {
          return; // none to move
        }

        var newlist = ix[newhash];

        if (!newlist) {
          ix[newhash] = oldlist;
        } else {
          ix[newhash] = oldlist.concat(newlist);
        }

        delete ix[oldhash];
      }; // the canonical one carries all the indexes


      for (var i = 0; i < 4; i++) {
        moveIndex(this.index[i]);
      }

      this.redirections[oldhash] = small;

      if (big.value) {
        // @@JAMBO: must update redirections,aliases from sub-items, too.
        if (!this.aliases[newhash]) {
          this.aliases[newhash] = [];
        }

        this.aliases[newhash].push(big); // Back link

        if (this.aliases[oldhash]) {
          for (i = 0; i < this.aliases[oldhash].length; i++) {
            this.redirections[this.id(this.aliases[oldhash][i])] = small;
            this.aliases[newhash].push(this.aliases[oldhash][i]);
          }
        }

        this.add(small, this.sym('http://www.w3.org/2007/ont/link#uri'), big); // If two things are equal, and one is requested, we should request the other.

        if (this.fetcher) {
          this.fetcher.nowKnownAs(big, small);
        }
      }

      moveIndex(this.classActions);
      moveIndex(this.propertyActions); // log.debug("Equate done. "+big+" to be known as "+small)

      return true; // true means the statement does not need to be put in
    }
    /**
     * Return all equivalent URIs by which this is known
     * @param x A named node
     */

  }, {
    key: "allAliases",
    value: function allAliases(x) {
      var a = this.aliases[this.id(this.canon(x))] || [];
      a.push(this.canon(x));
      return a;
    }
    /**
     * Compare by canonical URI as smushed
     * @param x A named node
     * @param y Another named node
     */

  }, {
    key: "sameThings",
    value: function sameThings(x, y) {
      if (x.equals(y)) {
        return true;
      }

      var x1 = this.canon(x); //    alert('x1='+x1)

      if (!x1) return false;
      var y1 = this.canon(y); //    alert('y1='+y1); //@@

      if (!y1) return false;
      return x1.value === y1.value;
    }
  }, {
    key: "setPrefixForURI",
    value: function setPrefixForURI(prefix, nsuri) {
      // TODO: This is a hack for our own issues, which ought to be fixed
      // post-release
      // See http://dig.csail.mit.edu/cgi-bin/roundup.cgi/$rdf/issue227
      if (prefix === 'tab' && this.namespaces['tab']) {
        return;
      } // There are files around with long badly generated prefixes like this


      if (prefix.slice(0, 2) === 'ns' || prefix.slice(0, 7) === 'default') {
        return;
      } // remove any prefix that currently targets nsuri


      for (var existingPrefix in this.namespaces) {
        if (this.namespaces[existingPrefix] == nsuri) delete this.namespaces[existingPrefix];
      }

      this.namespaces[prefix] = nsuri;
    }
    /** Search the Store
     *
     * ALL CONVENIENCE LOOKUP FUNCTIONS RELY ON THIS!
     * @param subj - A node to search for as subject, or if null, a wildcard
     * @param pred - A node to search for as predicate, or if null, a wildcard
     * @param obj - A node to search for as object, or if null, a wildcard
     * @param why - A node to search for as graph, or if null, a wildcard
     * @param justOne - flag - stop when found one rather than get all of them?
     * @returns An array of nodes which match the wildcard position
     */

  }, {
    key: "statementsMatching",
    value: function statementsMatching(subj, pred, obj, why, justOne) {
      // log.debug("Matching {"+subj+" "+pred+" "+obj+"}")
      var pat = [subj, pred, obj, why];
      var pattern = [];
      var hash = [];

      var given = []; // Not wild

      var p;
      var list;

      for (p = 0; p < 4; p++) {
        pattern[p] = this.canon(Node$2.fromValue(pat[p]));

        if (!pattern[p]) ; else {
          given.push(p);
          hash[p] = this.id(pattern[p]);
        }
      }

      if (given.length === 0) {
        return this.statements;
      }

      if (given.length === 1) {
        // Easy too, we have an index for that
        p = given[0];
        list = this.index[p][hash[p]];

        if (list && justOne) {
          if (list.length > 1) {
            list = list.slice(0, 1);
          }
        }

        list = list || [];
        return list;
      } // Now given.length is 2, 3 or 4.
      // We hope that the scale-free nature of the data will mean we tend to get
      // a short index in there somewhere!


      var best = 1e10; // really bad

      var iBest;
      var i;

      for (i = 0; i < given.length; i++) {
        p = given[i]; // Which part we are dealing with

        list = this.index[p][hash[p]];

        if (!list) {
          return []; // No occurrences
        }

        if (list.length < best) {
          best = list.length;
          iBest = i; // (not p!)
        }
      } // Ok, we have picked the shortest index but now we have to filter it


      var pBest = given[iBest];
      var possibles = this.index[pBest][hash[pBest]];
      var check = given.slice(0, iBest).concat(given.slice(iBest + 1)); // remove iBest

      var results = [];
      var parts = ['subject', 'predicate', 'object', 'why'];

      for (var j = 0; j < possibles.length; j++) {
        var st = possibles[j];

        for (i = 0; i < check.length; i++) {
          // for each position to be checked
          p = check[i];

          if (!this.canon(st[parts[p]]).equals(pattern[p])) {
            st = null;
            break;
          }
        }

        if (st != null) {
          results.push(st);
          if (justOne) break;
        }
      }

      return results;
    }
    /**
     * A list of all the URIs by which this thing is known
     * @param term
     */

  }, {
    key: "uris",
    value: function uris(term) {
      var cterm = this.canon(term);
      var terms = this.aliases[this.id(cterm)];
      if (!cterm.value) return [];
      var res = [cterm.value];

      if (terms) {
        for (var i = 0; i < terms.length; i++) {
          res.push(terms[i].uri);
        }
      }

      return res;
    }
  }, {
    key: "serialize",
    value: function serialize$1(base, contentType, provenance, options) {
      var _options;

      // override Formula.serialize to force the serializer namespace prefixes
      // to those of this IndexedFormula
      // if namespaces are explicitly passed in options, let them override the existing namespaces in this formula
      var namespaces = (_options = options) !== null && _options !== void 0 && _options.namespaces ? _objectSpread(_objectSpread({}, this.namespaces), options.namespaces) : _objectSpread({}, this.namespaces);
      options = _objectSpread(_objectSpread({}, options || {}), {}, {
        namespaces: namespaces
      });
      return serialize(provenance, this, base, contentType, undefined, options);
    }
  }], [{
    key: "defaultGraphURI",
    get: function get() {
      return defaultGraphURI;
    }
  }]);

  return IndexedFormula;
}(Formula);

_defineProperty(IndexedFormula, "handleRDFType", void 0);
IndexedFormula.handleRDFType = handleRDFType;

function hexify$1(str) {
  // also used in parser
  return encodeURI(str);
}

var Utf8 = {
  // public method for url encoding
  encode: function encode(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode(c >> 6 | 192);
        utftext += String.fromCharCode(c & 63 | 128);
      } else {
        utftext += String.fromCharCode(c >> 12 | 224);
        utftext += String.fromCharCode(c >> 6 & 63 | 128);
        utftext += String.fromCharCode(c & 63 | 128);
      }
    }

    return utftext;
  },
  // public method for url decoding
  decode: function decode(utftext) {
    var string = "";
    var i = 0;

    while (i < utftext.length) {
      var c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if (c > 191 && c < 224) {
        string += String.fromCharCode((c & 31) << 6 | utftext.charCodeAt(i + 1) & 63);
        i += 2;
      } else {
        string += String.fromCharCode((c & 15) << 12 | (utftext.charCodeAt(i + 1) & 63) << 6 | utftext.charCodeAt(i + 2) & 63);
        i += 3;
      }
    }

    return string;
  }
}; // Things we need to define to make converted pythn code work in js
var Logic_NS = "http://www.w3.org/2000/10/swap/log#"; //  pyjs seems to reference runtime library which I didn't find

var pyjslib_Tuple = function pyjslib_Tuple(theList) {
  return theList;
};

var pyjslib_List = function pyjslib_List(theList) {
  return theList;
};

var pyjslib_Dict = function pyjslib_Dict(listOfPairs) {
  if (listOfPairs.length > 0) throw "missing.js: oops nnonempty dict not imp";
  return [];
};

var pyjslib_len = function pyjslib_len(s) {
  return s.length;
};

var pyjslib_slice = function pyjslib_slice(str, i, j) {
  if (typeof str.slice == 'undefined') throw '@@ mising.js: No .slice function for ' + str + ' of type ' + _typeof(str);
  if (typeof j == 'undefined' || j == null) return str.slice(i);
  return str.slice(i, j); // @ exactly the same spec?
};

var StopIteration = Error('dummy error stop iteration');

var pyjslib_Iterator = function pyjslib_Iterator(theList) {
  this.last = 0;
  this.li = theList;

  this.next = function () {
    if (this.last == this.li.length) throw StopIteration;
    return this.li[this.last++];
  };

  return this;
};

var string_find = function string_find(str, s) {
  return str.indexOf(s);
};

var assertFudge = function assertFudge(condition, desc) {
  if (condition) return;
  if (desc) throw "python Assertion failed: " + desc;
  throw "(python) Assertion failed.";
};

var stringFromCharCode = function stringFromCharCode(uesc) {
  return String.fromCharCode(uesc);
};

String.prototype.encode = function (encoding) {
  if (encoding != 'utf-8') throw "UTF8_converter: can only do utf-8";
  return Utf8.encode(this);
};

String.prototype.decode = function (encoding) {
  if (encoding != 'utf-8') throw "UTF8_converter: can only do utf-8"; //return Utf8.decode(this);

  return this;
};

var uripath_join = function uripath_join(base, given) {
  return join(given, base); // sad but true
};

var becauseSubexpression = null; // No reason needed


var RDF_type_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var DAML_sameAs_URI = "http://www.w3.org/2002/07/owl#sameAs";
/*

$Id: n3parser.js 14561 2008-02-23 06:37:26Z kennyluck $

HAND EDITED FOR CONVERSION TO JAVASCRIPT

This module implements a Nptation3 parser, and the final
part of a notation3 serializer.

See also:

Notation 3
http://www.w3.org/DesignIssues/Notation3

Closed World Machine - and RDF Processor
http://www.w3.org/2000/10/swap/cwm

To DO: See also "@@" in comments

- Clean up interfaces
______________________________________________

Module originally by Dan Connolly, includeing notation3
parser and RDF generator. TimBL added RDF stream model
and N3 generation, replaced stream model with use
of common store/formula API.  Yosi Scharf developped
the module, including tests and test harness.

*/


var ADDED_HASH = "#";
var INTEGER_DATATYPE = "http://www.w3.org/2001/XMLSchema#integer";
var FLOAT_DATATYPE = "http://www.w3.org/2001/XMLSchema#double";
var DECIMAL_DATATYPE = "http://www.w3.org/2001/XMLSchema#decimal";
var DATE_DATATYPE = "http://www.w3.org/2001/XMLSchema#date";
var DATETIME_DATATYPE = "http://www.w3.org/2001/XMLSchema#dateTime";
var _notQNameChars = "\t\r\n !\"#$%&'()*.,+/;<=>?@[\\]^`{|}~";

var _notNameChars = _notQNameChars + ":";
var number_syntax = new RegExp("^([-+]?[0-9]+)(\\.[0-9]+)?(e[-+]?[0-9]+)?", 'g');
var datetime_syntax = new RegExp('^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9](T[0-9][0-9]:[0-9][0-9](:[0-9][0-9](\\.[0-9]*)?)?)?Z?');
var interesting = new RegExp("[\\\\\\r\\n\\\"]", 'g');
var langcode = new RegExp("^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*", 'g');

function createSinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why) {
  return new SinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why);
}
var SinkParser = /*#__PURE__*/function () {
  function SinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why) {
    _classCallCheck(this, SinkParser);

    if (typeof openFormula == 'undefined') openFormula = null;
    if (typeof thisDoc == 'undefined') thisDoc = "";
    if (typeof baseURI == 'undefined') baseURI = null;
    if (typeof genPrefix == 'undefined') genPrefix = "";
    if (typeof flags == 'undefined') flags = "";
    if (typeof why == 'undefined') why = null;
    /*
    note: namespace names should *not* end in #;
    the # will get added during qname processing */

    this._bindings = new pyjslib_Dict([]);
    this._flags = flags;

    if (thisDoc != "") {
      assertFudge(thisDoc.indexOf(":") >= 0, "Document URI not absolute: " + thisDoc);
      this._bindings[""] = thisDoc + "#";
    }

    this._store = store;

    if (genPrefix) {
      store.setGenPrefix(genPrefix);
    }

    this._thisDoc = thisDoc;
    this.source = store.sym(thisDoc);
    this.lines = 0;
    this.statementCount = 0;
    this.startOfLine = 0;
    this.previousLine = 0;
    this._genPrefix = genPrefix;
    this.keywords = new pyjslib_List(["a", "this", "bind", "has", "is", "of", "true", "false"]);
    this.keywordsSet = 0;
    this._anonymousNodes = new pyjslib_Dict([]);
    this._variables = new pyjslib_Dict([]);
    this._parentVariables = new pyjslib_Dict([]);
    this._reason = why;
    this._reason2 = null;

    if (baseURI) {
      this._baseURI = baseURI;
    } else {
      if (thisDoc) {
        this._baseURI = thisDoc;
      } else {
        this._baseURI = null;
      }
    }

    assertFudge(!this._baseURI || this._baseURI.indexOf(":") >= 0);

    if (!this._genPrefix) {
      if (this._thisDoc) {
        this._genPrefix = this._thisDoc + "#_g";
      } else {
        this._genPrefix = RDFSink_uniqueURI();
      }
    }

    if (openFormula == null) {
      if (this._thisDoc) {
        this._formula = store.formula(thisDoc + "#_formula");
      } else {
        this._formula = store.formula();
      }
    } else {
      this._formula = openFormula;
    }

    this._context = this._formula;
    this._parentContext = null;
  }

  _createClass(SinkParser, [{
    key: "here",
    value: function here(i) {
      return this._genPrefix + "_L" + this.lines + "C" + (i - this.startOfLine + 1);
    }
  }, {
    key: "formula",
    value: function formula() {
      return this._formula;
    }
  }, {
    key: "loadStream",
    value: function loadStream(stream) {
      return this.loadBuf(stream.read());
    }
  }, {
    key: "loadBuf",
    value: function loadBuf(buf) {
      /*
      Parses a buffer and returns its top level formula*/
      this.startDoc();
      this.feed(buf);
      return this.endDoc();
    }
  }, {
    key: "feed",
    value: function feed(octets) {
      /*
      Feed an octet stream tothe parser
       if BadSyntax is raised, the string
      passed in the exception object is the
      remainder after any statements have been parsed.
      So if there is more data to feed to the
      parser, it should be straightforward to recover.*/
      var str = octets.decode("utf-8");
      var i = 0;

      while (i >= 0) {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          return;
        }

        var i = this.directiveOrStatement(str, j);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "expected directive or statement");
        }
      }
    }
  }, {
    key: "directiveOrStatement",
    value: function directiveOrStatement(str, h) {
      var i = this.skipSpace(str, h);

      if (i < 0) {
        return i;
      }

      var j = this.directive(str, i);

      if (j >= 0) {
        return this.checkDot(str, j);
      }

      var j = this.statement(str, i);

      if (j >= 0) {
        return this.checkDot(str, j);
      }

      return j;
    }
  }, {
    key: "tok",
    value: function tok(_tok, str, i) {

      if (str.slice(i, i + 1) == "@") {
        var i = i + 1;
      } else {
        if (ArrayIndexOf(this.keywords, _tok) < 0) {
          return -1;
        }
      }

      var k = i + pyjslib_len(_tok);

      if (str.slice(i, k) == _tok && _notQNameChars.indexOf(str.charAt(k)) >= 0) {
        return k;
      } else {
        return -1;
      }
    }
  }, {
    key: "directive",
    value: function directive(str, i) {
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return j;
      }

      var res = new pyjslib_List([]);
      var j = this.tok("bind", str, i);

      if (j > 0) {
        throw BadSyntax(this._thisDoc, this.lines, str, i, "keyword bind is obsolete: use @prefix");
      }

      var j = this.tok("keywords", str, i);

      if (j > 0) {
        var i = this.commaSeparatedList(str, j, res, false);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "'@keywords' needs comma separated list of words");
        }

        this.setKeywords(pyjslib_slice(res, null, null));

        return i;
      }

      var j = this.tok("forAll", str, i);

      if (j > 0) {
        var i = this.commaSeparatedList(str, j, res, true);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "Bad variable list after @forAll");
        }

        var __x = new pyjslib_Iterator(res);

        try {
          while (true) {
            var x = __x.next();

            if (ArrayIndexOf(this._variables, x) < 0 || ArrayIndexOf(this._parentVariables, x) >= 0) {
              this._variables[x] = this._context.newUniversal(x);
            }
          }
        } catch (e) {
          if (e != StopIteration) {
            throw e;
          }
        }

        return i;
      }

      var j = this.tok("forSome", str, i);

      if (j > 0) {
        var i = this.commaSeparatedList(str, j, res, this.uri_ref2);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "Bad variable list after @forSome");
        }

        var __x = new pyjslib_Iterator(res);

        try {
          while (true) {
            var x = __x.next();

            this._context.declareExistential(x);
          }
        } catch (e) {
          if (e != StopIteration) {
            throw e;
          }
        }

        return i;
      }

      var j = this.tok("prefix", str, i);

      if (j >= 0) {
        var t = new pyjslib_List([]);
        var i = this.qname(str, j, t);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "expected qname after @prefix");
        }

        var j = this.uri_ref2(str, i, t);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "expected <uriref> after @prefix _qname_");
        }

        var ns = t[1].uri;

        if (this._baseURI) {
          var ns = uripath_join(this._baseURI, ns);
        } else {
          assertFudge(ns.indexOf(":") >= 0, "With no base URI, cannot handle relative URI for NS");
        }

        assertFudge(ns.indexOf(":") >= 0);
        this._bindings[t[0][0]] = ns;
        this.bind(t[0][0], hexify$1(ns));
        return j;
      }

      var j = this.tok("base", str, i);

      if (j >= 0) {
        var t = new pyjslib_List([]);
        var i = this.uri_ref2(str, j, t);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "expected <uri> after @base ");
        }

        var ns = t[0].uri;

        if (this._baseURI) {
          var ns = uripath_join(this._baseURI, ns);
        } else {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "With no previous base URI, cannot use relative URI in @base  <" + ns + ">");
        }

        assertFudge(ns.indexOf(":") >= 0);
        this._baseURI = ns;
        return i;
      }

      return -1;
    }
  }, {
    key: "bind",
    value: function bind(qn, uri) {
      if (qn == "") ; else {
        this._store.setPrefixForURI(qn, uri);
      }
    }
  }, {
    key: "setKeywords",
    value: function setKeywords(k) {
      /*
      Takes a list of strings*/
      if (k == null) {
        this.keywordsSet = 0;
      } else {
        this.keywords = k;
        this.keywordsSet = 1;
      }
    }
  }, {
    key: "startDoc",
    value: function startDoc() {}
  }, {
    key: "endDoc",
    value: function endDoc() {
      /*
      Signal end of document and stop parsing. returns formula*/
      return this._formula;
    }
  }, {
    key: "makeStatement",
    value: function makeStatement(quad) {
      quad[0].add(quad[2], quad[1], quad[3], this.source);
      this.statementCount += 1;
    }
  }, {
    key: "statement",
    value: function statement(str, i) {
      var r = new pyjslib_List([]);
      var i = this.object(str, i, r);

      if (i < 0) {
        return i;
      }

      var j = this.property_list(str, i, r[0]);

      if (j < 0) {
        throw BadSyntax(this._thisDoc, this.lines, str, i, "expected propertylist");
      }

      return j;
    }
  }, {
    key: "subject",
    value: function subject(str, i, res) {
      return this.item(str, i, res);
    }
  }, {
    key: "verb",
    value: function verb(str, i, res) {
      /*
      has _prop_
      is _prop_ of
      a
      =
      _prop_
      >- prop ->
      <- prop -<
      _operator_*/
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return j;
      }

      var r = new pyjslib_List([]);
      var j = this.tok("has", str, i);

      if (j >= 0) {
        var i = this.prop(str, j, r);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "expected property after 'has'");
        }

        res.push(new pyjslib_Tuple(["->", r[0]]));
        return i;
      }

      var j = this.tok("is", str, i);

      if (j >= 0) {
        var i = this.prop(str, j, r);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "expected <property> after 'is'");
        }

        var j = this.skipSpace(str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "End of file found, expected property after 'is'");
        }

        var i = j;
        var j = this.tok("of", str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "expected 'of' after 'is' <prop>");
        }

        res.push(new pyjslib_Tuple(["<-", r[0]]));
        return j;
      }

      var j = this.tok("a", str, i);

      if (j >= 0) {
        res.push(new pyjslib_Tuple(["->", this._store.sym(RDF_type_URI)]));
        return j;
      }

      if (str.slice(i, i + 2) == "<=") {
        res.push(new pyjslib_Tuple(["<-", this._store.sym(Logic_NS + "implies")]));
        return i + 2;
      }

      if (str.slice(i, i + 1) == "=") {
        if (str.slice(i + 1, i + 2) == ">") {
          res.push(new pyjslib_Tuple(["->", this._store.sym(Logic_NS + "implies")]));
          return i + 2;
        }

        res.push(new pyjslib_Tuple(["->", this._store.sym(DAML_sameAs_URI)]));
        return i + 1;
      }

      if (str.slice(i, i + 2) == ":=") {
        res.push(new pyjslib_Tuple(["->", Logic_NS + "becomes"]));
        return i + 2;
      }

      var j = this.prop(str, i, r);

      if (j >= 0) {
        res.push(new pyjslib_Tuple(["->", r[0]]));
        return j;
      }

      if (str.slice(i, i + 2) == ">-" || str.slice(i, i + 2) == "<-") {
        throw BadSyntax(this._thisDoc, this.lines, str, j, ">- ... -> syntax is obsolete.");
      }

      return -1;
    }
  }, {
    key: "prop",
    value: function prop(str, i, res) {
      return this.item(str, i, res);
    }
  }, {
    key: "item",
    value: function item(str, i, res) {
      return this.path(str, i, res);
    }
  }, {
    key: "blankNode",
    value: function blankNode(uri) {
      return this._context.bnode(uri, this._reason2);
    }
  }, {
    key: "path",
    value: function path(str, i, res) {
      /*
      Parse the path production.
      */
      var j = this.nodeOrLiteral(str, i, res);

      if (j < 0) {
        return j;
      }

      while ("!^.".indexOf(str.slice(j, j + 1)) >= 0) {
        var ch = str.slice(j, j + 1);

        if (ch == ".") {
          var ahead = str.slice(j + 1, j + 2);

          if (!ahead || _notNameChars.indexOf(ahead) >= 0 && ":?<[{(".indexOf(ahead) < 0) {
            break;
          }
        }

        var subj = res.pop();
        var obj = this.blankNode(this.here(j));
        var j = this.node(str, j + 1, res);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found in middle of path syntax");
        }

        var pred = res.pop();

        if (ch == "^") {
          this.makeStatement(new pyjslib_Tuple([this._context, pred, obj, subj]));
        } else {
          this.makeStatement(new pyjslib_Tuple([this._context, pred, subj, obj]));
        }

        res.push(obj);
      }

      return j;
    }
  }, {
    key: "anonymousNode",
    value: function anonymousNode(ln) {
      /*
      Remember or generate a term for one of these _: anonymous nodes*/
      var term = this._anonymousNodes[ln];

      if (term) {
        return term;
      }

      var term = this._store.bnode(ln); // var term = this._store.bnode(this._context, this._reason2); eh?


      this._anonymousNodes[ln] = term;
      return term;
    }
  }, {
    key: "node",
    value: function node(str, i, res, subjectAlready) {
      if (typeof subjectAlready == 'undefined') subjectAlready = null;
      /*
      Parse the <node> production.
      Space is now skipped once at the beginning
      instead of in multipe calls to self.skipSpace().
      */

      var subj = subjectAlready;
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return j;
      }

      var i = j;
      var ch = str.slice(i, i + 1);

      if (ch == "[") {
        var bnodeID = this.here(i);
        var j = this.skipSpace(str, i + 1);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF after '['");
        }

        if (str.slice(j, j + 1) == "=") {
          var i = j + 1;
          var objs = new pyjslib_List([]);
          var j = this.objectList(str, i, objs);

          if (j >= 0) {
            var subj = objs[0];

            if (pyjslib_len(objs) > 1) {
              var __obj = new pyjslib_Iterator(objs);

              try {
                while (true) {
                  var obj = __obj.next();

                  this.makeStatement(new pyjslib_Tuple([this._context, this._store.sym(DAML_sameAs_URI), subj, obj]));
                }
              } catch (e) {
                if (e != StopIteration) {
                  throw e;
                }
              }
            }

            var j = this.skipSpace(str, j);

            if (j < 0) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF when objectList expected after [ = ");
            }

            if (str.slice(j, j + 1) == ";") {
              var j = j + 1;
            }
          } else {
            throw BadSyntax(this._thisDoc, this.lines, str, i, "objectList expected after [= ");
          }
        }

        if (subj == null) {
          var subj = this.blankNode(bnodeID);
        }

        var i = this.property_list(str, j, subj);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "property_list expected");
        }

        var j = this.skipSpace(str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF when ']' expected after [ <propertyList>");
        }

        if (str.slice(j, j + 1) != "]") {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "']' expected");
        }

        res.push(subj);
        return j + 1;
      }

      if (ch == "{") {
        var ch2 = str.slice(i + 1, i + 2);

        if (ch2 == "$") {
          i += 1;
          var j = i + 1;
          var mylist = new pyjslib_List([]);
          var first_run = true;

          while (1) {
            var i = this.skipSpace(str, j);

            if (i < 0) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "needed '$}', found end.");
            }

            if (str.slice(i, i + 2) == "$}") {
              var j = i + 2;
              break;
            }

            if (!first_run) {
              if (str.slice(i, i + 1) == ",") {
                i += 1;
              } else {
                throw BadSyntax(this._thisDoc, this.lines, str, i, "expected: ','");
              }
            } else {
              var first_run = false;
            }

            var item = new pyjslib_List([]);
            var j = this.item(str, i, item);

            if (j < 0) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "expected item in set or '$}'");
            }

            mylist.push(item[0]);
          }

          res.push(this._store.newSet(mylist, this._context));
          return j;
        } else {
          var j = i + 1;
          var oldParentContext = this._parentContext;
          this._parentContext = this._context;
          var parentAnonymousNodes = this._anonymousNodes;
          var grandParentVariables = this._parentVariables;
          this._parentVariables = this._variables;
          this._anonymousNodes = new pyjslib_Dict([]);
          this._variables = this._variables.slice();
          var reason2 = this._reason2;
          this._reason2 = becauseSubexpression;

          if (subj == null) {
            var subj = this._store.formula();
          }

          this._context = subj;

          while (1) {
            var i = this.skipSpace(str, j);

            if (i < 0) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "needed '}', found end.");
            }

            if (str.slice(i, i + 1) == "}") {
              var j = i + 1;
              break;
            }

            var j = this.directiveOrStatement(str, i);

            if (j < 0) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "expected statement or '}'");
            }
          }

          this._anonymousNodes = parentAnonymousNodes;
          this._variables = this._parentVariables;
          this._parentVariables = grandParentVariables;
          this._context = this._parentContext;
          this._reason2 = reason2;
          this._parentContext = oldParentContext;
          res.push(subj.close());
          return j;
        }
      }

      if (ch == "(") {
        var thing_type = this._store.list;
        var ch2 = str.slice(i + 1, i + 2);

        if (ch2 == "$") {
          var thing_type = this._store.newSet;
          i += 1;
        }

        var j = i + 1;
        var mylist = new pyjslib_List([]);

        while (1) {
          var i = this.skipSpace(str, j);

          if (i < 0) {
            throw BadSyntax(this._thisDoc, this.lines, str, i, "needed ')', found end.");
          }

          if (str.slice(i, i + 1) == ")") {
            var j = i + 1;
            break;
          }

          var item = new pyjslib_List([]);
          var j = this.item(str, i, item);

          if (j < 0) {
            throw BadSyntax(this._thisDoc, this.lines, str, i, "expected item in list or ')'");
          }

          mylist.push(item[0]);
        }

        res.push(thing_type(mylist, this._context));
        return j;
      }

      var j = this.tok("this", str, i);

      if (j >= 0) {
        throw BadSyntax(this._thisDoc, this.lines, str, i, "Keyword 'this' was ancient N3. Now use @forSome and @forAll keywords.");
      }

      var j = this.tok("true", str, i);

      if (j >= 0) {
        res.push(true);
        return j;
      }

      var j = this.tok("false", str, i);

      if (j >= 0) {
        res.push(false);
        return j;
      }

      if (subj == null) {
        var j = this.uri_ref2(str, i, res);

        if (j >= 0) {
          return j;
        }
      }

      return -1;
    }
  }, {
    key: "property_list",
    value: function property_list(str, i, subj) {
      /*
      Parse property list
      Leaves the terminating punctuation in the buffer
      */
      while (1) {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF found when expected verb in property list");
        }

        if (str.slice(j, j + 2) == ":-") {
          var i = j + 2;
          var res = new pyjslib_List([]);
          var j = this.node(str, i, res, subj);

          if (j < 0) {
            throw BadSyntax(this._thisDoc, this.lines, str, i, "bad {} or () or [] node after :- ");
          }

          var i = j;
          continue;
        }

        var i = j;
        var v = new pyjslib_List([]);
        var j = this.verb(str, i, v);

        if (j <= 0) {
          return i;
        }

        var objs = new pyjslib_List([]);
        var i = this.objectList(str, j, objs);

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "objectList expected");
        }

        var __obj = new pyjslib_Iterator(objs);

        try {
          while (true) {
            var obj = __obj.next();

            var pairFudge = v[0];
            var dir = pairFudge[0];
            var sym = pairFudge[1];

            if (dir == "->") {
              this.makeStatement(new pyjslib_Tuple([this._context, sym, subj, obj]));
            } else {
              this.makeStatement(new pyjslib_Tuple([this._context, sym, obj, subj]));
            }
          }
        } catch (e) {
          if (e != StopIteration) {
            throw e;
          }
        }

        var j = this.skipSpace(str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found in list of objects");
        }

        if (str.slice(i, i + 1) != ";") {
          return i;
        }

        var i = i + 1;
      }
    }
  }, {
    key: "commaSeparatedList",
    value: function commaSeparatedList(str, j, res, ofUris) {
      /*
      return value: -1 bad syntax; >1 new position in str
      res has things found appended
       Used to use a final value of the function to be called, e.g. this.bareWord
      but passing the function didn't work fo js converion pyjs
      */
      var i = this.skipSpace(str, j);

      if (i < 0) {
        throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF found expecting comma sep list");
      }

      if (str.charAt(i) == ".") {
        return j;
      }

      if (ofUris) {
        var i = this.uri_ref2(str, i, res);
      } else {
        var i = this.bareWord(str, i, res);
      }

      if (i < 0) {
        return -1;
      }

      while (1) {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          return j;
        }

        var ch = str.slice(j, j + 1);

        if (ch != ",") {
          if (ch != ".") {
            return -1;
          }

          return j;
        }

        if (ofUris) {
          var i = this.uri_ref2(str, j + 1, res);
        } else {
          var i = this.bareWord(str, j + 1, res);
        }

        if (i < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "bad list content");
        }
      }
    }
  }, {
    key: "objectList",
    value: function objectList(str, i, res) {
      var i = this.object(str, i, res);

      if (i < 0) {
        return -1;
      }

      while (1) {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found after object");
        }

        if (str.slice(j, j + 1) != ",") {
          return j;
        }

        var i = this.object(str, j + 1, res);

        if (i < 0) {
          return i;
        }
      }
    }
  }, {
    key: "checkDot",
    value: function checkDot(str, i) {
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return j;
      }

      if (str.slice(j, j + 1) == ".") {
        return j + 1;
      }

      if (str.slice(j, j + 1) == "}") {
        return j;
      }

      if (str.slice(j, j + 1) == "]") {
        return j;
      }

      throw BadSyntax(this._thisDoc, this.lines, str, j, "expected '.' or '}' or ']' at end of statement");
    }
  }, {
    key: "uri_ref2",
    value: function uri_ref2(str, i, res) {
      /*
      Generate uri from n3 representation.
       Note that the RDF convention of directly concatenating
      NS and local name is now used though I prefer inserting a '#'
      to make the namesapces look more like what XML folks expect.
      */
      var qn = new pyjslib_List([]);
      var j = this.qname(str, i, qn);

      if (j >= 0) {
        var pairFudge = qn[0];
        var pfx = pairFudge[0];
        var ln = pairFudge[1];

        if (pfx == null) {
          assertFudge(0, "not used?");
          var ns = this._baseURI + ADDED_HASH;
        } else {
          var ns = this._bindings[pfx];

          if (!ns) {
            if (pfx == "_") {
              res.push(this.anonymousNode(ln));
              return j;
            }

            throw BadSyntax(this._thisDoc, this.lines, str, i, "Prefix " + pfx + " not bound.");
          }
        }

        var symb = this._store.sym(ns + ln);

        if (ArrayIndexOf(this._variables, symb) >= 0) {
          res.push(this._variables[symb]);
        } else {
          res.push(symb);
        }

        return j;
      }

      var i = this.skipSpace(str, i);

      if (i < 0) {
        return -1;
      }

      if (str.charAt(i) == "?") {
        var v = new pyjslib_List([]);
        var j = this.variable(str, i, v);

        if (j > 0) {
          res.push(v[0]);
          return j;
        }

        return -1;
      } else if (str.charAt(i) == "<") {
        var i = i + 1;
        var st = i;

        while (i < pyjslib_len(str)) {
          if (str.charAt(i) == ">") {
            var uref = str.slice(st, i);

            if (this._baseURI) {
              var uref = uripath_join(this._baseURI, uref);
            } else {
              assertFudge(uref.indexOf(":") >= 0, "With no base URI, cannot deal with relative URIs");
            }

            if (str.slice(i - 1, i) == "#" && !(pyjslib_slice(uref, -1, null) == "#")) {
              var uref = uref + "#";
            }

            var symb = this._store.sym(uref);

            if (ArrayIndexOf(this._variables, symb) >= 0) {
              res.push(this._variables[symb]);
            } else {
              res.push(symb);
            }

            return i + 1;
          }

          var i = i + 1;
        }

        throw BadSyntax(this._thisDoc, this.lines, str, j, "unterminated URI reference");
      } else if (this.keywordsSet) {
        var v = new pyjslib_List([]);
        var j = this.bareWord(str, i, v);

        if (j < 0) {
          return -1;
        }

        if (ArrayIndexOf(this.keywords, v[0]) >= 0) {
          throw BadSyntax(this._thisDoc, this.lines, str, i, "Keyword \"" + v[0] + "\" not allowed here.");
        }

        res.push(this._store.sym(this._bindings[""] + v[0]));
        return j;
      } else {
        return -1;
      }
    }
  }, {
    key: "skipSpace",
    value: function skipSpace(str, i) {
      /*
      Skip white space, newlines and comments.
      return -1 if EOF, else position of first non-ws character*/
      var whitespace = " \n\r\t\f\x0B\xA0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u2028\u2029\u3000";

      for (var j = i ? i : 0; j < str.length; j++) {
        var ch = str.charAt(j); // console.log("    skipspace j= "+j + " i= " + i + " n= " + str.length);
        // console.log(" skipspace ch <" + ch + ">");

        if (whitespace.indexOf(ch) < 0) {
          //not ws
          // console.log(" skipspace 2 ch <" + ch + ">");
          if (str.charAt(j) === '#') {
            for (;; j++) {
              // console.log("    skipspace2 j= "+j + " i= " + i + " n= " + str.length);
              if (j === str.length) {
                return -1; // EOF
              }

              if (str.charAt(j) === '\n') {
                this.lines = this.lines + 1;
                break;
              }
            }
          } else {
            // Not hash - something interesting
            // console.log(" skipspace 3 ch <" + ch + ">");
            return j;
          }
        } else {
          // Whitespace
          // console.log(" skipspace 5 ch <" + ch + ">");
          if (str.charAt(j) === '\n') {
            this.lines = this.lines + 1;
          }
        }
      } // next j


      return -1; // EOF
    }
  }, {
    key: "variable",
    value: function variable(str, i, res) {
      /*
      ?abc -> variable(:abc)
      */
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return -1;
      }

      if (str.slice(j, j + 1) != "?") {
        return -1;
      }

      var j = j + 1;
      var i = j;

      if ("0123456789-".indexOf(str.charAt(j)) >= 0) {
        throw BadSyntax(this._thisDoc, this.lines, str, j, "Varible name can't start with '" + str.charAt(j) + "s'");
      }

      while (i < pyjslib_len(str) && _notNameChars.indexOf(str.charAt(i)) < 0) {
        var i = i + 1;
      }

      if (this._parentContext == null) {
        throw BadSyntax(this._thisDoc, this.lines, str, j, "Can't use ?xxx syntax for variable in outermost level: " + str.slice(j - 1, i));
      }

      res.push(this._store.variable(str.slice(j, i)));
      return i;
    }
  }, {
    key: "bareWord",
    value: function bareWord(str, i, res) {
      /*
      abc -> :abc
      */
      var j = this.skipSpace(str, i);

      if (j < 0) {
        return -1;
      }

      var ch = str.charAt(j);

      if ("0123456789-".indexOf(ch) >= 0) {
        return -1;
      }

      if (_notNameChars.indexOf(ch) >= 0) {
        return -1;
      }

      var i = j;

      while (i < pyjslib_len(str) && _notNameChars.indexOf(str.charAt(i)) < 0) {
        var i = i + 1;
      }

      res.push(str.slice(j, i));
      return i;
    }
  }, {
    key: "qname",
    value: function qname(str, i, res) {
      /*
       xyz:def -> ('xyz', 'def')
      If not in keywords and keywordsSet: def -> ('', 'def')
      :def -> ('', 'def')
      */
      var i = this.skipSpace(str, i);

      if (i < 0) {
        return -1;
      }

      var c = str.charAt(i);

      if ("0123456789-+".indexOf(c) >= 0) {
        return -1;
      }

      if (_notNameChars.indexOf(c) < 0) {
        var ln = c;
        var i = i + 1;

        while (i < pyjslib_len(str)) {
          var c = str.charAt(i);

          if (_notNameChars.indexOf(c) < 0) {
            var ln = ln + c;
            var i = i + 1;
          } else {
            break;
          }
        }
      } else {
        var ln = "";
      }

      if (i < pyjslib_len(str) && str.charAt(i) == ":") {
        var pfx = ln;
        var i = i + 1;
        var ln = "";

        while (i < pyjslib_len(str)) {
          var c = str.charAt(i);

          if (_notNameChars.indexOf(c) < 0) {
            var ln = ln + c;
            var i = i + 1;
          } else {
            break;
          }
        }

        res.push(new pyjslib_Tuple([pfx, ln]));
        return i;
      } else {
        if (ln && this.keywordsSet && ArrayIndexOf(this.keywords, ln) < 0) {
          res.push(new pyjslib_Tuple(["", ln]));
          return i;
        }

        return -1;
      }
    }
  }, {
    key: "object",
    value: function object(str, i, res) {
      var j = this.subject(str, i, res);

      if (j >= 0) {
        return j;
      } else {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          return -1;
        } else {
          var i = j;
        }

        var delim = null;
        var ch = str.charAt(i);

        if (ch == "\"" || ch == "'") {
          if (str.slice(i, i + 3 == ch + ch)) {
            delim = ch + ch + ch;
          } else {
            delim = ch;
          }

          var i = i + pyjslib_len(delim);
          var pairFudge = this.strconst(str, i, delim);
          var j = pairFudge[0];
          var s = pairFudge[1];
          res.push(this._store.literal(s));
          return j;
        } else {
          return -1;
        }
      }
    }
  }, {
    key: "nodeOrLiteral",
    value: function nodeOrLiteral(str, i, res) {
      var j = this.node(str, i, res);

      if (j >= 0) {
        return j;
      } else {
        var j = this.skipSpace(str, i);

        if (j < 0) {
          return -1;
        } else {
          var i = j;
        }

        var ch = str.charAt(i);

        if ("-+0987654321".indexOf(ch) >= 0) {
          datetime_syntax.lastIndex = 0;
          var m = datetime_syntax.exec(str.slice(i));

          if (m != null) {
            // j =  ( i + datetime_syntax.lastIndex ) ;
            var val = m[0];
            j = i + val.length;

            if (val.indexOf("T") >= 0) {
              res.push(this._store.literal(val, this._store.sym(DATETIME_DATATYPE)));
            } else {
              res.push(this._store.literal(val, this._store.sym(DATE_DATATYPE)));
            }
          } else {
            number_syntax.lastIndex = 0;
            var m = number_syntax.exec(str.slice(i));

            if (m == null) {
              throw BadSyntax(this._thisDoc, this.lines, str, i, "Bad number or date syntax");
            }

            j = i + number_syntax.lastIndex;
            var val = str.slice(i, j);

            if (val.indexOf("e") >= 0) {
              res.push(this._store.literal(parseFloat(val), this._store.sym(FLOAT_DATATYPE)));
            } else if (str.slice(i, j).indexOf(".") >= 0) {
              res.push(this._store.literal(parseFloat(val), this._store.sym(DECIMAL_DATATYPE)));
            } else {
              res.push(this._store.literal(parseInt(val), this._store.sym(INTEGER_DATATYPE)));
            }
          }
          return j; // Where we have got up to
        }

        if (str.charAt(i) == "\"") {
          if (str.slice(i, i + 3) == "\"\"\"") {
            var delim = "\"\"\"";
          } else {
            var delim = "\"";
          }

          var i = i + pyjslib_len(delim);
          var dt = null;
          var pairFudge = this.strconst(str, i, delim);
          var j = pairFudge[0];
          var s = pairFudge[1];
          var lang = null;

          if (str.slice(j, j + 1) == "@") {
            langcode.lastIndex = 0;
            var m = langcode.exec(str.slice(j + 1));

            if (m == null) {
              throw BadSyntax(this._thisDoc, startline, str, i, "Bad language code syntax on string literal, after @");
            }

            var i = langcode.lastIndex + j + 1;
            var lang = str.slice(j + 1, i);
            var j = i;
          }

          if (str.slice(j, j + 2) == "^^") {
            var res2 = new pyjslib_List([]);
            var j = this.uri_ref2(str, j + 2, res2);
            var dt = res2[0];
          }

          res.push(this._store.literal(s, lang || dt));
          return j;
        } else {
          return -1;
        }
      }
    }
  }, {
    key: "strconst",
    value: function strconst(str, i, delim) {
      /*
      parse an N3 string constant delimited by delim.
      return index, val
      */
      var j = i;
      var ustr = "";
      var startline = this.lines;

      while (j < pyjslib_len(str)) {
        var i = j + pyjslib_len(delim);

        if (str.slice(j, i) == delim) {
          return new pyjslib_Tuple([i, ustr]);
        }

        if (str.charAt(j) == "\"") {
          var ustr = ustr + "\"";
          var j = j + 1;
          continue;
        }

        interesting.lastIndex = 0;
        var m = interesting.exec(str.slice(j));

        if (!m) {
          throw BadSyntax(this._thisDoc, startline, str, j, "Closing quote missing in string at ^ in " + str.slice(j - 20, j) + "^" + str.slice(j, j + 20));
        }

        var i = j + interesting.lastIndex - 1;
        var ustr = ustr + str.slice(j, i);
        var ch = str.charAt(i);

        if (ch == "\"") {
          var j = i;
          continue;
        } else if (ch == "\r") {
          var j = i + 1;
          continue;
        } else if (ch == "\n") {
          if (delim == "\"") {
            throw BadSyntax(this._thisDoc, startline, str, i, "newline found in string literal");
          }

          this.lines = this.lines + 1;
          var ustr = ustr + ch;
          var j = i + 1;
          this.previousLine = this.startOfLine;
          this.startOfLine = j;
        } else if (ch == "\\") {
          var j = i + 1;
          var ch = str.slice(j, j + 1);

          if (!ch) {
            throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal (2)");
          }

          var k = string_find("abfrtvn\\\"", ch);

          if (k >= 0) {
            var uch = "\a\b\f\r\t\v\n\\\"".charAt(k);
            var ustr = ustr + uch;
            var j = j + 1;
          } else if (ch == "u") {
            var pairFudge = this.uEscape(str, j + 1, startline);
            var j = pairFudge[0];
            var ch = pairFudge[1];
            var ustr = ustr + ch;
          } else if (ch == "U") {
            var pairFudge = this.UEscape(str, j + 1, startline);
            var j = pairFudge[0];
            var ch = pairFudge[1];
            var ustr = ustr + ch;
          } else {
            throw BadSyntax(this._thisDoc, this.lines, str, i, "bad escape");
          }
        }
      }

      throw BadSyntax(this._thisDoc, this.lines, str, i, "unterminated string literal");
    }
  }, {
    key: "uEscape",
    value: function uEscape(str, i, startline) {
      var j = i;
      var count = 0;
      var value = 0;

      while (count < 4) {
        var chFudge = str.slice(j, j + 1);
        var ch = chFudge.toLowerCase();
        var j = j + 1;

        if (ch == "") {
          throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal(3)");
        }

        var k = string_find("0123456789abcdef", ch);

        if (k < 0) {
          throw BadSyntax(this._thisDoc, startline, str, i, "bad string literal hex escape");
        }

        var value = value * 16 + k;
        var count = count + 1;
      }

      var uch = String.fromCharCode(value);
      return new pyjslib_Tuple([j, uch]);
    }
  }, {
    key: "UEscape",
    value: function UEscape(str, i, startline) {
      var j = i;
      var count = 0;
      var value = "\\U";

      while (count < 8) {
        var chFudge = str.slice(j, j + 1);
        var ch = chFudge.toLowerCase();
        var j = j + 1;

        if (ch == "") {
          throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal(3)");
        }

        var k = string_find("0123456789abcdef", ch);

        if (k < 0) {
          throw BadSyntax(this._thisDoc, startline, str, i, "bad string literal hex escape");
        }

        var value = value + ch;
        var count = count + 1;
      }

      var uch = stringFromCharCode("0x" + pyjslib_slice(value, 2, 10) - 0);
      return new pyjslib_Tuple([j, uch]);
    }
  }]);

  return SinkParser;
}();

function BadSyntax(uri, lines, str, i, why) {
  var lineNo = lines + 1;
  var msg = "Line " + lineNo + " of <" + uri + ">: Bad syntax: " + why + "\nat: \"" + str.slice(i, i + 30) + "\"";
  var e = new SyntaxError(msg, uri, lineNo);
  e.lineNo = lineNo;
  e.characterInFile = i;
  e.syntaxProblem = why;
  return e;
}

var _supports$1;

function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$1(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$1(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$1(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/**
 * Data factory which also supports Collections
 *
 * Necessary for preventing circular dependencies.
 */
var ExtendedTermFactory = _objectSpread$1(_objectSpread$1({}, CanonicalDataFactory), {}, {
  supports: (_supports$1 = {}, _defineProperty(_supports$1, Feature.collections, true), _defineProperty(_supports$1, Feature.defaultGraphType, false), _defineProperty(_supports$1, Feature.equalsMethod, true), _defineProperty(_supports$1, Feature.identity, false), _defineProperty(_supports$1, Feature.id, true), _defineProperty(_supports$1, Feature.reversibleId, false), _defineProperty(_supports$1, Feature.variableType, true), _supports$1),

  /**
   * Creates a new collection
   * @param elements - The initial element
   */
  collection: function collection(elements) {
    return new Collection(elements);
  },
  id: function id(term) {
    var _this = this;

    if (isCollection(term)) {
      return "( ".concat(term.elements.map(function (e) {
        return _this.id(e);
      }).join(', '), " )");
    }

    if (isVariable(term)) {
      return Variable.toString(term);
    }

    return CanonicalDataFactory.id(term);
  },
  termToNQ: function termToNQ(term) {
    if (term.termType === CollectionTermType) {
      return Collection.toNT(term);
    }

    return CanonicalDataFactory.termToNQ(term);
  }
});

/**
 * Parses json-ld formatted JS objects to a rdf Term.
 * @param kb - The DataFactory to use.
 * @param obj - The json-ld object to process.
 * @return {Literal|NamedNode|BlankNode|Collection}
 */

function jsonldObjectToTerm(kb, obj) {
  if (typeof obj === 'string') {
    return kb.rdfFactory.literal(obj);
  }

  if (Object.prototype.hasOwnProperty.call(obj, '@list')) {
    if (kb.rdfFactory.supports["COLLECTIONS"] === true) {
      return listToCollection(kb, obj['@list']);
    }

    return listToStatements(kb, obj);
  }

  if (Object.prototype.hasOwnProperty.call(obj, '@id')) {
    return kb.rdfFactory.namedNode(obj['@id']);
  }

  if (Object.prototype.hasOwnProperty.call(obj, '@language')) {
    return kb.rdfFactory.literal(obj['@value'], obj['@language']);
  }

  if (Object.prototype.hasOwnProperty.call(obj, '@type')) {
    return kb.rdfFactory.literal(obj['@value'], kb.rdfFactory.namedNode(obj['@type']));
  }

  if (Object.prototype.hasOwnProperty.call(obj, '@value')) {
    return kb.rdfFactory.literal(obj['@value']);
  }

  return kb.rdfFactory.literal(obj);
}
/**
 * Adds the statements in a json-ld list object to {kb}.
 */

function listToStatements(kb, obj) {
  var listId = obj['@id'] ? kb.rdfFactory.namedNode(obj['@id']) : kb.rdfFactory.blankNode();
  var items = obj['@list'].map(function (listItem) {
    return jsonldObjectToTerm(kb, listItem);
  });
  var statements = arrayToStatements(kb.rdfFactory, listId, items);
  kb.addAll(statements);
  return listId;
}

function listToCollection(kb, obj) {
  if (!Array.isArray(obj)) {
    throw new TypeError("Object must be an array");
  }

  return kb.rdfFactory.collection(obj.map(function (o) {
    return jsonldObjectToTerm(kb, o);
  }));
}
/**
 * Takes a json-ld formatted string {str} and adds its statements to {kb}.
 *
 * Ensure that {kb.rdfFactory} is a DataFactory.
 */


function jsonldParser(str, kb, base, callback) {
  var baseString = base && Object.prototype.hasOwnProperty.call(base, 'termType') ? base.value : base;
  return jsonld.flatten(JSON.parse(str), null, {
    base: baseString
  }).then(function (flattened) {
    return flattened.reduce(function (store, flatResource) {
      kb = processResource(kb, base, flatResource);
      return kb;
    }, kb);
  }).then(callback).catch(callback);
}

function processResource(kb, base, flatResource) {
  var id = flatResource['@id'] ? kb.rdfFactory.namedNode(flatResource['@id']) : kb.rdfFactory.blankNode();

  for (var _i = 0, _Object$keys = Object.keys(flatResource); _i < _Object$keys.length; _i++) {
    var property = _Object$keys[_i];

    if (property === '@id') {
      continue;
    } else if (property == '@graph') {
      // the JSON-LD flattened structure may contain nested graphs
      // the id value for this object is the new base (named graph id) for all nested flat resources
      var graphId = id; // this is an array of resources

      var nestedFlatResources = flatResource[property]; // recursively process all flat resources in the array, but with the graphId as base.

      for (var i = 0; i < nestedFlatResources.length; i++) {
        kb = processResource(kb, graphId, nestedFlatResources[i]);
      }
    }

    var value = flatResource[property];

    if (Array.isArray(value)) {
      for (var _i2 = 0; _i2 < value.length; _i2++) {
        kb.addStatement(createStatement(kb, id, property, value[_i2], base));
      }
    } else {
      kb.addStatement(createStatement(kb, id, property, value, base));
    }
  }

  return kb;
}
/**
 * Create statement quad depending on @type being a type node
 * @param kb
 * @param subject id
 * @param property
 * @param value
 * @return quad statement
 */


function createStatement(kb, id, property, value, base) {
  var predicate, object;

  if (property === "@type") {
    predicate = kb.rdfFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    object = kb.rdfFactory.namedNode(value);
  } else {
    predicate = kb.rdfFactory.namedNode(property);
    object = jsonldObjectToTerm(kb, value);
  }

  return kb.rdfFactory.quad(id, predicate, object, kb.rdfFactory.namedNode(base));
}

if (typeof Node$4 === 'undefined') {
  //  @@@@@@ Global. Interface to xmldom.
  var Node$4 = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

var RDFaProcessor = /*#__PURE__*/function () {
  function RDFaProcessor(kb, options) {
    _classCallCheck(this, RDFaProcessor);

    this.options = options || {};
    this.kb = kb;
    this.target = options.target || {
      graph: {
        subjects: {},
        prefixes: {},
        terms: {}
      }
    }; // XXX: Added to track bnodes

    this.blankNodes = []; // XXX: Added for normalisation

    this.htmlOptions = {
      'selfClosing': 'br img input area base basefont col colgroup source wbr isindex link meta param hr'
    };
    this.theOne = '_:' + new Date().getTime();
    this.language = null;
    this.vocabulary = null;
    this.blankCounter = 0;
    this.langAttributes = [{
      namespaceURI: 'http://www.w3.org/XML/1998/namespace',
      localName: 'lang'
    }];
    this.inXHTMLMode = false;
    this.absURIRE = /[\w\_\-]+:\S+/;
    this.finishedHandlers = [];
    this.init();
  }

  _createClass(RDFaProcessor, [{
    key: "addTriple",
    value: function addTriple(origin, subject, predicate, object) {
      var su, ob, pr, or;

      if (typeof subject === 'undefined') {
        su = CanonicalDataFactory.namedNode(this.options.base);
      } else {
        su = this.toRDFNodeObject(subject);
      }

      pr = this.toRDFNodeObject(predicate);
      ob = this.toRDFNodeObject(object);
      or = CanonicalDataFactory.namedNode(this.options.base); // console.log('Adding { ' + su + ' ' + pr + ' ' + ob + ' ' + or + ' }')

      this.kb.add(su, pr, ob, or);
    }
  }, {
    key: "ancestorPath",
    value: function ancestorPath(node) {
      var path = '';

      while (node && node.nodeType !== Node$4.DOCUMENT_NODE) {
        path = '/' + node.localName + path;
        node = node.parentNode;
      }

      return path;
    }
  }, {
    key: "copyMappings",
    value: function copyMappings(mappings) {
      var newMappings = {};

      for (var k in mappings) {
        newMappings[k] = mappings[k];
      }

      return newMappings;
    }
  }, {
    key: "copyProperties",
    value: function copyProperties() {}
  }, {
    key: "deriveDateTimeType",
    value: function deriveDateTimeType(value) {
      for (var i = 0; i < RDFaProcessor.dateTimeTypes.length; i++) {
        // console.log("Checking "+value+" against "+RDFaProcessor.dateTimeTypes[i].type)
        var matched = RDFaProcessor.dateTimeTypes[i].pattern.exec(value);

        if (matched && matched[0].length === value.length) {
          // console.log("Matched!")
          return RDFaProcessor.dateTimeTypes[i].type;
        }
      }

      return null;
    }
  }, {
    key: "init",
    value: function init() {}
  }, {
    key: "newBlankNode",
    value: function newBlankNode() {
      this.blankCounter++;
      return '_:' + this.blankCounter;
    }
  }, {
    key: "newSubjectOrigin",
    value: function newSubjectOrigin(origin, subject) {}
  }, {
    key: "parseCURIE",
    value: function parseCURIE(value, prefixes, base) {
      var colon = value.indexOf(':');
      var uri;

      if (colon >= 0) {
        var prefix = value.substring(0, colon);

        if (prefix === '') {
          // default prefix
          uri = prefixes[''];
          return uri ? uri + value.substring(colon + 1) : null;
        } else if (prefix === '_') {
          // blank node
          return '_:' + value.substring(colon + 1);
        } else if (RDFaProcessor.NCNAME.test(prefix)) {
          uri = prefixes[prefix];

          if (uri) {
            return uri + value.substring(colon + 1);
          }
        }
      }

      return null;
    }
  }, {
    key: "parseCURIEOrURI",
    value: function parseCURIEOrURI(value, prefixes, base) {
      var curie = this.parseCURIE(value, prefixes, base);

      if (curie) {
        return curie;
      }

      return this.resolveAndNormalize(base, value);
    }
  }, {
    key: "parsePredicate",
    value: function parsePredicate(value, defaultVocabulary, terms, prefixes, base, ignoreTerms) {
      if (value === '') {
        return null;
      }

      var predicate = this.parseTermOrCURIEOrAbsURI(value, defaultVocabulary, ignoreTerms ? null : terms, prefixes, base);

      if (predicate && predicate.indexOf('_:') === 0) {
        return null;
      }

      return predicate;
    }
  }, {
    key: "parsePrefixMappings",
    value: function parsePrefixMappings(str, target) {
      var values = this.tokenize(str);
      var prefix = null; // var uri = null

      for (var i = 0; i < values.length; i++) {
        if (values[i][values[i].length - 1] === ':') {
          prefix = values[i].substring(0, values[i].length - 1);
        } else if (prefix) {
          target[prefix] = this.options.base ? join(values[i], this.options.base) : values[i];
          prefix = null;
        }
      }
    }
  }, {
    key: "parseSafeCURIEOrCURIEOrURI",
    value: function parseSafeCURIEOrCURIEOrURI(value, prefixes, base) {
      value = this.trim(value);

      if (value.charAt(0) === '[' && value.charAt(value.length - 1) === ']') {
        value = value.substring(1, value.length - 1);
        value = value.trim(value);

        if (value.length === 0) {
          return null;
        }

        if (value === '_:') {
          // the one node
          return this.theOne;
        }

        return this.parseCURIE(value, prefixes, base);
      } else {
        return this.parseCURIEOrURI(value, prefixes, base);
      }
    }
  }, {
    key: "parseTermOrCURIEOrAbsURI",
    value: function parseTermOrCURIEOrAbsURI(value, defaultVocabulary, terms, prefixes, base) {
      // alert("Parsing "+value+" with default vocab "+defaultVocabulary)
      value = this.trim(value);
      var curie = this.parseCURIE(value, prefixes, base);

      if (curie) {
        return curie;
      } else if (terms) {
        if (defaultVocabulary && !this.absURIRE.exec(value)) {
          return defaultVocabulary + value;
        }

        var term = terms[value];

        if (term) {
          return term;
        }

        var lcvalue = value.toLowerCase();
        term = terms[lcvalue];

        if (term) {
          return term;
        }
      }

      if (this.absURIRE.exec(value)) {
        return this.resolveAndNormalize(base, value);
      }

      return null;
    }
  }, {
    key: "parseTermOrCURIEOrURI",
    value: function parseTermOrCURIEOrURI(value, defaultVocabulary, terms, prefixes, base) {
      // alert("Parsing "+value+" with default vocab "+defaultVocabulary)
      value = this.trim(value);
      var curie = this.parseCURIE(value, prefixes, base);

      if (curie) {
        return curie;
      } else {
        var term = terms[value];

        if (term) {
          return term;
        }

        var lcvalue = value.toLowerCase();
        term = terms[lcvalue];

        if (term) {
          return term;
        }

        if (defaultVocabulary && !this.absURIRE.exec(value)) {
          return defaultVocabulary + value;
        }
      }

      return this.resolveAndNormalize(base, value);
    }
  }, {
    key: "parseURI",
    value: function parseURI(uri) {
      return uri; // We just use strings as URIs, not objects now.
    }
  }, {
    key: "process",
    value: function process(node, options) {
      /*
      if (!window.console) {
         window.console = { log: function() {} }
      } */
      options = options || {};
      var base;

      if (node.nodeType === Node$4.DOCUMENT_NODE) {
        if (node.baseURI && !options.baseURI) {
          options.baseURI = node.baseURI; // be defensive as DOM implementations vary
        }

        base = node.baseURI;
        node = node.documentElement;

        if (!node.baseURI) {
          node.baseURI = base;
        }

        this.setContext(node);
      } else if (node.parentNode.nodeType === Node$4.DOCUMENT_NODE) {
        this.setContext(node);
      }

      var queue = []; // Fix for Firefox that includes the hash in the base URI

      var removeHash = function removeHash(baseURI) {
        // Fix for undefined baseURI property
        if (!baseURI && options && options.baseURI) {
          return options.baseURI;
        }

        var hash = baseURI.indexOf('#');

        if (hash >= 0) {
          baseURI = baseURI.substring(0, hash);
        }

        if (options && options.baseURIMap) {
          baseURI = options.baseURIMap(baseURI);
        }

        return baseURI;
      };

      queue.push({
        current: node,
        context: this.push(null, removeHash(node.baseURI))
      });

      while (queue.length > 0) {
        var item = queue.shift();

        if (item.parent) {
          // Sequence Step 14: list triple generation
          if (item.context.parent && item.context.parent.listMapping === item.listMapping) {
            // Skip a child context with exactly the same mapping
            continue;
          } // console.log("Generating lists for "+item.subject+", tag "+item.parent.localName)


          for (var _predicate in item.listMapping) {
            var list = item.listMapping[_predicate];

            if (list.length === 0) {
              this.addTriple(item.parent, item.subject, _predicate, {
                type: RDFaProcessor.objectURI,
                value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'
              });
              continue;
            }

            var bnodes = [];

            for (var _i = 0; _i < list.length; _i++) {
              bnodes.push(this.newBlankNode()); // this.newSubject(item.parent,bnodes[i])
            }

            for (var _i2 = 0; _i2 < bnodes.length; _i2++) {
              this.addTriple(item.parent, bnodes[_i2], 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first', list[_i2]);
              this.addTriple(item.parent, bnodes[_i2], 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest', {
                type: RDFaProcessor.objectURI,
                value: _i2 + 1 < bnodes.length ? bnodes[_i2 + 1] : 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'
              });
            }

            this.addTriple(item.parent, item.subject, _predicate, {
              type: RDFaProcessor.objectURI,
              value: bnodes[0]
            });
          }

          continue;
        }

        var current = item.current;
        var context = item.context; // console.log("Tag: "+current.localName+", listMapping="+JSON.stringify(context.listMapping))
        // Sequence Step 1

        var skip = false;
        var newSubject = null;
        var currentObjectResource = null;
        var typedResource = null;
        var prefixes = context.prefixes;
        var prefixesCopied = false;
        var incomplete = [];
        var listMapping = context.listMapping;
        var listMappingDifferent = !context.parent;
        var language = context.language;
        var vocabulary = context.vocabulary; // TODO: the "base" element may be used for HTML+RDFa 1.1

        base = this.parseURI(removeHash(current.baseURI));
        current.item = null; // Sequence Step 2: set the default vocabulary

        var vocabAtt = current.getAttributeNode('vocab');

        if (vocabAtt) {
          var value = this.trim(vocabAtt.value);

          if (value.length > 0) {
            vocabulary = value;
            var baseSubject = base.spec; // this.newSubject(current,baseSubject)

            this.addTriple(current, baseSubject, 'http://www.w3.org/ns/rdfa#usesVocabulary', {
              type: RDFaProcessor.objectURI,
              value: vocabulary
            });
          } else {
            vocabulary = this.vocabulary;
          }
        } // Sequence Step 3: IRI mappings
        // handle xmlns attributes


        for (var i = 0; i < current.attributes.length; i++) {
          var att = current.attributes[i]; // if (att.namespaceURI=="http://www.w3.org/2000/xmlns/") {

          if (att.nodeName.charAt(0) === 'x' && att.nodeName.indexOf('xmlns:') === 0) {
            if (!prefixesCopied) {
              prefixes = this.copyMappings(prefixes);
              prefixesCopied = true;
            }

            var prefix = att.nodeName.substring(6); // TODO: resolve relative?

            var ref = RDFaProcessor.trim(att.value);
            prefixes[prefix] = this.options.base ? join(ref, this.options.base) : ref;
          }
        } // Handle prefix mappings (@prefix)


        var prefixAtt = current.getAttributeNode('prefix');

        if (prefixAtt) {
          if (!prefixesCopied) {
            prefixes = this.copyMappings(prefixes);
            prefixesCopied = true;
          }

          this.parsePrefixMappings(prefixAtt.value, prefixes);
        } // Sequence Step 4: language


        var xmlLangAtt = null;

        for (var _i3 = 0; !xmlLangAtt && _i3 < this.langAttributes.length; _i3++) {
          xmlLangAtt = current.getAttributeNodeNS(this.langAttributes[_i3].namespaceURI, this.langAttributes[_i3].localName);
        }

        if (xmlLangAtt) {
          var _value = RDFaProcessor.trim(xmlLangAtt.value);

          if (_value.length > 0) {
            language = _value;
          } else {
            language = null;
          }
        }

        var relAtt = current.getAttributeNode('rel');
        var revAtt = current.getAttributeNode('rev');
        var typeofAtt = current.getAttributeNode('typeof');
        var propertyAtt = current.getAttributeNode('property');
        var datatypeAtt = current.getAttributeNode('datatype');
        var datetimeAtt = this.inHTMLMode ? current.getAttributeNode('datetime') : null;
        var contentAtt = current.getAttributeNode('content');
        var aboutAtt = current.getAttributeNode('about');
        var srcAtt = current.getAttributeNode('src');
        var resourceAtt = current.getAttributeNode('resource');
        var hrefAtt = current.getAttributeNode('href');
        var inlistAtt = current.getAttributeNode('inlist');
        var relAttPredicates = [];
        var predicate, values;

        if (relAtt) {
          values = this.tokenize(relAtt.value);

          for (var _i4 = 0; _i4 < values.length; _i4++) {
            predicate = this.parsePredicate(values[_i4], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt !== null);

            if (predicate) {
              relAttPredicates.push(predicate);
            }
          }
        }

        var revAttPredicates = [];

        if (revAtt) {
          values = this.tokenize(revAtt.value);

          for (var _i5 = 0; _i5 < values.length; _i5++) {
            predicate = this.parsePredicate(values[_i5], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt);

            if (predicate) {
              revAttPredicates.push(predicate);
            }
          }
        } // Section 3.1, bullet 7


        if (this.inHTMLMode && (relAtt || revAtt) && propertyAtt) {
          if (relAttPredicates.length === 0) {
            relAtt = null;
          }

          if (revAttPredicates.length === 0) {
            revAtt = null;
          }
        }

        if (relAtt || revAtt) {
          // Sequence Step 6: establish new subject and value
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);
          }

          if (typeofAtt) {
            typedResource = newSubject;
          }

          if (!newSubject) {
            if (current.parentNode.nodeType === Node$4.DOCUMENT_NODE) {
              newSubject = removeHash(current.baseURI);
            } else if (context.parentObject) {
              // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
              newSubject = removeHash(current.parentNode.baseURI) === context.parentObject ? removeHash(current.baseURI) : context.parentObject;
            }
          }

          if (resourceAtt) {
            currentObjectResource = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
          }

          if (!currentObjectResource) {
            if (hrefAtt) {
              currentObjectResource = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            } else if (srcAtt) {
              currentObjectResource = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            } else if (typeofAtt && !aboutAtt && !(this.inXHTMLMode && (current.localName === 'head' || current.localName === 'body'))) {
              currentObjectResource = this.newBlankNode();
            }
          }

          if (typeofAtt && !aboutAtt && this.inXHTMLMode && (current.localName === 'head' || current.localName === 'body')) {
            typedResource = newSubject;
          } else if (typeofAtt && !aboutAtt) {
            typedResource = currentObjectResource;
          }
        } else if (propertyAtt && !contentAtt && !datatypeAtt) {
          // Sequence Step 5.1: establish a new subject
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);

            if (typeofAtt) {
              typedResource = newSubject;
            }
          }

          if (!newSubject && current.parentNode.nodeType === Node$4.DOCUMENT_NODE) {
            newSubject = removeHash(current.baseURI);

            if (typeofAtt) {
              typedResource = newSubject;
            }
          } else if (!newSubject && context.parentObject) {
            // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
            newSubject = removeHash(current.parentNode.baseURI) === context.parentObject ? removeHash(current.baseURI) : context.parentObject;
          }

          if (typeofAtt && !typedResource) {
            if (resourceAtt) {
              typedResource = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
            }

            if (!typedResource && hrefAtt) {
              typedResource = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            }

            if (!typedResource && srcAtt) {
              typedResource = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            }

            if (!typedResource && (this.inXHTMLMode || this.inHTMLMode) && (current.localName === 'head' || current.localName === 'body')) {
              typedResource = newSubject;
            }

            if (!typedResource) {
              typedResource = this.newBlankNode();
            }

            currentObjectResource = typedResource;
          } // console.log(current.localName+", newSubject="+newSubject+", typedResource="+typedResource+", currentObjectResource="+currentObjectResource)

        } else {
          // Sequence Step 5.2: establish a new subject
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);
          }

          if (!newSubject && resourceAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
          }

          if (!newSubject && hrefAtt) {
            newSubject = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
          }

          if (!newSubject && srcAtt) {
            newSubject = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
          }

          if (!newSubject) {
            if (current.parentNode.nodeType === Node$4.DOCUMENT_NODE) {
              newSubject = removeHash(current.baseURI);
            } else if ((this.inXHTMLMode || this.inHTMLMode) && (current.localName === 'head' || current.localName === 'body')) {
              newSubject = removeHash(current.parentNode.baseURI) === context.parentObject ? removeHash(current.baseURI) : context.parentObject;
            } else if (typeofAtt) {
              newSubject = this.newBlankNode();
            } else if (context.parentObject) {
              // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
              newSubject = removeHash(current.parentNode.baseURI) === context.parentObject ? removeHash(current.baseURI) : context.parentObject;

              if (!propertyAtt) {
                skip = true;
              }
            }
          }

          if (typeofAtt) {
            typedResource = newSubject;
          }
        } // console.log(current.tagName+": newSubject="+newSubject+", currentObjectResource="+currentObjectResource+", typedResource="+typedResource+", skip="+skip)
        // var rdfaData = null


        if (newSubject) {
          // this.newSubject(current,newSubject)
          if (aboutAtt || resourceAtt || typedResource) {
            var id = newSubject;

            if (typeofAtt && !aboutAtt && !resourceAtt && currentObjectResource) {
              id = currentObjectResource;
            } // console.log("Setting data attribute for "+current.localName+" for subject "+id)


            this.newSubjectOrigin(current, id);
          }
        } // Sequence Step 7: generate type triple


        if (typedResource) {
          values = this.tokenize(typeofAtt.value);

          for (var _i6 = 0; _i6 < values.length; _i6++) {
            var object = this.parseTermOrCURIEOrAbsURI(values[_i6], vocabulary, context.terms, prefixes, base);

            if (object) {
              this.addTriple(current, typedResource, RDFaProcessor.typeURI, {
                type: RDFaProcessor.objectURI,
                value: object
              });
            }
          }
        } // Sequence Step 8: new list mappings if there is a new subject
        // console.log("Step 8: newSubject="+newSubject+", context.parentObject="+context.parentObject)


        if (newSubject && newSubject !== context.parentObject) {
          // console.log("Generating new list mapping for "+newSubject)
          listMapping = {};
          listMappingDifferent = true;
        } // Sequence Step 9: generate object triple


        if (currentObjectResource) {
          if (relAtt && inlistAtt) {
            for (var _i7 = 0; _i7 < relAttPredicates.length; _i7++) {
              var _list = listMapping[relAttPredicates[_i7]];

              if (!_list) {
                _list = [];
                listMapping[relAttPredicates[_i7]] = _list;
              }

              _list.push({
                type: RDFaProcessor.objectURI,
                value: currentObjectResource
              });
            }
          } else if (relAtt) {
            for (var _i8 = 0; _i8 < relAttPredicates.length; _i8++) {
              this.addTriple(current, newSubject, relAttPredicates[_i8], {
                type: RDFaProcessor.objectURI,
                value: currentObjectResource
              });
            }
          }

          if (revAtt) {
            for (var _i9 = 0; _i9 < revAttPredicates.length; _i9++) {
              this.addTriple(current, currentObjectResource, revAttPredicates[_i9], {
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            }
          }
        } else {
          // Sequence Step 10: incomplete triples
          if (newSubject && !currentObjectResource && (relAtt || revAtt)) {
            currentObjectResource = this.newBlankNode(); // alert(current.tagName+": generated blank node, newSubject="+newSubject+" currentObjectResource="+currentObjectResource)
          }

          if (relAtt && inlistAtt) {
            for (var _i10 = 0; _i10 < relAttPredicates.length; _i10++) {
              var _list2 = listMapping[relAttPredicates[_i10]];

              if (!_list2) {
                _list2 = [];
                listMapping[predicate] = _list2;
              } // console.log("Adding incomplete list for "+predicate)


              incomplete.push({
                predicate: relAttPredicates[_i10],
                list: _list2
              });
            }
          } else if (relAtt) {
            for (var _i11 = 0; _i11 < relAttPredicates.length; _i11++) {
              incomplete.push({
                predicate: relAttPredicates[_i11],
                forward: true
              });
            }
          }

          if (revAtt) {
            for (var _i12 = 0; _i12 < revAttPredicates.length; _i12++) {
              incomplete.push({
                predicate: revAttPredicates[_i12],
                forward: false
              });
            }
          }
        } // Step 11: Current property values


        if (propertyAtt) {
          var datatype = null;
          var content = null;

          if (datatypeAtt) {
            datatype = datatypeAtt.value === '' ? RDFaProcessor.PlainLiteralURI : this.parseTermOrCURIEOrAbsURI(datatypeAtt.value, vocabulary, context.terms, prefixes, base);

            if (datetimeAtt && !contentAtt) {
              content = datetimeAtt.value;
            } else {
              content = datatype === RDFaProcessor.XMLLiteralURI || datatype === RDFaProcessor.HTMLLiteralURI ? null : contentAtt ? contentAtt.value : current.textContent;
            }
          } else if (contentAtt) {
            datatype = RDFaProcessor.PlainLiteralURI;
            content = contentAtt.value;
          } else if (datetimeAtt) {
            content = datetimeAtt.value;
            datatype = RDFaProcessor.deriveDateTimeType(content);

            if (!datatype) {
              datatype = RDFaProcessor.PlainLiteralURI;
            }
          } else if (!relAtt && !revAtt) {
            if (resourceAtt) {
              content = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
            }

            if (!content && hrefAtt) {
              content = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            } else if (!content && srcAtt) {
              content = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            }

            if (content) {
              datatype = RDFaProcessor.objectURI;
            }
          }

          if (!datatype) {
            if (typeofAtt && !aboutAtt) {
              datatype = RDFaProcessor.objectURI;
              content = typedResource;
            } else {
              content = current.textContent;

              if (this.inHTMLMode && current.localName === 'time') {
                datatype = RDFaProcessor.deriveDateTimeType(content);
              }

              if (!datatype) {
                datatype = RDFaProcessor.PlainLiteralURI;
              }
            }
          }

          values = this.tokenize(propertyAtt.value);

          for (var _i13 = 0; _i13 < values.length; _i13++) {
            var _predicate2 = this.parsePredicate(values[_i13], vocabulary, context.terms, prefixes, base);

            if (_predicate2) {
              if (inlistAtt) {
                var _list3 = listMapping[_predicate2];

                if (!_list3) {
                  _list3 = [];
                  listMapping[_predicate2] = _list3;
                }

                _list3.push(datatype === RDFaProcessor.XMLLiteralURI || datatype === RDFaProcessor.HTMLLiteralURI ? {
                  type: datatype,
                  value: current.childNodes
                } : {
                  type: datatype || RDFaProcessor.PlainLiteralURI,
                  value: content,
                  language: language
                });
              } else {
                if (datatype === RDFaProcessor.XMLLiteralURI || datatype === RDFaProcessor.HTMLLiteralURI) {
                  this.addTriple(current, newSubject, _predicate2, {
                    type: datatype,
                    value: current.childNodes
                  });
                } else {
                  this.addTriple(current, newSubject, _predicate2, {
                    type: datatype || RDFaProcessor.PlainLiteralURI,
                    value: content,
                    language: language
                  }); // console.log(newSubject+" "+predicate+"="+content)
                }
              }
            }
          }
        } // Sequence Step 12: complete incomplete triples with new subject


        if (newSubject && !skip) {
          for (var _i14 = 0; _i14 < context.incomplete.length; _i14++) {
            if (context.incomplete[_i14].list) {
              // console.log("Adding subject "+newSubject+" to list for "+context.incomplete[i].predicate)
              // TODO: it is unclear what to do here
              context.incomplete[_i14].list.push({
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            } else if (context.incomplete[_i14].forward) {
              // console.log(current.tagName+": completing forward triple "+context.incomplete[i].predicate+" with object="+newSubject)
              this.addTriple(current, context.subject, context.incomplete[_i14].predicate, {
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            } else {
              // console.log(current.tagName+": completing reverse triple with object="+context.subject)
              this.addTriple(current, newSubject, context.incomplete[_i14].predicate, {
                type: RDFaProcessor.objectURI,
                value: context.subject
              });
            }
          }
        }

        var childContext = null;
        var listSubject = newSubject;

        if (skip) {
          // TODO: should subject be null?
          childContext = this.push(context, context.subject); // TODO: should the entObject be passed along?  If not, then intermediary children will keep properties from being associated with incomplete triples.
          // TODO: Verify: if the current baseURI has changed and the parentObject is the parent's base URI, then the baseURI should change

          childContext.parentObject = removeHash(current.parentNode.baseURI) === context.parentObject ? removeHash(current.baseURI) : context.parentObject;
          childContext.incomplete = context.incomplete;
          childContext.language = language;
          childContext.prefixes = prefixes;
          childContext.vocabulary = vocabulary;
        } else {
          childContext = this.push(context, newSubject);
          childContext.parentObject = currentObjectResource || newSubject || context.subject;
          childContext.prefixes = prefixes;
          childContext.incomplete = incomplete;

          if (currentObjectResource) {
            // console.log("Generating new list mapping for "+currentObjectResource)
            listSubject = currentObjectResource;
            listMapping = {};
            listMappingDifferent = true;
          }

          childContext.listMapping = listMapping;
          childContext.language = language;
          childContext.vocabulary = vocabulary;
        }

        if (listMappingDifferent) {
          // console.log("Pushing list parent "+current.localName)
          queue.unshift({
            parent: current,
            context: context,
            subject: listSubject,
            listMapping: listMapping
          });
        }

        for (var child = current.lastChild; child; child = child.previousSibling) {
          if (child.nodeType === Node$4.ELEMENT_NODE) {
            // console.log("Pushing child "+child.localName)
            // child.baseURI = current.baseURI
            queue.unshift({
              current: child,
              context: childContext
            });
          }
        }
      }

      if (this.inHTMLMode) {
        this.copyProperties();
      }

      for (var _i15 = 0; _i15 < this.finishedHandlers.length; _i15++) {
        this.finishedHandlers[_i15](node);
      }
    }
  }, {
    key: "push",
    value: function push(parent, subject) {
      return {
        parent: parent,
        subject: subject || (parent ? parent.subject : null),
        parentObject: null,
        incomplete: [],
        listMapping: parent ? parent.listMapping : {},
        language: parent ? parent.language : this.language,
        prefixes: parent ? parent.prefixes : this.target.graph.prefixes,
        terms: parent ? parent.terms : this.target.graph.terms,
        vocabulary: parent ? parent.vocabulary : this.vocabulary
      };
    }
  }, {
    key: "resolveAndNormalize",
    value: function resolveAndNormalize(base, uri$1) {
      // console.log("Joining " + uri + " to " + base + " making " +  Uri.join(uri, base))
      return join(uri$1, base); // @@ normalize?
    }
  }, {
    key: "setContext",
    value: function setContext(node) {
      // We only recognized XHTML+RDFa 1.1 if the version is set propertyly
      if (node.localName === 'html' && node.getAttribute('version') === 'XHTML+RDFa 1.1') {
        this.setXHTMLContext();
      } else if (node.localName === 'html' || node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        if (typeof document !== 'undefined' && document.doctype) {
          if (document.doctype.publicId === '-//W3C//DTD XHTML+RDFa 1.0//EN' && document.doctype.systemId === 'http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd') {
            console.log('WARNING: RDF 1.0 is not supported.  Defaulting to HTML5 mode.');
            this.setHTMLContext();
          } else if (document.doctype.publicId === '-//W3C//DTD XHTML+RDFa 1.1//EN' && document.doctype.systemId === 'http://www.w3.org/MarkUp/DTD/xhtml-rdfa-2.dtd') {
            this.setXHTMLContext();
          } else {
            this.setHTMLContext();
          }
        } else {
          this.setHTMLContext();
        }
      } else {
        this.setXMLContext();
      }
    }
  }, {
    key: "setHTMLContext",
    value: function setHTMLContext() {
      this.setInitialContext();
      this.langAttributes = [{
        namespaceURI: 'http://www.w3.org/XML/1998/namespace',
        localName: 'lang'
      }, {
        namespaceURI: null,
        localName: 'lang'
      }];
      this.inXHTMLMode = false;
      this.inHTMLMode = true;
    }
  }, {
    key: "setInitialContext",
    value: function setInitialContext() {
      this.vocabulary = null; // By default, the prefixes are terms are loaded to the RDFa 1.1. standard within the graph constructor

      this.langAttributes = [{
        namespaceURI: 'http://www.w3.org/XML/1998/namespace',
        localName: 'lang'
      }];
    }
  }, {
    key: "setXHTMLContext",
    value: function setXHTMLContext() {
      this.setInitialContext();
      this.inXHTMLMode = true;
      this.inHTMLMode = false;
      this.langAttributes = [{
        namespaceURI: 'http://www.w3.org/XML/1998/namespace',
        localName: 'lang'
      }, {
        namespaceURI: null,
        localName: 'lang'
      }]; // From http://www.w3.org/2011/rdfa-context/xhtml-rdfa-1.1

      this.target.graph.terms['alternate'] = 'http://www.w3.org/1999/xhtml/vocab#alternate';
      this.target.graph.terms['appendix'] = 'http://www.w3.org/1999/xhtml/vocab#appendix';
      this.target.graph.terms['bookmark'] = 'http://www.w3.org/1999/xhtml/vocab#bookmark';
      this.target.graph.terms['cite'] = 'http://www.w3.org/1999/xhtml/vocab#cite';
      this.target.graph.terms['chapter'] = 'http://www.w3.org/1999/xhtml/vocab#chapter';
      this.target.graph.terms['contents'] = 'http://www.w3.org/1999/xhtml/vocab#contents';
      this.target.graph.terms['copyright'] = 'http://www.w3.org/1999/xhtml/vocab#copyright';
      this.target.graph.terms['first'] = 'http://www.w3.org/1999/xhtml/vocab#first';
      this.target.graph.terms['glossary'] = 'http://www.w3.org/1999/xhtml/vocab#glossary';
      this.target.graph.terms['help'] = 'http://www.w3.org/1999/xhtml/vocab#help';
      this.target.graph.terms['icon'] = 'http://www.w3.org/1999/xhtml/vocab#icon';
      this.target.graph.terms['index'] = 'http://www.w3.org/1999/xhtml/vocab#index';
      this.target.graph.terms['last'] = 'http://www.w3.org/1999/xhtml/vocab#last';
      this.target.graph.terms['license'] = 'http://www.w3.org/1999/xhtml/vocab#license';
      this.target.graph.terms['meta'] = 'http://www.w3.org/1999/xhtml/vocab#meta';
      this.target.graph.terms['next'] = 'http://www.w3.org/1999/xhtml/vocab#next';
      this.target.graph.terms['prev'] = 'http://www.w3.org/1999/xhtml/vocab#prev';
      this.target.graph.terms['previous'] = 'http://www.w3.org/1999/xhtml/vocab#previous';
      this.target.graph.terms['section'] = 'http://www.w3.org/1999/xhtml/vocab#section';
      this.target.graph.terms['stylesheet'] = 'http://www.w3.org/1999/xhtml/vocab#stylesheet';
      this.target.graph.terms['subsection'] = 'http://www.w3.org/1999/xhtml/vocab#subsection';
      this.target.graph.terms['start'] = 'http://www.w3.org/1999/xhtml/vocab#start';
      this.target.graph.terms['top'] = 'http://www.w3.org/1999/xhtml/vocab#top';
      this.target.graph.terms['up'] = 'http://www.w3.org/1999/xhtml/vocab#up';
      this.target.graph.terms['p3pv1'] = 'http://www.w3.org/1999/xhtml/vocab#p3pv1'; // other

      this.target.graph.terms['related'] = 'http://www.w3.org/1999/xhtml/vocab#related';
      this.target.graph.terms['role'] = 'http://www.w3.org/1999/xhtml/vocab#role';
      this.target.graph.terms['transformation'] = 'http://www.w3.org/1999/xhtml/vocab#transformation';
    }
  }, {
    key: "setXMLContext",
    value: function setXMLContext() {
      this.setInitialContext();
      this.inXHTMLMode = false;
      this.inHTMLMode = false;
    }
  }, {
    key: "tokenize",
    value: function tokenize(str) {
      return this.trim(str).split(/\s+/);
    }
  }, {
    key: "toRDFNodeObject",
    value: function toRDFNodeObject(x) {
      var _this = this;

      if (typeof x === 'undefined') return undefined;

      if (typeof x === 'string') {
        if (x.substring(0, 2) === '_:') {
          if (typeof this.blankNodes[x.substring(2)] === 'undefined') {
            this.blankNodes[x.substring(2)] = new BlankNode(x.substring(2));
          }

          return this.blankNodes[x.substring(2)];
        }

        return CanonicalDataFactory.namedNode(x);
      }

      switch (x.type) {
        case RDFaProcessor.objectURI:
          if (x.value.substring(0, 2) === '_:') {
            if (typeof this.blankNodes[x.value.substring(2)] === 'undefined') {
              this.blankNodes[x.value.substring(2)] = new BlankNode(x.value.substring(2));
            }

            return this.blankNodes[x.value.substring(2)];
          }

          return CanonicalDataFactory.namedNode(x.value);

        case RDFaProcessor.PlainLiteralURI:
          return new Literal(x.value, x.language || '');

        case RDFaProcessor.XMLLiteralURI:
        case RDFaProcessor.HTMLLiteralURI:
          var string = '';
          Object.keys(x.value).forEach(function (i) {
            string += domToString(x.value[i], _this.htmlOptions);
          });
          return new Literal(string, '', new NamedNode(x.type));

        default:
          return new Literal(x.value, '', new NamedNode(x.type));
      }
    }
  }, {
    key: "trim",
    value: function trim(str) {
      return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
  }], [{
    key: "parseRDFaDOM",
    value: function parseRDFaDOM(dom, kb, base) {
      var p = new RDFaProcessor(kb, {
        'base': base
      }); //  Cannot assign to read only property 'baseURI' of object '#<XMLDocument>':

      if (!dom.baseURI) {
        // Note this became a read-only attribute some time before 2018
        dom.baseURI = base; // oinly set if not already set
      }

      p.process(dom, {
        baseURI: base
      });
    }
  }, {
    key: "tokenize",
    value: function tokenize(str) {
      return this.trim(str).split(/\s+/);
    }
  }, {
    key: "trim",
    value: function trim(str) {
      return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
  }]);

  return RDFaProcessor;
}();
RDFaProcessor.XMLLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral';
RDFaProcessor.HTMLLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML';
RDFaProcessor.PlainLiteralURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
RDFaProcessor.objectURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';
RDFaProcessor.typeURI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
RDFaProcessor.nameChar = "[-A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF.0-9\xB7\u0300-\u036F\u203F-\u2040]";
RDFaProcessor.nameStartChar = "[A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\xFF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_]";
RDFaProcessor.NCNAME = new RegExp('^' + RDFaProcessor.nameStartChar + RDFaProcessor.nameChar + '*$');
/*
RDFaProcessor.prototype.resolveAndNormalize = function(base,href) {
   var u = base.resolve(href)
   var parsed = this.parseURI(u)
   parsed.normalize()
   return parsed.spec
}
*/

RDFaProcessor.dateTimeTypes = [{
  pattern: /-?P(?:[0-9]+Y)?(?:[0-9]+M)?(?:[0-9]+D)?(?:T(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+(?:\.[0-9]+)?S)?)?/,
  type: 'http://www.w3.org/2001/XMLSchema#duration'
}, {
  pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9]T(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
  type: 'http://www.w3.org/2001/XMLSchema#dateTime'
}, {
  pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9](?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
  type: 'http://www.w3.org/2001/XMLSchema#date'
}, {
  pattern: /(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
  type: 'http://www.w3.org/2001/XMLSchema#time'
}, {
  pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]/,
  type: 'http://www.w3.org/2001/XMLSchema#gYearMonth'
}, {
  pattern: /-?[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9]/,
  type: 'http://www.w3.org/2001/XMLSchema#gYear'
}];
var parseRDFaDOM = RDFaProcessor.parseRDFaDOM;

var RDFParser = /*#__PURE__*/function () {
  /*
   * @constructor
   * @param {RDFStore} store An RDFStore object
   */
  function RDFParser(store) {
    _classCallCheck(this, RDFParser);

    /** Our triple store reference @private */
    this.store = store;
    /** Our identified blank nodes @private */

    this.bnodes = {};
    /** A context for context-aware stores @private */

    this.why = null;
    /** Reification flag */

    this.reify = false;
  }
  /** Standard namespaces that we know how to handle @final
   *  @member RDFParser
   */


  _createClass(RDFParser, [{
    key: "frameFactory",
    value:
    /**
     * Frame class for namespace and base URI lookups
     * Base lookups will always resolve because the parser knows
     * the default base.
     *
     * @private
     */
    function frameFactory(parser, parent, element) {
      return {
        'NODE': 1,
        'ARC': 2,
        'parent': parent,
        'parser': parser,
        'store': parser.store,
        'element': element,
        'lastChild': 0,
        'base': null,
        'lang': null,
        'node': null,
        'nodeType': null,
        'listIndex': 1,
        'rdfid': null,
        'datatype': null,
        'collection': false,

        /** Terminate the frame and notify the store that we're done */
        'terminateFrame': function terminateFrame() {
          if (this.collection) {
            this.node.close();
          }
        },

        /** Add a symbol of a certain type to the this frame */
        'addSymbol': function addSymbol(type, uri$1) {
          uri$1 = join(uri$1, this.base);
          this.node = this.store.sym(uri$1);
          this.nodeType = type;
        },

        /** Load any constructed triples into the store */
        'loadTriple': function loadTriple() {
          if (this.parent.parent.collection) {
            this.parent.parent.node.append(this.node);
          } else {
            this.store.add(this.parent.parent.node, this.parent.node, this.node, this.parser.why);
          }

          if (this.parent.rdfid != null) {
            // reify
            var triple = this.store.sym(join('#' + this.parent.rdfid, this.base));
            this.store.add(triple, this.store.sym(RDFParser.ns.RDF + 'type'), this.store.sym(RDFParser.ns.RDF + 'Statement'), this.parser.why);
            this.store.add(triple, this.store.sym(RDFParser.ns.RDF + 'subject'), this.parent.parent.node, this.parser.why);
            this.store.add(triple, this.store.sym(RDFParser.ns.RDF + 'predicate'), this.parent.node, this.parser.why);
            this.store.add(triple, this.store.sym(RDFParser.ns.RDF + 'object'), this.node, this.parser.why);
          }
        },

        /** Check if it's OK to load a triple */
        'isTripleToLoad': function isTripleToLoad() {
          return this.parent != null && this.parent.parent != null && this.nodeType === this.NODE && this.parent.nodeType === this.ARC && this.parent.parent.nodeType === this.NODE;
        },

        /** Add a symbolic node to this frame */
        'addNode': function addNode(uri) {
          this.addSymbol(this.NODE, uri);

          if (this.isTripleToLoad()) {
            this.loadTriple();
          }
        },

        /** Add a collection node to this frame */
        'addCollection': function addCollection() {
          this.nodeType = this.NODE;
          this.node = this.store.collection();
          this.collection = true;

          if (this.isTripleToLoad()) {
            this.loadTriple();
          }
        },

        /** Add a collection arc to this frame */
        'addCollectionArc': function addCollectionArc() {
          this.nodeType = this.ARC;
        },

        /** Add a bnode to this frame */
        'addBNode': function addBNode(id) {
          if (id != null) {
            if (this.parser.bnodes[id] != null) {
              this.node = this.parser.bnodes[id];
            } else {
              this.node = this.parser.bnodes[id] = this.store.bnode();
            }
          } else {
            this.node = this.store.bnode();
          }

          this.nodeType = this.NODE;

          if (this.isTripleToLoad()) {
            this.loadTriple();
          }
        },

        /** Add an arc or property to this frame */
        'addArc': function addArc(uri) {
          if (uri === RDFParser.ns.RDF + 'li') {
            uri = RDFParser.ns.RDF + '_' + this.parent.listIndex;
            this.parent.listIndex++;
          }

          this.addSymbol(this.ARC, uri);
        },

        /** Add a literal to this frame */
        'addLiteral': function addLiteral(value) {
          if (this.parent.datatype && this.parent.datatype !== RDFParser.ns.RDF + 'langString') {
            this.node = this.store.literal(value, this.store.sym(this.parent.datatype));
          } else {
            this.node = this.store.literal(value, this.lang);
          }

          this.nodeType = this.NODE;

          if (this.isTripleToLoad()) {
            this.loadTriple();
          }
        }
      };
    } // from the OpenLayers source .. needed to get around IE problems.

  }, {
    key: "getAttributeNodeNS",
    value: function getAttributeNodeNS(node, uri, name) {
      var attributeNode = null;

      if (node.getAttributeNodeNS) {
        attributeNode = node.getAttributeNodeNS(uri, name);
      } else {
        var attributes = node.attributes;
        var potentialNode, fullName;

        for (var i = 0; i < attributes.length; ++i) {
          potentialNode = attributes[i];

          if (potentialNode.namespaceURI === uri) {
            fullName = potentialNode.prefix ? potentialNode.prefix + ':' + name : name;

            if (fullName === potentialNode.nodeName) {
              attributeNode = potentialNode;
              break;
            }
          }
        }
      }

      return attributeNode;
    }
    /**
     * Build our initial scope frame and parse the DOM into triples
     * @param {HTMLDocument} document The DOM to parse
     * @param {String} base The base URL to use
     * @param {Object} why The context to which this resource belongs
     */

  }, {
    key: "parse",
    value: function parse(document, base, why) {
      var children = document.childNodes; // clean up for the next run

      this.cleanParser(); // figure out the root element

      var root;

      if (document.nodeType === RDFParser.nodeType.DOCUMENT) {
        for (var c = 0; c < children.length; c++) {
          if (children[c].nodeType === RDFParser.nodeType.ELEMENT) {
            root = children[c];
            break;
          }
        }
      } else if (document.nodeType === RDFParser.nodeType.ELEMENT) {
        root = document;
      } else {
        throw new Error("RDFParser: can't find root in " + base + '. Halting. '); // return false
      }

      this.why = why; // our topmost frame

      var f = this.frameFactory(this);
      this.base = base;
      f.base = base;
      f.lang = null; // was '' but can't have langs like that 2015 (!)

      this.parseDOM(this.buildFrame(f, root));
      return true;
    }
  }, {
    key: "parseDOM",
    value: function parseDOM(frame) {
      // a DOM utility function used in parsing
      var rdfid;

      var elementURI = function (el) {
        var result = '';

        if (el.namespaceURI == null) {
          throw new Error('RDF/XML syntax error: No namespace for ' + el.localName + ' in ' + this.base);
        }

        if (el.namespaceURI) {
          result = result + el.namespaceURI;
        }

        if (el.localName) {
          result = result + el.localName;
        } else if (el.nodeName) {
          if (el.nodeName.indexOf(':') >= 0) result = result + el.nodeName.split(':')[1];else result = result + el.nodeName;
        }

        return result;
      }.bind(this);

      var dig = true; // if we'll dig down in the tree on the next iter

      while (frame.parent) {
        var dom = frame.element;
        var attrs = dom.attributes;

        if (dom.nodeType === RDFParser.nodeType.TEXT || dom.nodeType === RDFParser.nodeType.CDATA_SECTION) {
          // we have a literal
          if (frame.parent.nodeType === frame.NODE) {
            // must have had attributes, store as rdf:value
            frame.addArc(RDFParser.ns.RDF + 'value');
            frame = this.buildFrame(frame);
          }

          frame.addLiteral(dom.nodeValue);
        } else if (elementURI(dom) !== RDFParser.ns.RDF + 'RDF') {
          // not root
          if (frame.parent && frame.parent.collection) {
            // we're a collection element
            frame.addCollectionArc();
            frame = this.buildFrame(frame, frame.element);
            frame.parent.element = null;
          }

          if (!frame.parent || !frame.parent.nodeType || frame.parent.nodeType === frame.ARC) {
            // we need a node
            var about = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'about');
            rdfid = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'ID');

            if (about && rdfid) {
              throw new Error('RDFParser: ' + dom.nodeName + ' has both rdf:id and rdf:about.' + ' Halting. Only one of these' + ' properties may be specified on a' + ' node.');
            }

            if (!about && rdfid) {
              frame.addNode('#' + rdfid.nodeValue);
              dom.removeAttributeNode(rdfid);
            } else if (about == null && rdfid == null) {
              var bnid = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'nodeID');

              if (bnid) {
                frame.addBNode(bnid.nodeValue);
                dom.removeAttributeNode(bnid);
              } else {
                frame.addBNode();
              }
            } else {
              frame.addNode(about.nodeValue);
              dom.removeAttributeNode(about);
            } // Typed nodes


            var rdftype = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'type');

            if (RDFParser.ns.RDF + 'Description' !== elementURI(dom)) {
              rdftype = {
                'nodeValue': elementURI(dom)
              };
            }

            if (rdftype != null) {
              this.store.add(frame.node, this.store.sym(RDFParser.ns.RDF + 'type'), this.store.sym(join(rdftype.nodeValue, frame.base)), this.why);

              if (rdftype.nodeName) {
                dom.removeAttributeNode(rdftype);
              }
            } // Property Attributes


            for (var x = attrs.length - 1; x >= 0; x--) {
              this.store.add(frame.node, this.store.sym(elementURI(attrs[x])), this.store.literal(attrs[x].nodeValue, frame.lang), this.why);
            }
          } else {
            // we should add an arc (or implicit bnode+arc)
            frame.addArc(elementURI(dom)); // save the arc's rdf:ID if it has one

            if (this.reify) {
              rdfid = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'ID');

              if (rdfid) {
                frame.rdfid = rdfid.nodeValue;
                dom.removeAttributeNode(rdfid);
              }
            }

            var parsetype = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'parseType');
            var datatype = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'datatype');

            if (datatype) {
              frame.datatype = datatype.nodeValue;
              dom.removeAttributeNode(datatype);
            }

            if (parsetype) {
              var nv = parsetype.nodeValue;

              if (nv === 'Literal') {
                frame.datatype = RDFParser.ns.RDF + 'XMLLiteral';
                frame = this.buildFrame(frame); // Don't include the literal node, only its children

                frame.addLiteral(dom.childNodes);
                dig = false;
              } else if (nv === 'Resource') {
                frame = this.buildFrame(frame, frame.element);
                frame.parent.element = null;
                frame.addBNode();
              } else if (nv === 'Collection') {
                frame = this.buildFrame(frame, frame.element);
                frame.parent.element = null;
                frame.addCollection();
              }

              dom.removeAttributeNode(parsetype);
            }

            if (attrs.length !== 0) {
              var resource = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'resource');
              var bnid2 = this.getAttributeNodeNS(dom, RDFParser.ns.RDF, 'nodeID');
              frame = this.buildFrame(frame);

              if (resource) {
                frame.addNode(resource.nodeValue);
                dom.removeAttributeNode(resource);
              } else {
                if (bnid2) {
                  frame.addBNode(bnid2.nodeValue);
                  dom.removeAttributeNode(bnid2);
                } else {
                  frame.addBNode();
                }
              }

              for (var x1 = attrs.length - 1; x1 >= 0; x1--) {
                var f = this.buildFrame(frame);
                f.addArc(elementURI(attrs[x1]));

                if (elementURI(attrs[x1]) === RDFParser.ns.RDF + 'type') {
                  this.buildFrame(f).addNode(attrs[x1].nodeValue);
                } else {
                  this.buildFrame(f).addLiteral(attrs[x1].nodeValue);
                }
              }
            } else if (dom.childNodes.length === 0) {
              this.buildFrame(frame).addLiteral('');
            }
          }
        } // rdf:RDF
        // dig dug


        dom = frame.element;

        while (frame.parent) {
          var pframe = frame;

          while (dom == null) {
            frame = frame.parent;
            dom = frame.element;
          }

          var candidate = dom.childNodes && dom.childNodes[frame.lastChild];

          if (!candidate || !dig) {
            frame.terminateFrame();

            if (!(frame = frame.parent)) {
              break;
            } // done


            dom = frame.element;
            dig = true;
          } else if (candidate.nodeType !== RDFParser.nodeType.ELEMENT && candidate.nodeType !== RDFParser.nodeType.TEXT && candidate.nodeType !== RDFParser.nodeType.CDATA_SECTION || (candidate.nodeType === RDFParser.nodeType.TEXT || candidate.nodeType === RDFParser.nodeType.CDATA_SECTION) && dom.childNodes.length !== 1) {
            frame.lastChild++;
          } else {
            // not a leaf
            frame.lastChild++;
            frame = this.buildFrame(pframe, dom.childNodes[frame.lastChild - 1]);
            break;
          }
        }
      } // while

    }
    /**
     * Cleans out state from a previous parse run
     * @private
     */

  }, {
    key: "cleanParser",
    value: function cleanParser() {
      this.bnodes = {};
      this.why = null;
    }
    /**
     * Builds scope frame
     * @private
     */

  }, {
    key: "buildFrame",
    value: function buildFrame(parent, element) {
      var frame = this.frameFactory(this, parent, element);

      if (parent) {
        frame.base = parent.base;
        frame.lang = parent.lang;
      }

      if (!element || element.nodeType === RDFParser.nodeType.TEXT || element.nodeType === RDFParser.nodeType.CDATA_SECTION) {
        return frame;
      }

      var attrs = element.attributes;
      var base = element.getAttributeNode('xml:base');

      if (base != null) {
        frame.base = base.nodeValue;
        element.removeAttribute('xml:base');
      }

      var lang = element.getAttributeNode('xml:lang');

      if (lang != null) {
        frame.lang = lang.nodeValue;
        element.removeAttribute('xml:lang');
      } // remove all extraneous xml and xmlns attributes


      for (var x = attrs.length - 1; x >= 0; x--) {
        if (attrs[x].nodeName.substr(0, 3) === 'xml') {
          if (attrs[x].name.slice(0, 6) === 'xmlns:') {
            var uri$1 = attrs[x].nodeValue; // alert('base for namespac attr:'+this.base)

            if (this.base) uri$1 = join(uri$1, this.base);
            this.store.setPrefixForURI(attrs[x].name.slice(6), uri$1);
          } //		alert('rdfparser: xml atribute: '+attrs[x].name) //@@


          element.removeAttributeNode(attrs[x]);
        }
      }

      return frame;
    }
  }]);

  return RDFParser;
}();

_defineProperty(RDFParser, "ns", {
  'RDF': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'RDFS': 'http://www.w3.org/2000/01/rdf-schema#'
});

_defineProperty(RDFParser, "nodeType", {
  'ELEMENT': 1,
  'ATTRIBUTE': 2,
  'TEXT': 3,
  'CDATA_SECTION': 4,
  'ENTITY_REFERENCE': 5,
  'ENTITY': 6,
  'PROCESSING_INSTRUCTION': 7,
  'COMMENT': 8,
  'DOCUMENT': 9,
  'DOCUMENT_TYPE': 10,
  'DOCUMENT_FRAGMENT': 11,
  'NOTATION': 12
});

// Parse a simple SPARL-Update subset syntax for patches.
function sparqlUpdateParser(str, kb, base) {
  var i, j, k;
  var keywords = ['INSERT', 'DELETE', 'WHERE'];
  var SQNS = Namespace('http://www.w3.org/ns/pim/patch#');
  var p = createSinkParser(kb, kb, base, base, null, null, '', null);
  var clauses = {};

  var badSyntax = function badSyntax(uri, lines, str, i, why) {
    return 'Line ' + (lines + 1) + ' of <' + uri + '>: Bad syntax:\n   ' + why + '\n   at: "' + str.slice(i, i + 30) + '"';
  }; // var check = function (next, last, message) {
  //   if (next < 0) {
  //     throw badSyntax(p._thisDoc, p.lines, str, j, last, message)
  //   }
  //   return next
  // }


  i = 0;
  var query = kb.sym(base + '#query'); // Invent a URI for the query

  clauses['query'] = query; // A way of accessing it in its N3 model.

  while (true) {
    // console.log("A Now at i = " + i)
    j = p.skipSpace(str, i);

    if (j < 0) {
      return clauses;
    } // console.log("B After space at j= " + j)


    if (str[j] === ';') {
      i = p.skipSpace(str, j + 1);

      if (i < 0) {
        return clauses; // Allow end in a
      }

      j = i;
    }

    var found = false;

    for (k = 0; k < keywords.length; k++) {
      var key = keywords[k];

      if (str.slice(j, j + key.length) === key) {
        i = p.skipSpace(str, j + key.length);

        if (i < 0) {
          throw badSyntax(p._thisDoc, p.lines, str, j + key.length, 'found EOF, needed {...} after ' + key);
        }

        if ((key === 'INSERT' || key === 'DELETE') && str.slice(i, i + 4) === 'DATA') {
          // Some wanted 'DATA'. Whatever
          j = p.skipSpace(str, i + 4);

          if (j < 0) {
            throw badSyntax(p._thisDoc, p.lines, str, i + 4, 'needed {...} after INSERT DATA ' + key);
          }

          i = j;
        }

        var res2 = [];
        j = p.node(str, i, res2); // Parse all the complexity of the clause

        if (j < 0) {
          throw badSyntax(p._thisDoc, p.lines, str, i, 'bad syntax or EOF in {...} after ' + key);
        }

        clauses[key.toLowerCase()] = res2[0];
        kb.add(query, SQNS(key.toLowerCase()), res2[0]); // , kb.sym(base)
        // key is the keyword and res2 has the contents

        found = true;
        i = j;
      }
    }

    if (!found && str.slice(j, j + 7) === '@prefix') {
      i = p.directive(str, j);

      if (i < 0) {
        throw badSyntax(p._thisDoc, p.lines, str, i, 'bad syntax or EOF after @prefix ');
      } // console.log("P before dot i= " + i)


      i = p.checkDot(str, i); // console.log("Q after dot i= " + i)

      found = true;
    }

    if (!found) {
      // console.log("Bad syntax " + j)
      throw badSyntax(p._thisDoc, p.lines, str, j, "Unknown syntax at start of statememt: '" + str.slice(j).slice(0, 20) + "'");
    }
  } // while
  // return clauses

}

/**
 * Parse a string and put the result into the graph kb.
 * Normal method is sync.
 * Unfortunately jsdonld is currently written to need to be called async.
 * Hence the mess below with executeCallback.
 * @param str - The input string to parse
 * @param kb - The store to use
 * @param base - The base URI to use
 * @param contentType - The MIME content type string for the input - defaults to text/turtle
 * @param [callback] - The callback to call when the data has been loaded
 */
function parse$1(str, kb, base) {
  var contentType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'text/turtle';
  var callback = arguments.length > 4 ? arguments[4] : undefined;
  contentType = contentType || TurtleContentType;
  contentType = contentType.split(';')[0];

  try {
    if (contentType === N3ContentType || contentType === TurtleContentType) {
      var p = createSinkParser(kb, kb, base, base, null, null, '', null);
      p.loadBuf(str);
      executeCallback();
    } else if (contentType === RDFXMLContentType) {
      var parser = new RDFParser(kb);
      parser.parse(parseXML(str), base, kb.sym(base));
      executeCallback();
    } else if (contentType === XHTMLContentType) {
      parseRDFaDOM(parseXML(str, {
        contentType: XHTMLContentType
      }), kb, base);
      executeCallback();
    } else if (contentType === HTMLContentType) {
      parseRDFaDOM(parseXML(str, {
        contentType: HTMLContentType
      }), kb, base);
      executeCallback();
    } else if (contentType === SPARQLUpdateContentType || contentType === SPARQLUpdateSingleMatchContentType) {
      // @@ we handle a subset
      sparqlUpdateParser(str, kb, base);
      executeCallback();
    } else if (contentType === JSONLDContentType) {
      jsonldParser(str, kb, base, executeCallback);
    } else if (contentType === NQuadsContentType || contentType === NQuadsAltContentType) {
      var n3Parser = new N3Parser({
        factory: ExtendedTermFactory
      });
      nquadCallback(null, str);
    } else if (contentType === undefined) {
      throw new Error("contentType is undefined");
    } else {
      throw new Error("Don't know how to parse " + contentType + ' yet');
    }
  } catch (e) {
    // @ts-ignore
    executeErrorCallback(e);
  }

  parse$1.handled = {
    'text/n3': true,
    'text/turtle': true,
    'application/rdf+xml': true,
    'application/xhtml+xml': true,
    'text/html': true,
    'application/sparql-update': true,
    'application/sparql-update-single-match': true,
    'application/ld+json': true,
    'application/nquads': true,
    'application/n-quads': true
  };

  function executeCallback() {
    if (callback) {
      callback(null, kb);
    } else {
      return;
    }
  }

  function executeErrorCallback(e) {
    if ( // TODO: Always true, what is the right behavior
    contentType !== JSONLDContentType || // @ts-ignore always true?
    contentType !== NQuadsContentType || // @ts-ignore always true?
    contentType !== NQuadsAltContentType) {
      if (callback) {
        callback(e, kb);
      } else {
        var e2 = new Error('' + e + ' while trying to parse <' + base + '> as ' + contentType); //@ts-ignore .cause is not a default error property

        e2.cause = e;
        throw e2;
      }
    }
  }
  /*
    function setJsonLdBase (doc, base) {
      if (doc instanceof Array) {
        return
      }
      if (!('@context' in doc)) {
        doc['@context'] = {}
      }
      doc['@context']['@base'] = base
    }
  */


  function nquadCallback(err, nquads) {
    if (err) {
      callback(err, kb);
    }

    try {
      n3Parser.parse(nquads, tripleCallback);
    } catch (err) {
      callback(err, kb);
    }
  }

  function tripleCallback(err, triple) {
    if (triple) {
      kb.add(triple.subject, triple.predicate, triple.object, triple.graph);
    } else {
      callback(err, kb);
    }
  }
}

function _createSuper$9(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$9(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$9() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var Parsable = {
  'text/n3': true,
  'text/turtle': true,
  'application/rdf+xml': true,
  'application/xhtml+xml': true,
  'text/html': true,
  'application/ld+json': true
}; // This is a minimal set to allow the use of damaged servers if necessary

var CONTENT_TYPE_BY_EXT = {
  'rdf': RDFXMLContentType,
  'owl': RDFXMLContentType,
  'n3': 'text/n3',
  'ttl': 'text/turtle',
  'nt': 'text/n3',
  'acl': 'text/n3',
  'html': 'text/html',
  'xml': 'text/xml'
}; // Convenience namespaces needed in this module.
// These are deliberately not exported as the user application should
// make its own list and not rely on the prefixes used here,
// and not be tempted to add to them, and them clash with those of another
// application.

var getNS = function getNS(factory) {
  return {
    link: Namespace('http://www.w3.org/2007/ont/link#', factory),
    http: Namespace('http://www.w3.org/2007/ont/http#', factory),
    httph: Namespace('http://www.w3.org/2007/ont/httph#', factory),
    // headers
    rdf: Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', factory),
    rdfs: Namespace('http://www.w3.org/2000/01/rdf-schema#', factory),
    dc: Namespace('http://purl.org/dc/elements/1.1/', factory),
    ldp: Namespace('http://www.w3.org/ns/ldp#', factory)
  };
};

var ns$1 = getNS();

var Handler = /*#__PURE__*/_createClass( // TODO: Document, type
// TODO: Document, type
function Handler(response, dom) {
  _classCallCheck(this, Handler);

  _defineProperty(this, "response", void 0);

  _defineProperty(this, "dom", void 0);

  this.response = response; // The type assertion operator here might need to be removed.

  this.dom = dom;
});

_defineProperty(Handler, "pattern", void 0);

var RDFXMLHandler = /*#__PURE__*/function (_Handler) {
  _inherits(RDFXMLHandler, _Handler);

  var _super = _createSuper$9(RDFXMLHandler);

  function RDFXMLHandler() {
    _classCallCheck(this, RDFXMLHandler);

    return _super.apply(this, arguments);
  }

  _createClass(RDFXMLHandler, [{
    key: "parse",
    value: function parse(fetcher,
    /** An XML String */
    responseText,
    /** Requires .original */
    options) {
      var kb = fetcher.store;

      if (!this.dom) {
        this.dom = parseXML(responseText);
      }

      var root = this.dom.documentElement;

      if (root.nodeName === 'parsererror') {
        // Mozilla only See issue/issue110
        // have to fail the request
        return fetcher.failFetch(options, 'Badly formed XML in ' + options.resource.value, 'parse_error');
      }

      var parser = new RDFParser(kb);

      try {
        parser.parse(this.dom, options.original.value, options.original);
      } catch (err) {
        return fetcher.failFetch(options, 'Syntax error parsing RDF/XML! ' + err, 'parse_error');
      }

      if (!options.noMeta) {
        kb.add(options.original, ns$1.rdf('type'), ns$1.link('RDFDocument'), fetcher.appNode);
      }

      return fetcher.doneFetch(options, this.response);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'RDFXMLHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes[RDFXMLContentType] = {
        'q': 0.9
      };
    }
  }]);

  return RDFXMLHandler;
}(Handler);

RDFXMLHandler.pattern = new RegExp('application/rdf\\+xml');

var XHTMLHandler = /*#__PURE__*/function (_Handler2) {
  _inherits(XHTMLHandler, _Handler2);

  var _super2 = _createSuper$9(XHTMLHandler);

  function XHTMLHandler() {
    _classCallCheck(this, XHTMLHandler);

    return _super2.apply(this, arguments);
  }

  _createClass(XHTMLHandler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options) {
      var relation, reverse;

      if (!this.dom) {
        this.dom = parseXML(responseText);
      }

      var kb = fetcher.store; // dc:title

      var title = this.dom.getElementsByTagName('title');

      if (title.length > 0) {
        kb.add(options.resource, ns$1.dc('title'), kb.rdfFactory.literal(title[0].textContent), options.resource); // log.info("Inferring title of " + xhr.resource)
      } // link rel


      var links = this.dom.getElementsByTagName('link');

      for (var x = links.length - 1; x >= 0; x--) {
        // @@ rev
        relation = links[x].getAttribute('rel');
        reverse = false;

        if (!relation) {
          relation = links[x].getAttribute('rev');
          reverse = true;
        }

        if (relation) {
          fetcher.linkData(options.original, relation, links[x].getAttribute('href'), options.resource, reverse);
        }
      } // Data Islands


      var scripts = this.dom.getElementsByTagName('script');

      for (var i = 0; i < scripts.length; i++) {
        var contentType = scripts[i].getAttribute('type');

        if (Parsable[contentType]) {
          // @ts-ignore incompatibility between Store.add and Formula.add
          parse$1(scripts[i].textContent, kb, options.original.value, contentType); // @ts-ignore incompatibility between Store.add and Formula.add

          parse$1(scripts[i].textContent, kb, options.original.value, contentType);
        }
      }

      if (!options.noMeta) {
        kb.add(options.resource, ns$1.rdf('type'), ns$1.link('WebPage'), fetcher.appNode);
      }

      if (!options.noRDFa && parseRDFaDOM) {
        // enable by default
        try {
          parseRDFaDOM(this.dom, kb, options.original.value);
        } catch (err) {
          // @ts-ignore
          var msg = 'Error trying to parse ' + options.resource + ' as RDFa:\n' + err + ':\n' + err.stack;
          return fetcher.failFetch(options, msg, 'parse_error');
        }
      }

      return fetcher.doneFetch(options, this.response);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'XHTMLHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes[XHTMLContentType] = {};
    }
  }]);

  return XHTMLHandler;
}(Handler);

XHTMLHandler.pattern = new RegExp('application/xhtml');

var XMLHandler = /*#__PURE__*/function (_Handler3) {
  _inherits(XMLHandler, _Handler3);

  var _super3 = _createSuper$9(XMLHandler);

  function XMLHandler() {
    _classCallCheck(this, XMLHandler);

    return _super3.apply(this, arguments);
  }

  _createClass(XMLHandler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options) {
      var dom = parseXML(responseText); // XML Semantics defined by root element namespace
      // figure out the root element

      for (var c = 0; c < dom.childNodes.length; c++) {
        var node = dom.childNodes[c]; // is this node an element?

        if (XMLHandler.isElement(node)) {
          // We've found the first element, it's the root
          var _ns = node.namespaceURI; // Is it RDF/XML?

          if (_ns && _ns === _ns['rdf']) {
            fetcher.addStatus(options.req, 'Has XML root element in the RDF namespace, so assume RDF/XML.');
            var rdfHandler = new RDFXMLHandler(this.response, dom);
            return rdfHandler.parse(fetcher, responseText, options);
          }

          break;
        }
      } // Or it could be XHTML?
      // Maybe it has an XHTML DOCTYPE?


      if (dom.doctype) {
        // log.info("We found a DOCTYPE in " + xhr.resource)
        if (dom.doctype.name === 'html' && dom.doctype.publicId.match(/^-\/\/W3C\/\/DTD XHTML/) && dom.doctype.systemId.match(/http:\/\/www.w3.org\/TR\/xhtml/)) {
          fetcher.addStatus(options.req, 'Has XHTML DOCTYPE. Switching to XHTML Handler.\n');
          var xhtmlHandler = new XHTMLHandler(this.response, dom);
          return xhtmlHandler.parse(fetcher, responseText, options);
        }
      } // Or what about an XHTML namespace?


      var html = dom.getElementsByTagName('html')[0];

      if (html) {
        var xmlns = html.getAttribute('xmlns');

        if (xmlns && xmlns.match(/^http:\/\/www.w3.org\/1999\/xhtml/)) {
          fetcher.addStatus(options.req, 'Has a default namespace for ' + 'XHTML. Switching to XHTMLHandler.\n');

          var _xhtmlHandler = new XHTMLHandler(this.response, dom);

          return _xhtmlHandler.parse(fetcher, responseText, options);
        }
      } // At this point we should check the namespace document (cache it!) and
      // look for a GRDDL transform
      // @@  Get namespace document <n>, parse it, look for  <n> grddl:namespaceTransform ?y
      // Apply ?y to   dom
      // We give up. What dialect is this?


      return fetcher.failFetch(options, 'Unsupported dialect of XML: not RDF or XHTML namespace, etc.\n' + responseText.slice(0, 80), 901);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'XMLHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes['text/xml'] = {
        'q': 0.5
      };
      fetcher.mediatypes['application/xml'] = {
        'q': 0.5
      };
    }
  }, {
    key: "isElement",
    value: function isElement(node) {
      return node.nodeType === Node.ELEMENT_NODE;
    }
  }]);

  return XMLHandler;
}(Handler);

XMLHandler.pattern = new RegExp('(text|application)/(.*)xml');

var HTMLHandler = /*#__PURE__*/function (_Handler4) {
  _inherits(HTMLHandler, _Handler4);

  var _super4 = _createSuper$9(HTMLHandler);

  function HTMLHandler() {
    _classCallCheck(this, HTMLHandler);

    return _super4.apply(this, arguments);
  }

  _createClass(HTMLHandler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options) {
      var kb = fetcher.store; // We only handle XHTML so we have to figure out if this is XML
      // log.info("Sniffing HTML " + xhr.resource + " for XHTML.")

      if (isXML(responseText)) {
        fetcher.addStatus(options.req, "Has an XML declaration. We'll assume " + "it's XHTML as the content-type was text/html.\n");
        var xhtmlHandler = new XHTMLHandler(this.response);
        return xhtmlHandler.parse(fetcher, responseText, options);
      } // DOCTYPE html


      if (isXHTML(responseText)) {
        fetcher.addStatus(options.req, 'Has XHTML DOCTYPE. Switching to XHTMLHandler.\n');

        var _xhtmlHandler2 = new XHTMLHandler(this.response);

        return _xhtmlHandler2.parse(fetcher, responseText, options);
      } // xmlns


      if (isXMLNS(responseText)) {
        fetcher.addStatus(options.req, 'Has default namespace for XHTML, so switching to XHTMLHandler.\n');

        var _xhtmlHandler3 = new XHTMLHandler(this.response);

        return _xhtmlHandler3.parse(fetcher, responseText, options);
      } // dc:title
      // no need to escape '/' here


      var titleMatch = new RegExp('<title>([\\s\\S]+?)</title>', 'im').exec(responseText);

      if (titleMatch) {
        kb.add(options.resource, ns$1.dc('title'), kb.rdfFactory.literal(titleMatch[1]), options.resource); // think about xml:lang later
      }

      kb.add(options.resource, ns$1.rdf('type'), ns$1.link('WebPage'), fetcher.appNode);
      fetcher.addStatus(options.req, 'non-XML HTML document, not parsed for data.');
      return fetcher.doneFetch(options, this.response);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'HTMLHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes['text/html'] = {
        'q': 0.9
      };
    }
  }]);

  return HTMLHandler;
}(Handler);

HTMLHandler.pattern = new RegExp('text/html');

var JsonLdHandler = /*#__PURE__*/function (_Handler5) {
  _inherits(JsonLdHandler, _Handler5);

  var _super5 = _createSuper$9(JsonLdHandler);

  function JsonLdHandler() {
    _classCallCheck(this, JsonLdHandler);

    return _super5.apply(this, arguments);
  }

  _createClass(JsonLdHandler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options, response) {
      var kb = fetcher.store;
      return new Promise(function (resolve, reject) {
        try {
          jsonldParser(responseText, kb, options.original.value, function () {
            resolve(fetcher.doneFetch(options, response));
          });
        } catch (err) {
          var msg = 'Error trying to parse ' + options.resource + ' as JSON-LD:\n' + err; // not err.stack -- irrelevant

          resolve(fetcher.failFetch(options, msg, 'parse_error', response));
        }
      });
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'JsonLdHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes['application/ld+json'] = {
        'q': 0.9
      };
    }
  }]);

  return JsonLdHandler;
}(Handler);

JsonLdHandler.pattern = /application\/ld\+json/;

var TextHandler = /*#__PURE__*/function (_Handler6) {
  _inherits(TextHandler, _Handler6);

  var _super6 = _createSuper$9(TextHandler);

  function TextHandler() {
    _classCallCheck(this, TextHandler);

    return _super6.apply(this, arguments);
  }

  _createClass(TextHandler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options) {
      // We only speak dialects of XML right now. Is this XML?
      // Look for an XML declaration
      if (isXML(responseText)) {
        fetcher.addStatus(options.req, 'Warning: ' + options.resource + " has an XML declaration. We'll assume " + "it's XML but its content-type wasn't XML.\n");
        var xmlHandler = new XMLHandler(this.response);
        return xmlHandler.parse(fetcher, responseText, options);
      } // Look for an XML declaration


      if (responseText.slice(0, 500).match(/xmlns:/)) {
        fetcher.addStatus(options.req, "May have an XML namespace. We'll assume " + "it's XML but its content-type wasn't XML.\n");

        var _xmlHandler = new XMLHandler(this.response);

        return _xmlHandler.parse(fetcher, responseText, options);
      } // We give up finding semantics - this is not an error, just no data


      fetcher.addStatus(options.req, 'Plain text document, no known RDF semantics.');
      return fetcher.doneFetch(options, this.response);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'TextHandler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes['text/plain'] = {
        'q': 0.5
      };
    }
  }]);

  return TextHandler;
}(Handler);

TextHandler.pattern = new RegExp('text/plain');

var N3Handler = /*#__PURE__*/function (_Handler7) {
  _inherits(N3Handler, _Handler7);

  var _super7 = _createSuper$9(N3Handler);

  function N3Handler() {
    _classCallCheck(this, N3Handler);

    return _super7.apply(this, arguments);
  }

  _createClass(N3Handler, [{
    key: "parse",
    value: function parse(fetcher, responseText, options, response) {
      // Parse the text of this N3 file
      var kb = fetcher.store;
      var p = createSinkParser(kb, kb, options.original.value, options.original.value, null, null, '', null); //                p.loadBuf(xhr.responseText)

      try {
        p.loadBuf(responseText);
      } catch (err) {
        var msg = 'Error trying to parse ' + options.resource + ' as Notation3:\n' + err; // not err.stack -- irrelevant

        return fetcher.failFetch(options, msg, 'parse_error', response);
      }

      fetcher.addStatus(options.req, 'N3 parsed: ' + p.statementCount + ' triples in ' + p.lines + ' lines.');
      fetcher.store.add(options.original, ns$1.rdf('type'), ns$1.link('RDFDocument'), fetcher.appNode);
      return fetcher.doneFetch(options, this.response);
    }
  }], [{
    key: "toString",
    value: function toString() {
      return 'N3Handler';
    }
  }, {
    key: "register",
    value: function register(fetcher) {
      fetcher.mediatypes['text/n3'] = {
        'q': '1.0'
      }; // as per 2008 spec

      /*
       fetcher.mediatypes['application/x-turtle'] = {
       'q': 1.0
       } // pre 2008
       */

      fetcher.mediatypes['text/turtle'] = {
        'q': 1.0
      }; // post 2008
    }
  }]);

  return N3Handler;
}(Handler);

N3Handler.pattern = new RegExp('(application|text)/(x-)?(rdf\\+)?(n3|turtle)');
var defaultHandlers = {
  RDFXMLHandler: RDFXMLHandler,
  XHTMLHandler: XHTMLHandler,
  XMLHandler: XMLHandler,
  HTMLHandler: HTMLHandler,
  TextHandler: TextHandler,
  N3Handler: N3Handler,
  JsonLdHandler: JsonLdHandler
};

function isXHTML(responseText) {
  var docTypeStart = responseText.indexOf('<!DOCTYPE html');
  var docTypeEnd = responseText.indexOf('>');

  if (docTypeStart === -1 || docTypeEnd === -1 || docTypeStart > docTypeEnd) {
    return false;
  }

  return responseText.substr(docTypeStart, docTypeEnd - docTypeStart).indexOf('XHTML') !== -1;
}

function isXML(responseText) {
  var match = responseText.match(/\s*<\?xml\s+version\s*=[^<>]+\?>/);
  return !!match;
}

function isXMLNS(responseText) {
  var match = responseText.match(/[^(<html)]*<html\s+[^<]*xmlns=['"]http:\/\/www.w3.org\/1999\/xhtml["'][^<]*>/);
  return !!match;
}

/** Fetcher
 *
 * The Fetcher object is a helper object for a quadstore
 * which turns it from an offline store to an online store.
 * The fetcher deals with loading data files rom the web,
  * figuring how to parse them.  It will also refresh, remove, the data
  * and put back the data to the web.
 */
var Fetcher = /*#__PURE__*/function () {
  /** Denoting this session */

  /**
   * this.requested[uri] states:
   * undefined     no record of web access or records reset
   * true          has been requested, fetch in progress
   * 'done'        received, Ok
   * 401           Not logged in
   * 403           HTTP status unauthorized
   * 404           Resource does not exist. Can be created etc.
   * 'redirected'  In attempt to counter CORS problems retried.
   * 'parse_error' Parse error
   * 'unsupported_protocol'  URI is not a protocol Fetcher can deal with
   * other strings mean various other errors.
   */

  /** List of timeouts associated with a requested URL */

  /** Redirected from *key uri* to *value uri* */

  /** fetchCallbacks[uri].push(callback) */

  /** Keep track of explicit 404s -> we can overwrite etc */
  // TODO: Document this

  /** Methods added by calling Util.callbackify in the constructor*/
  function Fetcher(store) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Fetcher);

    _defineProperty(this, "store", void 0);

    _defineProperty(this, "timeout", void 0);

    _defineProperty(this, "_fetch", void 0);

    _defineProperty(this, "mediatypes", void 0);

    _defineProperty(this, "appNode", void 0);

    _defineProperty(this, "requested", void 0);

    _defineProperty(this, "timeouts", void 0);

    _defineProperty(this, "redirectedTo", void 0);

    _defineProperty(this, "fetchQueue", void 0);

    _defineProperty(this, "fetchCallbacks", void 0);

    _defineProperty(this, "nonexistent", void 0);

    _defineProperty(this, "lookedUp", void 0);

    _defineProperty(this, "handlers", void 0);

    _defineProperty(this, "ns", void 0);

    _defineProperty(this, "fireCallbacks", void 0);

    this.store = store || new IndexedFormula();
    this.ns = getNS(this.store.rdfFactory);
    this.timeout = options.timeout || 30000; // solidFetcher is deprecated

    this._fetch = options.fetch || typeof global !== 'undefined' && (global.solidFetcher || global.solidFetch) || typeof window !== 'undefined' && (window.solidFetcher || window.solidFetch) || crossFetch;

    if (!this._fetch) {
      throw new Error('No _fetch function available for Fetcher');
    }

    this.appNode = this.store.rdfFactory.blankNode();
    this.store.fetcher = this; // Bi-linked

    this.requested = {};
    this.timeouts = {};
    this.redirectedTo = {};
    this.fetchQueue = {};
    this.fetchCallbacks = {};
    this.nonexistent = {};
    this.lookedUp = {};
    this.handlers = [];
    this.mediatypes = {
      'image/*': {
        'q': 0.9
      },
      '*/*': {
        'q': 0.1
      } // Must allow access to random content

    }; // Util.callbackify(this, ['request', 'recv', 'headers', 'load', 'fail',
    //   'refresh', 'retract', 'done'])
    // In switching to fetch(), 'recv', 'headers' and 'load' do not make sense

    callbackify(this, ['request', 'fail', 'refresh', 'retract', 'done']);
    Object.keys(options.handlers || defaultHandlers).map(function (key) {
      return _this.addHandler(defaultHandlers[key]);
    });
  }

  _createClass(Fetcher, [{
    key: "load",
    value:
    /**
     * Promise-based load function
     *
     * Loads a web resource or resources into the store.
     *
     * A resource may be given as NamedNode object, or as a plain URI.
     * an array of resources will be given, in which they will be fetched in parallel.
     * By default, the HTTP headers are recorded also, in the same store, in a separate graph.
     * This allows code like editable() for example to test things about the resource.
     *
     * @param uri {Array<RDFlibNamedNode>|Array<string>|RDFlibNamedNode|string}
     *
     * @param [options={}] {Object}
     *
     * @param [options.fetch] {Function}
     *
     * @param [options.referringTerm] {RDFlibNamedNode} Referring term, the resource which
     *   referred to this (for tracking bad links)
     *
     * @param [options.contentType] {string} Provided content type (for writes)
     *
     * @param [options.forceContentType] {string} Override the incoming header to
     *   force the data to be treated as this content-type (for reads)
     *
     * @param [options.force] {boolean} Load the data even if loaded before.
     *   Also sets the `Cache-Control:` header to `no-cache`
     *
     * @param [options.baseURI=docuri] {Node|string} Original uri to preserve
     *   through proxying etc (`xhr.original`).
     *
     * @param [options.proxyUsed] {boolean} Whether this request is a retry via
     *   a proxy (generally done from an error handler)
     *
     * @param [options.withCredentials] {boolean} flag for XHR/CORS etc
     *
     * @param [options.clearPreviousData] {boolean} Before we parse new data,
     *   clear old, but only on status 200 responses
     *
     * @param [options.noMeta] {boolean} Prevents the addition of various metadata
     *   triples (about the fetch request) to the store
     *
     * @param [options.noRDFa] {boolean}
     *
     * @returns {Promise<Result>}
     */
    function load(uri) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      options = Object.assign({}, options); // Take a copy as we add stuff to the options!!

      if (uri instanceof Array) {
        return Promise.all(uri.map(function (x) {
          return _this2.load(x, Object.assign({}, options));
        }));
      }

      var uriIn = uri;
      var docuri = termValue(uriIn);
      docuri = docuri.split('#')[0];
      options = this.initFetchOptions(docuri, options);
      var initialisedOptions = this.initFetchOptions(docuri, options);
      return this.pendingFetchPromise(docuri, initialisedOptions.baseURI, initialisedOptions);
    }
  }, {
    key: "pendingFetchPromise",
    value: function pendingFetchPromise(uri, originalUri, options) {
      var _this3 = this;

      var pendingPromise; // Check to see if some request is already dealing with this uri

      if (!options.force && this.fetchQueue[originalUri]) {
        pendingPromise = this.fetchQueue[originalUri];
      } else {
        pendingPromise = Promise.race([this.setRequestTimeout(uri, options), this.fetchUri(uri, options)]);
        this.fetchQueue[originalUri] = pendingPromise; // Clean up the queued promise after a time, if it's resolved

        this.cleanupFetchRequest(originalUri, undefined, this.timeout);
      }

      return pendingPromise.then(function (x) {
        if (uri in _this3.timeouts) {
          _this3.timeouts[uri].forEach(clearTimeout);

          delete _this3.timeouts[uri];
        }

        return x;
      });
    }
    /**
     * @param _options - DEPRECATED
     */

  }, {
    key: "cleanupFetchRequest",
    value: function cleanupFetchRequest(originalUri, _options, timeout) {
      var _this4 = this;

      if (_options !== undefined) {
        console.warn("_options is deprecated");
      }

      this.timeouts[originalUri] = (this.timeouts[originalUri] || []).concat(setTimeout(function () {
        if (!_this4.isPending(originalUri)) {
          delete _this4.fetchQueue[originalUri];
        }
      }, timeout));
    }
  }, {
    key: "initFetchOptions",
    value: function initFetchOptions(uri, options) {
      var kb = this.store;
      var isGet = !options.method || options.method.toUpperCase() === 'GET';

      if (!isGet) {
        options.force = true;
      }

      options.resource = kb.rdfFactory.namedNode(uri); // This might be proxified

      options.baseURI = options.baseURI || uri; // Preserve though proxying etc

      options.original = kb.rdfFactory.namedNode(options.baseURI);
      options.req = kb.bnode();
      options.headers = options.headers || new browserPonyfill.Headers();

      if (options.contentType) {
        // @ts-ignore
        options.headers['content-type'] = options.contentType;
      }

      if (options.force) {
        options.cache = 'no-cache';
      }

      var acceptString = this.acceptString(); // @ts-ignore

      options.headers['accept'] = acceptString;
      var requestedURI = Fetcher.offlineOverride(uri);
      options.requestedURI = requestedURI;
      Fetcher.setCredentials(requestedURI, options);
      var actualProxyURI = Fetcher.proxyIfNecessary(requestedURI);

      if (requestedURI !== actualProxyURI) {
        options.proxyUsed = true;
      }

      options.actualProxyURI = actualProxyURI;
      return options;
    }
    /**
     * (The promise chain ends in either a `failFetch()` or a `doneFetch()`)
     *
     * @param docuri {string}
     * @param options {Object}
     *
     * @returns {Promise<Object>} fetch() result or an { error, status } object
     */

  }, {
    key: "fetchUri",
    value: function fetchUri(docuri, options) {
      var _this5 = this;

      if (!docuri) {
        return Promise.reject(new Error('Cannot fetch an empty uri'));
      }

      if (Fetcher.unsupportedProtocol(docuri)) {
        return this.failFetch(options, 'fetcher: Unsupported protocol', 'unsupported_protocol');
      }

      var state = this.getState(docuri);

      if (!options.force) {
        if (state === 'fetched') {
          // URI already fetched and added to store
          return Promise.resolve( // @ts-ignore This is not a valid response object
          this.doneFetch(options, {
            status: 200,
            ok: true,
            statusText: 'Already loaded into quadstore.'
          }));
        }

        if (state === 'failed' && this.requested[docuri] === 404) {
          // Remember nonexistence
          var _message = 'Previously failed: ' + this.requested[docuri]; // @ts-ignore This is not a valid response object


          var dummyResponse = {
            url: docuri,
            // This does not comply to Fetch spec, it can be a string value in rdflib
            status: this.requested[docuri],
            statusText: _message,
            responseText: _message,
            headers: new browserPonyfill.Headers(),
            // Headers() ???
            ok: false,
            body: null,
            bodyUsed: false,
            size: 0,
            timeout: 0
          };
          return this.failFetch(options, _message, this.requested[docuri], dummyResponse);
        }
      } else {
        // options.force == true
        delete this.nonexistent[docuri];
      }

      this.fireCallbacks('request', [docuri]);
      this.requested[docuri] = true; // mark this uri as 'requested'

      if (!options.noMeta) {
        this.saveRequestMetadata(docuri, options);
      }

      var actualProxyURI = options.actualProxyURI; // Map might get mistakenly added into headers
      // error TS2339: Property 'map' does not exist on type 'Headers'.

      /* let map
      if (options.headers && map in options.headers) {
        delete options.headers.map
      } */

      return this._fetch(actualProxyURI, options).then(function (response) {
        return _this5.handleResponse(response, docuri, options);
      }, function (error) {
        // @@ handleError?
        // @ts-ignore Invalid response object
        var dummyResponse = {
          url: actualProxyURI,
          status: 999,
          // @@ what number/string should fetch failures report?
          statusText: (error.name || 'network failure') + ': ' + (error.errno || error.code || error.type),
          responseText: error.message,
          headers: new browserPonyfill.Headers(),
          // Headers() ???
          ok: false,
          body: null,
          bodyUsed: false,
          size: 0,
          timeout: 0
        };
        console.log('Fetcher: <' + actualProxyURI + '> Non-HTTP fetch exception: ' + error);
        return _this5.handleError(dummyResponse, docuri, options); // possible credentials retry
        // return this.failFetch(options, 'fetch failed: ' + error, 999, dummyResponse) // Fake status code: fetch exception
        // handleError expects a response so we fake some important bits.

        /*
        this.handleError(, docuri, options)
        */
      });
    }
    /**
     * Asks for a doc to be loaded if necessary then calls back
     *
     * Calling methods:
     *   nowOrWhenFetched (uri, userCallback)
     *   nowOrWhenFetched (uri, options, userCallback)
     *   nowOrWhenFetched (uri, referringTerm, userCallback, options)  <-- old
     *   nowOrWhenFetched (uri, referringTerm, userCallback) <-- old
     *
     *  Options include:
     *   referringTerm    The document in which this link was found.
     *                    this is valuable when finding the source of bad URIs
     *   force            boolean.  Never mind whether you have tried before,
     *                    load this from scratch.
     *   forceContentType Override the incoming header to force the data to be
     *                    treated as this content-type.
     *
     *  Callback function takes:
     *
     *    ok               True if the fetch worked, and got a 200 response.
     *                     False if any error happened
     *
     *    errmessage       Text error message if not OK.
     *
     *    response         The fetch Response object (was: XHR) if there was was one
     *                     includes response.status as the HTTP status if any.
     */

  }, {
    key: "nowOrWhenFetched",
    value: function nowOrWhenFetched(uriIn, p2, userCallback) {
      var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var uri = termValue(uriIn);

      if (typeof p2 === 'function') {
        // nowOrWhenFetched (uri, userCallback)
        userCallback = p2;
      } else if (typeof p2 === 'undefined') ; else if (isNamedNode(p2)) {
        // referringTerm = p2
        options.referringTerm = p2;
      } else {
        // nowOrWhenFetched (uri, options, userCallback)
        options = p2;
      }

      this.load(uri, options).then(function (fetchResponse) {
        if (userCallback) {
          if (fetchResponse) {
            if (fetchResponse.ok) {
              userCallback(true, 'OK', fetchResponse);
            } else {
              // console.log('@@@ fetcher.js Should not take this path !!!!!!!!!!!!')
              var oops = 'HTTP error: Status ' + fetchResponse.status + ' (' + fetchResponse.statusText + ')';

              if (fetchResponse.responseText) {
                oops += ' ' + fetchResponse.responseText; // not in 404, dns error, nock failure
              }

              console.log(oops + ' fetching ' + uri);
              userCallback(false, oops, fetchResponse);
            }
          } else {
            var _oops = '@@ nowOrWhenFetched:  no response object!';
            console.log(_oops);
            userCallback(false, _oops);
          }
        }
      }, function (err) {
        var message = err.message || err.statusText;
        message = 'Failed to load  <' + uri + '> ' + message;
        console.log(message);

        if (err.response && err.response.status) {
          message += ' status: ' + err.response.status;
        }

        userCallback(false, message, err.response);
      });
    }
    /**
     * Records a status message (as a literal node) by appending it to the
     * request's metadata status collection.
     *
     */

  }, {
    key: "addStatus",
    value: function addStatus(req, statusMessage) {
      // <Debug about="parsePerformance">
      var now = new Date();
      statusMessage = '[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds() + '] ' + statusMessage; // </Debug>

      var kb = this.store;
      var statusNode = kb.the(req, this.ns.link('status'));

      if (isCollection(statusNode)) {
        statusNode.append(kb.rdfFactory.literal(statusMessage));
      } else {
        log$1.warn('web.js: No list to add to: ' + statusNode + ',' + statusMessage);
      }
    }
    /**
     * Records errors in the system on failure:
     *
     *  - Adds an entry to the request status collection
     *  - Adds an error triple with the fail message to the metadata
     *  - Fires the 'fail' callback
     *  - Rejects with an error result object, which has a response object if any
     */

  }, {
    key: "failFetch",
    value: function failFetch(options, errorMessage, statusCode, response) {
      this.addStatus(options.req, errorMessage);

      if (!options.noMeta) {
        this.store.add(options.original, this.ns.link('error'), this.store.rdfFactory.literal(errorMessage));
      }

      var meth = (options.method || 'GET').toUpperCase();
      var isGet = meth === 'GET' || meth === 'HEAD';

      if (isGet) {
        // only cache the status code on GET or HEAD
        if (!options.resource.equals(options.original)) ;

        this.requested[docpart(options.original.value)] = statusCode;
        this.fireCallbacks('fail', [options.original.value, errorMessage]);
      }

      var err = new Error('Fetcher: ' + errorMessage); // err.ok = false // Is taken as a response, will work too @@ phase out?

      err.status = statusCode;
      err.statusText = errorMessage;
      err.response = response;
      return Promise.reject(err);
    } // in the why part of the quad distinguish between HTML and HTTP header
    // Reverse is set iif the link was rev= as opposed to rel=

  }, {
    key: "linkData",
    value: function linkData(originalUri, rel, uri$1, why, reverse) {
      if (!uri$1) return;
      var kb = this.store;
      var predicate; // See http://www.w3.org/TR/powder-dr/#httplink for describedby 2008-12-10

      var obj = kb.rdfFactory.namedNode(join(uri$1, originalUri.value));

      if (rel === 'alternate' || rel === 'seeAlso' || rel === 'meta' || rel === 'describedby') {
        if (obj.value === originalUri.value) {
          return;
        }

        predicate = this.ns.rdfs('seeAlso');
      } else if (rel === 'type') {
        predicate = kb.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
      } else {
        // See https://www.iana.org/assignments/link-relations/link-relations.xml
        // Alas not yet in RDF yet for each predicate
        // encode space in e.g. rel="shortcut icon"
        predicate = kb.rdfFactory.namedNode(join(encodeURIComponent(rel), 'http://www.iana.org/assignments/link-relations/'));
      }

      if (reverse) {
        kb.add(obj, predicate, originalUri, why);
      } else {
        kb.add(originalUri, predicate, obj, why);
      }
    }
  }, {
    key: "parseLinkHeader",
    value: function parseLinkHeader(linkHeader, originalUri, reqNode) {
      if (!linkHeader) {
        return;
      } // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*")))*(,|$)/g
      // const paramexp = /[^()<>@,;:"/[]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*"))/g
      // From https://www.dcode.fr/regular-expression-simplificator:
      // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} t]+=["]))*[,$]/g
      // const paramexp = /[^\\<>@,;:"\/\[\]?={} \t]+=["])/g
      // Original:


      var linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
      var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;
      var matches = linkHeader.match(linkexp);
      if (matches == null) return;

      for (var i = 0; i < matches.length; i++) {
        var split = matches[i].split('>');
        var href = split[0].substring(1);
        var ps = split[1];
        var s = ps.match(paramexp);
        if (s == null) return;

        for (var j = 0; j < s.length; j++) {
          var p = s[j];
          var paramsplit = p.split('='); // var name = paramsplit[0]

          var rel = paramsplit[1].replace(/["']/g, ''); // '"

          this.linkData(originalUri, rel, href, reqNode);
        }
      }
    }
  }, {
    key: "doneFetch",
    value: function doneFetch(options, response) {
      this.addStatus(options.req, 'Done.');
      this.requested[options.original.value] = 'done';
      this.fireCallbacks('done', [options.original.value]);
      response.req = options.req; // Set the request meta blank node

      return response;
    }
    /**
     * Note two nodes are now smushed
     * If only one was flagged as looked up, then the new node is looked up again,
     * which will make sure all the URIs are dereferenced
     */

  }, {
    key: "nowKnownAs",
    value: function nowKnownAs(was, now) {
      if (this.lookedUp[was.value]) {
        // Transfer userCallback
        if (!this.lookedUp[now.value]) {
          this.lookUpThing(now, was);
        }
      } else if (this.lookedUp[now.value]) {
        if (!this.lookedUp[was.value]) {
          this.lookUpThing(was, now);
        }
      }
    }
    /**
     * Writes back to the web what we have in the store for this uri
     */

  }, {
    key: "putBack",
    value: function putBack(uri) {
      var _this6 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var uriSting = termValue(uri);
      var doc = new NamedNode(uriSting).doc(); // strip off #

      options.contentType = options["content-type"] || options["Content-Type"] || options.contentType || TurtleContentType;

      if (options.contentType === 'application/ld+json') {
        return new Promise(function (resolve, reject) {
          serialize(doc, _this6.store, doc.uri, options.contentType, function (err, jsonString) {
            if (err) {
              reject(err);
            } else {
              // @ts-ignore
              options.data = jsonString;

              _this6.webOperation('PUT', uri, options).then(function (res) {
                return resolve(res);
              }).catch(function (error) {
                return reject(error);
              });
            }
          });
        });
      }

      options.data = serialize(doc, this.store, doc.value, options.contentType);
      return this.webOperation('PUT', uriSting, options);
    }
  }, {
    key: "webCopy",
    value: function webCopy(here, there, contentType) {
      var _this7 = this;

      return this.webOperation('GET', here).then(function (result) {
        return _this7.webOperation('PUT', // change to binary from text
        there, {
          data: result.responseText,
          contentType: contentType
        });
      });
    }
  }, {
    key: "delete",
    value: function _delete(uri, options) {
      var _this8 = this;

      return this.webOperation('DELETE', uri, options).then(function (response) {
        _this8.requested[uri] = 404;
        _this8.nonexistent[uri] = true;

        _this8.unload(_this8.store.rdfFactory.namedNode(uri));

        return response;
      });
    }
    /** Create an empty resource if it really does not exist
     *  Be absolutely sure something does not exist before creating a new empty file
     * as otherwise existing could  be deleted.
     * @param doc - The resource
    */

  }, {
    key: "createIfNotExists",
    value: function () {
      var _createIfNotExists = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(doc) {
        var contentType,
            data,
            fetcher,
            response,
            _args = arguments;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                contentType = _args.length > 1 && _args[1] !== undefined ? _args[1] : TurtleContentType;
                data = _args.length > 2 && _args[2] !== undefined ? _args[2] : '';
                fetcher = this;
                _context.prev = 3;
                _context.next = 6;
                return fetcher.load(doc);

              case 6:
                response = _context.sent;
                _context.next = 29;
                break;

              case 9:
                _context.prev = 9;
                _context.t0 = _context["catch"](3);

                if (!(_context.t0.response.status === 404)) {
                  _context.next = 27;
                  break;
                }

                console.log('createIfNotExists: doc does NOT exist, will create... ' + doc);
                _context.prev = 13;
                _context.next = 16;
                return fetcher.webOperation('PUT', doc.value, {
                  data: data,
                  contentType: contentType
                });

              case 16:
                response = _context.sent;
                _context.next = 23;
                break;

              case 19:
                _context.prev = 19;
                _context.t1 = _context["catch"](13);
                console.log('createIfNotExists doc FAILED: ' + doc + ': ' + _context.t1);
                throw _context.t1;

              case 23:
                delete fetcher.requested[doc.value]; // delete cached 404 error
                // console.log('createIfNotExists doc created ok ' + doc)

                return _context.abrupt("return", response);

              case 27:
                console.log('createIfNotExists doc load error NOT 404:  ' + doc + ': ' + _context.t0);
                throw _context.t0;

              case 29:
                return _context.abrupt("return", response);

              case 30:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[3, 9], [13, 19]]);
      }));

      function createIfNotExists(_x) {
        return _createIfNotExists.apply(this, arguments);
      }

      return createIfNotExists;
    }()
    /**
     * @param parentURI URI of parent container
     * @param folderName - Optional folder name (slug)
     * @param data - Optional folder metadata
     */

  }, {
    key: "createContainer",
    value: function createContainer(parentURI, folderName, data) {
      var headers = {
        // Force the right mime type for containers
        'content-type': TurtleContentType,
        'link': this.ns.ldp('BasicContainer') + '; rel="type"'
      };

      if (folderName) {
        headers['slug'] = folderName;
      } // @ts-ignore These headers lack some of the required operators.


      var options = {
        headers: headers
      };

      if (data) {
        options.body = data;
      }

      return this.webOperation('POST', parentURI, options);
    }
  }, {
    key: "invalidateCache",
    value: function invalidateCache(iri) {
      var uri = termValue(iri);
      var fetcher = this; // @ts-ignore

      if (fetcher.fetchQueue && fetcher.fetchQueue[uri]) {
        console.log('Internal error - fetchQueue exists ' + uri);
        var promise = fetcher.fetchQueue[uri];

        if (promise['PromiseStatus'] === 'resolved') {
          delete fetcher.fetchQueue[uri];
        } else {
          // pending
          delete fetcher.fetchQueue[uri];
          console.log('*** Fetcher: pending fetchQueue deleted ' + uri);
        }
      }

      if (fetcher.requested[uri] && fetcher.requested[uri] !== 'done' && fetcher.requested[uri] !== 'failed' && fetcher.requested[uri] !== 404) {
        var msg = "Rdflib: fetcher: Destructive operation on <".concat(fetcher.requested[uri], "> file being fetched! ") + uri;
        console.error(msg); // alert(msg)
      } else {
        delete fetcher.requested[uri]; // invalidate read cache -- @@ messes up logic if request in progress ??

        delete fetcher.nonexistent[uri];
      }
    }
    /**
     * A generic web opeation, at the fetch() level.
     * does not invole the quadstore.
     *
     *  Returns promise of Response
     *  If data is returned, copies it to response.responseText before returning
     */

  }, {
    key: "webOperation",
    value: function webOperation(method, uriIn) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var uri = termValue(uriIn);
      options.method = method;
      options.body = options.data || options.body;
      options.force = true;
      var fetcher = this;

      if (options.body && !options.contentType) {
        throw new Error('Web operation sending data must have a defined contentType.');
      }

      if (options.contentType) {
        options.headers = options.headers || {};
        options.headers['content-type'] = options.contentType;
      }

      Fetcher.setCredentials(uri, options);
      return new Promise(function (resolve, reject) {
        fetcher._fetch(uri, options).then(function (response) {
          if (response.ok) {
            if (method === 'PUT' || method === 'PATCH' || method === 'POST' || method === 'DELETE') {
              fetcher.invalidateCache(uri);
            } // response.body with Chrome can't be relied on


            if (response.text) {
              // Was: response.body https://github.com/linkeddata/rdflib.js/issues/506
              response.text().then(function (data) {
                response.responseText = data;
                resolve(response);
              });
            } else {
              resolve(response);
            }
          } else {
            var msg = 'Web error: ' + response.status;
            if (response.statusText) msg += ' (' + response.statusText + ')';
            msg += ' on ' + method + ' of <' + uri + '>';
            if (response.responseText) msg += ': ' + response.responseText;
            var e2 = new Error(msg);
            e2.response = response;
            reject(e2);
          }
        }, function (err) {
          var msg = 'Fetch error for ' + method + ' of <' + uri + '>:' + err;
          reject(new Error(msg));
        });
      });
    }
    /**
     * Looks up something.
     * Looks up all the URIs a things has.
     *
     * @param term - canonical term for the thing whose URI is
     *   to be dereferenced
     * @param rterm - the resource which referred to this
     *   (for tracking bad links)
     */

  }, {
    key: "lookUpThing",
    value: function lookUpThing(term, rterm) {
      var _this9 = this;

      var uris = this.store.uris(term); // Get all URIs

      uris = uris.map(function (u) {
        return docpart(u);
      }); // Drop hash fragments

      uris.forEach(function (u) {
        _this9.lookedUp[u] = true;
      }); // @ts-ignore Recursive type

      return this.load(uris, {
        referringTerm: rterm
      });
    }
    /**
     * Looks up response header.
     *
     * @returns {Array|undefined} a list of header values found in a stored HTTP
     *   response, or [] if response was found but no header found,
     *   or undefined if no response is available.
     * Looks for { [] link:requestedURI ?uri; link:response [ httph:header-name  ?value ] }
     */

  }, {
    key: "getHeader",
    value: function getHeader(doc, header) {
      var kb = this.store; // look for the URI (AS A STRING NOT A NODE) for a stored request

      var docuri = doc.value;
      var requests = kb.each(undefined, this.ns.link('requestedURI'), kb.rdfFactory.literal(docuri));

      for (var r = 0; r < requests.length; r++) {
        var request = requests[r];

        if (request !== undefined) {
          var _response = kb.any(request, this.ns.link('response'));

          if (_response !== undefined && kb.anyValue(_response, this.ns.http('status')) && kb.anyValue(_response, this.ns.http('status')).startsWith('2')) {
            // Only look at success returns - not 401 error messagess etc
            var results = kb.each(_response, this.ns.httph(header.toLowerCase()));

            if (results.length) {
              return results.map(function (v) {
                return v.value;
              });
            }

            return [];
          }
        }
      }

      return undefined;
    }
  }, {
    key: "saveRequestMetadata",
    value: function saveRequestMetadata(docuri, options) {
      var req = options.req;
      var kb = this.store;
      var rterm = options.referringTerm;
      this.addStatus(options.req, 'Accept: ' + options.headers['accept']);

      if (isNamedNode(rterm)) {
        kb.add(kb.rdfFactory.namedNode(docuri), this.ns.link('requestedBy'), rterm, this.appNode);
      }

      if (options.original && options.original.value !== docuri) {
        kb.add(req, this.ns.link('orginalURI'), kb.rdfFactory.literal(options.original.value), this.appNode);
      }

      var now = new Date();
      var timeNow = '[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '] ';
      kb.add(req, this.ns.rdfs('label'), kb.rdfFactory.literal(timeNow + ' Request for ' + docuri), this.appNode); // We store the docuri as a string, not as a node,
      // see https://github.com/linkeddata/rdflib.js/pull/427#pullrequestreview-447910061

      kb.add(req, this.ns.link('requestedURI'), kb.rdfFactory.literal(docuri), this.appNode);
      kb.add(req, this.ns.link('status'), kb.collection(), this.appNode);
    }
  }, {
    key: "saveResponseMetadata",
    value: function saveResponseMetadata(response, options) {
      var _this10 = this;

      var kb = this.store;
      var responseNode = kb.bnode();
      kb.add(options.req, this.ns.link('response'), responseNode, responseNode);
      kb.add(responseNode, this.ns.http('status'), kb.rdfFactory.literal(response.status), responseNode);
      kb.add(responseNode, this.ns.http('statusText'), kb.rdfFactory.literal(response.statusText), responseNode); // Save the response headers

      response.headers.forEach(function (value, header) {
        kb.add(responseNode, _this10.ns.httph(header), _this10.store.rdfFactory.literal(value), responseNode);

        if (header === 'content-type') {
          kb.add(options.resource, _this10.ns.rdf('type'), kb.rdfFactory.namedNode(mediaTypeClass(value).value), responseNode);
        }
      });
      return responseNode;
    }
  }, {
    key: "objectRefresh",
    value: function objectRefresh(term) {
      var uris = this.store.uris(term); // Get all URIs

      if (typeof uris !== 'undefined') {
        for (var i = 0; i < uris.length; i++) {
          this.refresh(this.store.rdfFactory.namedNode(docpart(uris[i]))); // what about rterm?
        }
      }
    }
    /* refresh  Reload data from a given document
    **
    ** @param term - An RDF Named Node for the eodcument in question
    ** @param userCallback - A function userCallback(ok, message, response)
    */

  }, {
    key: "refresh",
    value: function refresh(term, userCallback) {
      // sources_refresh
      this.fireCallbacks('refresh', arguments);
      this.nowOrWhenFetched(term, {
        force: true,
        clearPreviousData: true
      }, userCallback);
    }
    /* refreshIfExpired   Conditional refresh if Expired
    **
    ** @param term - An RDF Named Node for the eodcument in question
    ** @param userCallback - A function userCallback(ok, message, response)
    */

  }, {
    key: "refreshIfExpired",
    value: function refreshIfExpired(term, userCallback) {
      var exp = this.getHeader(term, 'Expires');

      if (!exp || new Date(exp[0]).getTime() <= new Date().getTime()) {
        this.refresh(term, userCallback);
      } else {
        userCallback(true, 'Not expired', {});
      }
    }
  }, {
    key: "retract",
    value: function retract(term) {
      // sources_retract
      this.store.removeMany(undefined, undefined, undefined, term);

      if (term.value) {
        delete this.requested[docpart(term.value)];
      }

      this.fireCallbacks('retract', arguments);
    }
  }, {
    key: "getState",
    value: function getState(docuri) {
      if (typeof this.requested[docuri] === 'undefined') {
        return 'unrequested';
      } else if (this.requested[docuri] === true) {
        return 'requested';
      } else if (this.requested[docuri] === 'done') {
        return 'fetched';
      } else if (this.requested[docuri] === 'redirected') {
        return this.getState(this.redirectedTo[docuri]);
      } else {
        // An non-200 HTTP error status
        return 'failed';
      }
    }
  }, {
    key: "isPending",
    value: function isPending(docuri) {
      // sources_pending
      // doing anyStatementMatching is wasting time
      // if it's not pending: false -> flailed
      //   'done' -> done 'redirected' -> redirected
      return this.requested[docuri] === true;
    }
  }, {
    key: "unload",
    value: function unload(term) {
      this.store.removeDocument(term);
      delete this.requested[term.value]; // So it can be load2ed again
    }
  }, {
    key: "addHandler",
    value: function addHandler(handler) {
      this.handlers.push(handler);
      handler.register(this);
    }
  }, {
    key: "retryNoCredentials",
    value: function retryNoCredentials(docuri, options) {
      console.log('Fetcher: CORS: RETRYING with NO CREDENTIALS for ' + options.resource);
      options.retriedWithNoCredentials = true; // protect against being called twice

      delete this.requested[docuri]; // forget the original request happened

      delete this.fetchQueue[docuri]; // Note: XHR property was withCredentials, but fetch property is just credentials

      var newOptions = Object.assign({}, options, {
        credentials: 'omit'
      });
      this.addStatus(options.req, 'Abort: Will retry with credentials SUPPRESSED to see if that helps');
      return this.load(docuri, newOptions);
    }
    /**
     * Tests whether a request is being made to a cross-site URI (for purposes
     * of retrying with a proxy)
     */

  }, {
    key: "isCrossSite",
    value: function isCrossSite(uri$1) {
      // Mashup situation, not node etc
      if (typeof document === 'undefined' || !document.location) {
        return false;
      }

      var hostpart$1 = hostpart;
      var here = '' + document.location;
      return (hostpart$1(here) && hostpart$1(uri$1) && hostpart$1(here)) !== hostpart$1(uri$1);
    }
    /**
     * Called when there's a network error in fetch(), or a response
     * with status of 0.
     */

  }, {
    key: "handleError",
    value: function handleError(response, docuri, options) {
      if (this.isCrossSite(docuri)) {
        // Make sure we haven't retried already
        if (options.credentials && options.credentials === 'include' && !options.retriedWithNoCredentials) {
          return this.retryNoCredentials(docuri, options);
        } // Now attempt retry via proxy


        var proxyUri = Fetcher.crossSiteProxy(docuri);

        if (proxyUri && !options.proxyUsed) {
          console.log('web: Direct failed so trying proxy ' + proxyUri);
          return this.redirectToProxy(proxyUri, options);
        }
      }

      var message;

      if (response instanceof Error) {
        message = 'Fetch error: ' + response.message;
      } else {
        message = response.statusText;

        if (response.responseText) {
          message += " ".concat(response.responseText);
        }
      } // This is either not a CORS error, or retries have been made


      return this.failFetch(options, message, response.status || 998, response);
    } // deduce some things from the HTTP transaction

  }, {
    key: "addType",
    value: function addType(rdfType, req, kb, locURI) {
      // add type to all redirected resources too
      var prev = req;

      if (locURI) {
        var reqURI = kb.any(prev, this.ns.link('requestedURI'));

        if (reqURI && reqURI.value !== locURI) {
          kb.add(kb.rdfFactory.namedNode(locURI), this.ns.rdf('type'), rdfType, this.appNode);
        }
      }

      for (;;) {
        var doc = kb.any(prev, this.ns.link('requestedURI'));

        if (doc && doc.value) {
          kb.add(kb.rdfFactory.namedNode(doc.value), this.ns.rdf('type'), rdfType, this.appNode);
        } // convert Literal


        prev = kb.any(undefined, kb.rdfFactory.namedNode('http://www.w3.org/2007/ont/link#redirectedRequest'), prev);

        if (!prev) {
          break;
        }

        var response = kb.any(prev, kb.rdfFactory.namedNode('http://www.w3.org/2007/ont/link#response'));

        if (!response) {
          break;
        }

        var redirection = kb.any(response, kb.rdfFactory.namedNode('http://www.w3.org/2007/ont/http#status'));

        if (!redirection) {
          break;
        } // @ts-ignore always true?


        if (redirection !== '301' && redirection !== '302') {
          break;
        }
      }
    }
    /**
     * Handle fetch() response
     */

  }, {
    key: "handleResponse",
    value: function handleResponse(response, docuri, options) {
      var _this11 = this;

      var kb = this.store;
      var headers = response.headers;
      var reqNode = options.req;
      var responseNode = this.saveResponseMetadata(response, options);
      var contentType = this.normalizedContentType(options, headers) || '';
      var contentLocation = headers.get('content-location'); // this.fireCallbacks('recv', xhr.args)
      // this.fireCallbacks('headers', [{uri: docuri, headers: xhr.headers}])
      // Check for masked errors (CORS, etc)

      if (response.status === 0) {
        console.log('Masked error - status 0 for ' + docuri);
        return this.handleError(response, docuri, options);
      }

      if (response.status >= 400) {
        if (response.status === 404) {
          this.nonexistent[options.original.value] = true;
          this.nonexistent[docuri] = true;
        }

        return this.saveErrorResponse(response, responseNode).then(function () {
          var errorMessage = options.resource + ' ' + response.statusText;
          return _this11.failFetch(options, errorMessage, response.status, response);
        });
      }

      var diffLocation = null;
      var absContentLocation = null;

      if (contentLocation) {
        absContentLocation = join(contentLocation, docuri);

        if (absContentLocation !== docuri) {
          diffLocation = absContentLocation;
        }
      }

      if (response.status === 200) {
        this.addType(this.ns.link('Document'), reqNode, kb, docuri);

        if (diffLocation) {
          this.addType(this.ns.link('Document'), reqNode, kb, diffLocation);
        } // Before we parse new data clear old but only on 200


        if (options.clearPreviousData) {
          kb.removeDocument(options.resource);
        }

        var isImage = contentType.includes('image/') || contentType.includes('application/pdf');

        if (contentType && isImage) {
          this.addType(kb.rdfFactory.namedNode('http://purl.org/dc/terms/Image'), reqNode, kb, docuri);

          if (diffLocation) {
            this.addType(kb.rdfFactory.namedNode('http://purl.org/dc/terms/Image'), reqNode, kb, diffLocation);
          }
        }
      } // If we have already got the thing at this location, abort


      if (contentLocation) {
        if (!options.force && diffLocation && this.requested[absContentLocation] === 'done') {
          // we have already fetched this
          // should we smush too?
          // log.info("HTTP headers indicate we have already" + " retrieved " +
          // xhr.resource + " as " + absContentLocation + ". Aborting.")
          return this.doneFetch(options, response);
        }

        this.requested[absContentLocation] = true;
      }

      this.parseLinkHeader(headers.get('link'), options.original, reqNode);
      var handler = this.handlerForContentType(contentType, response);

      if (!handler) {
        //  Not a problem, we just don't extract data
        this.addStatus(reqNode, 'Fetch over. No data handled.');
        return this.doneFetch(options, response);
      }

      return response.text() // @ts-ignore Types seem right
      .then(function (responseText) {
        response.responseText = responseText;
        return handler.parse(_this11, responseText, options, response);
      });
    }
  }, {
    key: "saveErrorResponse",
    value: function saveErrorResponse(response, responseNode) {
      var _this12 = this;

      var kb = this.store;
      return response.text().then(function (content) {
        if (content.length > 10) {
          kb.add(responseNode, _this12.ns.http('content'), kb.rdfFactory.literal(content), responseNode);
        }
      });
    }
  }, {
    key: "handlerForContentType",
    value: function handlerForContentType(contentType, response) {
      if (!contentType) {
        return null;
      }

      var Handler = this.handlers.find(function (handler) {
        return contentType.match(handler.pattern);
      }); // @ts-ignore in practice all Handlers have constructors.

      return Handler ? new Handler(response) : null;
    }
  }, {
    key: "guessContentType",
    value: function guessContentType(uri) {
      return CONTENT_TYPE_BY_EXT[uri.split('.').pop()];
    }
  }, {
    key: "normalizedContentType",
    value: function normalizedContentType(options, headers) {
      if (options.forceContentType) {
        return options.forceContentType;
      }

      var contentType = headers.get('content-type');

      if (!contentType || contentType.includes('application/octet-stream')) {
        var guess = this.guessContentType(options.resource.value);

        if (guess) {
          return guess;
        }
      }

      var protocol$1 = protocol(options.resource.value);

      if (!contentType && ['file', 'chrome'].includes(protocol$1)) {
        return 'text/xml';
      }

      return contentType;
    }
    /**
     * Sends a new request to the specified uri. (Extracted from `onerrorFactory()`)
     */

  }, {
    key: "redirectToProxy",
    value: function redirectToProxy(newURI, options) {
      var _this13 = this;

      this.addStatus(options.req, 'BLOCKED -> Cross-site Proxy to <' + newURI + '>');
      options.proxyUsed = true;
      var kb = this.store;
      var oldReq = options.req; // request metadata blank node

      if (!options.noMeta) {
        kb.add(oldReq, this.ns.link('redirectedTo'), kb.rdfFactory.namedNode(newURI), oldReq);
        this.addStatus(oldReq, 'redirected to new request'); // why
      }

      this.requested[options.resource.value] = 'redirected';
      this.redirectedTo[options.resource.value] = newURI;
      var newOptions = Object.assign({}, options);
      newOptions.baseURI = options.resource.value;
      return this.fetchUri(newURI, newOptions).then(function (response) {
        if (!newOptions.noMeta) {
          kb.add(oldReq, _this13.ns.link('redirectedRequest'), newOptions.req, _this13.appNode);
        }

        return response;
      });
    }
  }, {
    key: "setRequestTimeout",
    value: function setRequestTimeout(uri, options) {
      var _this14 = this;

      return new Promise(function (resolve) {
        _this14.timeouts[uri] = (_this14.timeouts[uri] || []).concat(setTimeout(function () {
          if (_this14.isPending(uri) && !options.retriedWithNoCredentials && !options.proxyUsed) {
            resolve(_this14.failFetch(options, "Request to ".concat(uri, " timed out"), 'timeout'));
          }
        }, _this14.timeout));
      });
    }
  }, {
    key: "addFetchCallback",
    value: function addFetchCallback(uri, callback) {
      if (!this.fetchCallbacks[uri]) {
        this.fetchCallbacks[uri] = [callback];
      } else {
        this.fetchCallbacks[uri].push(callback);
      }
    }
  }, {
    key: "acceptString",
    value: function acceptString() {
      var acceptstring = '';

      for (var mediaType in this.mediatypes) {
        if (acceptstring !== '') {
          acceptstring += ', ';
        }

        acceptstring += mediaType;

        for (var property in this.mediatypes[mediaType]) {
          acceptstring += ';' + property + '=' + this.mediatypes[mediaType][property];
        }
      }

      return acceptstring;
    } // var updatesVia = new $rdf.UpdatesVia(this) // Subscribe to headers
    // @@@@@@@@ This is turned off because it causes a websocket to be set up for ANY fetch
    // whether we want to track it ot not. including ontologies loaed though the XSSproxy

  }], [{
    key: "crossSiteProxy",
    value: function crossSiteProxy(uri) {
      if (Fetcher.crossSiteProxyTemplate) {
        return Fetcher.crossSiteProxyTemplate.replace('{uri}', encodeURIComponent(uri));
      } else {
        return undefined;
      }
    }
  }, {
    key: "offlineOverride",
    value: function offlineOverride(uri) {
      // Map the URI to a localhost proxy if we are running on localhost
      // This is used for working offline, e.g. on planes.
      // Is the script itself is running in localhost, then access all
      //   data in a localhost mirror.
      // Do not remove without checking with TimBL
      var requestedURI = uri;
      var UI;

      if (typeof window !== 'undefined' && window.panes && (UI = window.panes.UI) && UI.preferences && UI.preferences.get('offlineModeUsingLocalhost')) {
        if (requestedURI.slice(0, 7) === 'http://' && requestedURI.slice(7, 17) !== 'localhost/') {
          requestedURI = 'http://localhost/' + requestedURI.slice(7);
          log$1.warn('Localhost kludge for offline use: actually getting <' + requestedURI + '>');
        }
      }

      return requestedURI;
    }
  }, {
    key: "proxyIfNecessary",
    value: function proxyIfNecessary(uri) {
      var UI;

      if (typeof window !== 'undefined' && window.panes && (UI = window.panes.UI) && UI.isExtension) {
        return uri;
      } // Extension does not need proxy


      if (typeof $SolidTestEnvironment !== 'undefined' && $SolidTestEnvironment.localSiteMap) {
        // nested dictionaries of URI parts from origin down
        var hostpath = uri.split('/').slice(2); // the bit after the //

        var lookup = function lookup(parts, index) {
          var z = index[parts.shift()];

          if (!z) {
            return null;
          }

          if (typeof z === 'string') {
            return z + parts.join('/');
          }

          if (!parts) {
            return null;
          }

          return lookup(parts, z);
        };

        var y = lookup(hostpath, $SolidTestEnvironment.localSiteMap);

        if (y) {
          return y;
        }
      } // browser does 2014 on as https browser script not trusted
      // If the web app origin is https: then the mixed content rules
      // prevent it loading insecure http: stuff so we need proxy.


      if (Fetcher.crossSiteProxyTemplate && typeof document !== 'undefined' && document.location && ('' + document.location).slice(0, 6) === 'https:' && // origin is secure
      uri.slice(0, 5) === 'http:') {
        // requested data is not
        return Fetcher.crossSiteProxyTemplate.replace('{uri}', encodeURIComponent(uri));
      }

      return uri;
    }
    /**
     * Tests whether the uri's protocol is supported by the Fetcher.
     * @param uri
     */

  }, {
    key: "unsupportedProtocol",
    value: function unsupportedProtocol(uri$1) {
      var pcol = protocol(uri$1);
      return pcol === 'tel' || pcol === 'mailto' || pcol === 'urn';
    }
    /** Decide on credentials using old XXHR api or new fetch()  one
     * @param requestedURI
     * @param options
     */

  }, {
    key: "setCredentials",
    value: function setCredentials(requestedURI) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      // 2014 CORS problem:
      // XMLHttpRequest cannot load http://www.w3.org/People/Berners-Lee/card.
      // A wildcard '*' cannot be used in the 'Access-Control-Allow-Origin'
      //   header when the credentials flag is true.
      // @ Many ontology files under http: and need CORS wildcard ->
      //   can't have credentials
      if (options.credentials === undefined) {
        // Caller using new fetch convention
        if (options.withCredentials !== undefined) {
          // XHR style is what Fetcher specified before
          options.credentials = options.withCredentials ? 'include' : 'omit';
        } else {
          options.credentials = 'include'; // default is to be logged on
        }
      }
    }
  }]);

  return Fetcher;
}();

_defineProperty(Fetcher, "HANDLERS", void 0);

_defineProperty(Fetcher, "CONTENT_TYPE_BY_EXT", void 0);

_defineProperty(Fetcher, "crossSiteProxyTemplate", void 0);
Fetcher.HANDLERS = defaultHandlers;
Fetcher.CONTENT_TYPE_BY_EXT = CONTENT_TYPE_BY_EXT;

var jsonparser = (function () {
  return {
    parseJSON: function parseJSON(data, source, store) {
      var subject, predicate, object;
      var bnodes = {};
      var why = store.sym(source);

      for (var x in data) {
        if (x.indexOf('_:') === 0) {
          if (bnodes[x]) {
            subject = bnodes[x];
          } else {
            subject = store.bnode(x);
            bnodes[x] = subject;
          }
        } else {
          subject = store.sym(x);
        }

        var preds = data[x];

        for (var y in preds) {
          var objects = preds[y];
          predicate = store.sym(y);

          for (var z in objects) {
            var obj = objects[z];

            if (obj.type === 'uri') {
              object = store.sym(obj.value);
              store.add(subject, predicate, object, why);
            } else if (obj.type === 'BlankNode') {
              if (bnodes[obj.value]) {
                object = bnodes[obj.value];
              } else {
                object = store.bnode(obj.value);
                bnodes[obj.value] = object;
              }

              store.add(subject, predicate, object, why);
            } else if (obj.type === 'Literal') {
              // var datatype
              if (obj.datatype) {
                object = store.literal(obj.value, undefined, store.sym(obj.datatype));
              } else if (obj.lang) {
                object = store.literal(obj.value, obj.lang);
              } else {
                object = store.literal(obj.value);
              }

              store.add(subject, predicate, object, why);
            } else {
              throw new Error('error: unexpected termtype: ' + z.type);
            }
          }
        }
      }
    }
  };
})();

function queryToSPARQL(query) {
  var indent = 0;

  function getSelect(query) {
    var str = addIndent() + 'SELECT ';

    for (var i = 0; i < query.vars.length; i++) {
      str += query.vars[i] + ' ';
    }

    str += '\n';
    return str;
  }

  function getPattern(pat) {
    var str = '';
    var st = pat.statements;

    for (var x in st) {
      log$1.debug('Found statement: ' + st);
      str += addIndent() + st[x] + '\n';
    }

    return str;
  }

  function getConstraints(pat) {
    var str = '';

    for (var v in pat.constraints) {
      var foo = pat.constraints[v];
      str += addIndent() + 'FILTER ( ' + foo.describe(v) + ' ) ' + '\n';
    }

    return str;
  }

  function getOptionals(pat) {
    var str = '';

    for (var x = 0; x < pat.optional.length; x++) {
      // alert(pat.optional.termType)
      log$1.debug('Found optional query');
      str += addIndent() + 'OPTIONAL { ' + '\n';
      indent++;
      str += getPattern(pat.optional[x]);
      str += getConstraints(pat.optional[x]);
      str += getOptionals(pat.optional[x]);
      indent--;
      str += addIndent() + '}' + '\n';
    }

    return str;
  }

  function getWhere(pat) {
    var str = addIndent() + 'WHERE \n' + '{ \n';
    indent++;
    str += getPattern(pat);
    str += getConstraints(pat);
    str += getOptionals(pat);
    indent--;
    str += '}';
    return str;
  }

  function addIndent() {
    var str = '';

    for (var i = 0; i < indent; i++) {
      str += '    ';
    }

    return str;
  }

  function getSPARQL(query) {
    return getSelect(query) + getWhere(query.pat);
  }

  return getSPARQL(query);
}

// Converting between SPARQL queries and the $rdf query API
/**
 * @SPARQL: SPARQL text that is converted to a query object which is returned.
 * @testMode: testing flag. Prevents loading of sources.
 */

function SPARQLToQuery(SPARQL, testMode, kb) {
  // AJAR_ClearTable()
  var variableHash = [];

  function makeVar(name) {
    if (variableHash[name]) {
      return variableHash[name];
    }

    var newVar = kb.variable(name);
    variableHash[name] = newVar;
    return newVar;
  } // term type functions


  function isRealText(term) {
    return typeof term === 'string' && term.match(/[^ \n\t]/);
  }

  function isVar(term) {
    return typeof term === 'string' && term.match(/^[\?\$]/);
  }

  function fixSymbolBrackets(term) {
    if (typeof term === 'string') {
      return term.replace(/^&lt;/, '<').replace(/&gt;$/, '>');
    } else {
      return term;
    }
  }

  function isSymbol(term) {
    return typeof term === 'string' && term.match(/^<[^>]*>$/);
  }

  function isBnode(term) {
    return typeof term === 'string' && (term.match(/^_:/) || term.match(/^$/));
  }

  function isPrefix(term) {
    return typeof term === 'string' && term.match(/:$/);
  }

  function isPrefixedSymbol(term) {
    return typeof term === 'string' && term.match(/^:|^[^_][^:]*:/);
  }

  function getPrefix(term) {
    var a = term.split(':');
    return a[0];
  }

  function getSuffix(term) {
    var a = term.split(':');
    return a[1];
  }

  function removeBrackets(term) {
    if (isSymbol(term)) {
      return term.slice(1, term.length - 1);
    } else {
      return term;
    }
  } // takes a string and returns an array of strings and Literals in the place of literals


  function parseLiterals(str) {
    // var sin = (str.indexOf(/[ \n]\'/)==-1)?null:str.indexOf(/[ \n]\'/), doub = (str.indexOf(/[ \n]\"/)==-1)?null:str.indexOf(/[ \n]\"/)
    var sin = str.indexOf("'") === -1 ? null : str.indexOf("'");
    var doub = str.indexOf('"') === -1 ? null : str.indexOf('"'); // alert("S: "+sin+" D: "+doub)

    if (!sin && !doub) {
      var a = new Array(1);
      a[0] = str;
      return a;
    }

    var res = new Array(2);
    var br;
    var ind;

    if (!sin || doub && doub < sin) {
      br = '"';
      ind = doub;
    } else if (!doub || sin && sin < doub) {
      br = "'";
      ind = sin;
    } else {
      log$1.error('SQARQL QUERY OOPS!');
      return res;
    }

    res[0] = str.slice(0, ind);
    var end = str.slice(ind + 1).indexOf(br);

    if (end === -1) {
      log$1.error('SPARQL parsing error: no matching parentheses in literal ' + str);
      return str;
    } // alert(str.slice(end + ind + 2).match(/^\^\^/))


    var end2;

    if (str.slice(end + ind + 2).match(/^\^\^/)) {
      end2 = str.slice(end + ind + 2).indexOf(' '); // alert(end2)

      res[1] = kb.literal(str.slice(ind + 1, ind + 1 + end), kb.sym(removeBrackets(str.slice(ind + 4 + end, ind + 2 + end + end2)))); // alert(res[1].datatype.uri)

      res = res.concat(parseLiterals(str.slice(end + ind + 3 + end2)));
    } else if (str.slice(end + ind + 2).match(/^@/)) {
      end2 = str.slice(end + ind + 2).indexOf(' '); // alert(end2)

      res[1] = kb.literal(str.slice(ind + 1, ind + 1 + end), str.slice(ind + 3 + end, ind + 2 + end + end2), null); // alert(res[1].datatype.uri)

      res = res.concat(parseLiterals(str.slice(end + ind + 2 + end2)));
    } else {
      res[1] = kb.literal(str.slice(ind + 1, ind + 1 + end));
      log$1.info('Literal found: ' + res[1]);
      res = res.concat(parseLiterals(str.slice(end + ind + 2))); // finds any other literals
    }

    return res;
  }

  function spaceDelimit(str) {
    str = str.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').replace(/</g, ' <').replace(/>/g, '> ').replace(/{/g, ' { ').replace(/}/g, ' } ').replace(/[\t\n\r]/g, ' ').replace(/; /g, ' ; ').replace(/\. /g, ' . ').replace(/, /g, ' , ');
    log$1.info('New str into spaceDelimit: \n' + str);
    var res = [];
    var br = str.split(' ');

    for (var x in br) {
      if (isRealText(br[x])) {
        res = res.concat(br[x]);
      }
    }

    return res;
  }

  function replaceKeywords(input) {
    var strarr = input;

    for (var x = 0; x < strarr.length; x++) {
      if (strarr[x] === 'a') {
        strarr[x] = '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>';
      }

      if (strarr[x] === 'is' && strarr[x + 2] === 'of') {
        strarr.splice(x, 1);
        strarr.splice(x + 1, 1);
        var s = strarr[x - 1];
        strarr[x - 1] = strarr[x + 1];
        strarr[x + 1] = s;
      }
    }

    return strarr;
  }

  function toTerms(input) {
    var res = [];

    for (var x = 0; x < input.length; x++) {
      if (typeof input[x] !== 'string') {
        res[x] = input[x];
        continue;
      }

      input[x] = fixSymbolBrackets(input[x]);

      if (isVar(input[x])) {
        res[x] = makeVar(input[x].slice(1));
      } else if (isBnode(input[x])) {
        log$1.info(input[x] + ' was identified as a bnode.');
        res[x] = kb.bnode();
      } else if (isSymbol(input[x])) {
        log$1.info(input[x] + ' was identified as a symbol.');
        res[x] = kb.sym(removeBrackets(input[x]));
      } else if (isPrefixedSymbol(input[x])) {
        log$1.info(input[x] + ' was identified as a prefixed symbol');

        if (prefixes[getPrefix(input[x])]) {
          res[x] = kb.sym(input[x] = prefixes[getPrefix(input[x])] + getSuffix(input[x]));
        } else {
          log$1.error('SPARQL error: ' + input[x] + ' with prefix ' + getPrefix(input[x]) + ' does not have a correct prefix entry.');
          res[x] = input[x];
        }
      } else {
        res[x] = input[x];
      }
    }

    return res;
  }

  function tokenize(str) {
    var token1 = parseLiterals(str);
    var token2 = [];

    for (var x in token1) {
      if (typeof token1[x] === 'string') {
        token2 = token2.concat(spaceDelimit(token1[x]));
      } else {
        token2 = token2.concat(token1[x]);
      }
    }

    token2 = replaceKeywords(token2);
    log$1.info('SPARQL Tokens: ' + token2);
    return token2;
  } // CASE-INSENSITIVE


  function arrayIndexOf(str, arr) {
    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string') {
        continue;
      }

      if (arr[i].toLowerCase() === str.toLowerCase()) {
        return i;
      }
    } // log.warn("No instance of "+str+" in array "+arr)


    return null;
  } // CASE-INSENSITIVE


  function arrayIndicesOf(str, arr) {
    var ind = [];

    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string') {
        continue;
      }

      if (arr[i].toLowerCase() === str.toLowerCase()) {
        ind.push(i);
      }
    }

    return ind;
  }

  function setVars(input, query) {
    log$1.info('SPARQL vars: ' + input);

    for (var x in input) {
      if (isVar(input[x])) {
        log$1.info('Added ' + input[x] + ' to query variables from SPARQL');
        var v = makeVar(input[x].slice(1));
        query.vars.push(v);
        v.label = input[x].slice(1);
      } else {
        log$1.warn('Incorrect SPARQL variable in SELECT: ' + input[x]);
      }
    }
  }

  function getPrefixDeclarations(input) {
    var prefInd = arrayIndicesOf('PREFIX', input);
    var res = [];

    for (var i in prefInd) {
      var a = input[prefInd[i] + 1];
      var b = input[prefInd[i] + 2];

      if (!isPrefix(a)) {
        log$1.error('Invalid SPARQL prefix: ' + a);
      } else if (!isSymbol(b)) {
        log$1.error('Invalid SPARQL symbol: ' + b);
      } else {
        log$1.info('Prefix found: ' + a + ' -> ' + b);
        var pref = getPrefix(a);
        var symbol = removeBrackets(b);
        res[pref] = symbol;
      }
    }

    return res;
  }

  function getMatchingBracket(arr, open, close) {
    log$1.info('Looking for a close bracket of type ' + close + ' in ' + arr);
    var index = 0;

    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === open) {
        index++;
      }

      if (arr[i] === close) {
        index--;
      }

      if (index < 0) {
        return i;
      }
    }

    log$1.error('Statement had no close parenthesis in SPARQL query');
    return 0;
  }


  function ConstraintEqualTo(value) {
    this.describe = function (varstr) {
      return varstr + ' = ' + value.toNT();
    };

    this.test = function (term) {
      return value.equals(term);
    };

    return this;
  } // value must be a literal


  function ConstraintRegexp(value) {
    this.describe = function (varstr) {
      return "REGEXP( '" + value + "' , " + varstr + ' )';
    };

    this.test = function (term) {
      var str = value; // str = str.replace(/^//,"").replace(//$/,"")

      var rg = new RegExp(str);

      if (term.value) {
        return rg.test(term.value);
      } else {
        return false;
      }
    };
  }

  function setConstraint(input, pat) {
    if (input.length === 3 && input[0].termType === 'Variable' && (input[2].termType === 'NamedNode' || input[2].termType === 'Literal')) {
      if (input[1] === '=') {
        log$1.debug('Constraint added: ' + input);
        pat.constraints[input[0]] = new ConstraintEqualTo(input[2]);
      } else if (input[1] === '>') {
        log$1.debug('Constraint added: ' + input);
        pat.constraints[input[0]] = new ConstraintEqualTo(input[2]);
      } else if (input[1] === '<') {
        log$1.debug('Constraint added: ' + input);
        pat.constraints[input[0]] = new ConstraintEqualTo(input[2]);
      } else {
        log$1.warn("I don't know how to handle the constraint: " + input);
      }
    } else if (input.length === 6 && typeof input[0] === 'string' && input[0].toLowerCase() === 'regexp' && input[1] === '(' && input[5] === ')' && input[3] === ',' && input[4].termType === 'Variable' && input[2].termType === 'Literal') {
      log$1.debug('Constraint added: ' + input);
      pat.constraints[input[4]] = new ConstraintRegexp(input[2].value);
    } // log.warn("I don't know how to handle the constraint: "+input)
    // alert("length: "+input.length+" input 0 type: "+input[0].termType+" input 1: "+input[1]+" input[2] type: "+input[2].termType)

  }

  function setOptional(terms, pat) {
    log$1.debug('Optional query: ' + terms + ' not yet implemented.');
    var opt = kb.formula();
    setWhere(terms, opt);
    pat.optional.push(opt);
  }

  function setWhere(input, pat) {
    var terms = toTerms(input);
    var end;
    log$1.debug('WHERE: ' + terms);
    var opt; // var opt = arrayIndicesOf("OPTIONAL",terms)

    while (arrayIndexOf('OPTIONAL', terms)) {
      opt = arrayIndexOf('OPTIONAL', terms);
      log$1.debug('OPT: ' + opt + ' ' + terms[opt] + ' in ' + terms);

      if (terms[opt + 1] !== '{') {
        log$1.warn('Bad optional opening bracket in word ' + opt);
      }

      end = getMatchingBracket(terms.slice(opt + 2), '{', '}');

      if (end === -1) {
        log$1.error('No matching bracket in word ' + opt);
      } else {
        setOptional(terms.slice(opt + 2, opt + 2 + end), pat); // alert(pat.statements[0].toNT())

        opt = arrayIndexOf('OPTIONAL', terms);
        end = getMatchingBracket(terms.slice(opt + 2), '{', '}');
        terms.splice(opt, end + 3);
      }
    }

    log$1.debug('WHERE after optionals: ' + terms);

    while (arrayIndexOf('FILTER', terms)) {
      var filt = arrayIndexOf('FILTER', terms);

      if (terms[filt + 1] !== '(') {
        log$1.warn('Bad filter opening bracket in word ' + filt);
      }

      end = getMatchingBracket(terms.slice(filt + 2), '(', ')');

      if (end === -1) {
        log$1.error('No matching bracket in word ' + filt);
      } else {
        setConstraint(terms.slice(filt + 2, filt + 2 + end), pat);
        filt = arrayIndexOf('FILTER', terms);
        end = getMatchingBracket(terms.slice(filt + 2), '(', ')');
        terms.splice(filt, end + 3);
      }
    }

    log$1.debug('WHERE after filters and optionals: ' + terms);
    extractStatements(terms, pat);
  }

  function extractStatements(terms, formula) {
    var arrayZero = new Array(1);
    arrayZero[0] = -1; // this is just to add the beginning of the where to the periods index.

    var per = arrayZero.concat(arrayIndicesOf('.', terms));
    var stat = [];

    for (var x = 0; x < per.length - 1; x++) {
      stat[x] = terms.slice(per[x] + 1, per[x + 1]);
    } // Now it's in an array of statements


    for (x in stat) {
      // THIS MUST BE CHANGED FOR COMMA, SEMICOLON
      log$1.info('s+p+o ' + x + ' = ' + stat[x]);
      var subj = stat[x][0];
      stat[x].splice(0, 1);
      var sem = arrayZero.concat(arrayIndicesOf(';', stat[x]));
      sem.push(stat[x].length);
      var stat2 = [];

      for (var y = 0; y < sem.length - 1; y++) {
        stat2[y] = stat[x].slice(sem[y] + 1, sem[y + 1]);
      }

      for (x in stat2) {
        log$1.info('p+o ' + x + ' = ' + stat[x]);
        var pred = stat2[x][0];
        stat2[x].splice(0, 1);
        var com = arrayZero.concat(arrayIndicesOf(',', stat2[x]));
        com.push(stat2[x].length);
        var stat3 = [];

        for (y = 0; y < com.length - 1; y++) {
          stat3[y] = stat2[x].slice(com[y] + 1, com[y + 1]);
        }

        for (x in stat3) {
          var obj = stat3[x][0];
          log$1.info('Subj=' + subj + ' Pred=' + pred + ' Obj=' + obj);
          formula.add(subj, pred, obj);
        }
      }
    }
  } // ******************************* Body of SPARQLToQuery ***************************//


  log$1.info('SPARQL input: \n' + SPARQL);
  var q = new Query();
  var sp = tokenize(SPARQL); // first tokenize everything

  var prefixes = getPrefixDeclarations(sp);

  if (!prefixes.rdf) {
    prefixes.rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  }

  if (!prefixes.rdfs) {
    prefixes.rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
  }

  var selectLoc = arrayIndexOf('SELECT', sp);
  var whereLoc = arrayIndexOf('WHERE', sp);

  if (selectLoc < 0 || whereLoc < 0 || selectLoc > whereLoc) {
    log$1.error('Invalid or nonexistent SELECT and WHERE tags in SPARQL query');
    return false;
  }

  setVars(sp.slice(selectLoc + 1, whereLoc), q);
  setWhere(sp.slice(whereLoc + 2, sp.length - 1), q.pat);

  if (testMode) {
    return q;
  }

  for (var x in q.pat.statements) {
    var st = q.pat.statements[x];

    if (st.subject.termType === 'NamedNode') {
      if (kb.fetcher) {
        kb.fetcher.lookUpThing(st.subject, 'sparql:' + st.subject);
      }
    }

    if (st.object.termType === 'NamedNode') {
      if (kb.fetcher) {
        kb.fetcher.lookUpThing(st.object, 'sparql:' + st.object);
      }
    }
  } // alert(q.pat)


  return q; // checkVars()
  // *******************************************************************//
}

function _createForOfIteratorHelper$2(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$2(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray$2(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$2(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen); }

function _arrayLikeToArray$2(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
* The UpdateManager is a helper object for a store.
* Just as a Fetcher provides the store with the ability to read and write,
* the Update Manager provides functionality for making small patches in real time,
* and also looking out for concurrent updates from other agents
*/
var UpdateManager = /*#__PURE__*/function () {
  /** Index of objects for coordinating incoming and outgoing patches */

  /** Object of namespaces */

  /**
   * @param  store - The quadstore to store data and metadata. Created if not passed.
  */
  function UpdateManager(store) {
    _classCallCheck(this, UpdateManager);

    _defineProperty(this, "store", void 0);

    _defineProperty(this, "ifps", void 0);

    _defineProperty(this, "fps", void 0);

    _defineProperty(this, "patchControl", void 0);

    _defineProperty(this, "ns", void 0);

    store = store || new IndexedFormula();

    if (store.updater) {
      throw new Error("You can't have two UpdateManagers for the same store");
    }

    if (!store.fetcher) {
      store.fetcher = new Fetcher(store);
    }

    this.store = store;
    store.updater = this;
    this.ifps = {};
    this.fps = {};
    this.ns = {};
    this.ns.link = Namespace('http://www.w3.org/2007/ont/link#');
    this.ns.http = Namespace('http://www.w3.org/2007/ont/http#');
    this.ns.httph = Namespace('http://www.w3.org/2007/ont/httph#');
    this.ns.ldp = Namespace('http://www.w3.org/ns/ldp#');
    this.ns.rdf = Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    this.ns.rdfs = Namespace('http://www.w3.org/2000/01/rdf-schema#');
    this.ns.rdf = Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    this.ns.owl = Namespace('http://www.w3.org/2002/07/owl#');
    this.patchControl = [];
  }

  _createClass(UpdateManager, [{
    key: "patchControlFor",
    value: function patchControlFor(doc) {
      if (!this.patchControl[doc.value]) {
        this.patchControl[doc.value] = [];
      }

      return this.patchControl[doc.value];
    }
  }, {
    key: "isHttpUri",
    value: function isHttpUri(uri) {
      return uri.slice(0, 4) === 'http';
    }
    /**
     * Tests whether a file is editable.
     * If the file has a specific annotation that it is machine written,
     * for safety, it is editable (this doesn't actually check for write access)
     * If the file has wac-allow and accept patch headers, those are respected.
     * and local write access is determined by those headers.
     * This version only looks at past HTTP requests, does not make new ones.
     *
     * @returns The method string SPARQL or DAV or
     *   LOCALFILE or false if known, undefined if not known.
     */

  }, {
    key: "editable",
    value: function editable(uri, kb) {
      if (!uri) {
        return false; // Eg subject is bnode, no known doc to write to
      }

      if (!kb) {
        kb = this.store;
      }

      uri = termValue(uri);

      if (!this.isHttpUri(uri)) {
        if (kb.holds(this.store.rdfFactory.namedNode(uri), this.store.rdfFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), this.store.rdfFactory.namedNode('http://www.w3.org/2007/ont/link#MachineEditableDocument'))) {
          return 'LOCALFILE';
        }
      }

      var request;
      var definitive = false; // @ts-ignore passes a string to kb.each, which expects a term. Should this work?

      var requests = kb.each(undefined, this.ns.link('requestedURI'), docpart(uri));
      var method;

      for (var r = 0; r < requests.length; r++) {
        request = requests[r];

        if (request !== undefined) {
          var response = kb.any(request, this.ns.link('response'));

          if (request !== undefined) {
            var wacAllow = kb.anyValue(response, this.ns.httph('wac-allow'));

            if (wacAllow) {
              var _iterator = _createForOfIteratorHelper$2(wacAllow.split(',')),
                  _step;

              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  var bit = _step.value;
                  var lr = bit.split('=');

                  if (lr[0].includes('user') && !lr[1].includes('write') && !lr[1].includes('append')) {
                    // console.log('    editable? excluded by WAC-Allow: ', wacAllow)
                    return false;
                  }
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
            }

            var acceptPatch = kb.each(response, this.ns.httph('accept-patch'));

            if (acceptPatch.length) {
              for (var i = 0; i < acceptPatch.length; i++) {
                method = acceptPatch[i].value.trim();
                if (method.indexOf('application/sparql-update') >= 0) return 'SPARQL';
                if (method.indexOf('application/sparql-update-single-match') >= 0) return 'SPARQL';
              }
            }

            var authorVia = kb.each(response, this.ns.httph('ms-author-via'));

            if (authorVia.length) {
              for (var _i = 0; _i < authorVia.length; _i++) {
                method = authorVia[_i].value.trim();

                if (method.indexOf('SPARQL') >= 0) {
                  return 'SPARQL';
                }

                if (method.indexOf('DAV') >= 0) {
                  return 'DAV';
                }
              }
            }

            if (!this.isHttpUri(uri)) {
              if (!wacAllow) return false;else return 'LOCALFILE';
            }

            var status = kb.each(response, this.ns.http('status'));

            if (status.length) {
              for (var _i2 = 0; _i2 < status.length; _i2++) {
                // @ts-ignore since statuses should be TFTerms, this should always be false
                if (status[_i2] === 200 || status[_i2] === 404) {
                  definitive = true; // return false // A definitive answer
                }
              }
            }
          }
        }
      }

      if (requests.length === 0) ; else {
        if (definitive) {
          return false; // We have got a request and it did NOT say editable => not editable
        }
      } // console.log('UpdateManager.editable: inconclusive for ' + uri + '\n')


      return undefined; // We don't know (yet) as we haven't had a response (yet)
    }
  }, {
    key: "anonymize",
    value: function anonymize(obj) {
      return obj.toNT().substr(0, 2) === '_:' && this.mentioned(obj) ? '?' + obj.toNT().substr(2) : obj.toNT();
    }
  }, {
    key: "anonymizeNT",
    value: function anonymizeNT(stmt) {
      return this.anonymize(stmt.subject) + ' ' + this.anonymize(stmt.predicate) + ' ' + this.anonymize(stmt.object) + ' .';
    }
    /**
     * Returns a list of all bnodes occurring in a statement
     * @private
     */

  }, {
    key: "statementBnodes",
    value: function statementBnodes(st) {
      return [st.subject, st.predicate, st.object].filter(function (x) {
        return isBlankNode(x);
      });
    }
    /**
     * Returns a list of all bnodes occurring in a list of statements
     * @private
     */

  }, {
    key: "statementArrayBnodes",
    value: function statementArrayBnodes(sts) {
      var bnodes = [];

      for (var i = 0; i < sts.length; i++) {
        bnodes = bnodes.concat(this.statementBnodes(sts[i]));
      }

      bnodes.sort(); // in place sort - result may have duplicates

      var bnodes2 = [];

      for (var j = 0; j < bnodes.length; j++) {
        if (j === 0 || !bnodes[j].equals(bnodes[j - 1])) {
          bnodes2.push(bnodes[j]);
        }
      }

      return bnodes2;
    }
    /**
     * Makes a cached list of [Inverse-]Functional properties
     * @private
     */

  }, {
    key: "cacheIfps",
    value: function cacheIfps() {
      this.ifps = {};
      var a = this.store.each(undefined, this.ns.rdf('type'), this.ns.owl('InverseFunctionalProperty'));

      for (var i = 0; i < a.length; i++) {
        this.ifps[a[i].value] = true;
      }

      this.fps = {};
      a = this.store.each(undefined, this.ns.rdf('type'), this.ns.owl('FunctionalProperty'));

      for (var _i3 = 0; _i3 < a.length; _i3++) {
        this.fps[a[_i3].value] = true;
      }
    }
    /**
     * Returns a context to bind a given node, up to a given depth
     * @private
     */

  }, {
    key: "bnodeContext2",
    value: function bnodeContext2(x, source, depth) {
      // Return a list of statements which indirectly identify a node
      //  Depth > 1 if try further indirection.
      //  Return array of statements (possibly empty), or null if failure
      var sts = this.store.statementsMatching(undefined, undefined, x, source); // incoming links

      var y;
      var res;

      for (var i = 0; i < sts.length; i++) {
        if (this.fps[sts[i].predicate.value]) {
          y = sts[i].subject;

          if (!y.isBlank) {
            return [sts[i]];
          }

          if (depth) {
            res = this.bnodeContext2(y, source, depth - 1);

            if (res) {
              return res.concat([sts[i]]);
            }
          }
        }
      } // outgoing links


      sts = this.store.statementsMatching(x, undefined, undefined, source);

      for (var _i4 = 0; _i4 < sts.length; _i4++) {
        if (this.ifps[sts[_i4].predicate.value]) {
          y = sts[_i4].object;

          if (!y.isBlank) {
            return [sts[_i4]];
          }

          if (depth) {
            res = this.bnodeContext2(y, source, depth - 1);

            if (res) {
              return res.concat([sts[_i4]]);
            }
          }
        }
      }

      return null; // Failure
    }
    /**
     * Returns the smallest context to bind a given single bnode
     * @private
     */

  }, {
    key: "bnodeContext1",
    value: function bnodeContext1(x, source) {
      // Return a list of statements which indirectly identify a node
      //   Breadth-first
      for (var depth = 0; depth < 3; depth++) {
        // Try simple first
        var con = this.bnodeContext2(x, source, depth);
        if (con !== null) return con;
      } // If we can't guarantee unique with logic just send all info about node


      return this.store.connectedStatements(x, source); // was:
      // throw new Error('Unable to uniquely identify bnode: ' + x.toNT())
    }
    /**
     * @private
     */

  }, {
    key: "mentioned",
    value: function mentioned(x) {
      return this.store.statementsMatching(x, null, null, null).length !== 0 || // Don't pin fresh bnodes
      this.store.statementsMatching(null, x).length !== 0 || this.store.statementsMatching(null, null, x).length !== 0;
    }
    /**
     * @private
     */

  }, {
    key: "bnodeContext",
    value: function bnodeContext(bnodes, doc) {
      var context = [];

      if (bnodes.length) {
        this.cacheIfps();

        for (var i = 0; i < bnodes.length; i++) {
          // Does this occur in old graph?
          var bnode = bnodes[i];
          if (!this.mentioned(bnode)) continue;
          context = context.concat(this.bnodeContext1(bnode, doc));
        }
      }

      return context;
    }
    /**
     * Returns the best context for a single statement
     * @private
     */

  }, {
    key: "statementContext",
    value: function statementContext(st) {
      var bnodes = this.statementBnodes(st);
      return this.bnodeContext(bnodes, st.graph);
    }
    /**
     * @private
     */

  }, {
    key: "contextWhere",
    value: function contextWhere(context) {
      var updater = this;
      return !context || context.length === 0 ? '' : 'WHERE { ' + context.map(function (x) {
        return updater.anonymizeNT(x);
      }).join('\n') + ' }\n';
    }
    /**
     * @private
     */

  }, {
    key: "fire",
    value: function fire(uri, query, callbackFunction) {
      var _this = this;

      return Promise.resolve().then(function () {
        if (!uri) {
          throw new Error('No URI given for remote editing operation: ' + query);
        } // console.log('UpdateManager: sending update to <' + uri + '>')


        var options = {
          noMeta: true,
          contentType: 'application/sparql-update',
          body: query
        };
        return _this.store.fetcher.webOperation('PATCH', uri, options);
      }).then(function (response) {
        if (!response.ok) {
          var _message = 'UpdateManager: update failed for <' + uri + '> status=' + response.status + ', ' + response.statusText + '\n   for query: ' + query; // console.log(message)


          throw new Error(_message);
        } // console.log('UpdateManager: update Ok for <' + uri + '>')


        callbackFunction(uri, response.ok, response.responseText, response);
      }).catch(function (err) {
        callbackFunction(uri, false, err.message, err);
      });
    } // ARE THESE THEE FUNCTIONS USED? DEPROCATE?

    /** return a statemnet updating function
     *
     * This does NOT update the statement.
     * It returns an object which includes
     *  function which can be used to change the object of the statement.
     */

  }, {
    key: "update_statement",
    value: function update_statement(statement) {
      if (statement && !statement.graph) {
        return;
      }

      var updater = this;
      var context = this.statementContext(statement);
      return {
        statement: statement ? [statement.subject, statement.predicate, statement.object, statement.graph] : undefined,
        statementNT: statement ? this.anonymizeNT(statement) : undefined,
        where: updater.contextWhere(context),
        set_object: function set_object(obj, callbackFunction) {
          var query = this.where;
          query += 'DELETE DATA { ' + this.statementNT + ' } ;\n';
          query += 'INSERT DATA { ' + // @ts-ignore `this` might refer to the wrong scope. Does this work?
          this.anonymize(this.statement[0]) + ' ' + // @ts-ignore
          this.anonymize(this.statement[1]) + ' ' + // @ts-ignore
          this.anonymize(obj) + ' ' + ' . }\n';
          updater.fire(this.statement[3].value, query, callbackFunction);
        }
      };
    }
  }, {
    key: "insert_statement",
    value: function insert_statement(st, callbackFunction) {
      var st0 = st instanceof Array ? st[0] : st;
      var query = this.contextWhere(this.statementContext(st0));

      if (st instanceof Array) {
        var stText = '';

        for (var i = 0; i < st.length; i++) {
          stText += st[i] + '\n';
        }

        query += 'INSERT DATA { ' + stText + ' }\n';
      } else {
        query += 'INSERT DATA { ' + this.anonymize(st.subject) + ' ' + this.anonymize(st.predicate) + ' ' + this.anonymize(st.object) + ' ' + ' . }\n';
      }

      this.fire(st0.graph.value, query, callbackFunction);
    }
  }, {
    key: "delete_statement",
    value: function delete_statement(st, callbackFunction) {
      var st0 = st instanceof Array ? st[0] : st;
      var query = this.contextWhere(this.statementContext(st0));

      if (st instanceof Array) {
        var stText = '';

        for (var i = 0; i < st.length; i++) {
          stText += st[i] + '\n';
        }

        query += 'DELETE DATA { ' + stText + ' }\n';
      } else {
        query += 'DELETE DATA { ' + this.anonymize(st.subject) + ' ' + this.anonymize(st.predicate) + ' ' + this.anonymize(st.object) + ' ' + ' . }\n';
      }

      this.fire(st0.graph.value, query, callbackFunction);
    } /// //////////////////////

    /**
     * Requests a now or future action to refresh changes coming downstream
     * This is designed to allow the system to re-request the server version,
     * when a websocket has pinged to say there are changes.
     * If the websocket, by contrast, has sent a patch, then this may not be necessary.
     *
     * @param doc
     * @param action
     */

  }, {
    key: "requestDownstreamAction",
    value: function requestDownstreamAction(doc, action) {
      var control = this.patchControlFor(doc);

      if (!control.pendingUpstream) {
        action(doc);
      } else {
        if (control.downstreamAction) {
          if ('' + control.downstreamAction !== '' + action) {
            // Kludge compare
            throw new Error("Can't wait for > 1 different downstream actions");
          }
        } else {
          control.downstreamAction = action;
        }
      }
    }
    /**
     * We want to start counting websocket notifications
     * to distinguish the ones from others from our own.
     */

  }, {
    key: "clearUpstreamCount",
    value: function clearUpstreamCount(doc) {
      var control = this.patchControlFor(doc);
      control.upstreamCount = 0;
    }
  }, {
    key: "getUpdatesVia",
    value: function getUpdatesVia(doc) {
      var linkHeaders = this.store.fetcher.getHeader(doc, 'updates-via');
      if (!linkHeaders || !linkHeaders.length) return null;
      return linkHeaders[0].trim();
    }
  }, {
    key: "addDownstreamChangeListener",
    value: function addDownstreamChangeListener(doc, listener) {
      var _this2 = this;

      var control = this.patchControlFor(doc);

      if (!control.downstreamChangeListeners) {
        control.downstreamChangeListeners = [];
      }

      control.downstreamChangeListeners.push(listener);
      this.setRefreshHandler(doc, function (doc) {
        _this2.reloadAndSync(doc);
      });
    }
  }, {
    key: "reloadAndSync",
    value: function reloadAndSync(doc) {
      var control = this.patchControlFor(doc);
      var updater = this;

      if (control.reloading) {
        // console.log('   Already reloading - note this load may be out of date')
        control.outOfDate = true;
        return; // once only needed @@ Not true, has changed again
      }

      control.reloading = true;
      var retryTimeout = 1000; // ms

      var tryReload = function tryReload() {
        // console.log('try reload - timeout = ' + retryTimeout)
        updater.reload(updater.store, doc, function (ok, message, response) {
          if (ok) {
            if (control.downstreamChangeListeners) {
              for (var i = 0; i < control.downstreamChangeListeners.length; i++) {
                // console.log('        Calling downstream listener ' + i)
                control.downstreamChangeListeners[i]();
              }
            }

            control.reloading = false;

            if (control.outOfDate) {
              // console.log('   Extra reload because of extra update.')
              control.outOfDate = false;
              tryReload();
            }
          } else {
            control.reloading = false;

            if (response.status === 0) {
              // console.log('Network error refreshing the data. Retrying in ' +
              // retryTimeout / 1000)
              control.reloading = true;
              retryTimeout = retryTimeout * 2;
              setTimeout(tryReload, retryTimeout);
            }
          }
        });
      };

      tryReload();
    }
    /**
     * Sets up websocket to listen on
     *
     * There is coordination between upstream changes and downstream ones
     * so that a reload is not done in the middle of an upstream patch.
     * If you use this API then you get called when a change happens, and you
     * have to reload the file yourself, and then refresh the UI.
     * Alternative is addDownstreamChangeListener(), where you do not
     * have to do the reload yourself. Do mot mix them.
     *
     * kb contains the HTTP  metadata from previous operations
     *
     * @param doc
     * @param handler
     *
     * @returns {boolean}
     */

  }, {
    key: "setRefreshHandler",
    value: function setRefreshHandler(doc, handler) {
      var wssURI = this.getUpdatesVia(doc); // relative
      // var kb = this.store

      var theHandler = handler;
      var self = this;
      var updater = this;
      var retryTimeout = 1500; // *2 will be 3 Seconds, 6, 12, etc

      var retries = 0;

      if (!wssURI) {
        // console.log('Server does not support live updates through Updates-Via :-(')
        return false;
      }

      wssURI = join(wssURI, doc.value);
      var validWssURI = wssURI.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'); // console.log('Web socket URI ' + wssURI)

      var openWebsocket = function openWebsocket() {
        // From https://github.com/solid/solid-spec#live-updates
        var socket;

        if (typeof WebSocket !== 'undefined') {
          socket = new WebSocket(validWssURI);
        } else if (typeof window !== 'undefined' && window.WebSocket) {
          socket = window.WebSocket(validWssURI);
        } else {
          // console.log('Live update disabled, as WebSocket not supported by platform :-(')
          return;
        }

        socket.onopen = function () {
          // console.log('    websocket open')
          retryTimeout = 1500; // reset timeout to fast on success

          this.send('sub ' + doc.value);

          if (retries) {
            // console.log('Web socket has been down, better check for any news.')
            updater.requestDownstreamAction(doc, theHandler);
          }
        };

        var control = self.patchControlFor(doc);
        control.upstreamCount = 0;

        socket.onerror = function onerror(err) {// console.log('Error on Websocket:', err)
        }; // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
        //
        // 1000  CLOSE_NORMAL  Normal closure; the connection successfully completed whatever purpose for which it was created.
        // 1001  CLOSE_GOING_AWAY  The endpoint is going away, either
        //                                  because of a server failure or because the browser is navigating away from the page that opened the connection.
        // 1002  CLOSE_PROTOCOL_ERROR  The endpoint is terminating the connection due to a protocol error.
        // 1003  CLOSE_UNSUPPORTED  The connection is being terminated because the endpoint
        //                                  received data of a type it cannot accept (for example, a text-only endpoint received binary data).
        // 1004                             Reserved. A meaning might be defined in the future.
        // 1005  CLOSE_NO_STATUS  Reserved.  Indicates that no status code was provided even though one was expected.
        // 1006  CLOSE_ABNORMAL  Reserved. Used to indicate that a connection was closed abnormally (
        //
        //


        socket.onclose = function (event) {
          // console.log('*** Websocket closed with code ' + event.code +
          //   ", reason '" + event.reason + "' clean = " + event.wasClean)
          retryTimeout *= 2;
          retries += 1; // console.log('Retrying in ' + retryTimeout + 'ms') // (ask user?)

          setTimeout(function () {
            // console.log('Trying websocket again')
            openWebsocket();
          }, retryTimeout);
        };

        socket.onmessage = function (msg) {
          if (msg.data && msg.data.slice(0, 3) === 'pub') {
            if ('upstreamCount' in control) {
              control.upstreamCount -= 1;

              if (control.upstreamCount >= 0) {
                // console.log('just an echo: ' + control.upstreamCount)
                return; // Just an echo
              }
            } // console.log('Assume a real downstream change: ' + control.upstreamCount + ' -> 0')


            control.upstreamCount = 0;
            self.requestDownstreamAction(doc, theHandler);
          }
        };
      }; // openWebsocket


      openWebsocket();
      return true;
    }
    /**
     * This high-level function updates the local store iff the web is changed successfully.
     * Deletions, insertions may be undefined or single statements or lists or formulae (may contain bnodes which can be indirectly identified by a where clause).
     * The `why` property of each statement must be the give the web document to be updated.
     * The statements to be deleted and inserted may span more than one web document.
     * @param deletions - Statement or statements to be deleted.
     * @param insertions - Statement or statements to be inserted.
     * @returns a promise
     */

  }, {
    key: "updateMany",
    value: function updateMany(deletions) {
      var insertions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var docs = deletions.concat(insertions).map(function (st) {
        return st.why;
      });
      var thisUpdater = this;
      var uniqueDocs = [];
      docs.forEach(function (doc) {
        if (!uniqueDocs.find(function (uniqueDoc) {
          return uniqueDoc.equals(doc);
        })) uniqueDocs.push(doc);
      });
      var updates = uniqueDocs.map(function (doc) {
        return thisUpdater.update(deletions.filter(function (st) {
          return st.why.equals(doc);
        }), insertions.filter(function (st) {
          return st.why.equals(doc);
        }));
      });

      if (updates.length > 1) {
        console.log("@@ updateMany to ".concat(updates.length, ": ").concat(uniqueDocs));
      }

      return Promise.all(updates);
    }
    /**
     * This high-level function updates the local store iff the web is changed successfully.
     * Deletions, insertions may be undefined or single statements or lists or formulae (may contain bnodes which can be indirectly identified by a where clause).
     * The `why` property of each statement must be the same and give the web document to be updated.
     * @param deletions - Statement or statements to be deleted.
     * @param insertions - Statement or statements to be inserted.
     * @param callback - called as callbackFunction(uri, success, errorbody)
     *           OR returns a promise
     */

  }, {
    key: "update",
    value: function update(deletions, insertions, callback, secondTry) {
      var _this3 = this;

      if (!callback) {
        var thisUpdater = this;
        return new Promise(function (resolve, reject) {
          // Promise version
          thisUpdater.update(deletions, insertions, function (uri, ok, errorBody) {
            if (!ok) {
              reject(new Error(errorBody));
            } else {
              resolve();
            }
          }); // callbackFunction
        }); // promise
      } // if


      try {
        var kb = this.store;
        var ds = !deletions ? [] : isStore(deletions) ? deletions.statements : deletions instanceof Array ? deletions : [deletions];
        var is = !insertions ? [] : isStore(insertions) ? insertions.statements : insertions instanceof Array ? insertions : [insertions];

        if (!(ds instanceof Array)) {
          throw new Error('Type Error ' + _typeof(ds) + ': ' + ds);
        }

        if (!(is instanceof Array)) {
          throw new Error('Type Error ' + _typeof(is) + ': ' + is);
        }

        if (ds.length === 0 && is.length === 0) {
          return callback(null, true); // success -- nothing needed to be done.
        }

        var doc = ds.length ? ds[0].graph : is[0].graph;

        if (!doc) {
          var _message2 = 'Error patching: statement does not specify which document to patch:' + ds[0] + ', ' + is[0]; // console.log(message)


          throw new Error(_message2);
        }

        var control = this.patchControlFor(doc);
        var startTime = Date.now();
        var props = ['subject', 'predicate', 'object', 'why'];
        var verbs = ['insert', 'delete'];
        var clauses = {
          'delete': ds,
          'insert': is
        };
        verbs.map(function (verb) {
          clauses[verb].map(function (st) {
            if (!doc.equals(st.graph)) {
              throw new Error('update: destination ' + doc + ' inconsistent with delete quad ' + st.graph);
            }

            props.map(function (prop) {
              if (typeof st[prop] === 'undefined') {
                throw new Error('update: undefined ' + prop + ' of statement.');
              }
            });
          });
        });
        var protocol = this.editable(doc.value, kb);

        if (protocol === false) {
          throw new Error('Update: Can\'t make changes in uneditable ' + doc);
        }

        if (protocol === undefined) {
          // Not enough metadata
          if (secondTry) {
            throw new Error('Update: Loaded ' + doc + "but stil can't figure out what editing protcol it supports.");
          } // console.log(`Update: have not loaded ${doc} before: loading now...`);


          this.store.fetcher.load(doc).then(function (response) {
            _this3.update(deletions, insertions, callback, true);
          }, function (err) {
            if (err.response.status === 404) {
              // nonexistent files are fine
              _this3.update(deletions, insertions, callback, true);
            } else {
              throw new Error("Update: Can't get updatability status ".concat(doc, " before patching: ").concat(err));
            }
          });
          return;
        } else if (protocol.indexOf('SPARQL') >= 0) {
          var bnodes = [];
          if (ds.length) bnodes = this.statementArrayBnodes(ds);
          if (is.length) bnodes = bnodes.concat(this.statementArrayBnodes(is));
          var context = this.bnodeContext(bnodes, doc);
          var whereClause = this.contextWhere(context);
          var query = '';

          if (whereClause.length) {
            // Is there a WHERE clause?
            if (ds.length) {
              query += 'DELETE { ';

              for (var i = 0; i < ds.length; i++) {
                query += this.anonymizeNT(ds[i]) + '\n';
              }

              query += ' }\n';
            }

            if (is.length) {
              query += 'INSERT { ';

              for (var _i5 = 0; _i5 < is.length; _i5++) {
                query += this.anonymizeNT(is[_i5]) + '\n';
              }

              query += ' }\n';
            }

            query += whereClause;
          } else {
            // no where clause
            if (ds.length) {
              query += 'DELETE DATA { ';

              for (var _i6 = 0; _i6 < ds.length; _i6++) {
                query += this.anonymizeNT(ds[_i6]) + '\n';
              }

              query += ' } \n';
            }

            if (is.length) {
              if (ds.length) query += ' ; ';
              query += 'INSERT DATA { ';

              for (var _i7 = 0; _i7 < is.length; _i7++) {
                query += this.anonymizeNT(is[_i7]) + '\n';
              }

              query += ' }\n';
            }
          } // Track pending upstream patches until they have finished their callbackFunction


          control.pendingUpstream = control.pendingUpstream ? control.pendingUpstream + 1 : 1;

          if ('upstreamCount' in control) {
            control.upstreamCount += 1; // count changes we originated ourselves
            // console.log('upstream count up to : ' + control.upstreamCount)
          }

          this.fire(doc.value, query, function (uri, success, body, response) {
            response.elapsedTimeMs = Date.now() - startTime;
            console.log('    UpdateManager: Return ' + (success ? 'success ' : 'FAILURE ') + response.status + ' elapsed ' + response.elapsedTimeMs + 'ms');

            if (success) {
              try {
                kb.remove(ds);
              } catch (e) {
                success = false;
                body = 'Remote Ok BUT error deleting ' + ds.length + ' from store!!! ' + e;
              } // Add in any case -- help recover from weirdness??


              for (var _i8 = 0; _i8 < is.length; _i8++) {
                kb.add(is[_i8].subject, is[_i8].predicate, is[_i8].object, doc);
              }
            }

            callback(uri, success, body, response);
            control.pendingUpstream -= 1; // When upstream patches have been sent, reload state if downstream waiting

            if (control.pendingUpstream === 0 && control.downstreamAction) {
              var downstreamAction = control.downstreamAction;
              delete control.downstreamAction; // console.log('delayed downstream action:')

              downstreamAction(doc);
            }
          });
        } else if (protocol.indexOf('DAV') >= 0) {
          this.updateDav(doc, ds, is, callback);
        } else {
          if (protocol.indexOf('LOCALFILE') >= 0) {
            try {
              this.updateLocalFile(doc, ds, is, callback);
            } catch (e) {
              callback(doc.value, false, 'Exception trying to write back file <' + doc.value + '>\n' // + tabulator.Util.stackString(e))
              );
            }
          } else {
            throw new Error("Unhandled edit method: '" + protocol + "' for " + doc);
          }
        }
      } catch (e) {
        callback(undefined, false, 'Exception in update: ' + e + '\n' + stackString(e));
      }
    }
  }, {
    key: "updateDav",
    value: function updateDav(doc, ds, is, callbackFunction) {
      var kb = this.store; // The code below is derived from Kenny's UpdateCenter.js

      var request = kb.any(doc, this.ns.link('request'));

      if (!request) {
        throw new Error('No record of our HTTP GET request for document: ' + doc);
      } // should not happen


      var response = kb.any(request, this.ns.link('response'));

      if (!response) {
        return null; // throw "No record HTTP GET response for document: "+doc
      }

      var contentType = kb.the(response, this.ns.httph('content-type')).value; // prepare contents of revised document

      var newSts = kb.statementsMatching(undefined, undefined, undefined, doc).slice(); // copy!

      for (var i = 0; i < ds.length; i++) {
        RDFArrayRemove(newSts, ds[i]);
      }

      for (var _i9 = 0; _i9 < is.length; _i9++) {
        newSts.push(is[_i9]);
      }

      var documentString = this.serialize(doc.value, newSts, contentType); // Write the new version back

      var candidateTarget = kb.the(response, this.ns.httph('content-location'));
      var targetURI;

      if (candidateTarget) {
        targetURI = join(candidateTarget.value, targetURI);
      }

      var options = {
        contentType: contentType,
        noMeta: true,
        body: documentString
      };
      return kb.fetcher.webOperation('PUT', targetURI, options).then(function (response) {
        if (!response.ok) {
          throw new Error(response.error);
        }

        for (var _i10 = 0; _i10 < ds.length; _i10++) {
          kb.remove(ds[_i10]);
        }

        for (var _i11 = 0; _i11 < is.length; _i11++) {
          kb.add(is[_i11].subject, is[_i11].predicate, is[_i11].object, doc);
        }

        callbackFunction(doc.value, response.ok, response.responseText, response);
      }).catch(function (err) {
        callbackFunction(doc.value, false, err.message, err);
      });
    }
    /**
     * Likely deprecated, since this lib no longer deals with browser extension
     *
     * @param doc
     * @param ds
     * @param is
     * @param callbackFunction
     */

  }, {
    key: "updateLocalFile",
    value: function updateLocalFile(doc, ds, is, callbackFunction) {
      var kb = this.store; // console.log('Writing back to local file\n')
      // prepare contents of revised document

      var newSts = kb.statementsMatching(undefined, undefined, undefined, doc).slice(); // copy!

      for (var i = 0; i < ds.length; i++) {
        RDFArrayRemove(newSts, ds[i]);
      }

      for (var _i12 = 0; _i12 < is.length; _i12++) {
        newSts.push(is[_i12]);
      } // serialize to the appropriate format


      var dot = doc.value.lastIndexOf('.');

      if (dot < 1) {
        throw new Error('Rewriting file: No filename extension: ' + doc.value);
      }

      var ext = doc.value.slice(dot + 1);
      var contentType = Fetcher.CONTENT_TYPE_BY_EXT[ext];

      if (!contentType) {
        throw new Error('File extension .' + ext + ' not supported for data write');
      }

      var documentString = this.serialize(doc.value, newSts, contentType);
      kb.fetcher.webOperation('PUT', doc.value, {
        "body": documentString,
        contentType: contentType
      }).then(function (response) {
        if (!response.ok) return callbackFunction(doc.value, false, response.error);

        for (var _i13 = 0; _i13 < ds.length; _i13++) {
          kb.remove(ds[_i13]);
        }

        for (var _i14 = 0; _i14 < is.length; _i14++) {
          kb.add(is[_i14].subject, is[_i14].predicate, is[_i14].object, doc);
        }

        callbackFunction(doc.value, true, ''); // success!
      });
    }
    /**
     * @throws {Error} On unsupported content type
     *
     * @returns {string}
     */

  }, {
    key: "serialize",
    value: function serialize(uri, data, contentType) {
      var kb = this.store;
      var documentString;

      if (typeof data === 'string') {
        return data;
      } // serialize to the appropriate format


      var sz = createSerializer(kb);
      sz.suggestNamespaces(kb.namespaces);
      sz.setBase(uri);

      switch (contentType) {
        case 'text/xml':
        case 'application/rdf+xml':
          documentString = sz.statementsToXML(data);
          break;

        case 'text/n3':
        case 'text/turtle':
        case 'application/x-turtle': // Legacy

        case 'application/n3':
          // Legacy
          documentString = sz.statementsToN3(data);
          break;

        default:
          throw new Error('Content-type ' + contentType + ' not supported for data serialization');
      }

      return documentString;
    }
    /**
     * This is suitable for an initial creation of a document.
     */

  }, {
    key: "put",
    value: function put(doc, data, contentType, callback) {
      var _this4 = this;

      var kb = this.store;
      var documentString;
      return Promise.resolve().then(function () {
        documentString = _this4.serialize(doc.value, data, contentType);
        return kb.fetcher.webOperation('PUT', doc.value, {
          contentType: contentType,
          body: documentString
        });
      }).then(function (response) {
        if (!response.ok) {
          return callback(doc.value, response.ok, response.error, response);
        }

        delete kb.fetcher.nonexistent[doc.value];
        delete kb.fetcher.requested[doc.value]; // @@ could this mess with the requested state machine? if a fetch is in progress

        if (typeof data !== 'string') {
          data.map(function (st) {
            kb.addStatement(st);
          });
        }

        callback(doc.value, response.ok, '', response);
      }).catch(function (err) {
        callback(doc.value, false, err.message);
      });
    }
    /**
     * Reloads a document.
     *
     * Fast and cheap, no metadata. Measure times for the document.
     * Load it provisionally.
     * Don't delete the statements before the load, or it will leave a broken
     * document in the meantime.
     *
     * @param kb
     * @param doc {RDFlibNamedNode}
     * @param callbackFunction
     */

  }, {
    key: "reload",
    value: function reload(kb, doc, callbackFunction) {
      var startTime = Date.now(); // force sets no-cache and

      var options = {
        force: true,
        noMeta: true,
        clearPreviousData: true
      };
      kb.fetcher.nowOrWhenFetched(doc.value, options, function (ok, body, response) {
        if (!ok) {
          // console.log('    ERROR reloading data: ' + body)
          callbackFunction(false, 'Error reloading data: ' + body, response); //@ts-ignore Where does onErrorWasCalled come from?
        } else if (response.onErrorWasCalled || response.status !== 200) {
          // console.log('    Non-HTTP error reloading data! onErrorWasCalled=' +
          //@ts-ignore Where does onErrorWasCalled come from?
          // response.onErrorWasCalled + ' status: ' + response.status)
          callbackFunction(false, 'Non-HTTP error reloading data: ' + body, response);
        } else {
          var elapsedTimeMs = Date.now() - startTime;
          if (!doc.reloadTimeTotal) doc.reloadTimeTotal = 0;
          if (!doc.reloadTimeCount) doc.reloadTimeCount = 0;
          doc.reloadTimeTotal += elapsedTimeMs;
          doc.reloadTimeCount += 1; // console.log('    Fetch took ' + elapsedTimeMs + 'ms, av. of ' +
          // doc.reloadTimeCount + ' = ' +
          // (doc.reloadTimeTotal / doc.reloadTimeCount) + 'ms.')

          callbackFunction(true);
        }
      });
    }
  }]);

  return UpdateManager;
}();

function ownKeys$2(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$2(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$2(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$2(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/** Full RDFLib.js Data Factory */
var RDFlibDataFactory = _objectSpread$2(_objectSpread$2({}, ExtendedTermFactory), {}, {
  /**
   * Creates a new fetcher
   * @param store - The store to use
   * @param options - The options
   */
  fetcher: function fetcher(store, options) {
    return new Fetcher(store, options);
  },

  /**
   * Creates a new graph (store)
   */
  graph: function graph() {
    var features = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    return new IndexedFormula(features, opts || {
      rdfFactory: ExtendedTermFactory
    });
  },

  /**
   * Creates a new literal node
   * @param val The lexical value
   * @param lang The language
   * @param dt The datatype
   */
  lit: function lit(val, lang, dt) {
    return this.literal('' + val, lang || dt);
  },

  /**
   * Creates a new statement
   * @param subject The subject
   * @param predicate The predicate
   * @param object The object
   * @param graph The containing graph
   */
  st: function st(subject, predicate, object, graph) {
    return this.quad(subject, predicate, object, graph);
  }
});

var UpdatesSocket = /*#__PURE__*/function () {
  function UpdatesSocket(parent, via) {
    _classCallCheck(this, UpdatesSocket);

    this.parent = parent;
    this.via = via;
    this.connected = false;
    this.pending = {};
    this.subscribed = {};
    this.socket = {};

    try {
      this.socket = new WebSocket(via);
      this.socket.onopen = this.onOpen;
      this.socket.onclose = this.onClose;
      this.socket.onmessage = this.onMessage;
      this.socket.onerror = this.onError;
    } catch (error) {
      this.onError(error);
    }
  }

  _createClass(UpdatesSocket, [{
    key: "_decode",
    value: function _decode(q) {
      var elt;
      var i;
      var k;
      var r;
      var ref;
      var ref1;
      var v;
      r = {};

      ref = function () {
        var j, len, ref, results;
        ref = q.split('&');
        results = [];

        for (j = 0, len = ref.length; j < len; j++) {
          elt = ref[j];
          results.push(elt.split('='));
        }

        return results;
      }();

      for (i in ref) {
        elt = ref[i];
        ref1 = [decodeURIComponent(elt[0]), decodeURIComponent(elt[1])];
        k = ref1[0];
        v = ref1[1];

        if (r[k] == null) {
          r[k] = [];
        }

        r[k].push(v);
      }

      return r;
    }
  }, {
    key: "_send",
    value: function _send(method, uri, data) {
      var base, message;
      message = [method, uri, data].join(' ');
      return typeof (base = this.socket).send === 'function' ? base.send(message) : void 0;
    }
  }, {
    key: "_subscribe",
    value: function _subscribe(uri) {
      this._send('sub', uri, '');

      this.subscribed[uri] = true;
      return this.subscribed[uri];
    }
  }, {
    key: "onClose",
    value: function onClose(e) {
      var uri;
      this.connected = false;

      for (uri in this.subscribed) {
        this.pending[uri] = true;
      }

      this.subscribed = {};
      return this.subscribed;
    }
  }, {
    key: "onError",
    value: function onError(e) {
      throw new Error('onError' + e);
    }
  }, {
    key: "onMessage",
    value: function onMessage(e) {
      var base, message;
      message = e.data.split(' ');

      if (message[0] === 'ping') {
        return typeof (base = this.socket).send === 'function' ? base.send('pong ' + message.slice(1).join(' ')) : void 0;
      } else if (message[0] === 'pub') {
        return this.parent.onUpdate(message[1], this._decode(message[2]));
      }
    }
  }, {
    key: "onOpen",
    value: function onOpen(e) {
      var results, uri;
      this.connected = true;
      results = [];

      for (uri in this.pending) {
        delete this.pending[uri];
        results.push(this._subscribe(uri));
      }

      return results;
    }
  }, {
    key: "subscribe",
    value: function subscribe(uri) {
      if (this.connected) {
        return this._subscribe(uri);
      } else {
        this.pending[uri] = true;
        return this.pending[uri];
      }
    }
  }]);

  return UpdatesSocket;
}();
var UpdatesVia = /*#__PURE__*/function () {
  function UpdatesVia(fetcher) {
    _classCallCheck(this, UpdatesVia);

    this.fetcher = fetcher;
    this.graph = {};
    this.via = {};
    this.fetcher.addCallback('headers', this.onHeaders);
  }

  _createClass(UpdatesVia, [{
    key: "onHeaders",
    value: function onHeaders(d) {
      var etag, uri, via;

      if (d.headers == null) {
        return true;
      }

      if (typeof WebSocket === 'undefined' || WebSocket === null) {
        return true;
      }

      etag = d.headers['etag'];
      via = d.headers['updates-via'];
      uri = d.uri;

      if (etag && via) {
        this.graph[uri] = {
          etag: etag,
          via: via
        };
        this.register(via, uri);
      }

      return true;
    }
  }, {
    key: "onUpdate",
    value: function onUpdate(uri, d) {
      return this.fetcher.refresh(RDFlibDataFactory.namedNode(uri));
    }
  }, {
    key: "register",
    value: function register(via, uri) {
      if (this.via[via] == null) {
        this.via[via] = new UpdatesSocket(this, via);
      }

      return this.via[via].subscribe(uri);
    }
  }]);

  return UpdatesVia;
}();

function _createSuper$a(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct$a(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct$a() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var boundDataFactory = {};

for (var name in RDFlibDataFactory) {
  if (typeof RDFlibDataFactory[name] === 'function') boundDataFactory[name] = RDFlibDataFactory[name].bind(RDFlibDataFactory);
}

var fetcher = boundDataFactory.fetcher,
    graph = boundDataFactory.graph,
    lit = boundDataFactory.lit,
    st = boundDataFactory.st,
    namedNode = boundDataFactory.namedNode,
    variable = boundDataFactory.variable,
    blankNode = boundDataFactory.blankNode,
    defaultGraph$1 = boundDataFactory.defaultGraph,
    literal = boundDataFactory.literal,
    quad$1 = boundDataFactory.quad,
    triple = boundDataFactory.triple;
var formula = new Formula();

var fromNT = function fromNT(str) {
  return formula.fromNT(str);
};

var term = Node$2.fromValue; // TODO: this export is broken;
// it exports the _current_ value of nextId, which is always 0

var NextId = BlankNode.nextId;
var ConnectedStore = /*#__PURE__*/function (_Store) {
  _inherits(ConnectedStore, _Store);

  var _super = _createSuper$a(ConnectedStore);

  function ConnectedStore(features) {
    var _this;

    _classCallCheck(this, ConnectedStore);

    _this = _super.call(this, features);

    _defineProperty(_assertThisInitialized(_this), "fetcher", void 0);

    _this.fetcher = new Fetcher(_assertThisInitialized(_this), {});
    return _this;
  }

  return _createClass(ConnectedStore);
}(IndexedFormula);
var LiveStore = /*#__PURE__*/function (_ConnectedStore) {
  _inherits(LiveStore, _ConnectedStore);

  var _super2 = _createSuper$a(LiveStore);

  function LiveStore(features) {
    var _this2;

    _classCallCheck(this, LiveStore);

    _this2 = _super2.call(this, features);

    _defineProperty(_assertThisInitialized(_this2), "updater", void 0);

    _this2.updater = new UpdateManager(_assertThisInitialized(_this2));
    return _this2;
  }

  return _createClass(LiveStore);
}(ConnectedStore);

export { BlankNode, Collection, ConnectedStore, RDFlibDataFactory as DataFactory, Empty, Fetcher, Formula, IndexedFormula, Literal, LiveStore, createSinkParser as N3Parser, NamedNode, Namespace, NextId, Node$2 as Node, Query, RDFParser, RDFaProcessor, SPARQLToQuery, createSerializer as Serializer, Statement, IndexedFormula as Store, UpdateManager, UpdatesSocket, UpdatesVia, utilsJs as Util, Variable, blankNode, convert, defaultGraph$1 as defaultGraph, fetcher, fromNT, graph, isBlankNode, isCollection, isGraph, isLiteral, isNamedNode, isPredicate, isQuad, isRDFObject, isRDFlibObject, isStatement, isStore, isSubject, isTerm, isVariable, jsonparser as jsonParser, lit, literal, log$1 as log, namedNode, parse$1 as parse, quad$1 as quad, queryToSPARQL, serialize, sparqlUpdateParser, st, namedNode as sym, term, termValue, triple, uri, variable };
