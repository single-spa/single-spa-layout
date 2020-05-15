# single-spa-layout

[![Build Status](https://travis-ci.com/single-spa/single-spa-layout.svg?branch=master)](https://travis-ci.com/single-spa/single-spa-layout)

Layout engine for single-spa applications

## Project Goal

Single-spa layout attempts to solve the following problems:

- Controlling where each single-spa application is rendered in the DOM
- Reordering the single-spa applications during route changes
- Embracing a more familiar route based registration of applications
- Facilitating server rendering of single spa applications, which likely will use an HTML template like the one encouraged by single-spa-layout
- Changing dom element containers for applications during route changes
- Doing all this in a way that can be stored in a database, for organizations who want dynamic registration of applications

## API

### Overview

1. [contstruct routes](#Constructing-Routes)
2. construct applications from routes
3. register applications
4. construct layout engine
5. call `start()` from the `single-spa` package

```js
// root-config.js
import { registerApplication, start } from 'single-spa';
import { constructRoutes, constructApplications, constructLayoutEngine } from 'single-spa-layout';

const routes = constructRoutes(...)
const applications = constructApplications({routes, loadApp: name => System.import(name)})
applications.forEach(registerApplication);
const layoutEngine = constructLayoutEngine({routes, applications})
start()
```

### Constructing Routes

single-spa-layout supports two different sytanxes defining applications and routes at this time:

- [JSX](#JSX) (compiles to JSON syntax)
- [JSON](#JSON)

#### Route Object types

1. Router
2. Application
3. Route

##### Router

The root object/node. Router can have the following options:

- mode: 'history' | 'hash'
- base: base url where the router is active
- containerEl: which cssSelector is where the routing should take place (inferred in HTML syntax)
- routes: Array of routes or Application objects

##### Route

A routing point where all children will be conditionally rendered when the url matches. Suppors the following options

- path: string to evaluate against the URL
- routes: Array of routes or Application objects

##### Application

A placeholder for where a microfrontend application will render. Application objects support the following objects

- name: Name of the application (will be used to registerApplications in single-spa)
- props: object of custom props to pass down to the application (this object is constructed from all non-matching attributes in HTML and JSX syntax)
- nodeName: The name of the HTML node that should be used to contain the application. ex: 'nav' || 'div' || 'section'

#### JSX

```jsx
<router mode="history" base="/" containerEl="#selector">
  <application name="@org/navbar" />
  <route path="/app1">
    <application name="@org/main-sidenav" />
    <application name="@org/app1" />
  </route>
  <route path="/app2">
    <application name="@org/main-sidenav" />
    <application name="@org/app2" />
  </route>
  <route path="/settings">
    <application name="@org/settings" />
  </route>
  <application name="@org/footer" />
</router>
```

#### JSON

```js
const routes = {
  mode: "history",
  base: "/",
  containerEl: "#selector",
  children: [
    { type: "application", name: "@org/navbar" },
    {
      type: "route",
      path: "app1",
      children: [
        { type: "application", name: "@org/main-sidenav" },
        { type: "application", name: "@org/app1" },
      ],
    },
    {
      type: "route",
      path: "app2",
      children: [
        { type: "application", name: "@org/main-sidenav" },
        { type: "application", name: "@org/app2" },
      ],
    },
    {
      type: "route",
      path: "settings",
      children: [{ type: "application", name: "@org/settings" }],
    },
    { type: "application", name: "@org/footer" },
  ],
};
```
