export default class Dropdown {
    /** 
     * @param {HTMLElement} parent 
     * @param {HTMLElement} dropdown element with display: flex
     * @param {function() : any} onopen called when dropdown is opened 
     * @param {function() : any} onclose called when dropdown is closed 
     * @param {boolean} manual if true, clicking parent does nothing. must open programmatically 
     */
    constructor(parent, dropdown, onopen, onclose, manual) {
        this.visible = false;
        this.parent = parent;
        this.dropdown = dropdown;

        this.onopen = onopen;
        this.onclose = onclose;
        
        if (!manual) {
            parent.addEventListener("click", (e) => {
                if (e.currentTarget !== parent) return;
                
                if (this.visible)   this.close();
                else                this.open();
            });
        }
        
        document.body.addEventListener("mousedown", (e) => {
            if (this.visible && !parent.contains(e.target)) {
                this.close();
            }
        });
        
        dropdown.addEventListener("mouseover", (e) => e.stopPropagation());
        dropdown.addEventListener("click", (e) => e.stopPropagation());
    }

    open() {
        this.dropdown.style.display = "flex";
        this.visible = true;
        if (this.onopen) this.onopen();
        if (this.parent.tooltip) this.parent.tooltip.style.visibility = "hidden";
    }

    close() {
        this.dropdown.style.display = "none";
        this.visible = false;
        if (this.onclose) this.onclose();
        if (this.parent.tooltip) this.parent.tooltip.style.visibility = "visible";
    }
}


