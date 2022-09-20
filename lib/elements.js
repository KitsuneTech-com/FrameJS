import * as Controllers from './controllers.js';

export class FrameJSAppElement extends HTMLElement {
    #name;
    #app;
    constructor() {
        super();
    }
    get name() {
        return this.getAttribute('name');
    }
    set app(app){
        if (!app || app instanceof Controllers.FrameJSApp){
            throw new Error('app property must be a FrameJSApp instance');
        }
        this.#app = app;
    }
    connectedCallback() {
        if (!this.name) {
            throw new Error('<framejs-app> requires a name attribute');
        }
        if (!this.#app) {
            this.#app = new Controllers.FrameJSApp(this.name);
            this.#app.initialize(this);
        }
    }
    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr){
            case 'name':
                this.#name = newValue;
                if (this.#app){
                    this.#app.appName = newValue;
                }
                break;
        }
    }
}
export class FrameJSFrameElement extends HTMLElement {
    #shadowRoot;
    constructor(){
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'open' });
    }
}
export class FrameJSModuleElement extends HTMLElement {
    #shadowRoot;
    #head;
    #body;
    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: 'open' });
    }
    get head(){
        return this.#head;
    }
    get body(){
        return this.#body;
    }
}
export class FrameJSPageElement extends FrameJSModuleElement {
    constructor() {
        super();
    }
}
export class FrameJSConfigElement extends HTMLElement {
    #app;
    constructor() {
        super();
    }
    connectedCallback(){
        if (!this.parentElement || !(this.parentElement instanceof FrameJSAppElement)){
            throw new Error('<framejs-config> must be a direct child of <framejs-app>');
        }
        this.#app = this.parentElement.app;
    }
}
export class FrameJSConfigFileElement extends HTMLElement {
    constructor() {
        super();
    }
}
export class FrameJSPropertyElement extends HTMLElement {
    #name;
    #value;
    constructor() {
        super();
    }
    get name(){
        return this.#name;
    }
    set name(name){
        this.#name = name;
    }
    get value(){
        return this.#value;
    }
    set value(value){
        this.#value = value;
    }
}

customElements.define('fjs-app', FrameJSAppElement);
customElements.define('fjs-module', FrameJSModuleElement);
customElements.define('fjs-page', FrameJSPageElement);
customElements.define('fjs-config', FrameJSConfigElement);
customElements.define('fjs-configfile', FrameJSConfigFileElement);
customElements.define('fjs-property', FrameJSPropertyElement);