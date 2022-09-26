# FrameJS
## ES6 custom-element-based SPA framework

## Version: 2.0 (alpha) **Testing only - not suitable for production use**

### Overview

FrameJS is a single-page-application framework based on ES6 classes and custom elements. It's designed to allow an
application to be split into multiple modules, each of which can be loaded on demand. Custom elements are used to
isolate the code and style in each module within a shadow DOM while still allowing the module to interact with the
rest of the application as needed.

Each element is represented by two classes: a controller class and its corresponding custom element. The application
can be defined either by instantiating the controller classes directly or by using the custom elements. The
controller classes are responsible for managing the state of the application and the custom elements are responsible
for rendering the application. The controller classes are also responsible for loading the custom elements that
they need.

#### Custom Elements

If defining the application using the custom elements, the application is defined by creating a `<fjs-app>` element
for the application, with a name attribute specified to identify the application. The configuration of the application
is specified by creating a `<fjs-config>` element as a child of the `<fjs-app>` element. Within this element, configuration
details can either be provided through `<fjs-property>` elements representing named directives or by specifying the same
directives in an external JSON file and referencing this file in the src attribute of a `<fjs-configfile>` element. The
`<fjs-property>` elements can be used to override the values specified in the external configuration file.

The `<fjs-app>` element can also contain a `<fjs-frame>` element in which the application's content frame can be defined.
This content frame will remain on-screen while the application is running, and all pages will be loaded within a
`<fjs-page>` element within this frame. Transitions can be effected by using three `<fjs-page>` elements, each with a
unary attribute specifying the transition phase: "previous", "main", or "next". If such elements are specified, the
`<fjs-page main>` will be used to display the currently active content, while `<fjs-page previous>` and `<fjs-page next>`
will be used to display the content that is being transitioned away from and transitioned to, respectively. The attributes
will be modified as the transition progresses; when all content for the `<fjs-page next>` element has been loaded, its
attribute will be changed to "main" and the `<fjs-page main>` element will be changed to "previous". Finally, the
`<fjs-page previous>` element will be removed from the DOM, and a new `<fjs-page next>` element will be created for the
next transition. FrameJS will force a reflow of the page when the attributes are changed so that any defined CSS
transitions based on these attributes will be triggered. Backward navigation swaps the roles of the "previous" and "next"
pages to invert the transition direction.

In addition to `<fjs-page>` elements, the `<fjs-frame>` element can also contain `<fjs-module>` elements, which are self-contained
elements that can be loaded/unloaded outside the typical navigation flow. `<fjs-module>` elements can be used to define
dialogs, popups, or scripts that can either be loaded at startup or on demand, depending on when they are attached to
the DOM.

Content for the `<fjs-module>` and `<fjs-page>` elements is loaded either by referencing external HTML documents using the
src attribute or by specifying the content directly within the element. All such content is treated as a complete
HTML document, with the `<fjs-page>` or `<fjs-module>` element being the root element. (Note: if the content is specified
directly within the element, a `<html>` tag is not required, and certain tags such as `<head>`, `<title>`, `<body>`, and others
that can only appear once in a document, as well as any `<script>` or `<style>` tags that are not intended to be run immediately
when the application is loaded, must be prefixed with "fjs-".) Any modules loaded in this manner may be added to either
a `<fjs-loaded-modules>` or `<fjs-cache>` element within the `<fjs-app>` element (only one of each such element is allowed
within the `<fjs-app>` element, and these will be created automatically if not specified). Modules placed in `<fjs-loaded-modules>`
will be loaded and run immediately when the application is loaded, while modules placed in `<fjs-cache>` will be loaded
immediately but will not be run until initialized by the application. Modules that are intended to be cloned and
initialized independently should be placed in `<fjs-cache>`, while modules that are primarily intended to be used to
compartmentalize application-wide code and style should be placed in `<fjs-loaded-modules>`.

#### Controller Classes

If defining the application using the controller classes, the application is defined by creating an instance of the
`FrameJSApp` class, using the desired app name as the single argument to the constructor. If a `<fjs-app>` element already
exists in the DOM with the given name, this element will be associated with the `FrameJSApp` instance. Otherwise, a new
`<fjs-app>` element will be created with the given name; this will need to be added to the DOM in order to initialize the
application. This element (of class `FrameJSAppElement`) can be accessed through the `FrameJSApp.rootElement` property.

The configuration of this application is specified in the `FrameJSApp.config` property, which is an object containing
the configuration directives as they would be defined in an external JSON file. (Such a file can be used instead by
calling the `FrameJSApp.config.fromFile()` method using the path to the file as the argument.) Modules and pages can
be defined by creating instances of the FrameJSModule and FrameJSPage classes, respectively, and added to the application
using either the `FrameJSApp.loadModule()` or `FrameJSApp.addToCache()` methods, depending on whether the module should
be loaded immediately or not. (FrameJSPage instances can only be added with the latter.) Modules and pages can also
be autoloaded en masse by referencing them in an external JSON file and specifying the path to this file as the argument
to the `FrameJSApp.autoload()` method, in a `<fjs-property name="autoload">` element in the `<fjs-config>` element, or as an
autoload property in an external JSON configuration file.

The FrameJSApp class also provides methods for loading and unloading modules and pages, as well as for navigating
between pages. `FrameJSApp.back()` and `FrameJSApp.forward()` can be used as functional equivalents for the browser's
back and forward buttons, respectively. The `FrameJSApp.navigate()` method can be used to navigate to a specific page
or module identified by name, and the `FrameJSApp.reload()` method can be used to reload the current page or module.
The `FrameJSApp.loadModule()` and `FrameJSApp.unloadModule()` methods can be used to load and unload modules that are
not part of the navigation flow. The `FrameJSApp.addToCache()` and `FrameJSApp.removeFromCache()` methods can be used to
add and remove modules or pages from the cache, respectively. (Note: removing a module or page from the cache will
not unload it if it is currently loaded. To unload a module or page, use the `FrameJSApp.unloadModule()` method, or
the equivalent `unload()` method on the `FrameJSModule` or `FrameJSPage` instance.)

