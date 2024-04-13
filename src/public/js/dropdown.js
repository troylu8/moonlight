
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
            if (e.target !== button) return;
            
            if (this.visible) {
                if (allowClose()) close();
            }
            else open();
        });

        document.body.addEventListener("click", (e) => {
            if (this.visible && !add.contains(e.target) && allowClose()) {
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


