import * as Controllers from './controllers.js';

function replaceFJSElems(elementSet){
    for (let elem of elementSet){
        let newElem = document.createElement(elem.tagName.replace('fjs-', ''));
        newElem.innerHTML = elem.innerHTML;
        elem.parentNode.insertBefore(newElem, elem);
        elem.parentNode.removeChild(elem);
    }
}

export class FrameJSAppElement extends HTMLElement {
    #name;
    #app;
    #shadowRoot;
    constructor(){
        super();
    }
    get name(){
        return this.getAttribute('name');
    }
    get app(){
        return this.#app;
    }
    set app(app){
        if (!app || app instanceof Controllers.FrameJSApp){
            throw new Error('app property must be a FrameJSApp instance');
        }
        this.#app = app;
    }
    connectedCallback(){
        if (!this.name){
            throw new Error('<fjs-app> requires a name attribute');
        }
        this.#shadowRoot = this.attachShadow({mode: 'open'});
        this.#shadowRoot.appendChild(document.createElement('slot'));
        //Move any <fjs-config> or <fjs-cache> elements out of the slot and into the shadow root
        let hiddenElems = this.querySelectorAll('fjs-config, fjs-cache');
        for (let elem of hiddenElems){
            this.#shadowRoot.appendChild(elem);
        }
        if (!this.#app){
            this.#app = new Controllers.FrameJSApp(this.name);
            this.#app.initialize(this);
        }
    }
    attributeChangedCallback(attr, oldValue, newValue){
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
    }
    connectedCallback(){
        this.#shadowRoot = this.attachShadow({mode: 'open'});
        this.#shadowRoot.appendChild(document.createElement('slot'));
        replaceFJSElems(this.children);
    }
}
export class FrameJSModuleElement extends HTMLElement {
    #shadowRoot;
    #head;
    #body;
    #instance;
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
    get instance(){
        if (!this.#instance){
            //Initialize an instance if one doesn't exist
            //(This is done here instead of in the constructor to avoid creating an unnecessary instance if the setter is called first)
            this.#instance = new Controllers.FrameJSModuleInstance(this);
        }
        return this.#instance;
    }
    set instance(instance){
        this.#instance = instance;
    }
    connectedCallback(){
        if (this.tagName.toLowerCase() === 'fjs-module') {
            let elemSet = this.querySelectorAll('fjs-script, fjs-style');
            replaceFJSElems(elemSet);
        }
        this.#head = this.querySelector('fjs-head');
        this.#body = this.querySelector('fjs-body');
    }
}
export class FrameJSPageElement extends FrameJSModuleElement {
    constructor() {
        super();
    }

    connectedCallback(){
        super.connectedCallback();
    }

    get observedAttributes(){
        return super.observedAttributes.concat(['next', 'main', 'prev']);
    }

    attributeChangedCallback(attr, oldValue, newValue){
        switch (attr) {
            case 'next':
                let runfirstElems = this.querySelectorAll('fjs-style, fjs-script[runfirst]');
                replaceFJSElems(runfirstElems);
                const onloadEvent = new CustomEvent('onload');
                this.dispatchEvent(onloadEvent);
                break;
            case 'main':
                //If this element doesn't have a sibling with a next attribute, then run its runfirst scripts
                if (!this.nextElementSibling || !this.nextElementSibling.hasAttribute('next')){
                    let runfirstElems = this.querySelectorAll('fjs-style, fjs-script[runfirst]');
                    replaceFJSElems(runfirstElems);
                }
                let delayedScripts = this.querySelectorAll('fjs-script:not([runfirst])');
                replaceFJSElems(delayedScripts);
                break;
            case 'prev':
                const beforeunloadEvent = new CustomEvent('beforeunload');
                this.dispatchEvent(beforeunloadEvent);
                break;
        }
    }
}
export class FrameJSConfigElement extends HTMLElement {
    #app;
    constructor() {
        super();
    }
    connectedCallback(){
        if (!(this.getRootNode().host instanceof FrameJSAppElement)){
            throw new Error('<fjs-config> must be a child of <fjs-app>');
        }
        this.#app = this.getRootNode().host.app;
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

export class FrameJSCacheElement extends HTMLElement {
    #app;
    constructor() {
        super();
    }
    get app(){
        return this.#app;
    }
    connectedCallback(){
        if (!(this.getRootNode().host instanceof FrameJSAppElement)){
            throw new Error('<fjs-cache> must be a child of <fjs-app>');
        }
        this.#app = this.getRootNode().host.app;
    }
}

customElements.define('fjs-app', FrameJSAppElement);
customElements.define('fjs-cache', FrameJSCacheElement);
customElements.define('fjs-frame', FrameJSFrameElement);
customElements.define('fjs-module', FrameJSModuleElement);
customElements.define('fjs-page', FrameJSPageElement);
customElements.define('fjs-config', FrameJSConfigElement);
customElements.define('fjs-configfile', FrameJSConfigFileElement);
customElements.define('fjs-property', FrameJSPropertyElement);