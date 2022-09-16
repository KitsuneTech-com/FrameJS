import * as Controllers from './controllers.js';
export class FrameJSAppElement extends HTMLElement {
    #name;
    #app;
    #configuration;
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
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
            for (let child of this.children){

            }
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
export class FrameJSModuleElement extends HTMLElement {
    #head;
    #body;
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
        this.attachShadow({ mode: 'open' });
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
        this.attachShadow({ mode: 'open' });
    }
    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'src':
                this.#src = newValue;
                break;
        }
    }
    connectedCallback() {

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
    get value(){
        return this.#value;
    }
    set name(name){
        this.#name = name;
    }
    set value(value){
        this.#value = value;
    }
}

customElements.define('fjs-app', FrameJSAppElement);
customElements.define('fjs-module', FrameJSModuleElement);
customElements.define('fjs-page', FrameJSPageElement);
customElements.define('fjs-property', FrameJSPropertyElement);
customElements.define('fjs-config', FrameJSConfigElement);
customElements.define('fjs-configfile', FrameJSConfigFileElement);