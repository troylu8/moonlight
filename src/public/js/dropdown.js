export default class Dropdown {
    /** 
     * @param {HTMLElement} button 
     * @param {HTMLElement} dropdown element with display: flex
     * @param {object} options
     * @param {function() : boolean} options.allowClose return false when dropdown should stay open 
     * @param {function() : any} options.onclose called when dropdown is closed 
     */
    constructor(button, dropdown, options) {
        this.visible = false;
        this.button = button;
        this.dropdown = dropdown;

        if (options) {
            this._onclose = options.onclose;
            this.allowClose = options.allowClose ?? ( () => true ); // if omitted allowClose, always true
        }
        
        button.addEventListener("click", (e) => {
            if (e.currentTarget !== button) return;
            
            if (this.visible) {
                if (this.allowClose()) this.close();
            }
            else this.open();
        });
        dropdown.addEventListener("click", (e) => e.stopPropagation());

        document.body.addEventListener("mousedown", (e) => {
            
            if (this.visible && !button.contains(e.target) && this.allowClose()) {
                this.close();
            }
        });

        dropdown.addEventListener("mouseover", (e) => e.stopPropagation());
    }

    open() {
        this.dropdown.style.display = "flex";
        this.visible = true;
    }

    close() {
        this.dropdown.style.display = "none";
        this.visible = false;
        this._onclose();
    }
}


