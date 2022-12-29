//Set global to hold application instances.
window.FrameJS = window.FrameJS || [];

export class FrameJSApp {
    #appName;   // Used as document title
    #modules;
    #pages;
    #rootElement;
    #cacheElement;
    #configuration;
    #currentPage;
    #previousPage;
    constructor(appName) {
        this.#appName = appName;
        this.#modules = new FrameJSModuleCollection();
        this.#pages = new FrameJSPageCollection();
        this.#configuration = {};
        window.FrameJS.push(this);
    }
    get appName() {
        return this.#appName;
    }
    set appName(appName) {
        this.#appName = appName;
    }
    get modules() {
        return this.#modules;
    }
    get pages() {
        return this.#pages;
    }
    get rootElement() {
        return this.#rootElement;
    }
    get configuration(){
        return this.#configuration;
    }
    initialize(rootElement){
        //If the root element isn't passed, create it
        if (!rootElement) {
            this.#rootElement = document.createElement('fjs-app');
            this.#rootElement.setAttribute('name', this.#appName);
            this.#rootElement.app = this;
            document.body.appendChild(this.#rootElement); //this.#rootElement's connectedCallback() is called here
        }
        else {
            this.#rootElement = rootElement;
        }
        if (!this.#cacheElement){
            //If a fjs-cache element exists in this.#rootElement, use it
            this.#cacheElement = this.#rootElement.shadowRoot.querySelector('fjs-cache');
            if (!this.#cacheElement) {
                this.#cacheElement = document.createElement('fjs-cache');
                this.#cacheElement.app = this;
                this.#rootElement.shadowRoot.appendChild(this.#cacheElement); //this.#cacheElement's connectedCallback() is called here
            }
        }
        //Load and set the configuration
        this.setConfiguration()
            .then(() =>
                // Initialize the modules
                this.modules.initialize()
            ).then(() =>
            // Initialize the pages
            this.pages.initialize()
        );
    }
    async setConfiguration(){
        function loadConfigFromDirectives(configElement){
            let configProperties = configElement.querySelectorAll('fjs-property');
            for (let configProperty of configProperties) {
                //Get the property name
                let propertyName = configProperty.getAttribute('name');
                //Set the property
                this.#configuration[propertyName] = configProperty.getAttribute('value');
            }
        }
        function configCallbacks(){
            //Configuration actions that need to be run immediately after the configuration is loaded/reloaded
            for (let key of Object.keys(this.#configuration)){
                switch (key) {
                    case 'pagesDir':
                    case 'modulesDir':
                        fetch(this.#configuration[key] + "/index.json").then(response => response.json()).then(modules => {
                            let firstPage;
                            for (let i = 0; i < modules.length; i++) {
                                if (key === 'pagesDir') {
                                    const page = new FrameJSPage(this.#configuration[key] + "/" + modules[i].path, modules[i].name, modules[i].state);
                                    page.load();
                                    if (modules[i].firstPage) {
                                        if (firstPage) {
                                            throw new Error('External configuration error: multiple pages defined as first page');
                                        }
                                        else {
                                            firstPage = page;
                                        }
                                    }
                                    else {
                                        this.addToCache(page);
                                    }
                                }
                                else if (key === 'modulesDir') {
                                    const module = new FrameJSModule(modules[i].path, modules[i].name, modules[i].state);
                                    if (modules[i].autoload){
                                        this.loadModule(module);
                                    }
                                    else {
                                        this.addToCache(module);
                                    }
                                }
                            }
                            if (firstPage) {
                                this.navigate(firstPage);
                            }
                        });
                        break;
                }
            }
        }
        //Empty the configuration array
        this.#configuration = {};

        //Process configuration groups in document order
        let configElements = this.#rootElement.shadowRoot.querySelectorAll('fjs-config');

        //Apply core styles
        let coreStyles = document.createElement('style');
        coreStyles.setAttribute("id","fjs-core-styles");
        coreStyles.innerHTML = `
            fjs-cache, fjs-config {
                display: none;
            }
        `;
        document.head.appendChild(coreStyles);

        //Process each configuration group
        for (let configElement of configElements){
            //Start first with <fjs-configfile> elements
            let configFiles = configElement.querySelectorAll('fjs-configfile');
            let configFetches = [];
            for (let configFile of configFiles){
                //Fetch the configuration file
                let configFilePath = configFile.getAttribute('src');
                configFetches.push(fetch(configFilePath));
            }
            if (configFetches.length > 0) {
                //Wait for all configuration files to be fetched
                let responses = await Promise.all(configFetches);
                for (let response of responses) {
                    //Merge the configuration JSON into the configuration object
                    let configJSON = await response.json();
                    this.#configuration = Object.assign(this.#configuration, configJSON);
                }
                //Process <fjs-property> elements (which override configuration file values)
                if (!this.#configuration.disableClientDirectives) {
                    loadConfigFromDirectives.call(this, configElement);
                    configCallbacks.call(this);
                }
            }
            else if (!this.#configuration.disableClientDirectives) {
                //Process <fjs-property> elements
                loadConfigFromDirectives(configElement);
                configCallbacks.call(this);
            }
        }
    }
    addToCache(module){
        if (module instanceof FrameJSPage){
            this.#pages.add(module);
        }
        else if (module instanceof FrameJSModule){
            this.#modules.add(module);
        }
        else {
            throw new Error('Invalid module type');
        }
        this.#cacheElement.appendChild(module.element);
    }
    removeFromCache(module){
        if (module instanceof FrameJSModule){
            this.#modules.remove(module);
        }
        else if (module instanceof FrameJSPage){
            this.#pages.remove(module);
        }
        else {
            throw new Error('Invalid module type');
        }
        this.#cacheElement.removeChild(module.doc);
    }
    navigate(page){
        if (typeof page === 'string'){
            page = this.#pages.get(page);
            if (!page) throw new Error('Page not found');
        }
        if (this.#currentPage) {
            this.#previousPage = this.#currentPage;
        }
        this.#currentPage = page.newInstance();

        if (this.#configuration.useTransitions){
            //Step 1: Add the new page to the DOM with attribute "next"
            this.#currentPage.element.setAttribute('next', '');
            if (this.#previousPage){
                this.#previousPage.element.after(this.#currentPage.element);
            }
            else {
                this.#rootElement.appendChild(this.#currentPage.element);
            }
            this.#currentPage.element.offsetHeight; //force a reflow

            //Step 2: Change the current "main" page to "previous" and the new page to "main"
            if (this.#previousPage) this.#previousPage.element.setAttribute('previous', '');
            this.#currentPage.element.removeAttribute('next');
            this.#currentPage.element.setAttribute('main', '');
            this.#currentPage.element.offsetHeight; //force another reflow

            //Step 3: Remove the previous page from the DOM
            if (this.#previousPage) this.#rootElement.removeChild(this.#previousPage.element);
        }
        else {
            this.#rootElement.removeChild(this.#previousPage.element);
            this.#rootElement.appendChild(this.#currentPage.element);
        }
    }

}

export class FrameJSModule {
    #name;
    #path;
    #head;
    #body;
    #element;
    _instances = [];
    constructor(path, name){
        this.#name = name;
        this.#path = path;
        if (this.constructor.name === "FrameJSModule"){    // Subclasses use different element names
            this.#element = document.createElement('fjs-module');
            //Classes that extend FrameJSModule will set this.#element to an instance of the corresponding element
        }
    }
    get name() {
        return this.#name;
    }
    get element(){
        if (!this.#element){
            this.#element = document.createElement('fjs-module');
        }
        return this.#element;
    }
    load(){
        return new Promise((resolve, reject) => {
            fetch(this.#path)
                .then(response => response.text())
                .then(text => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');
                    this.#head = doc.head;
                    this.#body = doc.body;
                    resolve();
                })
                .catch(error => reject(error));
        });
    }
    clone(){
        return this.#body.cloneNode(true);
    }
    newInstance(state){
        let instance = new FrameJSModuleInstance(this, this.clone(), state);
        this._instances.push(instance);
        return instance;
    }
}

export class FrameJSModuleInstance {
    #module;
    #element;
    #state;
    constructor(module, element, state){
        this.#module = module;
        this.#element = element;
        this.#element.instance = this;
        this.#state = state;
    }
    get module(){
        return this.#module;
    }
    get element(){
        return this.#element;
    }
    get state(){
        return this.#state;
    }
}

export class FrameJSPage extends FrameJSModule {
    #scripts;
    #styles;
    #otherHeadElements;
    #title;
    #element;
    constructor(path, name){
        super(path, name);
        if (this instanceof FrameJSPage) {
            this.#element = document.createElement('fjs-page');
        }
    }
    get element(){
        if (!this.#element){
            this.#element = document.createElement('fjs-page');
        }
        return this.#element;
    }
    load(){
        super.load().then((() => {
            this.#title = this.element.querySelector('title');
            this.#scripts = this.element.querySelectorAll('fjs-script');
            this.#styles = this.element.querySelectorAll('fjs-style');
            this.#otherHeadElements = this.element.querySelectorAll('fjs-head > *:not(fjs-script):not(fjs-style)');
        }));
    }
    newInstance(state) {
        let instance = new FrameJSPageInstance(this, this.clone(), state);
        this._instances.push(instance);
        return instance;
    }
}

export class FrameJSPageInstance extends FrameJSModuleInstance {
    constructor(page, element, state){
        super(page, element, state);
    }
}

export class FrameJSModuleCollection {
    #modules;
    constructor() {
        this.#modules = {};
    }
    //FrameJSModuleCollection and FrameJSPageCollection are iterable
    [Symbol.iterator]() {
        let index = -1;
        let items = Object.values(this.#modules);
        return {
            next: () => ({ value: items[++index], done: !(index in items) })
        }
    }
    get length() {
        return Object.keys(this.#modules).length;
    }
    add(module) {
        if (this.#modules[module.name] !== undefined) {
            throw new Error(`Module ${module.name} already exists in application`);
        }
        else {
            this.#modules[module.name] = module;
        }
    }
    remove(module) {
        delete this.#modules[module.name];
    }
    get(name) {
        return this.#modules[name];
    }
    all() {
        return this.#modules;
    }
    initialize() {
        for (let module of this) {
            module.initialize();
        }
    }
}

export class FrameJSPageCollection extends FrameJSModuleCollection {
    add(page){
        if (page instanceof FrameJSPage) {
            super.add(page);
        }
        else {
            throw new Error('Only FrameJSPage objects can be added to a FrameJSPageCollection');
        }
    }
    remove(page){
        super.remove(page);
    }
}
