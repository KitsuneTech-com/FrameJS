export class FrameJSApp {
    #appName;   // Used as document title
    #modules;
    #pages;
    #rootElement;
    constructor(appName) {
        this.#appName = appName;
        this.#modules = new FrameJSModuleCollection();
        this.#pages = new FrameJSPageCollection();
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
    initialize(){
        // Create the root element
        this.#rootElement = document.createElement('framejs-app');
        this.#rootElement.setAttribute('name', this.#appName);
        this.#rootElement.app = this;

        document.body.appendChild(this.#rootElement);
        //this.#rootElement's connectedCallback() is called here


        // Initialize the modules
        this.modules.initialize();
        // Initialize the pages
        this.pages.initialize();
    }
}

export class FrameJSModuleCollection {
    #modules;
    constructor() {
        this.#modules = {};
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
}

export class FrameJSModule {
    #name;
    #path;
    #doc;   // Document fragment containing the document loaded from #path
    #instances = [];
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
                .then(text => {
                    this.#doc = new DOMParser().parseFromString(text, 'text/html');
                    resolve();
                })
                .catch(error => reject(error));
        });
    }
    clone(){
        return this.#doc.cloneNode(true);
    }
    newInstance(){
        let instance = new FrameJSModuleInstance(this, this.#doc.cloneNode(true));
        this.#instances.push(instance);
        return instance;
    }
}

export class FrameJSModuleInstance {
    #module;
    #element;
    constructor(module, element){
        this.#module = module;
        this.#element = element;
    }
    get module(){
        return this.#module;
    }
    get element(){
        return this.#element;
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
            this.#scripts = super.#doc.querySelectorAll('script');
            this.#body = super.#doc.querySelector('body');
        });
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
}
