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
            this.#cacheElement = this.#rootElement.querySelector('fjs-cache');
            if (!this.#cacheElement) {
                this.#cacheElement = document.createElement('fjs-cache');
                this.#cacheElement.app = this;
                this.#rootElement.appendChild(this.#cacheElement); //this.#cacheElement's connectedCallback() is called here
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
        let configElements = this.#rootElement.querySelectorAll('fjs-config');

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
        if (module instanceof FrameJSModule){
            this.#modules.add(module);
        }
        else if (module instanceof FrameJSPage){
            this.#pages.add(module);
        }
        else {
            throw new Error('Invalid module type');
        }
        this.#cacheElement.appendChild(module.doc);
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
        if (this.#currentPage) {
            this.#previousPage = this.#currentPage;
        }
        this.#currentPage = page;
        if (this.#configuration.useTransitions){
            //Step 1: Add the new page to the DOM with attribute "next"
            this.#currentPage.setAttribute('next', '');
            this.#previousPage.after(this.#currentPage);
            this.#currentPage.offsetHeight; //force a reflow

            //Step 2: Change the current "main" page to "previous" and the new page to "main"
            this.#previousPage.setAttribute('previous', '');
            this.#currentPage.removeAttribute('next');
            this.#currentPage.setAttribute('main', '');
            this.#currentPage.offsetHeight; //force another reflow

            //Step 3: Remove the previous page from the DOM
            this.#rootElement.removeChild(this.#previousPage);
        }
        else {
            this.#rootElement.removeChild(this.#previousPage);
            this.#rootElement.appendChild(this.#currentPage);
        }
    }
}

export class FrameJSModule {
    #name;
    #path;
    #doc;   // Document fragment containing the document loaded from #path
    _instances = [];
    constructor(path, name){
        this.#name = name;
        this.#path = path;
    }
    get name() {
        return this.#name;
    }
    get doc(){
        return this.#doc;
    }
    load(){
        return new Promise((resolve, reject) => {
            fetch(this.#path)
                .then(response => response.text())
                .then((text => {
                    this.#doc = new DOMParser().parseFromString(text, 'text/html');
                    resolve();
                }).call(this))
                .catch(error => reject(error));
        });
    }
    clone(){
        return this.#doc.cloneNode(true);
    }
    newInstance(state){
        let instance = new FrameJSModuleInstance(this, this.#doc.cloneNode(true), state);
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
    #body;
    constructor(path, name){
        super(path, name);
    }
    load(){
        super.load().then(() => {
            this.#scripts = super.doc.querySelectorAll('script');
            this.#body = super.doc.querySelector('body');
        });
    }
    newInstance(state) {
        let instance = new FrameJSPageInstance(this, this.#body.cloneNode(true), state);
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
