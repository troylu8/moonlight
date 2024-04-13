
export default class Dropdown {
    /** 
     * @param {HTMLElement} button 
     * @param {HTMLElement} dropdown element with display: flex
     * @param {function() : boolean} allowClose return false when dropdown should stay open 
     */
    constructor(button, dropdown, allowClose) {
        this.visible = false;
        this.button = button;
        this.dropdown = dropdown;

        allowClose = allowClose ?? ( () => true ); // if omitted allowClose, always true

        button.addEventListener("click", (e) => {
            if (e.currentTarget !== button) return;
            
            if (this.visible) {
                if (allowClose()) this.close();
            }
            else this.open();
        });
        dropdown.addEventListener("click", (e) => e.stopPropagation());

        document.body.addEventListener("mousedown", (e) => {
            
            if (this.visible && !button.contains(e.target) && allowClose()) {
                this.close();
            }
        })
    }

    open() {
        this.dropdown.style.display = "flex";
        this.visible = true;
    }

    close() {
        this.dropdown.style.display = "none";
        this.visible = false;
    }
}


