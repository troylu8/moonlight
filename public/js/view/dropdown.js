export default class Dropdown {
    /** 
     * @param {HTMLElement} parent 
     * @param {HTMLElement} dropdown element with display: flex
     * @param {object} options
     * @param {function() : boolean} options.allowClose return false when dropdown should stay open 
     * @param {function() : any} options.onclose called when dropdown is closed 
     */
    constructor(parent, dropdown, options) {
        this.visible = false;
        this.parent = parent;
        this.dropdown = dropdown;

        if (options) {
            this._onclose = options.onclose;
            this.allowClose = options.allowClose ?? ( () => true ); // if omitted allowClose, always true
        }
        
        parent.addEventListener("click", (e) => {
            if (e.currentTarget !== parent) return;
            
            if (this.visible) {
                if (this.allowClose()) this.close();
            }
            else this.open();
        });
        dropdown.addEventListener("click", (e) => e.stopPropagation());
        

        document.body.addEventListener("mousedown", (e) => {
            
            if (this.visible && !parent.contains(e.target) && this.allowClose()) {
                this.close();
                
            }
        });

        dropdown.addEventListener("mouseover", (e) => e.stopPropagation());
    }

    open() {
        this.dropdown.style.display = "flex";
        this.visible = true;
        if (this.parent.tooltip) this.parent.tooltip.style.visibility = "hidden";
    }

    close() {
        this.dropdown.style.display = "none";
        this.visible = false;
        this._onclose();
        if (this.parent.tooltip) this.parent.tooltip.style.visibility = "visible";
    }
}


