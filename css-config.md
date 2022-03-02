# CSS Configuration Notes/Guide

This file describes how the configuration file for CSS (Solid Community Server) works, and how to customise it.

The information contained in this file may be incomplete or incorrect in some cases, because it is based on experience rather than the design document (which does not seem to exist) for CSS. Corrections are more than welcome.

## General information

The configuration file is a [JSON-LD](https://w3c.github.io/json-ld-syntax/) file, which uses its own context. A _context_ in JSON-LD specifies how a term should be mapped to an IRI. It works similarly to OWL / ontology.  

@@TODO: Verify the real relation between context and OWL ontology.

The configuration file also contains directives for [Components.js](https://componentsjs.readthedocs.io/en/latest/), which provides the mechanism to compose the required components through the configuration file rather than hard-coded in the source code.

Because of Components.js, the configuration file determines the behaviour of the CSS server, including what to start when the server runs. We can also change some part of the configuration and replace that with what we want, to alter the behaviour of the server. For example, the [mashlib recipe](https://github.com/solid/community-server-recipes) uses the configuration file to start both the CSS server and use/serve mashlib as the default frontend; the [Solid Calendar Store](https://github.com/KNowledgeOnWebScale/solid-calendar-store) uses the configuration file to start CSS and configures the calendar API endpoints.

## Sectioning

The configuration file mainly contains three sections:

1. `@context`: context specification

2. `import`: directives to import configurations from other files

3. `@graph`: configurations in this file

The other files linked by `import` are to be parsed and added to the configuration specified in the current file. CSS has split them into different sub-directories.

`@context` and `@graph` are a part of JSON-LD syntax, where `@graph` contains the graph (content).

## Interpretation

As a part of component.js syntax, the content in the configuration file describes what components to initialise and how to initialise components. The critical parts are:

```json
  "@id": "ex:myInstance",
  "@type": "MyComponent",
  "MyComponent:_name": "John"
```

- `@id` is the ID of the current node in the graph. It may be referenced by other nodes in the graph.

- `@type` is the type of the current node in the graph, **and** also the class to initialise.

- `MyComponent:_name` specifies an argument to the class constructor's `name` parameter.

Note: See [this discussion](https://github.com/LinkedSoftwareDependencies/Components.js/discussions/82) for the relation between different representations of setting arguments to constructor: `MyComponent:_name` (as seen in [Workflow TypeScript - Components.js Documentation](https://componentsjs.readthedocs.io/en/latest/getting_started/basics/workflow_ts/#2-component-configuration-file)) and `name` (as seen in [Home - Components.js Documentation](https://componentsjs.readthedocs.io/en/latest/#3-create-a-configuration-file-to-instantiate-our-class)).

Most often, we (including CSS) will use the companion `componentsjs-generator` tool to automatically generate the `components.jsonld` and `context.jsonld` files for us. This is configured in `package.json`, as a part of the build scripts.



For example, in Solid Calendar Store, the available classes to initialise is from `dist/components/components.jsonld`. The context URL/file is eventually mapped to `dist/components/context.jsonld`, where the mapping is specified in `package.json`. Both files are generated during building by invoking `componentsjs-generator` (see `package.json`). See [Exposing Components - Components.js Documentation](https://componentsjs.readthedocs.io/en/latest/getting_started/basics/exposing_components/) for more explanation.



## Components/Elements in the configuration

The configuration file for CSS is separated into multiple parts/modules, each serving certain functionalities. We can choose / compose from them about the parts we need, and `import` them. 

@@TODO: I remember seeing this somewhere but can't find it: only one from each is needed.



If you open a configuration file, you will see lots of `@id`s. That is also true for the alternative configurations we can find in recipes (e.g. mashlib) and extensions/plugins (e.g. Solid Calendar Store), which will have even more `@id`s -- both from CSS and themselves.



Each `@id` is for a node in the JSON-LD document, and must be unique. Some other fields may reference them. If a node does not need to be referred to at all, the `@id` is not needed.



Unless exceptional, CSS configurations should (eventually) include `config/app/main/default.json` or other files under the same directory. They describe the main entrypoint of CSS, as a node with ID `urn:solid-server:default:App`.



All other components are grdually included, as the parameters (for the corresponding objects constructed) for that `urn:solid-server:default:App`. Therefore, if we want to replace a component, we can simply write a node for that component, and construct the object as we wish (and do not include/import the sample one).



For example, in mashlib recipe, it did not include `config/util/index/default.json`, but defined its own `urn:solid-server:default:DefaultUiConverter`; it did not include `config/storage/backend/file.json`, but defined its own `urn:solid-server:default:ResourceStore_Backend` with some different settings (and imported `config/storage/backend/data-accessors/file.json`).



Note: in Components.js, you can not override a previously defined node (at least yet). See [this issue](https://github.com/LinkedSoftwareDependencies/Components.js/issues/66) if you are interested to join the discussion.




