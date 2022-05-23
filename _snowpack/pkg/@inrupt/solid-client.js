import { B as Buffer, N as N3Writer, a as N3Parser } from '../common/N3Writer-744d9ae7.js';
import '../common/_commonjsHelpers-fdecda49.js';

function hasResourceInfo(resource) {
  const potentialResourceInfo = resource;
  return typeof potentialResourceInfo === "object" && typeof potentialResourceInfo.internal_resourceInfo === "object";
}
function hasServerResourceInfo(resource) {
  const potentialResourceInfo = resource;
  return typeof potentialResourceInfo === "object" && typeof potentialResourceInfo.internal_resourceInfo === "object" && typeof potentialResourceInfo.internal_resourceInfo.linkedResources === "object";
}
function hasChangelog(dataset) {
  const potentialChangeLog = dataset;
  return typeof potentialChangeLog.internal_changeLog === "object" && Array.isArray(potentialChangeLog.internal_changeLog.additions) && Array.isArray(potentialChangeLog.internal_changeLog.deletions);
}
class SolidClientError extends Error {
}

function internal_toIriString(iri) {
  return typeof iri === "string" ? iri : iri.value;
}

const fetch = async (resource, init) => {
  if (typeof window === "object" && typeof require !== "function") {
    return await window.fetch(resource, init);
  }
  if (typeof require !== "function") {
    const crossFetchModule = await import('../common/browser-ponyfill-c9a58b8e.js').then(function (n) { return n.c; });
    const fetch3 = crossFetchModule.default;
    return fetch3(resource, init);
  }
  let fetch2;
  fetch2 = require("cross-fetch");
  return await fetch2(resource, init);
};

var COMPATIBLE_ENCODING_PATTERN = /^utf-?8|ascii|utf-?16-?le|ucs-?2|base-?64|latin-?1$/i;
var WS_TRIM_PATTERN = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
var WS_CHAR_PATTERN = /\s|\uFEFF|\xA0/;
var WS_FOLD_PATTERN = /\r?\n[\x20\x09]+/g;
var DELIMITER_PATTERN = /[;,"]/;
var WS_DELIMITER_PATTERN = /[;,"]|\s/;

/**
 * Token character pattern
 * @type {RegExp}
 * @see https://tools.ietf.org/html/rfc7230#section-3.2.6
 */
var TOKEN_PATTERN = /^[!#$%&'*+\-\.^_`|~\da-zA-Z]+$/;

var STATE = {
  IDLE: 1 << 0,
  URI: 1 << 1,
  ATTR: 1 << 2,
};

function trim( value ) {
  return value.replace( WS_TRIM_PATTERN, '' )
}

function hasWhitespace( value ) {
  return WS_CHAR_PATTERN.test( value )
}

function skipWhitespace( value, offset ) {
  while( hasWhitespace( value[offset] ) ) {
    offset++;
  }
  return offset
}

function needsQuotes( value ) {
  return WS_DELIMITER_PATTERN.test( value ) ||
    !TOKEN_PATTERN.test( value )
}

class Link {

  /**
   * Link
   * @constructor
   * @param {String} [value]
   * @returns {Link}
   */
  constructor( value ) {

    /** @type {Array} URI references */
    this.refs = [];

    if( value ) {
      this.parse( value );
    }

  }

  /**
   * Get refs with given relation type
   * @param {String} value
   * @returns {Array<Object>}
   */
  rel( value ) {

    var links = [];
    var type = value.toLowerCase();

    for( var i = 0; i < this.refs.length; i++ ) {
      if( this.refs[ i ].rel.toLowerCase() === type ) {
        links.push( this.refs[ i ] );
      }
    }

    return links

  }

  /**
   * Get refs where given attribute has a given value
   * @param {String} attr
   * @param {String} value
   * @returns {Array<Object>}
   */
  get( attr, value ) {

    attr = attr.toLowerCase();

    var links = [];

    for( var i = 0; i < this.refs.length; i++ ) {
      if( this.refs[ i ][ attr ] === value ) {
        links.push( this.refs[ i ] );
      }
    }

    return links

  }

  set( link ) {
    this.refs.push( link );
    return this
  }

  has( attr, value ) {

    attr = attr.toLowerCase();

    for( var i = 0; i < this.refs.length; i++ ) {
      if( this.refs[ i ][ attr ] === value ) {
        return true
      }
    }

    return false

  }

  parse( value, offset ) {

    offset = offset || 0;
    value = offset ? value.slice( offset ) : value;

    // Trim & unfold folded lines
    value = trim( value ).replace( WS_FOLD_PATTERN, '' );

    var state = STATE.IDLE;
    var length = value.length;
    var offset = 0;
    var ref = null;

    while( offset < length ) {
      if( state === STATE.IDLE ) {
        if( hasWhitespace( value[offset] ) ) {
          offset++;
          continue
        } else if( value[offset] === '<' ) {
          if( ref != null ) {
            ref.rel != null ?
              this.refs.push( ...Link.expandRelations( ref ) ) :
              this.refs.push( ref );
          }
          var end = value.indexOf( '>', offset );
          if( end === -1 ) throw new Error( 'Expected end of URI delimiter at offset ' + offset )
          ref = { uri: value.slice( offset + 1, end ) };
          // this.refs.push( ref )
          offset = end;
          state = STATE.URI;
        } else {
          throw new Error( 'Unexpected character "' + value[offset] + '" at offset ' + offset )
        }
        offset++;
      } else if( state === STATE.URI ) {
        if( hasWhitespace( value[offset] ) ) {
          offset++;
          continue
        } else if( value[offset] === ';' ) {
          state = STATE.ATTR;
          offset++;
        } else if( value[offset] === ',' ) {
          state = STATE.IDLE;
          offset++;
        } else {
          throw new Error( 'Unexpected character "' + value[offset] + '" at offset ' + offset )
        }
      } else if( state === STATE.ATTR ) {
        if( value[offset] ===';' || hasWhitespace( value[offset] ) ) {
          offset++;
          continue
        }
        var end = value.indexOf( '=', offset );
        if( end === -1 ) throw new Error( 'Expected attribute delimiter at offset ' + offset )
        var attr = trim( value.slice( offset, end ) ).toLowerCase();
        var attrValue = '';
        offset = end + 1;
        offset = skipWhitespace( value, offset );
        if( value[offset] === '"' ) {
          offset++;
          while( offset < length ) {
            if( value[offset] === '"' ) {
              offset++; break
            }
            if( value[offset] === '\\' ) {
              offset++;
            }
            attrValue += value[offset];
            offset++;
          }
        } else {
          var end = offset + 1;
          while( !DELIMITER_PATTERN.test( value[end] ) && end < length ) {
            end++;
          }
          attrValue = value.slice( offset, end );
          offset = end;
        }
        if( ref[ attr ] && Link.isSingleOccurenceAttr( attr ) ) ; else if( attr[ attr.length - 1 ] === '*' ) {
          ref[ attr ] = Link.parseExtendedValue( attrValue );
        } else {
          attrValue = attr === 'type' ?
            attrValue.toLowerCase() : attrValue;
          if( ref[ attr ] != null ) {
            if( Array.isArray( ref[ attr ] ) ) {
              ref[ attr ].push( attrValue );
            } else {
              ref[ attr ] = [ ref[ attr ], attrValue ];
            }
          } else {
            ref[ attr ] = attrValue;
          }
        }
        switch( value[offset] ) {
          case ',': state = STATE.IDLE; break
          case ';': state = STATE.ATTR; break
        }
        offset++;
      } else {
        throw new Error( 'Unknown parser state "' + state + '"' )
      }
    }

    if( ref != null ) {
      ref.rel != null ?
        this.refs.push( ...Link.expandRelations( ref ) ) :
        this.refs.push( ref );
    }

    ref = null;

    return this

  }

  toString() {

    var refs = [];
    var link = '';
    var ref = null;

    for( var i = 0; i < this.refs.length; i++ ) {
      ref = this.refs[i];
      link = Object.keys( this.refs[i] ).reduce( function( link, attr ) {
        if( attr === 'uri' ) return link
        return link + '; ' + Link.formatAttribute( attr, ref[ attr ] )
      }, '<' + ref.uri + '>' );
      refs.push( link );
    }

    return refs.join( ', ' )

  }

}

/**
 * Determines whether an encoding can be
 * natively handled with a `Buffer`
 * @param {String} value
 * @returns {Boolean}
 */
Link.isCompatibleEncoding = function( value ) {
  return COMPATIBLE_ENCODING_PATTERN.test( value )
};

Link.parse = function( value, offset ) {
  return new Link().parse( value, offset )
};

Link.isSingleOccurenceAttr = function( attr ) {
  return attr === 'rel' || attr === 'type' || attr === 'media' ||
    attr === 'title' || attr === 'title*'
};

Link.isTokenAttr = function( attr ) {
  return attr === 'rel' || attr === 'type' || attr === 'anchor'
};

Link.escapeQuotes = function( value ) {
  return value.replace( /"/g, '\\"' )
};

Link.expandRelations = function( ref ) {
  var rels = ref.rel.split( ' ' );
  return rels.map( function( rel ) {
    var value = Object.assign( {}, ref );
    value.rel = rel;
    return value
  })
};

/**
 * Parses an extended value and attempts to decode it
 * @internal
 * @param {String} value
 * @return {Object}
 */
Link.parseExtendedValue = function( value ) {
  var parts = /([^']+)?(?:'([^']+)')?(.+)/.exec( value );
  return {
    language: parts[2].toLowerCase(),
    encoding: Link.isCompatibleEncoding( parts[1] ) ?
      null : parts[1].toLowerCase(),
    value: Link.isCompatibleEncoding( parts[1] ) ?
      decodeURIComponent( parts[3] ) : parts[3]
  }
};

/**
 * Format a given extended attribute and it's value
 * @param {String} attr
 * @param {Object} data
 * @return {String}
 */
Link.formatExtendedAttribute = function( attr, data ) {

  var encoding = ( data.encoding || 'utf-8' ).toUpperCase();
  var language = data.language || 'en';

  var encodedValue = '';

  if( Buffer.isBuffer( data.value ) && Link.isCompatibleEncoding( encoding ) ) {
    encodedValue = data.value.toString( encoding );
  } else if( Buffer.isBuffer( data.value ) ) {
    encodedValue = data.value.toString( 'hex' )
      .replace( /[0-9a-f]{2}/gi, '%$1' );
  } else {
    encodedValue = encodeURIComponent( data.value );
  }

  return attr + '=' + encoding + '\'' +
    language + '\'' + encodedValue

};

/**
 * Format a given attribute and it's value
 * @param {String} attr
 * @param {String|Object} value
 * @return {String}
 */
Link.formatAttribute = function( attr, value ) {

  if( Array.isArray( value ) ) {
    return value.map(( item ) => {
      return Link.formatAttribute( attr, item )
    }).join( '; ' )
  }

  if( attr[ attr.length - 1 ] === '*' || typeof value !== 'string' ) {
    return Link.formatExtendedAttribute( attr, value )
  }

  if( Link.isTokenAttr( attr ) ) {
    value = needsQuotes( value ) ?
      '"' + Link.escapeQuotes( value ) + '"' :
      Link.escapeQuotes( value );
  } else if( needsQuotes( value ) ) {
    value = encodeURIComponent( value );
    // We don't need to escape <SP> <,> <;> within quotes
    value = value
      .replace( /%20/g, ' ' )
      .replace( /%2C/g, ',' )
      .replace( /%3B/g, ';' );

    value = '"' + value + '"';
  }

  return attr + '=' + value

};

var link = Link;

function internal_parseResourceInfo(response) {
  var _a, _b, _c;
  const contentTypeParts = (_b = (_a = response.headers.get("Content-Type")) === null || _a === void 0 ? void 0 : _a.split(";")) !== null && _b !== void 0 ? _b : [];
  const isSolidDataset = contentTypeParts.length > 0 && ["text/turtle", "application/ld+json"].includes(contentTypeParts[0]);
  const resourceInfo = {
    sourceIri: response.url,
    isRawData: !isSolidDataset,
    contentType: (_c = response.headers.get("Content-Type")) !== null && _c !== void 0 ? _c : void 0,
    linkedResources: {}
  };
  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = link.parse(linkHeader);
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      resourceInfo.aclUrl = new URL(aclLinks[0].uri, resourceInfo.sourceIri).href;
    }
    resourceInfo.linkedResources = parsedLinks.refs.reduce((rels, ref) => {
      var _a2;
      var _b2;
      (_a2 = rels[_b2 = ref.rel]) !== null && _a2 !== void 0 ? _a2 : rels[_b2] = [];
      rels[ref.rel].push(new URL(ref.uri, resourceInfo.sourceIri).href);
      return rels;
    }, resourceInfo.linkedResources);
  }
  const wacAllowHeader = response.headers.get("WAC-Allow");
  if (wacAllowHeader) {
    resourceInfo.permissions = parseWacAllowHeader(wacAllowHeader);
  }
  return resourceInfo;
}
function parseWacAllowHeader(wacAllowHeader) {
  function parsePermissionStatement(permissionStatement) {
    const permissions = permissionStatement.split(" ");
    const writePermission = permissions.includes("write");
    return writePermission ? {
      read: permissions.includes("read"),
      append: true,
      write: true,
      control: permissions.includes("control")
    } : {
      read: permissions.includes("read"),
      append: permissions.includes("append"),
      write: false,
      control: permissions.includes("control")
    };
  }
  function getStatementFor(header, scope) {
    const relevantEntries = header.split(",").map((rawEntry) => rawEntry.split("=")).filter((parts) => parts.length === 2 && parts[0].trim() === scope);
    if (relevantEntries.length !== 1) {
      return "";
    }
    const relevantStatement = relevantEntries[0][1].trim();
    if (relevantStatement.charAt(0) !== '"' || relevantStatement.charAt(relevantStatement.length - 1) !== '"') {
      return "";
    }
    return relevantStatement.substring(1, relevantStatement.length - 1);
  }
  return {
    user: parsePermissionStatement(getStatementFor(wacAllowHeader, "user")),
    public: parsePermissionStatement(getStatementFor(wacAllowHeader, "public"))
  };
}
function internal_cloneResource(resource) {
  let clonedResource;
  if (typeof resource.slice === "function") {
    clonedResource = Object.assign(resource.slice(), Object.assign({}, resource));
  } else {
    clonedResource = Object.assign({}, resource);
  }
  return clonedResource;
}
function internal_isUnsuccessfulResponse(response) {
  return !response.ok;
}
function internal_isAuthenticationFailureResponse(response) {
  return response.status === 401 || response.status === 403;
}

const acl = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  AuthenticatedAgent: "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
  accessTo: "http://www.w3.org/ns/auth/acl#accessTo",
  agent: "http://www.w3.org/ns/auth/acl#agent",
  agentGroup: "http://www.w3.org/ns/auth/acl#agentGroup",
  agentClass: "http://www.w3.org/ns/auth/acl#agentClass",
  default: "http://www.w3.org/ns/auth/acl#default",
  defaultForNew: "http://www.w3.org/ns/auth/acl#defaultForNew",
  mode: "http://www.w3.org/ns/auth/acl#mode",
  origin: "http://www.w3.org/ns/auth/acl#origin"
};
const rdf = {
  type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
};
const ldp = {
  BasicContainer: "http://www.w3.org/ns/ldp#BasicContainer",
  Container: "http://www.w3.org/ns/ldp#Container",
  Resource: "http://www.w3.org/ns/ldp#Resource",
  contains: "http://www.w3.org/ns/ldp#contains"
};
const foaf = {
  Agent: "http://xmlns.com/foaf/0.1/Agent",
  primaryTopic: "http://xmlns.com/foaf/0.1/primaryTopic",
  isPrimaryTopicOf: "http://xmlns.com/foaf/0.1/isPrimaryTopicOf"
};
const acp = {
  AccessControlResource: "http://www.w3.org/ns/solid/acp#AccessControlResource",
  Policy: "http://www.w3.org/ns/solid/acp#Policy",
  AccessControl: "http://www.w3.org/ns/solid/acp#AccessControl",
  Read: "http://www.w3.org/ns/solid/acp#Read",
  Append: "http://www.w3.org/ns/solid/acp#Append",
  Write: "http://www.w3.org/ns/solid/acp#Write",
  Rule: "http://www.w3.org/ns/solid/acp#Rule",
  Matcher: "http://www.w3.org/ns/solid/acp#Matcher",
  accessControl: "http://www.w3.org/ns/solid/acp#accessControl",
  memberAccessControl: "http://www.w3.org/ns/solid/acp#memberAccessControl",
  apply: "http://www.w3.org/ns/solid/acp#apply",
  applyMembers: "http://www.w3.org/ns/solid/acp#applyMembers",
  allow: "http://www.w3.org/ns/solid/acp#allow",
  deny: "http://www.w3.org/ns/solid/acp#deny",
  allOf: "http://www.w3.org/ns/solid/acp#allOf",
  anyOf: "http://www.w3.org/ns/solid/acp#anyOf",
  noneOf: "http://www.w3.org/ns/solid/acp#noneOf",
  access: "http://www.w3.org/ns/solid/acp#access",
  accessMembers: "http://www.w3.org/ns/solid/acp#accessMembers",
  agent: "http://www.w3.org/ns/solid/acp#agent",
  group: "http://www.w3.org/ns/solid/acp#group",
  client: "http://www.w3.org/ns/solid/acp#client",
  PublicAgent: "http://www.w3.org/ns/solid/acp#PublicAgent",
  AuthenticatedAgent: "http://www.w3.org/ns/solid/acp#AuthenticatedAgent",
  CreatorAgent: "http://www.w3.org/ns/solid/acp#CreatorAgent"
};

const internal_defaultFetchOptions = {
  fetch
};
async function getResourceInfo(url, options = Object.assign(Object.assign({}, internal_defaultFetchOptions), {ignoreAuthenticationErrors: false})) {
  var _a;
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  const response = await config.fetch(url, {method: "HEAD"});
  return responseToResourceInfo(response, {
    ignoreAuthenticationErrors: (_a = options.ignoreAuthenticationErrors) !== null && _a !== void 0 ? _a : false
  });
}
function responseToResourceInfo(response, options = {ignoreAuthenticationErrors: false}) {
  if (internal_isUnsuccessfulResponse(response) && (!internal_isAuthenticationFailureResponse(response) || !options.ignoreAuthenticationErrors)) {
    throw new FetchError(`Fetching the metadata of the Resource at [${response.url}] failed: [${response.status}] [${response.statusText}].`, response);
  }
  const resourceInfo = internal_parseResourceInfo(response);
  return {internal_resourceInfo: resourceInfo};
}
function getContentType(resource) {
  var _a;
  return (_a = resource.internal_resourceInfo.contentType) !== null && _a !== void 0 ? _a : null;
}
function getSourceUrl(resource) {
  if (hasResourceInfo(resource)) {
    return resource.internal_resourceInfo.sourceIri;
  }
  return null;
}
const getSourceIri = getSourceUrl;
function getLinkedResourceUrlAll(resource) {
  return resource.internal_resourceInfo.linkedResources;
}
class FetchError extends SolidClientError {
  constructor(message, errorResponse) {
    super(message);
    this.response = errorResponse;
  }
  get statusCode() {
    return this.response.status;
  }
  get statusText() {
    return this.response.statusText;
  }
}

class BlankNode {
  constructor (id) {
    this.value = id || ('b' + (++BlankNode.nextId));
  }

  equals (other) {
    return !!other && other.termType === this.termType && other.value === this.value
  }
}

BlankNode.prototype.termType = 'BlankNode';

BlankNode.nextId = 0;

var BlankNode_1 = BlankNode;

class DefaultGraph {
  equals (other) {
    return !!other && other.termType === this.termType
  }
}

DefaultGraph.prototype.termType = 'DefaultGraph';
DefaultGraph.prototype.value = '';

var DefaultGraph_1 = DefaultGraph;

function fromTerm (original) {
  if (!original) {
    return null
  }

  if (original.termType === 'BlankNode') {
    return this.blankNode(original.value)
  }

  if (original.termType === 'DefaultGraph') {
    return this.defaultGraph()
  }

  if (original.termType === 'Literal') {
    return this.literal(original.value, original.language || this.namedNode(original.datatype.value))
  }

  if (original.termType === 'NamedNode') {
    return this.namedNode(original.value)
  }

  if (original.termType === 'Quad') {
    const subject = this.fromTerm(original.subject);
    const predicate = this.fromTerm(original.predicate);
    const object = this.fromTerm(original.object);
    const graph = this.fromTerm(original.graph);

    return this.quad(subject, predicate, object, graph)
  }

  if (original.termType === 'Variable') {
    return this.variable(original.value)
  }

  throw new Error(`unknown termType ${original.termType}`)
}

var fromTerm_1 = fromTerm;

class NamedNode {
  constructor (iri) {
    this.value = iri;
  }

  equals (other) {
    return !!other && other.termType === this.termType && other.value === this.value
  }
}

NamedNode.prototype.termType = 'NamedNode';

var NamedNode_1 = NamedNode;

class Literal {
  constructor (value, language, datatype) {
    this.value = value;
    this.datatype = Literal.stringDatatype;
    this.language = '';

    if (language) {
      this.language = language;
      this.datatype = Literal.langStringDatatype;
    } else if (datatype) {
      this.datatype = datatype;
    }
  }

  equals (other) {
    return !!other && other.termType === this.termType && other.value === this.value &&
      other.language === this.language && other.datatype.equals(this.datatype)
  }
}

Literal.prototype.termType = 'Literal';

Literal.langStringDatatype = new NamedNode_1('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString');
Literal.stringDatatype = new NamedNode_1('http://www.w3.org/2001/XMLSchema#string');

var Literal_1 = Literal;

class Quad {
  constructor (subject, predicate, object, graph) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;

    if (graph) {
      this.graph = graph;
    } else {
      this.graph = new DefaultGraph_1();
    }
  }

  equals (other) {
    // `|| !other.termType` is for backwards-compatibility with old factories without RDF* support.
    return !!other && (other.termType === 'Quad' || !other.termType) &&
      other.subject.equals(this.subject) && other.predicate.equals(this.predicate) &&
      other.object.equals(this.object) && other.graph.equals(this.graph)
  }
}

Quad.prototype.termType = 'Quad';
Quad.prototype.value = '';

var Quad_1 = Quad;

class Variable {
  constructor (name) {
    this.value = name;
  }

  equals (other) {
    return !!other && other.termType === this.termType && other.value === this.value
  }
}

Variable.prototype.termType = 'Variable';

var Variable_1 = Variable;

function namedNode (value) {
  return new NamedNode_1(value)
}

function blankNode (value) {
  return new BlankNode_1(value)
}

function literal (value, languageOrDatatype) {
  if (typeof languageOrDatatype === 'string') {
    if (languageOrDatatype.indexOf(':') === -1) {
      return new Literal_1(value, languageOrDatatype)
    }

    return new Literal_1(value, null, DataFactory.namedNode(languageOrDatatype))
  }

  return new Literal_1(value, null, languageOrDatatype)
}

function variable (value) {
  return new Variable_1(value)
}

function defaultGraph () {
  return DataFactory.defaultGraphInstance
}

function triple (subject, predicate, object) {
  return DataFactory.quad(subject, predicate, object)
}

function quad (subject, predicate, object, graph) {
  return new Quad_1(subject, predicate, object, graph || DataFactory.defaultGraphInstance)
}

function fromTerm$1 (original) {
  return fromTerm_1.call(DataFactory, original)
}

function fromQuad (original) {
  return fromTerm_1.call(DataFactory, original)
}

const DataFactory = {
  namedNode,
  blankNode,
  literal,
  variable,
  defaultGraph,
  triple,
  quad,
  fromTerm: fromTerm$1,
  fromQuad,
  defaultGraphInstance: new DefaultGraph_1()
};

var DataFactory_1 = DataFactory;

var dataModel = DataFactory_1;

function isString (s) {
  return typeof s === 'string' || s instanceof String
}

const xsdString = 'http://www.w3.org/2001/XMLSchema#string';

function termToId (term) {
  if (typeof term === 'string') {
    return term
  }

  if (!term) {
    return ''
  }

  if (typeof term.id !== 'undefined' && term.termType !== 'Quad') {
    return term.id
  }

  let subject, predicate, object, graph;

  // Term instantiated with another library
  switch (term.termType) {
    case 'NamedNode':
      return term.value

    case 'BlankNode':
      return `_:${term.value}`

    case 'Variable':
      return `?${term.value}`

    case 'DefaultGraph':
      return ''

    case 'Literal':
      if (term.language) {
        return `"${term.value}"@${term.language}`
      }

      return `"${term.value}"${term.datatype && term.datatype.value !== xsdString ? `^^${term.datatype.value}` : ''}`

    case 'Quad':
      // To identify RDF* quad components, we escape quotes by doubling them.
      // This avoids the overhead of backslash parsing of Turtle-like syntaxes.
      subject = escapeQuotes(termToId(term.subject));
      predicate = escapeQuotes(termToId(term.predicate));
      object = escapeQuotes(termToId(term.object));
      graph = term.graph.termType === 'DefaultGraph' ? '' : ` ${termToId(term.graph)}`;

      return `<<${subject} ${predicate} ${object}${graph}>>`

    default:
      throw new Error(`Unexpected termType: ${term.termType}`)
  }
}

const escapedLiteral = /^"(.*".*)(?="[^"]*$)/;

function escapeQuotes (id) {
  return id.replace(escapedLiteral, (_, quoted) => `"${quoted.replace(/"/g, '""')}`)
}

class DatasetCore {
  constructor (quads) {
    // The number of quads is initially zero
    this._size = 0;
    // `_graphs` contains subject, predicate, and object indexes per graph
    this._graphs = Object.create(null);
    // `_ids` maps entities such as `http://xmlns.com/foaf/0.1/name` to numbers,
    // saving memory by using only numbers as keys in `_graphs`
    this._id = 0;
    this._ids = Object.create(null);
    this._ids['><'] = 0; // dummy entry, so the first actual key is non-zero
    this._entities = Object.create(null); // inverse of `_ids`

    this._quads = new Map();

    // Add quads if passed
    if (quads) {
      for (const quad of quads) {
        this.add(quad);
      }
    }
  }

  get size () {
    // Return the quad count if if was cached
    let size = this._size;

    if (size !== null) {
      return size
    }

    // Calculate the number of quads by counting to the deepest level
    size = 0;
    const graphs = this._graphs;
    let subjects, subject;

    for (const graphKey in graphs) {
      for (const subjectKey in (subjects = graphs[graphKey].subjects)) {
        for (const predicateKey in (subject = subjects[subjectKey])) {
          size += Object.keys(subject[predicateKey]).length;
        }
      }
    }

    this._size = size;

    return this._size
  }

  add (quad) {
    // Convert terms to internal string representation
    let subject = termToId(quad.subject);
    let predicate = termToId(quad.predicate);
    let object = termToId(quad.object);
    const graph = termToId(quad.graph);

    // Find the graph that will contain the triple
    let graphItem = this._graphs[graph];
    // Create the graph if it doesn't exist yet
    if (!graphItem) {
      graphItem = this._graphs[graph] = { subjects: {}, predicates: {}, objects: {} };
      // Freezing a graph helps subsequent `add` performance,
      // and properties will never be modified anyway
      Object.freeze(graphItem);
    }

    // Since entities can often be long IRIs, we avoid storing them in every index.
    // Instead, we have a separate index that maps entities to numbers,
    // which are then used as keys in the other indexes.
    const ids = this._ids;
    const entities = this._entities;
    subject = ids[subject] || (ids[entities[++this._id] = subject] = this._id);
    predicate = ids[predicate] || (ids[entities[++this._id] = predicate] = this._id);
    object = ids[object] || (ids[entities[++this._id] = object] = this._id);

    this._addToIndex(graphItem.subjects, subject, predicate, object);
    this._addToIndex(graphItem.predicates, predicate, object, subject);
    this._addToIndex(graphItem.objects, object, subject, predicate);

    this._setQuad(subject, predicate, object, graph, quad);

    // The cached quad count is now invalid
    this._size = null;

    return this
  }

  delete (quad) {
    // Convert terms to internal string representation
    let subject = termToId(quad.subject);
    let predicate = termToId(quad.predicate);
    let object = termToId(quad.object);
    const graph = termToId(quad.graph);

    // Find internal identifiers for all components
    // and verify the quad exists.
    const ids = this._ids;
    const graphs = this._graphs;
    let graphItem, subjects, predicates;

    if (!(subject = ids[subject]) || !(predicate = ids[predicate]) ||
      !(object = ids[object]) || !(graphItem = graphs[graph]) ||
      !(subjects = graphItem.subjects[subject]) ||
      !(predicates = subjects[predicate]) ||
      !(object in predicates)
    ) {
      return this
    }

    // Remove it from all indexes
    this._removeFromIndex(graphItem.subjects, subject, predicate, object);
    this._removeFromIndex(graphItem.predicates, predicate, object, subject);
    this._removeFromIndex(graphItem.objects, object, subject, predicate);

    if (this._size !== null) {
      this._size--;
    }

    this._deleteQuad(subject, predicate, object, graph);

    // Remove the graph if it is empty
    for (subject in graphItem.subjects) { // eslint-disable-line no-unreachable-loop
      return this
    }

    delete graphs[graph];

    return this
  }

  has (quad) {
    // Convert terms to internal string representation
    const subject = termToId(quad.subject);
    const predicate = termToId(quad.predicate);
    const object = termToId(quad.object);
    const graph = termToId(quad.graph);

    const graphItem = this._graphs[graph];

    if (!graphItem) {
      return false
    }

    const ids = this._ids;
    let subjectId, predicateId, objectId;

    // Translate IRIs to internal index keys.
    if (
      (isString(subject) && !(subjectId = ids[subject])) ||
      (isString(predicate) && !(predicateId = ids[predicate])) ||
      (isString(object) && !(objectId = ids[object]))
    ) {
      return false
    }

    return this._countInIndex(graphItem.objects, objectId, subjectId, predicateId) === 1
  }

  match (subject, predicate, object, graph) {
    return this._createDataset(this._match(subject, predicate, object, graph))
  }

  [Symbol.iterator] () {
    return this._match()[Symbol.iterator]()
  }

  // ## Private methods

  // ### `_addToIndex` adds a quad to a three-layered index.
  // Returns if the index has changed, if the entry did not already exist.
  _addToIndex (index0, key0, key1, key2) {
    // Create layers as necessary
    const index1 = index0[key0] || (index0[key0] = {});
    const index2 = index1[key1] || (index1[key1] = {});
    // Setting the key to _any_ value signals the presence of the quad
    const existed = key2 in index2;

    if (!existed) {
      index2[key2] = null;
    }

    return !existed
  }

  // ### `_removeFromIndex` removes a quad from a three-layered index
  _removeFromIndex (index0, key0, key1, key2) {
    // Remove the quad from the index
    const index1 = index0[key0];
    const index2 = index1[key1];
    delete index2[key2];

    // Remove intermediary index layers if they are empty
    for (const key in index2) { // eslint-disable-line no-unreachable-loop
      return
    }

    delete index1[key1];

    for (const key in index1) { // eslint-disable-line no-unreachable-loop
      return
    }

    delete index0[key0];
  }

  // ### `_findInIndex` finds a set of quads in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be undefined, which is interpreted as a wildcard.
  // `name0`, `name1`, and `name2` are the names of the keys at each level,
  // used when reconstructing the resulting quad
  // (for instance: _subject_, _predicate_, and _object_).
  // Finally, `graph` will be the graph of the created quads.
  // If `callback` is given, each result is passed through it
  // and iteration halts when it returns truthy for any quad.
  // If instead `array` is given, each result is added to the array.
  _findInIndex (index0, key0, key1, key2, name0, name1, name2, graph, callback, array) {
    let tmp, index1, index2;

    // If a key is specified, use only that part of index 0.
    if (key0) {
      (tmp = index0, index0 = {})[key0] = tmp[key0];
    }

    for (const value0 in index0) {
      index1 = index0[value0];

      if (index1) {
        // If a key is specified, use only that part of index 1.
        if (key1) {
          (tmp = index1, index1 = {})[key1] = tmp[key1];
        }

        for (const value1 in index1) {
          index2 = index1[value1];

          if (index2) {
            // If a key is specified, use only that part of index 2, if it exists.
            const values = key2 ? (key2 in index2 ? [key2] : []) : Object.keys(index2);
            // Create quads for all items found in index 2.
            for (let l = 0; l < values.length; l++) {
              const parts = {
                [name0]: value0,
                [name1]: value1,
                [name2]: values[l]
              };

              const quad = this._getQuad(parts.subject, parts.predicate, parts.object, graph);

              if (array) {
                array.push(quad);
              } else if (callback(quad)) {
                return true
              }
            }
          }
        }
      }
    }

    return array
  }

  // ### `_countInIndex` counts matching quads in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be undefined, which is interpreted as a wildcard.
  _countInIndex (index0, key0, key1, key2) {
    let count = 0;
    let tmp, index1, index2;

    // If a key is specified, count only that part of index 0
    if (key0) {
      (tmp = index0, index0 = {})[key0] = tmp[key0];
    }

    for (const value0 in index0) {
      index1 = index0[value0];

      if (index1) {
        // If a key is specified, count only that part of index 1
        if (key1) {
          (tmp = index1, index1 = {})[key1] = tmp[key1];
        }

        for (const value1 in index1) {
          index2 = index1[value1];

          if (index2) {
            if (key2) {
              // If a key is specified, count the quad if it exists
              (key2 in index2) && count++;
            } else {
              // Otherwise, count all quads
              count += Object.keys(index2).length;
            }
          }
        }
      }
    }

    return count
  }

  // ### `_getGraphs` returns an array with the given graph,
  // or all graphs if the argument is null or undefined.
  _getGraphs (graph) {
    if (!isString(graph)) {
      return this._graphs
    }

    return {
      [graph]: this._graphs[graph]
    }
  }

  _match (subject, predicate, object, graph) {
    // Convert terms to internal string representation
    subject = subject && termToId(subject);
    predicate = predicate && termToId(predicate);
    object = object && termToId(object);
    graph = graph && termToId(graph);

    const quads = [];
    const graphs = this._getGraphs(graph);
    const ids = this._ids;
    let content, subjectId, predicateId, objectId;

    // Translate IRIs to internal index keys.
    if (
      (isString(subject) && !(subjectId = ids[subject])) ||
      (isString(predicate) && !(predicateId = ids[predicate])) ||
      (isString(object) && !(objectId = ids[object]))
    ) {
      return quads
    }

    for (const graphId in graphs) {
      content = graphs[graphId];

      // Only if the specified graph contains triples, there can be results
      if (content) {
        // Choose the optimal index, based on what fields are present
        if (subjectId) {
          if (objectId) {
            // If subject and object are given, the object index will be the fastest
            this._findInIndex(content.objects, objectId, subjectId, predicateId, 'object', 'subject', 'predicate', graphId, null, quads);
          } else {
            // If only subject and possibly predicate are given, the subject index will be the fastest
            this._findInIndex(content.subjects, subjectId, predicateId, null, 'subject', 'predicate', 'object', graphId, null, quads);
          }
        } else if (predicateId) {
          // if only predicate and possibly object are given, the predicate index will be the fastest
          this._findInIndex(content.predicates, predicateId, objectId, null, 'predicate', 'object', 'subject', graphId, null, quads);
        } else if (objectId) {
          // If only object is given, the object index will be the fastest
          this._findInIndex(content.objects, objectId, null, null, 'object', 'subject', 'predicate', graphId, null, quads);
        } else {
          // If nothing is given, iterate subjects and predicates first
          this._findInIndex(content.subjects, null, null, null, 'subject', 'predicate', 'object', graphId, null, quads);
        }
      }
    }

    return quads
  }

  _getQuad (subjectId, predicateId, objectId, graphId) {
    return this._quads.get(this._toId(subjectId, predicateId, objectId, graphId))
  }

  _setQuad (subjectId, predicateId, objectId, graphId, quad) {
    this._quads.set(this._toId(subjectId, predicateId, objectId, graphId), quad);
  }

  _deleteQuad (subjectId, predicateId, objectId, graphId) {
    this._quads.delete(this._toId(subjectId, predicateId, objectId, graphId));
  }

  _createDataset (quads) {
    return new this.constructor(quads)
  }

  _toId (subjectId, predicateId, objectId, graphId) {
    return `${subjectId}:${predicateId}:${objectId}:${graphId}`
  }
}

var DatasetCore_1 = DatasetCore;

function dataset (quads) {
  return new DatasetCore_1(quads)
}

var dataset_1 = Object.assign({ dataset }, dataModel);

dataset_1.dataset;
const localNodeSkolemPrefix = "https://inrupt.com/.well-known/sdk-local-node/";
const freeze = Object.freeze;
function isLocalNodeIri(iri) {
  return iri.substring(0, localNodeSkolemPrefix.length) === localNodeSkolemPrefix;
}
function getLocalNodeName(localNodeIri) {
  return localNodeIri.substring(localNodeSkolemPrefix.length);
}
function getLocalNodeIri(localNodeName) {
  return `${localNodeSkolemPrefix}${localNodeName}`;
}
function isBlankNodeId(value) {
  return typeof value === "string" && value.substring(0, 2) === "_:";
}
function getBlankNodeValue(blankNodeId) {
  return blankNodeId.substring(2);
}
function getBlankNodeId(blankNode) {
  return `_:${blankNode.value}`;
}

const xmlSchemaTypes = {
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime",
  date: "http://www.w3.org/2001/XMLSchema#date",
  time: "http://www.w3.org/2001/XMLSchema#time",
  decimal: "http://www.w3.org/2001/XMLSchema#decimal",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  string: "http://www.w3.org/2001/XMLSchema#string",
  langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
};
function deserializeBoolean(value) {
  if (value === "true" || value === "1") {
    return true;
  } else if (value === "false" || value === "0") {
    return false;
  } else {
    return null;
  }
}
function serializeDatetime(value) {
  return value.toISOString();
}
function deserializeDatetime(literalString) {
  const datetimeRegEx = /-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|(\+|-)\d\d:\d\d)?/;
  if (!datetimeRegEx.test(literalString)) {
    return null;
  }
  const [signedDateString, rest] = literalString.split("T");
  const [yearMultiplier, dateString] = signedDateString.charAt(0) === "-" ? [-1, signedDateString.substring(1)] : [1, signedDateString];
  const [yearString, monthString, dayString] = dateString.split("-");
  const utcFullYear = Number.parseInt(yearString, 10) * yearMultiplier;
  const utcMonth = Number.parseInt(monthString, 10) - 1;
  const utcDate = Number.parseInt(dayString, 10);
  const [timeString, timezoneString] = splitTimeFromTimezone(rest);
  const [hourOffset, minuteOffset] = typeof timezoneString === "string" ? getTimezoneOffsets(timezoneString) : [0, 0];
  const [hourString, minuteString, timeRest] = timeString.split(":");
  const utcHours = Number.parseInt(hourString, 10) + hourOffset;
  const utcMinutes = Number.parseInt(minuteString, 10) + minuteOffset;
  const [secondString, optionalMillisecondString] = timeRest.split(".");
  const utcSeconds = Number.parseInt(secondString, 10);
  const utcMilliseconds = optionalMillisecondString ? Number.parseInt(optionalMillisecondString, 10) : 0;
  const date = new Date(Date.UTC(utcFullYear, utcMonth, utcDate, utcHours, utcMinutes, utcSeconds, utcMilliseconds));
  if (utcFullYear >= 0 && utcFullYear < 100) {
    date.setUTCFullYear(date.getUTCFullYear() - 1900);
  }
  return date;
}
function splitTimeFromTimezone(timeString) {
  if (timeString.endsWith("Z")) {
    return [timeString.substring(0, timeString.length - 1), "Z"];
  }
  const splitOnPlus = timeString.split("+");
  const splitOnMinus = timeString.split("-");
  if (splitOnPlus.length === 1 && splitOnMinus.length === 1) {
    return [splitOnPlus[0], void 0];
  }
  return splitOnPlus.length > splitOnMinus.length ? [splitOnPlus[0], "+" + splitOnPlus[1]] : [splitOnMinus[0], "-" + splitOnMinus[1]];
}
function getTimezoneOffsets(timezoneString) {
  if (timezoneString === "Z") {
    return [0, 0];
  }
  const multiplier = timezoneString.charAt(0) === "+" ? 1 : -1;
  const [hourString, minuteString] = timezoneString.substring(1).split(":");
  const hours = Number.parseInt(hourString, 10);
  const minutes = Number.parseInt(minuteString, 10);
  return [hours * multiplier, minutes * multiplier];
}
function deserializeDecimal(literalString) {
  const deserialized = Number.parseFloat(literalString);
  if (Number.isNaN(deserialized)) {
    return null;
  }
  return deserialized;
}
function serializeInteger(value) {
  return value.toString();
}
function deserializeInteger(literalString) {
  const deserialized = Number.parseInt(literalString, 10);
  if (Number.isNaN(deserialized)) {
    return null;
  }
  return deserialized;
}
function isNamedNode(value) {
  return isTerm(value) && value.termType === "NamedNode";
}
function isLiteral(value) {
  return isTerm(value) && value.termType === "Literal";
}
function isTerm(value) {
  return value !== null && typeof value === "object" && typeof value.termType === "string" && typeof value.value === "string" && typeof value.equals === "function";
}
function isLocalNode(value) {
  return isNamedNode(value) && isLocalNodeIri(value.value);
}
function internal_isValidUrl(iri) {
  const iriString = internal_toIriString(iri);
  if (typeof URL !== "function") {
    return true;
  }
  try {
    new URL(iriString);
  } catch (_a) {
    return false;
  }
  return true;
}
function resolveIriForLocalNode(localNode, resourceIri) {
  return DataFactory$1.namedNode(resolveLocalIri(getLocalNodeName(localNode.value), resourceIri));
}
function resolveLocalIri(name, resourceIri) {
  if (typeof URL !== "function") {
    throw new Error("The URL interface is not available, so an IRI cannot be determined.");
  }
  const thingIri = new URL(resourceIri);
  thingIri.hash = name;
  return thingIri.href;
}

const DataFactory$1 = dataModel;
function addRdfJsQuadToDataset(dataset, quad, quadParseOptions = {}) {
  var _a;
  const supportedGraphTypes = [
    "NamedNode",
    "DefaultGraph"
  ];
  if (!supportedGraphTypes.includes(quad.graph.termType)) {
    throw new Error(`Cannot parse Quads with nodes of type [${quad.graph.termType}] as their Graph node.`);
  }
  const graphId = quad.graph.termType === "DefaultGraph" ? "default" : quad.graph.value;
  const graph = (_a = dataset.graphs[graphId]) !== null && _a !== void 0 ? _a : {};
  return freeze(Object.assign(Object.assign({}, dataset), {graphs: freeze(Object.assign(Object.assign({}, dataset.graphs), {[graphId]: addRdfJsQuadToGraph(graph, quad, quadParseOptions)}))}));
}
function addRdfJsQuadToGraph(graph, quad, quadParseOptions) {
  var _a;
  const supportedSubjectTypes = [
    "NamedNode",
    "BlankNode"
  ];
  if (!supportedSubjectTypes.includes(quad.subject.termType)) {
    throw new Error(`Cannot parse Quads with nodes of type [${quad.subject.termType}] as their Subject node.`);
  }
  const subjectIri = quad.subject.termType === "BlankNode" ? `_:${quad.subject.value}` : quad.subject.value;
  const subject = (_a = graph[subjectIri]) !== null && _a !== void 0 ? _a : {
    type: "Subject",
    url: subjectIri,
    predicates: {}
  };
  return freeze(Object.assign(Object.assign({}, graph), {[subjectIri]: addRdfJsQuadToSubject(subject, quad, quadParseOptions)}));
}
function addRdfJsQuadToSubject(subject, quad, quadParseOptions) {
  return freeze(Object.assign(Object.assign({}, subject), {predicates: addRdfJsQuadToPredicates(subject.predicates, quad, quadParseOptions)}));
}
function addRdfJsQuadToPredicates(predicates, quad, quadParseOptions) {
  var _a;
  const supportedPredicateTypes = [
    "NamedNode"
  ];
  if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
    throw new Error(`Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`);
  }
  const predicateIri = quad.predicate.value;
  const objects = (_a = predicates[predicateIri]) !== null && _a !== void 0 ? _a : {};
  return freeze(Object.assign(Object.assign({}, predicates), {[predicateIri]: addRdfJsQuadToObjects(objects, quad, quadParseOptions)}));
}
function addRdfJsQuadToObjects(objects, quad, quadParseOptions) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (quad.object.termType === "NamedNode") {
    const namedNodes = freeze([
      ...(_a = objects.namedNodes) !== null && _a !== void 0 ? _a : [],
      quad.object.value
    ]);
    return freeze(Object.assign(Object.assign({}, objects), {namedNodes}));
  }
  if (quad.object.termType === "Literal") {
    if (quad.object.datatype.value === xmlSchemaTypes.langString) {
      const locale = quad.object.language.toLowerCase();
      const thisLocaleStrings = freeze([
        ...(_c = (_b = objects.langStrings) === null || _b === void 0 ? void 0 : _b[locale]) !== null && _c !== void 0 ? _c : [],
        quad.object.value
      ]);
      const langStrings = freeze(Object.assign(Object.assign({}, (_d = objects.langStrings) !== null && _d !== void 0 ? _d : {}), {[locale]: thisLocaleStrings}));
      return freeze(Object.assign(Object.assign({}, objects), {langStrings}));
    }
    const thisTypeValues = freeze([
      ...(_f = (_e = objects.literals) === null || _e === void 0 ? void 0 : _e[quad.object.datatype.value]) !== null && _f !== void 0 ? _f : [],
      quad.object.value
    ]);
    const literals = freeze(Object.assign(Object.assign({}, (_g = objects.literals) !== null && _g !== void 0 ? _g : {}), {[quad.object.datatype.value]: thisTypeValues}));
    return freeze(Object.assign(Object.assign({}, objects), {literals}));
  }
  if (quad.object.termType === "BlankNode") {
    const blankNodePredicates = getPredicatesForBlankNode(quad.object, quadParseOptions);
    const blankNodes = freeze([
      ...(_h = objects.blankNodes) !== null && _h !== void 0 ? _h : [],
      blankNodePredicates
    ]);
    return freeze(Object.assign(Object.assign({}, objects), {blankNodes}));
  }
  throw new Error(`Objects of type [${quad.object.termType}] are not supported.`);
}
function getPredicatesForBlankNode(node, quadParseOptions) {
  var _a, _b;
  const chainBlankNodes = (_a = quadParseOptions.chainBlankNodes) !== null && _a !== void 0 ? _a : [];
  if (chainBlankNodes.find((chainBlankNode) => chainBlankNode.equals(node)) === void 0) {
    return getBlankNodeId(node);
  }
  const quads = (_b = quadParseOptions.otherQuads) !== null && _b !== void 0 ? _b : [];
  const quadsWithNodeAsSubject = quads.filter((quad) => quad.subject.equals(node));
  const predicates = quadsWithNodeAsSubject.filter((quad) => !isBlankNode(quad.object)).reduce((predicatesAcc, quad) => {
    var _a2;
    const supportedPredicateTypes = [
      "NamedNode"
    ];
    if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
      throw new Error(`Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`);
    }
    const objects = (_a2 = predicatesAcc[quad.predicate.value]) !== null && _a2 !== void 0 ? _a2 : {};
    return freeze(Object.assign(Object.assign({}, predicatesAcc), {[quad.predicate.value]: addRdfJsQuadToObjects(objects, quad, quadParseOptions)}));
  }, {});
  const blankNodeObjectQuads = quadsWithNodeAsSubject.filter((quad) => isBlankNode(quad.object));
  return blankNodeObjectQuads.reduce((predicatesAcc, quad) => {
    var _a2, _b2;
    const supportedPredicateTypes = [
      "NamedNode"
    ];
    if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
      throw new Error(`Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`);
    }
    const objects = (_a2 = predicatesAcc[quad.predicate.value]) !== null && _a2 !== void 0 ? _a2 : {};
    const blankNodes = (_b2 = objects.blankNodes) !== null && _b2 !== void 0 ? _b2 : [];
    return freeze(Object.assign(Object.assign({}, predicatesAcc), {
      [quad.predicate.value]: Object.assign(Object.assign({}, objects), {blankNodes: [
        ...blankNodes,
        getPredicatesForBlankNode(quad.object, quadParseOptions)
      ]})
    }));
  }, predicates);
}
function getChainBlankNodes(quads) {
  const blankNodeSubjects = quads.map((quad) => quad.subject).filter(isBlankNode);
  const blankNodeObjects = quads.map((quad) => quad.object).filter(isBlankNode);
  function everyNodeTheSame(nodes) {
    return nodes.every((otherNode) => nodes.every((anotherNode) => otherNode.equals(anotherNode)));
  }
  const cycleBlankNodes = [];
  blankNodeObjects.forEach((blankNodeObject) => {
    cycleBlankNodes.push(...getCycleBlankNodes(blankNodeObject, quads));
  });
  const chainBlankNodes = blankNodeSubjects.concat(blankNodeObjects).filter((blankNode) => {
    if (cycleBlankNodes.some((cycleBlankNode) => cycleBlankNode.equals(blankNode))) {
      return false;
    }
    const subjectsWithThisNodeAsObject = quads.filter((quad) => quad.object.equals(blankNode)).map((quad) => quad.subject);
    return subjectsWithThisNodeAsObject.length > 0 && everyNodeTheSame(subjectsWithThisNodeAsObject);
  });
  return chainBlankNodes;
}
function toRdfJsQuads(dataset, options = {}) {
  var _a;
  const quads = [];
  const dataFactory = (_a = options.dataFactory) !== null && _a !== void 0 ? _a : dataModel;
  Object.keys(dataset.graphs).forEach((graphIri) => {
    const graph = dataset.graphs[graphIri];
    const graphNode = graphIri === "default" ? dataFactory.defaultGraph() : dataFactory.namedNode(graphIri);
    Object.keys(graph).forEach((subjectIri) => {
      const predicates = graph[subjectIri].predicates;
      const subjectNode = isBlankNodeId(subjectIri) ? dataFactory.blankNode(getBlankNodeValue(subjectIri)) : dataFactory.namedNode(subjectIri);
      quads.push(...subjectToRdfJsQuads(predicates, subjectNode, graphNode, options));
    });
  });
  return quads;
}
function subjectToRdfJsQuads(predicates, subjectNode, graphNode, options = {}) {
  var _a;
  const quads = [];
  const dataFactory = (_a = options.dataFactory) !== null && _a !== void 0 ? _a : dataModel;
  Object.keys(predicates).forEach((predicateIri) => {
    var _a2, _b, _c, _d;
    const predicateNode = dataFactory.namedNode(predicateIri);
    const langStrings = (_a2 = predicates[predicateIri].langStrings) !== null && _a2 !== void 0 ? _a2 : {};
    const namedNodes = (_b = predicates[predicateIri].namedNodes) !== null && _b !== void 0 ? _b : [];
    const literals = (_c = predicates[predicateIri].literals) !== null && _c !== void 0 ? _c : {};
    const blankNodes = (_d = predicates[predicateIri].blankNodes) !== null && _d !== void 0 ? _d : [];
    const literalTypes = Object.keys(literals);
    literalTypes.forEach((typeIri) => {
      const typeNode = dataFactory.namedNode(typeIri);
      const literalValues = literals[typeIri];
      literalValues.forEach((value) => {
        const literalNode = dataFactory.literal(value, typeNode);
        quads.push(dataFactory.quad(subjectNode, predicateNode, literalNode, graphNode));
      });
    });
    const locales = Object.keys(langStrings);
    locales.forEach((locale) => {
      const localeValues = langStrings[locale];
      localeValues.forEach((value) => {
        const langStringNode = dataFactory.literal(value, locale);
        quads.push(dataFactory.quad(subjectNode, predicateNode, langStringNode, graphNode));
      });
    });
    namedNodes.forEach((namedNodeIri) => {
      const node = dataFactory.namedNode(namedNodeIri);
      quads.push(dataFactory.quad(subjectNode, predicateNode, node, graphNode));
    });
    blankNodes.forEach((blankNodeIdOrPredicates) => {
      if (isBlankNodeId(blankNodeIdOrPredicates)) {
        const blankNode = dataFactory.blankNode(getBlankNodeValue(blankNodeIdOrPredicates));
        quads.push(dataFactory.quad(subjectNode, predicateNode, blankNode, graphNode));
      } else {
        const node = dataFactory.blankNode();
        const blankNodeObjectQuad = dataFactory.quad(subjectNode, predicateNode, node, graphNode);
        const blankNodeSubjectQuads = subjectToRdfJsQuads(blankNodeIdOrPredicates, node, graphNode);
        quads.push(blankNodeObjectQuad);
        quads.push(...blankNodeSubjectQuads);
      }
    });
  });
  return quads;
}
function getCycleBlankNodes(currentNode, quads, traversedBlankNodes = []) {
  if (traversedBlankNodes.find((traversedBlankNode) => traversedBlankNode.equals(currentNode)) !== void 0) {
    return traversedBlankNodes;
  }
  const blankNodeObjects = quads.filter((quad) => quad.subject.equals(currentNode) && isBlankNode(quad.object)).map((quad) => quad.object);
  if (blankNodeObjects.length === 0) {
    return [];
  }
  const nextTraversedNodes = [...traversedBlankNodes, currentNode];
  const cycleBlankNodeArrays = blankNodeObjects.map((nextNode) => getCycleBlankNodes(nextNode, quads, nextTraversedNodes));
  const allCycleBlankNodes = [];
  for (const cycleBlankNodes of cycleBlankNodeArrays) {
    allCycleBlankNodes.push(...cycleBlankNodes);
  }
  return allCycleBlankNodes;
}
function isBlankNode(term) {
  return term.termType === "BlankNode";
}

const getTurtleParser = () => {
  const onQuadCallbacks = [];
  const onCompleteCallbacks = [];
  const onErrorCallbacks = [];
  return {
    onQuad: (callback) => {
      onQuadCallbacks.push(callback);
    },
    onError: (callback) => {
      onErrorCallbacks.push(callback);
    },
    onComplete: (callback) => {
      onCompleteCallbacks.push(callback);
    },
    parse: async (source, resourceInfo) => {
      const parser = await getParser(getSourceUrl(resourceInfo));
      parser.parse(source, (error, quad, _prefixes) => {
        if (error) {
          onErrorCallbacks.forEach((callback) => callback(error));
        } else if (quad) {
          onQuadCallbacks.forEach((callback) => callback(quad));
        } else {
          onCompleteCallbacks.forEach((callback) => callback());
        }
      });
    }
  };
};
async function getParser(baseIri) {
  return new N3Parser({format: "text/turtle", baseIRI: baseIri});
}
async function triplesToTurtle(quads) {
  const format = "text/turtle";
  const writer = new N3Writer({format});
  const triples = quads.map((quad) => DataFactory$1.quad(quad.subject, quad.predicate, quad.object, void 0));
  writer.addQuads(triples);
  const writePromise = new Promise((resolve, reject) => {
    writer.end((error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
  const rawTurtle = await writePromise;
  return rawTurtle;
}

function internal_getReadableValue(value) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (isNamedNode(value)) {
    return `<${value.value}> (URL)`;
  }
  if (isLiteral(value)) {
    if (!isNamedNode(value.datatype)) {
      return `[${value.value}] (RDF/JS Literal of unknown type)`;
    }
    let val;
    switch (value.datatype.value) {
      case xmlSchemaTypes.boolean:
        val = (_b = (_a = deserializeBoolean(value.value)) === null || _a === void 0 ? void 0 : _a.valueOf()) !== null && _b !== void 0 ? _b : `Invalid data: \`${value.value}\``;
        return val + " (boolean)";
      case xmlSchemaTypes.dateTime:
        val = (_d = (_c = deserializeDatetime(value.value)) === null || _c === void 0 ? void 0 : _c.toUTCString()) !== null && _d !== void 0 ? _d : `Invalid data: \`${value.value}\``;
        return val + " (datetime)";
      case xmlSchemaTypes.decimal:
        val = (_f = (_e = deserializeDecimal(value.value)) === null || _e === void 0 ? void 0 : _e.toString()) !== null && _f !== void 0 ? _f : `Invalid data: \`${value.value}\``;
        return val + " (decimal)";
      case xmlSchemaTypes.integer:
        val = (_h = (_g = deserializeInteger(value.value)) === null || _g === void 0 ? void 0 : _g.toString()) !== null && _h !== void 0 ? _h : `Invalid data: \`${value.value}\``;
        return val + " (integer)";
      case xmlSchemaTypes.langString:
        return `"${value.value}" (${value.language} string)`;
      case xmlSchemaTypes.string:
        return `"${value.value}" (string)`;
      default:
        return `[${value.value}] (RDF/JS Literal of type: \`${value.datatype.value}\`)`;
    }
  }
  if (value.termType === "BlankNode") {
    return `[${value.value}] (RDF/JS BlankNode)`;
  }
  if (value.termType === "Quad") {
    return `??? (nested RDF* Quad)`;
  }
  if (value.termType === "Variable") {
    return `?${value.value} (RDF/JS Variable)`;
  }
  return value;
}
function internal_throwIfNotThing(thing) {
  if (!isThing(thing)) {
    throw new ThingExpectedError(thing);
  }
}
function internal_addAdditionsToChangeLog(solidDataset, additions) {
  const changeLog = hasChangelog(solidDataset) ? solidDataset.internal_changeLog : {additions: [], deletions: []};
  const [newAdditions, newDeletions] = additions.filter((addition) => !containsBlankNode(addition)).reduce(([additionsAcc, deletionsAcc], addition) => {
    const existingDeletion = deletionsAcc.find((deletion) => deletion.equals(addition));
    if (typeof existingDeletion !== "undefined") {
      return [
        additionsAcc,
        deletionsAcc.filter((deletion) => !deletion.equals(addition))
      ];
    }
    return [additionsAcc.concat(addition), deletionsAcc];
  }, [changeLog.additions, changeLog.deletions]);
  return freeze(Object.assign(Object.assign({}, solidDataset), {internal_changeLog: {
    additions: newAdditions,
    deletions: newDeletions
  }}));
}
function internal_addDeletionsToChangeLog(solidDataset, deletions) {
  const changeLog = hasChangelog(solidDataset) ? solidDataset.internal_changeLog : {additions: [], deletions: []};
  const [newAdditions, newDeletions] = deletions.filter((deletion) => !containsBlankNode(deletion)).reduce(([additionsAcc, deletionsAcc], deletion) => {
    const existingAddition = additionsAcc.find((addition) => addition.equals(deletion));
    if (typeof existingAddition !== "undefined") {
      return [
        additionsAcc.filter((addition) => !addition.equals(deletion)),
        deletionsAcc
      ];
    }
    return [additionsAcc, deletionsAcc.concat(deletion)];
  }, [changeLog.additions, changeLog.deletions]);
  return freeze(Object.assign(Object.assign({}, solidDataset), {internal_changeLog: {
    additions: newAdditions,
    deletions: newDeletions
  }}));
}
function internal_withChangeLog(solidDataset) {
  const newSolidDataset = hasChangelog(solidDataset) ? solidDataset : freeze(Object.assign(Object.assign({}, solidDataset), {internal_changeLog: {additions: [], deletions: []}}));
  return newSolidDataset;
}
function containsBlankNode(quad) {
  return quad.subject.termType === "BlankNode" || quad.object.termType === "BlankNode";
}

function getUrl(thing, property) {
  var _a, _b, _c;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateUrl = internal_toIriString(property);
  const firstUrl = (_c = (_b = (_a = thing.predicates[predicateUrl]) === null || _a === void 0 ? void 0 : _a.namedNodes) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : null;
  if (firstUrl === null) {
    return null;
  }
  return isLocalNodeIri(firstUrl) ? `#${getLocalNodeName(firstUrl)}` : firstUrl;
}
const getIri = getUrl;
function getUrlAll(thing, property) {
  var _a, _b, _c;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateUrl = internal_toIriString(property);
  return (_c = (_b = (_a = thing.predicates[predicateUrl]) === null || _a === void 0 ? void 0 : _a.namedNodes) === null || _b === void 0 ? void 0 : _b.map((iri) => isLocalNodeIri(iri) ? `#${getLocalNodeName(iri)}` : iri)) !== null && _c !== void 0 ? _c : [];
}
const getIriAll = getUrlAll;
function getInteger(thing, property) {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(thing, property, xmlSchemaTypes.integer);
  if (literalString === null) {
    return null;
  }
  return deserializeInteger(literalString);
}
function getStringNoLocaleAll(thing, property) {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(thing, property, xmlSchemaTypes.string);
  return literalStrings;
}
function getNamedNodeAll(thing, property) {
  const iriStrings = getIriAll(thing, property);
  return iriStrings.map((iriString) => DataFactory$1.namedNode(iriString));
}
function getLiteralAll(thing, property) {
  var _a, _b, _c, _d;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  let literals = [];
  const langStrings = (_b = (_a = thing.predicates[predicateIri]) === null || _a === void 0 ? void 0 : _a.langStrings) !== null && _b !== void 0 ? _b : {};
  const locales = Object.keys(langStrings);
  for (const locale of locales) {
    const stringsInLocale = langStrings[locale];
    const localeLiterals = stringsInLocale.map((langString) => DataFactory$1.literal(langString, locale));
    literals = literals.concat(localeLiterals);
  }
  const otherLiterals = (_d = (_c = thing.predicates[predicateIri]) === null || _c === void 0 ? void 0 : _c.literals) !== null && _d !== void 0 ? _d : {};
  const dataTypes = Object.keys(otherLiterals);
  for (const dataType of dataTypes) {
    const values = otherLiterals[dataType];
    const typeNode = DataFactory$1.namedNode(dataType);
    const dataTypeLiterals = values.map((value) => DataFactory$1.literal(value, typeNode));
    literals = literals.concat(dataTypeLiterals);
  }
  return literals;
}
function getTermAll(thing, property) {
  var _a, _b;
  internal_throwIfNotThing(thing);
  const namedNodes = getNamedNodeAll(thing, property);
  const literals = getLiteralAll(thing, property);
  const predicateIri = internal_toIriString(property);
  const blankNodeValues = (_b = (_a = thing.predicates[predicateIri]) === null || _a === void 0 ? void 0 : _a.blankNodes) !== null && _b !== void 0 ? _b : [];
  const blankNodes = blankNodeValues.map((rawBlankNode) => {
    const blankNodeName = isBlankNodeId(rawBlankNode) ? getBlankNodeValue(rawBlankNode) : void 0;
    return DataFactory$1.blankNode(blankNodeName);
  });
  const terms = namedNodes.concat(literals).concat(blankNodes);
  return terms;
}
function getLiteralOfType(thing, property, literalType) {
  var _a, _b, _c, _d;
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  return (_d = (_c = (_b = (_a = thing.predicates[predicateIri]) === null || _a === void 0 ? void 0 : _a.literals) === null || _b === void 0 ? void 0 : _b[literalType]) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : null;
}
function getLiteralAllOfType(thing, property, literalType) {
  var _a, _b, _c;
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const literalsOfType = (_c = (_b = (_a = thing.predicates[predicateIri]) === null || _a === void 0 ? void 0 : _a.literals) === null || _b === void 0 ? void 0 : _b[literalType]) !== null && _c !== void 0 ? _c : [];
  return [...literalsOfType];
}

function getThing(solidDataset, thingUrl, options = {}) {
  var _a;
  if (!internal_isValidUrl(thingUrl)) {
    throw new ValidThingUrlExpectedError(thingUrl);
  }
  const graph = typeof options.scope !== "undefined" ? internal_toIriString(options.scope) : "default";
  const thingsByIri = (_a = solidDataset.graphs[graph]) !== null && _a !== void 0 ? _a : {};
  const thingIri = internal_toIriString(thingUrl);
  const resolvedThingIri = isLocalNodeIri(thingIri) && hasServerResourceInfo(solidDataset) ? resolveLocalIri(getLocalNodeName(thingIri), getSourceUrl(solidDataset)) : thingIri;
  const thing = thingsByIri[resolvedThingIri];
  if (typeof thing === "undefined") {
    return null;
  }
  return thing;
}
function getThingAll(solidDataset, options = {acceptBlankNodes: false}) {
  var _a;
  const graph = typeof options.scope !== "undefined" ? internal_toIriString(options.scope) : "default";
  const thingsByIri = (_a = solidDataset.graphs[graph]) !== null && _a !== void 0 ? _a : {};
  return Object.values(thingsByIri).filter((thing) => !isBlankNodeId(thing.url) || options.acceptBlankNodes);
}
function setThing(solidDataset, thing) {
  var _a;
  const thingIri = isThingLocal(thing) && hasServerResourceInfo(solidDataset) ? resolveLocalIri(getLocalNodeName(thing.url), getSourceUrl(solidDataset)) : thing.url;
  const defaultGraph = solidDataset.graphs.default;
  const updatedDefaultGraph = freeze(Object.assign(Object.assign({}, defaultGraph), {[thingIri]: freeze(Object.assign(Object.assign({}, thing), {url: thingIri}))}));
  const updatedGraphs = freeze(Object.assign(Object.assign({}, solidDataset.graphs), {default: updatedDefaultGraph}));
  const subjectNode = DataFactory$1.namedNode(thingIri);
  const deletedThingPredicates = (_a = solidDataset.graphs.default[thingIri]) === null || _a === void 0 ? void 0 : _a.predicates;
  const deletions = typeof deletedThingPredicates !== "undefined" ? subjectToRdfJsQuads(deletedThingPredicates, subjectNode, DataFactory$1.defaultGraph()) : [];
  const additions = subjectToRdfJsQuads(thing.predicates, subjectNode, DataFactory$1.defaultGraph());
  return internal_addAdditionsToChangeLog(internal_addDeletionsToChangeLog(freeze(Object.assign(Object.assign({}, solidDataset), {graphs: updatedGraphs})), deletions), additions);
}
function removeThing(solidDataset, thing) {
  var _a;
  let thingIri;
  if (isNamedNode(thing)) {
    thingIri = thing.value;
  } else if (typeof thing === "string") {
    thingIri = isLocalNodeIri(thing) && hasServerResourceInfo(solidDataset) ? resolveLocalIri(getLocalNodeName(thing), getSourceUrl(solidDataset)) : thing;
  } else if (isThingLocal(thing)) {
    thingIri = thing.url;
  } else {
    thingIri = asIri(thing);
  }
  const defaultGraph = solidDataset.graphs.default;
  const updatedDefaultGraph = Object.assign({}, defaultGraph);
  delete updatedDefaultGraph[thingIri];
  const updatedGraphs = freeze(Object.assign(Object.assign({}, solidDataset.graphs), {default: freeze(updatedDefaultGraph)}));
  const subjectNode = DataFactory$1.namedNode(thingIri);
  const deletedThingPredicates = (_a = solidDataset.graphs.default[thingIri]) === null || _a === void 0 ? void 0 : _a.predicates;
  const deletions = typeof deletedThingPredicates !== "undefined" ? subjectToRdfJsQuads(deletedThingPredicates, subjectNode, DataFactory$1.defaultGraph()) : [];
  return internal_addDeletionsToChangeLog(freeze(Object.assign(Object.assign({}, solidDataset), {graphs: updatedGraphs})), deletions);
}
function createThing(options = {}) {
  var _a;
  if (typeof options.url !== "undefined") {
    const url = options.url;
    if (!internal_isValidUrl(url)) {
      throw new ValidThingUrlExpectedError(url);
    }
    const thing2 = freeze({
      type: "Subject",
      predicates: freeze({}),
      url
    });
    return thing2;
  }
  const name = (_a = options.name) !== null && _a !== void 0 ? _a : generateName();
  const localNodeIri = getLocalNodeIri(name);
  const thing = freeze({
    type: "Subject",
    predicates: freeze({}),
    url: localNodeIri
  });
  return thing;
}
function isThing(input) {
  return typeof input === "object" && input !== null && typeof input.type === "string" && input.type === "Subject";
}
function asUrl(thing, baseUrl) {
  if (isThingLocal(thing)) {
    if (typeof baseUrl === "undefined") {
      throw new Error("The URL of a Thing that has not been persisted cannot be determined without a base URL.");
    }
    return resolveLocalIri(getLocalNodeName(thing.url), baseUrl);
  }
  return thing.url;
}
const asIri = asUrl;
function thingAsMarkdown(thing) {
  let thingAsMarkdown2 = "";
  if (isThingLocal(thing)) {
    thingAsMarkdown2 += `## Thing (no URL yet — identifier: \`#${getLocalNodeName(thing.url)}\`)
`;
  } else {
    thingAsMarkdown2 += `## Thing: ${thing.url}
`;
  }
  const predicateIris = Object.keys(thing.predicates);
  if (predicateIris.length === 0) {
    thingAsMarkdown2 += "\n<empty>\n";
  } else {
    for (const predicate of predicateIris) {
      thingAsMarkdown2 += `
Property: ${predicate}
`;
      const values = getTermAll(thing, predicate);
      values.forEach((value) => {
        thingAsMarkdown2 += `- ${internal_getReadableValue(value)}
`;
      });
    }
  }
  return thingAsMarkdown2;
}
function isThingLocal(thing) {
  return isLocalNodeIri(thing.url);
}
class ThingExpectedError extends SolidClientError {
  constructor(receivedValue) {
    const message = `Expected a Thing, but received: [${receivedValue}].`;
    super(message);
    this.receivedValue = receivedValue;
  }
}
class ValidPropertyUrlExpectedError extends SolidClientError {
  constructor(receivedValue) {
    const value = isNamedNode(receivedValue) ? receivedValue.value : receivedValue;
    const message = `Expected a valid URL to identify a property, but received: [${value}].`;
    super(message);
    this.receivedProperty = value;
  }
}
class ValidValueUrlExpectedError extends SolidClientError {
  constructor(receivedValue) {
    const value = isNamedNode(receivedValue) ? receivedValue.value : receivedValue;
    const message = `Expected a valid URL value, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}
class ValidThingUrlExpectedError extends SolidClientError {
  constructor(receivedValue) {
    const value = isNamedNode(receivedValue) ? receivedValue.value : receivedValue;
    const message = `Expected a valid URL to identify a Thing, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}
const generateName = () => {
  return Date.now().toString() + Math.random().toString().substring("0.".length);
};

function normalizeServerSideIri(iri) {
  const iriObj = new URL(iri);
  iriObj.hash = "";
  return iriObj.href;
}

function createSolidDataset() {
  return freeze({
    type: "Dataset",
    graphs: {
      default: {}
    }
  });
}
async function responseToSolidDataset(response, parseOptions = {}) {
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(`Fetching the SolidDataset at [${response.url}] failed: [${response.status}] [${response.statusText}].`, response);
  }
  const resourceInfo = responseToResourceInfo(response);
  const parsers = Object.assign({"text/turtle": getTurtleParser()}, parseOptions.parsers);
  const contentType = getContentType(resourceInfo);
  if (contentType === null) {
    throw new Error(`Could not determine the content type of the Resource at [${getSourceUrl(resourceInfo)}].`);
  }
  const mimeType = contentType.split(";")[0];
  const parser = parsers[mimeType];
  if (typeof parser === "undefined") {
    throw new Error(`The Resource at [${getSourceUrl(resourceInfo)}] has a MIME type of [${mimeType}], but the only parsers available are for the following MIME types: [${Object.keys(parsers).join(", ")}].`);
  }
  const data = await response.text();
  const parsingPromise = new Promise((resolve, reject) => {
    let solidDataset = freeze({
      graphs: freeze({default: freeze({})}),
      type: "Dataset"
    });
    const quadsWithBlankNodes = [];
    const allQuads = [];
    parser.onError((error) => {
      reject(new Error(`Encountered an error parsing the Resource at [${getSourceUrl(resourceInfo)}] with content type [${contentType}]: ${error}`));
    });
    parser.onQuad((quad) => {
      allQuads.push(quad);
      if (quad.subject.termType === "BlankNode" || quad.object.termType === "BlankNode") {
        quadsWithBlankNodes.push(quad);
      } else {
        solidDataset = addRdfJsQuadToDataset(solidDataset, quad);
      }
    });
    parser.onComplete(async () => {
      const maxBlankNodesToDetectChainsFor = 20;
      const chainBlankNodes = quadsWithBlankNodes.length <= maxBlankNodesToDetectChainsFor ? getChainBlankNodes(quadsWithBlankNodes) : [];
      const quadsWithoutChainBlankNodeSubjects = quadsWithBlankNodes.filter((quad) => chainBlankNodes.every((chainBlankNode) => !chainBlankNode.equals(quad.subject)));
      solidDataset = quadsWithoutChainBlankNodeSubjects.reduce((datasetAcc, quad) => addRdfJsQuadToDataset(datasetAcc, quad, {
        otherQuads: allQuads,
        chainBlankNodes
      }), solidDataset);
      const solidDatasetWithResourceInfo = freeze(Object.assign(Object.assign({}, solidDataset), resourceInfo));
      resolve(solidDatasetWithResourceInfo);
    });
    parser.parse(data, resourceInfo);
  });
  return await parsingPromise;
}
async function getSolidDataset(url, options = internal_defaultFetchOptions) {
  var _a;
  url = internal_toIriString(url);
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  const parserContentTypes = Object.keys((_a = options.parsers) !== null && _a !== void 0 ? _a : {});
  const acceptedContentTypes = parserContentTypes.length > 0 ? parserContentTypes.join(", ") : "text/turtle";
  const response = await config.fetch(url, {
    headers: {
      Accept: acceptedContentTypes
    }
  });
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(`Fetching the Resource at [${url}] failed: [${response.status}] [${response.statusText}].`, response);
  }
  const solidDataset = await responseToSolidDataset(response, options);
  return solidDataset;
}
async function prepareSolidDatasetUpdate(solidDataset) {
  const deleteStatement = solidDataset.internal_changeLog.deletions.length > 0 ? `DELETE DATA {${(await triplesToTurtle(solidDataset.internal_changeLog.deletions.map(getNamedNodesForLocalNodes))).trim()}};` : "";
  const insertStatement = solidDataset.internal_changeLog.additions.length > 0 ? `INSERT DATA {${(await triplesToTurtle(solidDataset.internal_changeLog.additions.map(getNamedNodesForLocalNodes))).trim()}};` : "";
  return {
    method: "PATCH",
    body: `${deleteStatement} ${insertStatement}`,
    headers: {
      "Content-Type": "application/sparql-update"
    }
  };
}
async function prepareSolidDatasetCreation(solidDataset) {
  return {
    method: "PUT",
    body: await triplesToTurtle(toRdfJsQuads(solidDataset).map(getNamedNodesForLocalNodes)),
    headers: {
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      Link: `<${ldp.Resource}>; rel="type"`
    }
  };
}
async function saveSolidDatasetAt(url, solidDataset, options = internal_defaultFetchOptions) {
  url = internal_toIriString(url);
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  const datasetWithChangelog = internal_withChangeLog(solidDataset);
  const requestInit = isUpdate(datasetWithChangelog, url) ? await prepareSolidDatasetUpdate(datasetWithChangelog) : await prepareSolidDatasetCreation(datasetWithChangelog);
  const response = await config.fetch(url, requestInit);
  if (internal_isUnsuccessfulResponse(response)) {
    const diagnostics = isUpdate(datasetWithChangelog, url) ? "The changes that were sent to the Pod are listed below.\n\n" + changeLogAsMarkdown(datasetWithChangelog) : "The SolidDataset that was sent to the Pod is listed below.\n\n" + solidDatasetAsMarkdown(datasetWithChangelog);
    throw new FetchError(`Storing the Resource at [${url}] failed: [${response.status}] [${response.statusText}].

` + diagnostics, response);
  }
  const resourceInfo = Object.assign(Object.assign({}, internal_parseResourceInfo(response)), {isRawData: false});
  const storedDataset = freeze(Object.assign(Object.assign({}, solidDataset), {internal_changeLog: {additions: [], deletions: []}, internal_resourceInfo: resourceInfo}));
  const storedDatasetWithResolvedIris = resolveLocalIrisInSolidDataset(storedDataset);
  return storedDatasetWithResolvedIris;
}
async function deleteSolidDataset(solidDataset, options = internal_defaultFetchOptions) {
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  const url = hasResourceInfo(solidDataset) ? internal_toIriString(getSourceUrl(solidDataset)) : internal_toIriString(solidDataset);
  const response = await config.fetch(url, {method: "DELETE"});
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(`Deleting the SolidDataset at [${url}] failed: [${response.status}] [${response.statusText}].`, response);
  }
}
async function createContainerAt(url, options = internal_defaultFetchOptions) {
  var _a;
  url = internal_toIriString(url);
  url = url.endsWith("/") ? url : url + "/";
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  const response = await config.fetch(url, {
    method: "PUT",
    body: config.initialContent ? await triplesToTurtle(toRdfJsQuads(config.initialContent).map(getNamedNodesForLocalNodes)) : void 0,
    headers: {
      Accept: "text/turtle",
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      Link: `<${ldp.BasicContainer}>; rel="type"`
    }
  });
  if (internal_isUnsuccessfulResponse(response)) {
    if (response.status === 409 && response.statusText === "Conflict" && (await response.text()).trim() === internal_NSS_CREATE_CONTAINER_SPEC_NONCOMPLIANCE_DETECTION_ERROR_MESSAGE_TO_WORKAROUND_THEIR_ISSUE_1465) {
      return createContainerWithNssWorkaroundAt(url, options);
    }
    const containerType = config.initialContent === void 0 ? "empty" : "non-empty";
    throw new FetchError(`Creating the ${containerType} Container at [${url}] failed: [${response.status}] [${response.statusText}].`, response);
  }
  const resourceInfo = internal_parseResourceInfo(response);
  const containerDataset = freeze(Object.assign(Object.assign({}, (_a = options.initialContent) !== null && _a !== void 0 ? _a : createSolidDataset()), {internal_changeLog: {additions: [], deletions: []}, internal_resourceInfo: resourceInfo}));
  return containerDataset;
}
const internal_NSS_CREATE_CONTAINER_SPEC_NONCOMPLIANCE_DETECTION_ERROR_MESSAGE_TO_WORKAROUND_THEIR_ISSUE_1465 = "Can't write file: PUT not supported on containers, use POST instead";
const createContainerWithNssWorkaroundAt = async (url, options) => {
  url = internal_toIriString(url);
  const config = Object.assign(Object.assign({}, internal_defaultFetchOptions), options);
  let existingContainer;
  try {
    existingContainer = await getResourceInfo(url, options);
  } catch (e) {
    if (!(e instanceof FetchError) || e.statusCode !== 404) {
      throw e;
    }
  }
  if (typeof existingContainer !== "undefined") {
    throw new Error(`The Container at [${url}] already exists, and therefore cannot be created again.`);
  }
  const dummyUrl = url + ".dummy";
  const createResponse = await config.fetch(dummyUrl, {
    method: "PUT",
    headers: {
      Accept: "text/turtle",
      "Content-Type": "text/turtle"
    }
  });
  if (internal_isUnsuccessfulResponse(createResponse)) {
    throw new FetchError(`Creating the empty Container at [${url}] failed: [${createResponse.status}] [${createResponse.statusText}].`, createResponse);
  }
  await config.fetch(dummyUrl, {method: "DELETE"});
  const containerInfoResponse = await config.fetch(url, {method: "HEAD"});
  const resourceInfo = internal_parseResourceInfo(containerInfoResponse);
  const containerDataset = freeze(Object.assign(Object.assign({}, createSolidDataset()), {internal_changeLog: {additions: [], deletions: []}, internal_resourceInfo: resourceInfo}));
  return containerDataset;
};
function isSourceIriEqualTo(dataset, iri) {
  return normalizeServerSideIri(dataset.internal_resourceInfo.sourceIri) === normalizeServerSideIri(iri);
}
function isUpdate(solidDataset, url) {
  return hasChangelog(solidDataset) && hasResourceInfo(solidDataset) && typeof solidDataset.internal_resourceInfo.sourceIri === "string" && isSourceIriEqualTo(solidDataset, url);
}
function getContainedResourceUrlAll(solidDataset) {
  const container = getThing(solidDataset, getSourceUrl(solidDataset));
  return container !== null ? getIriAll(container, ldp.contains) : [];
}
function solidDatasetAsMarkdown(solidDataset) {
  let readableSolidDataset = "";
  if (hasResourceInfo(solidDataset)) {
    readableSolidDataset += `# SolidDataset: ${getSourceUrl(solidDataset)}
`;
  } else {
    readableSolidDataset += `# SolidDataset (no URL yet)
`;
  }
  const things = getThingAll(solidDataset);
  if (things.length === 0) {
    readableSolidDataset += "\n<empty>\n";
  } else {
    things.forEach((thing) => {
      readableSolidDataset += "\n" + thingAsMarkdown(thing);
      if (hasChangelog(solidDataset)) {
        readableSolidDataset += "\n" + getReadableChangeLogSummary(solidDataset, thing) + "\n";
      }
    });
  }
  return readableSolidDataset;
}
function changeLogAsMarkdown(solidDataset) {
  if (!hasResourceInfo(solidDataset)) {
    return "This is a newly initialized SolidDataset, so there is no source to compare it to.";
  }
  if (!hasChangelog(solidDataset) || solidDataset.internal_changeLog.additions.length === 0 && solidDataset.internal_changeLog.deletions.length === 0) {
    return `## Changes compared to ${getSourceUrl(solidDataset)}

This SolidDataset has not been modified since it was fetched from ${getSourceUrl(solidDataset)}.
`;
  }
  let readableChangeLog = `## Changes compared to ${getSourceUrl(solidDataset)}
`;
  const changeLogsByThingAndProperty = sortChangeLogByThingAndProperty(solidDataset);
  Object.keys(changeLogsByThingAndProperty).forEach((thingUrl) => {
    readableChangeLog += `
### Thing: ${thingUrl}
`;
    const changeLogByProperty = changeLogsByThingAndProperty[thingUrl];
    Object.keys(changeLogByProperty).forEach((propertyUrl) => {
      readableChangeLog += `
Property: ${propertyUrl}
`;
      const deleted = changeLogByProperty[propertyUrl].deleted;
      const added = changeLogByProperty[propertyUrl].added;
      if (deleted.length > 0) {
        readableChangeLog += "- Removed:\n";
        deleted.forEach((deletedValue) => readableChangeLog += `  - ${internal_getReadableValue(deletedValue)}
`);
      }
      if (added.length > 0) {
        readableChangeLog += "- Added:\n";
        added.forEach((addedValue) => readableChangeLog += `  - ${internal_getReadableValue(addedValue)}
`);
      }
    });
  });
  return readableChangeLog;
}
function sortChangeLogByThingAndProperty(solidDataset) {
  const changeLogsByThingAndProperty = {};
  solidDataset.internal_changeLog.deletions.forEach((deletion) => {
    var _a, _b;
    var _c;
    const subjectNode = isLocalNode(deletion.subject) ? resolveIriForLocalNode(deletion.subject, getSourceUrl(solidDataset)) : deletion.subject;
    if (!isNamedNode(subjectNode) || !isNamedNode(deletion.predicate)) {
      return;
    }
    const thingUrl = internal_toIriString(subjectNode);
    const propertyUrl = internal_toIriString(deletion.predicate);
    (_a = changeLogsByThingAndProperty[thingUrl]) !== null && _a !== void 0 ? _a : changeLogsByThingAndProperty[thingUrl] = {};
    (_b = (_c = changeLogsByThingAndProperty[thingUrl])[propertyUrl]) !== null && _b !== void 0 ? _b : _c[propertyUrl] = {
      added: [],
      deleted: []
    };
    changeLogsByThingAndProperty[thingUrl][propertyUrl].deleted.push(deletion.object);
  });
  solidDataset.internal_changeLog.additions.forEach((addition) => {
    var _a, _b;
    var _c;
    const subjectNode = isLocalNode(addition.subject) ? resolveIriForLocalNode(addition.subject, getSourceUrl(solidDataset)) : addition.subject;
    if (!isNamedNode(subjectNode) || !isNamedNode(addition.predicate)) {
      return;
    }
    const thingUrl = internal_toIriString(subjectNode);
    const propertyUrl = internal_toIriString(addition.predicate);
    (_a = changeLogsByThingAndProperty[thingUrl]) !== null && _a !== void 0 ? _a : changeLogsByThingAndProperty[thingUrl] = {};
    (_b = (_c = changeLogsByThingAndProperty[thingUrl])[propertyUrl]) !== null && _b !== void 0 ? _b : _c[propertyUrl] = {
      added: [],
      deleted: []
    };
    changeLogsByThingAndProperty[thingUrl][propertyUrl].added.push(addition.object);
  });
  return changeLogsByThingAndProperty;
}
function getReadableChangeLogSummary(solidDataset, thing) {
  const subject = DataFactory$1.namedNode(thing.url);
  const nrOfAdditions = solidDataset.internal_changeLog.additions.reduce((count, addition) => addition.subject.equals(subject) ? count + 1 : count, 0);
  const nrOfDeletions = solidDataset.internal_changeLog.deletions.reduce((count, deletion) => deletion.subject.equals(subject) ? count + 1 : count, 0);
  const additionString = nrOfAdditions === 1 ? "1 new value added" : nrOfAdditions + " new values added";
  const deletionString = nrOfDeletions === 1 ? "1 value removed" : nrOfDeletions + " values removed";
  return `(${additionString} / ${deletionString})`;
}
function getNamedNodesForLocalNodes(quad) {
  const subject = isNamedNode(quad.subject) ? getNamedNodeFromLocalNode(quad.subject) : quad.subject;
  const object = isNamedNode(quad.object) ? getNamedNodeFromLocalNode(quad.object) : quad.object;
  return DataFactory$1.quad(subject, quad.predicate, object, quad.graph);
}
function getNamedNodeFromLocalNode(node) {
  if (isLocalNodeIri(node.value)) {
    return DataFactory$1.namedNode("#" + getLocalNodeName(node.value));
  }
  return node;
}
function resolveLocalIrisInSolidDataset(solidDataset) {
  const resourceIri = getSourceUrl(solidDataset);
  const defaultGraph = solidDataset.graphs.default;
  const thingIris = Object.keys(defaultGraph);
  const updatedDefaultGraph = thingIris.reduce((graphAcc, thingIri) => {
    const resolvedThing = resolveLocalIrisInThing(graphAcc[thingIri], resourceIri);
    const resolvedThingIri = isLocalNodeIri(thingIri) ? `${resourceIri}#${getLocalNodeName(thingIri)}` : thingIri;
    const updatedGraph = Object.assign({}, graphAcc);
    delete updatedGraph[thingIri];
    updatedGraph[resolvedThingIri] = resolvedThing;
    return freeze(updatedGraph);
  }, defaultGraph);
  const updatedGraphs = freeze(Object.assign(Object.assign({}, solidDataset.graphs), {default: updatedDefaultGraph}));
  return freeze(Object.assign(Object.assign({}, solidDataset), {graphs: updatedGraphs}));
}
function resolveLocalIrisInThing(thing, baseIri) {
  const predicateIris = Object.keys(thing.predicates);
  const updatedPredicates = predicateIris.reduce((predicatesAcc, predicateIri) => {
    var _a;
    const namedNodes = (_a = predicatesAcc[predicateIri].namedNodes) !== null && _a !== void 0 ? _a : [];
    if (namedNodes.every((namedNode) => !isLocalNodeIri(namedNode))) {
      return predicatesAcc;
    }
    const updatedNamedNodes = freeze(namedNodes.map((namedNode) => isLocalNodeIri(namedNode) ? `${baseIri}#${getLocalNodeName(namedNode)}` : namedNode));
    const updatedPredicate = freeze(Object.assign(Object.assign({}, predicatesAcc[predicateIri]), {namedNodes: updatedNamedNodes}));
    return freeze(Object.assign(Object.assign({}, predicatesAcc), {[predicateIri]: updatedPredicate}));
  }, thing.predicates);
  return freeze(Object.assign(Object.assign({}, thing), {predicates: updatedPredicates, url: isLocalNodeIri(thing.url) ? `${baseIri}#${getLocalNodeName(thing.url)}` : thing.url}));
}

const addUrl = (thing, property, url) => {
  var _a, _b;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  if (!isThing(url) && !internal_isValidUrl(url)) {
    throw new ValidValueUrlExpectedError(url);
  }
  const predicateIri = internal_toIriString(property);
  const existingPredicate = (_a = thing.predicates[predicateIri]) !== null && _a !== void 0 ? _a : {};
  const existingNamedNodes = (_b = existingPredicate.namedNodes) !== null && _b !== void 0 ? _b : [];
  let iriToAdd;
  if (isNamedNode(url)) {
    iriToAdd = url.value;
  } else if (typeof url === "string") {
    iriToAdd = url;
  } else if (isThingLocal(url)) {
    iriToAdd = url.url;
  } else {
    iriToAdd = asIri(url);
  }
  const updatedNamedNodes = freeze(existingNamedNodes.concat(internal_toIriString(iriToAdd)));
  const updatedPredicate = freeze(Object.assign(Object.assign({}, existingPredicate), {namedNodes: updatedNamedNodes}));
  const updatedPredicates = freeze(Object.assign(Object.assign({}, thing.predicates), {[predicateIri]: updatedPredicate}));
  const updatedThing = freeze(Object.assign(Object.assign({}, thing), {predicates: updatedPredicates}));
  return updatedThing;
};
const addIri = addUrl;
const addDatetime = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(thing, property, serializeDatetime(value), xmlSchemaTypes.dateTime);
};
const addInteger = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(thing, property, serializeInteger(value), xmlSchemaTypes.integer);
};
const addStringNoLocale = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(thing, property, value, xmlSchemaTypes.string);
};
function addLiteralOfType(thing, property, value, type) {
  var _a, _b, _c;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const existingPredicate = (_a = thing.predicates[predicateIri]) !== null && _a !== void 0 ? _a : {};
  const existingLiterals = (_b = existingPredicate.literals) !== null && _b !== void 0 ? _b : {};
  const existingValuesOfType = (_c = existingLiterals[type]) !== null && _c !== void 0 ? _c : [];
  const updatedValuesOfType = freeze(existingValuesOfType.concat(value));
  const updatedLiterals = freeze(Object.assign(Object.assign({}, existingLiterals), {[type]: updatedValuesOfType}));
  const updatedPredicate = freeze(Object.assign(Object.assign({}, existingPredicate), {literals: updatedLiterals}));
  const updatedPredicates = freeze(Object.assign(Object.assign({}, thing.predicates), {[predicateIri]: updatedPredicate}));
  const updatedThing = freeze(Object.assign(Object.assign({}, thing), {predicates: updatedPredicates}));
  return updatedThing;
}

function removeAll(thing, property) {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const newPredicates = Object.assign({}, thing.predicates);
  delete newPredicates[predicateIri];
  return freeze(Object.assign(Object.assign({}, thing), {predicates: freeze(newPredicates)}));
}
const removeUrl = (thing, property, value) => {
  var _a, _b, _c;
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  if (!isThing(value) && !internal_isValidUrl(value)) {
    throw new ValidValueUrlExpectedError(value);
  }
  const iriToRemove = isNamedNode(value) ? value.value : typeof value === "string" ? value : asIri(value);
  const updatedNamedNodes = freeze((_c = (_b = (_a = thing.predicates[predicateIri]) === null || _a === void 0 ? void 0 : _a.namedNodes) === null || _b === void 0 ? void 0 : _b.filter((namedNode) => namedNode.toLowerCase() !== iriToRemove.toLowerCase())) !== null && _c !== void 0 ? _c : []);
  const updatedPredicate = freeze(Object.assign(Object.assign({}, thing.predicates[predicateIri]), {namedNodes: updatedNamedNodes}));
  const updatedPredicates = freeze(Object.assign(Object.assign({}, thing.predicates), {[predicateIri]: updatedPredicate}));
  return freeze(Object.assign(Object.assign({}, thing), {predicates: updatedPredicates}));
};
const removeIri = removeUrl;

const setUrl = (thing, property, url) => {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  if (!isThing(url) && !internal_isValidUrl(url)) {
    throw new ValidValueUrlExpectedError(url);
  }
  return addUrl(removeAll(thing, property), property, url);
};
const setIri = setUrl;
const setDatetime = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addDatetime(removeAll(thing, property), property, value);
};
const setInteger = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addInteger(removeAll(thing, property), property, value);
};
const setStringNoLocale = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addStringNoLocale(removeAll(thing, property), property, value);
};

function isAcr(linkedAccessResource) {
  const relTypeLinks = getLinkedResourceUrlAll(linkedAccessResource)["type"];
  return Array.isArray(relTypeLinks) && relTypeLinks.includes(acp.AccessControlResource);
}

async function internal_fetchAcl(resourceInfo, options = internal_defaultFetchOptions) {
  if (!hasAccessibleAcl(resourceInfo)) {
    return {
      resourceAcl: null,
      fallbackAcl: null
    };
  }
  try {
    const resourceAcl = await internal_fetchResourceAcl(resourceInfo, options);
    const acl2 = resourceAcl === null ? {
      resourceAcl: null,
      fallbackAcl: await internal_fetchFallbackAcl(resourceInfo, options)
    } : {resourceAcl, fallbackAcl: null};
    return acl2;
  } catch (e) {
    if (e instanceof AclIsAcrError) {
      return {
        resourceAcl: null,
        fallbackAcl: null
      };
    }
    throw e;
  }
}
async function internal_fetchResourceAcl(dataset, options = internal_defaultFetchOptions) {
  if (!hasAccessibleAcl(dataset)) {
    return null;
  }
  try {
    const aclSolidDataset = await getSolidDataset(dataset.internal_resourceInfo.aclUrl, options);
    if (isAcr(aclSolidDataset)) {
      throw new AclIsAcrError(dataset, aclSolidDataset);
    }
    return freeze(Object.assign(Object.assign({}, aclSolidDataset), {internal_accessTo: getSourceUrl(dataset)}));
  } catch (e) {
    if (e instanceof AclIsAcrError) {
      throw e;
    }
    return null;
  }
}
async function internal_fetchFallbackAcl(resource, options = internal_defaultFetchOptions) {
  const resourceUrl = new URL(getSourceUrl(resource));
  const resourcePath = resourceUrl.pathname;
  if (resourcePath === "/") {
    return null;
  }
  const containerPath = internal_getContainerPath(resourcePath);
  const containerIri = new URL(containerPath, resourceUrl.origin).href;
  const containerInfo = await getResourceInfo(containerIri, options);
  if (!hasAccessibleAcl(containerInfo)) {
    return null;
  }
  const containerAcl = await internal_fetchResourceAcl(containerInfo, options);
  if (containerAcl === null) {
    return internal_fetchFallbackAcl(containerInfo, options);
  }
  return containerAcl;
}
function internal_getContainerPath(resourcePath) {
  const resourcePathWithoutTrailingSlash = resourcePath.substring(resourcePath.length - 1) === "/" ? resourcePath.substring(0, resourcePath.length - 1) : resourcePath;
  const containerPath = resourcePath.substring(0, resourcePathWithoutTrailingSlash.lastIndexOf("/")) + "/";
  return containerPath;
}
function internal_getAclRules(aclDataset) {
  const things = getThingAll(aclDataset);
  return things.filter(isAclRule);
}
function isAclRule(thing) {
  return getIriAll(thing, rdf.type).includes(acl.Authorization);
}
function internal_getResourceAclRulesForResource(aclRules, resource) {
  return aclRules.filter((rule) => appliesToResource(rule, resource));
}
function appliesToResource(aclRule, resource) {
  return getIriAll(aclRule, acl.accessTo).includes(resource);
}
function internal_getDefaultAclRulesForResource(aclRules, resource) {
  return aclRules.filter((rule) => isDefaultForResource(rule, resource));
}
function isDefaultForResource(aclRule, resource) {
  return getIriAll(aclRule, acl.default).includes(resource) || getIriAll(aclRule, acl.defaultForNew).includes(resource);
}
function internal_getAccess(rule) {
  const ruleAccessModes = getIriAll(rule, acl.mode);
  const writeAccess = ruleAccessModes.includes(internal_accessModeIriStrings.write);
  return writeAccess ? {
    read: ruleAccessModes.includes(internal_accessModeIriStrings.read),
    append: true,
    write: true,
    control: ruleAccessModes.includes(internal_accessModeIriStrings.control)
  } : {
    read: ruleAccessModes.includes(internal_accessModeIriStrings.read),
    append: ruleAccessModes.includes(internal_accessModeIriStrings.append),
    write: false,
    control: ruleAccessModes.includes(internal_accessModeIriStrings.control)
  };
}
function internal_combineAccessModes(modes) {
  return modes.reduce((accumulator, current) => {
    const writeAccess = accumulator.write || current.write;
    return writeAccess ? {
      read: accumulator.read || current.read,
      append: true,
      write: true,
      control: accumulator.control || current.control
    } : {
      read: accumulator.read || current.read,
      append: accumulator.append || current.append,
      write: false,
      control: accumulator.control || current.control
    };
  }, {read: false, append: false, write: false, control: false});
}
function internal_removeEmptyAclRules(aclDataset) {
  const aclRules = internal_getAclRules(aclDataset);
  const aclRulesToRemove = aclRules.filter(isEmptyAclRule);
  const updatedAclDataset = aclRulesToRemove.reduce(removeThing, aclDataset);
  return updatedAclDataset;
}
function isEmptyAclRule(aclRule) {
  if (subjectToRdfJsQuads(aclRule.predicates, DataFactory$1.namedNode(aclRule.url), DataFactory$1.defaultGraph()).some((quad) => !isAclQuad(quad))) {
    return false;
  }
  if (getIri(aclRule, acl.accessTo) === null && getIri(aclRule, acl.default) === null && getIri(aclRule, acl.defaultForNew) === null) {
    return true;
  }
  if (getIri(aclRule, acl.mode) === null) {
    return true;
  }
  if (getIri(aclRule, acl.agent) === null && getIri(aclRule, acl.agentGroup) === null && getIri(aclRule, acl.agentClass) === null) {
    return true;
  }
  return false;
}
function isAclQuad(quad) {
  const predicate = quad.predicate;
  const object = quad.object;
  if (predicate.equals(DataFactory$1.namedNode(rdf.type)) && object.equals(DataFactory$1.namedNode(acl.Authorization))) {
    return true;
  }
  if (predicate.equals(DataFactory$1.namedNode(acl.accessTo)) || predicate.equals(DataFactory$1.namedNode(acl.default)) || predicate.equals(DataFactory$1.namedNode(acl.defaultForNew))) {
    return true;
  }
  if (predicate.equals(DataFactory$1.namedNode(acl.mode)) && Object.values(internal_accessModeIriStrings).some((mode) => object.equals(DataFactory$1.namedNode(mode)))) {
    return true;
  }
  if (predicate.equals(DataFactory$1.namedNode(acl.agent)) || predicate.equals(DataFactory$1.namedNode(acl.agentGroup)) || predicate.equals(DataFactory$1.namedNode(acl.agentClass))) {
    return true;
  }
  if (predicate.equals(DataFactory$1.namedNode(acl.origin))) {
    return true;
  }
  return false;
}
const internal_accessModeIriStrings = {
  read: "http://www.w3.org/ns/auth/acl#Read",
  append: "http://www.w3.org/ns/auth/acl#Append",
  write: "http://www.w3.org/ns/auth/acl#Write",
  control: "http://www.w3.org/ns/auth/acl#Control"
};
function internal_getAclRulesForIri(aclRules, targetIri, targetType) {
  return aclRules.filter((rule) => getIriAll(rule, targetType).includes(targetIri));
}
function internal_initialiseAclRule(access) {
  let newRule = createThing();
  newRule = setIri(newRule, rdf.type, acl.Authorization);
  if (access.read) {
    newRule = addIri(newRule, acl.mode, internal_accessModeIriStrings.read);
  }
  if (access.append && !access.write) {
    newRule = addIri(newRule, acl.mode, internal_accessModeIriStrings.append);
  }
  if (access.write) {
    newRule = addIri(newRule, acl.mode, internal_accessModeIriStrings.write);
  }
  if (access.control) {
    newRule = addIri(newRule, acl.mode, internal_accessModeIriStrings.control);
  }
  return newRule;
}
function internal_duplicateAclRule(sourceRule) {
  let targetRule = createThing();
  targetRule = setIri(targetRule, rdf.type, acl.Authorization);
  function copyIris(inputRule, outputRule, predicate) {
    return getIriAll(inputRule, predicate).reduce((outputRule2, iriTarget) => addIri(outputRule2, predicate, iriTarget), outputRule);
  }
  targetRule = copyIris(sourceRule, targetRule, acl.accessTo);
  targetRule = copyIris(sourceRule, targetRule, acl.default);
  targetRule = copyIris(sourceRule, targetRule, acl.defaultForNew);
  targetRule = copyIris(sourceRule, targetRule, acl.agent);
  targetRule = copyIris(sourceRule, targetRule, acl.agentGroup);
  targetRule = copyIris(sourceRule, targetRule, acl.agentClass);
  targetRule = copyIris(sourceRule, targetRule, acl.origin);
  targetRule = copyIris(sourceRule, targetRule, acl.mode);
  return targetRule;
}
function internal_setAcl(resource, acl2) {
  return Object.assign(internal_cloneResource(resource), {internal_acl: acl2});
}
const supportedActorPredicates = [
  acl.agent,
  acl.agentClass,
  acl.agentGroup,
  acl.origin
];
function internal_removeActorFromRule(rule, actor, actorPredicate, resourceIri, ruleType) {
  if (!getIriAll(rule, actorPredicate).includes(actor)) {
    const emptyRule = internal_initialiseAclRule({
      read: false,
      append: false,
      write: false,
      control: false
    });
    return [rule, emptyRule];
  }
  const ruleWithoutActor = removeIri(rule, actorPredicate, actor);
  let ruleForOtherTargets = internal_duplicateAclRule(rule);
  ruleForOtherTargets = removeIri(ruleForOtherTargets, ruleType === "resource" ? acl.accessTo : acl.default, resourceIri);
  if (ruleType === "default") {
    ruleForOtherTargets = removeIri(ruleForOtherTargets, acl.defaultForNew, resourceIri);
  }
  ruleForOtherTargets = setIri(ruleForOtherTargets, actorPredicate, actor);
  supportedActorPredicates.filter((predicate) => predicate !== actorPredicate).forEach((predicate) => {
    ruleForOtherTargets = removeAll(ruleForOtherTargets, predicate);
  });
  return [ruleWithoutActor, ruleForOtherTargets];
}
function internal_setActorAccess(aclDataset, access, actorPredicate, accessType, actor) {
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    const [filteredRule, remainingRule] = internal_removeActorFromRule(aclRule, actor, actorPredicate, aclDataset.internal_accessTo, accessType);
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });
  let newRule = internal_initialiseAclRule(access);
  newRule = setIri(newRule, accessType === "resource" ? acl.accessTo : acl.default, aclDataset.internal_accessTo);
  newRule = setIri(newRule, actorPredicate, actor);
  const updatedAcl = setThing(filteredAcl, newRule);
  return internal_removeEmptyAclRules(updatedAcl);
}
class AclIsAcrError extends Error {
  constructor(sourceResource, aclResource) {
    super(`[${getSourceIri(sourceResource)}] is governed by Access Control Policies in [${getSourceIri(aclResource)}] rather than by Web Access Control.`);
  }
}

function hasResourceAcl(resource) {
  return resource.internal_acl.resourceAcl !== null && getSourceUrl(resource) === resource.internal_acl.resourceAcl.internal_accessTo && resource.internal_resourceInfo.aclUrl === getSourceUrl(resource.internal_acl.resourceAcl);
}
async function getSolidDatasetWithAcl(url, options = internal_defaultFetchOptions) {
  const solidDataset = await getSolidDataset(url, options);
  const acl2 = await internal_fetchAcl(solidDataset, options);
  return internal_setAcl(solidDataset, acl2);
}
function getResourceAcl(resource) {
  if (!hasResourceAcl(resource)) {
    return null;
  }
  return resource.internal_acl.resourceAcl;
}
function hasFallbackAcl(resource) {
  return resource.internal_acl.fallbackAcl !== null;
}
function createAcl(targetResource) {
  const emptyResourceAcl = freeze(Object.assign(Object.assign({}, createSolidDataset()), {internal_accessTo: getSourceUrl(targetResource), internal_resourceInfo: {
    sourceIri: targetResource.internal_resourceInfo.aclUrl,
    isRawData: false,
    linkedResources: {}
  }}));
  return emptyResourceAcl;
}
async function saveAclFor(resource, resourceAcl, options = internal_defaultFetchOptions) {
  if (!hasAccessibleAcl(resource)) {
    throw new Error(`Could not determine the location of the ACL for the Resource at [${getSourceUrl(resource)}]; possibly the current user does not have Control access to that Resource. Try calling \`hasAccessibleAcl()\` before calling \`saveAclFor()\`.`);
  }
  const savedDataset = await saveSolidDatasetAt(resource.internal_resourceInfo.aclUrl, resourceAcl, options);
  const savedAclDataset = Object.assign(Object.assign({}, savedDataset), {internal_accessTo: getSourceUrl(resource)});
  return savedAclDataset;
}
function hasAccessibleAcl(dataset) {
  return typeof dataset.internal_resourceInfo.aclUrl === "string";
}

function setAgentResourceAccess(aclDataset, agent, access) {
  return internal_setActorAccess(aclDataset, access, acl.agent, "resource", agent);
}
function setAgentDefaultAccess(aclDataset, agent, access) {
  return internal_setActorAccess(aclDataset, access, acl.agent, "default", agent);
}

function getGroupAccess(resourceInfo, group) {
  if (hasResourceAcl(resourceInfo)) {
    return getGroupResourceAccess(resourceInfo.internal_acl.resourceAcl, group);
  }
  if (hasFallbackAcl(resourceInfo)) {
    return getGroupDefaultAccess(resourceInfo.internal_acl.fallbackAcl, group);
  }
  return null;
}
function getGroupResourceAccess(aclDataset, group) {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(allRules, aclDataset.internal_accessTo);
  const groupResourceRules = getGroupAclRuleForGroup(resourceRules, group);
  const groupAccessModes = groupResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}
function getGroupDefaultAccess(aclDataset, group) {
  const allRules = internal_getAclRules(aclDataset);
  const defaultRules = internal_getDefaultAclRulesForResource(allRules, aclDataset.internal_accessTo);
  const groupDefaultRules = getGroupAclRuleForGroup(defaultRules, group);
  const groupAccessModes = groupDefaultRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}
function getGroupAclRuleForGroup(rules, group) {
  return internal_getAclRulesForIri(rules, group, acl.agentGroup);
}
function setGroupResourceAccess(aclDataset, group, access) {
  return internal_setActorAccess(aclDataset, access, acl.agentGroup, "resource", group);
}
function setGroupDefaultAccess(aclDataset, group, access) {
  return internal_setActorAccess(aclDataset, access, acl.agentGroup, "default", group);
}

function getPublicAccess(resourceInfo) {
  if (hasResourceAcl(resourceInfo)) {
    return getPublicResourceAccess(resourceInfo.internal_acl.resourceAcl);
  }
  if (hasFallbackAcl(resourceInfo)) {
    return getPublicDefaultAccess(resourceInfo.internal_acl.fallbackAcl);
  }
  return null;
}
function getPublicResourceAccess(aclDataset) {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(allRules, aclDataset.internal_accessTo);
  const publicResourceRules = getClassAclRulesForClass(resourceRules, foaf.Agent);
  const publicAccessModes = publicResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(publicAccessModes);
}
function getPublicDefaultAccess(aclDataset) {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(allRules, aclDataset.internal_accessTo);
  const publicResourceRules = getClassAclRulesForClass(resourceRules, foaf.Agent);
  const publicAccessModes = publicResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(publicAccessModes);
}
function setPublicResourceAccess(aclDataset, access) {
  return internal_setActorAccess(aclDataset, access, acl.agentClass, "resource", foaf.Agent);
}
function setPublicDefaultAccess(aclDataset, access) {
  return internal_setActorAccess(aclDataset, access, acl.agentClass, "default", foaf.Agent);
}
function getClassAclRulesForClass(aclRules, agentClass) {
  return aclRules.filter((rule) => appliesToClass(rule, agentClass));
}
function appliesToClass(aclRule, agentClass) {
  return getIriAll(aclRule, acl.agentClass).includes(agentClass);
}

export { addStringNoLocale, addUrl, asUrl, createAcl, createContainerAt, createSolidDataset, createThing, deleteSolidDataset, getContainedResourceUrlAll, getGroupAccess, getInteger, getPublicAccess, getResourceAcl, getSolidDataset, getSolidDatasetWithAcl, getStringNoLocaleAll, getThing, getThingAll, getUrl, getUrlAll, hasResourceAcl, removeThing, removeUrl, saveAclFor, saveSolidDatasetAt, setAgentDefaultAccess, setAgentResourceAccess, setDatetime, setGroupDefaultAccess, setGroupResourceAccess, setInteger, setPublicDefaultAccess, setPublicResourceAccess, setStringNoLocale, setThing, setUrl };
