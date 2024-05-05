import { createTrackerEntry } from "../view/elems.js";

export class Tracker {

    downloaded = 0;

    constructor(title, total, oncancel, oncomplete) {
        this.total = total;
        this.oncancel = oncancel;
        this.oncomplete = oncomplete;
        
        this.trackerElem = createTrackerEntry(title);
        
        this.titleElem = this.trackerElem.querySelector(".tracker__title");
        this.cancelBtn = this.trackerElem.querySelector(".tracker__cancel");
        this.cancelBtn.addEventListener("click", () => {
            if (this.oncancel) this.oncancel();
            this.close(false);
        });

        this.bar = this.trackerElem.querySelector(".tracker__bar");
    }

    add(chunkSize) {
        this.downloaded += chunkSize;
        this.updateBar();
    }
    setProgress(downloaded, total) {
        this.downloaded = downloaded;
        this.total = total;
        this.updateBar();
    }

    close(success) {
        if (success) {
            this.cancelBtn.innerHTML = "done";
        }
        else {
            this.cancelBtn.innerHTML = "canc";
        }
        setTimeout(() => {
            fadeOut(this.trackerElem);
        }, 1000);
    } 

    updateBar() {
        this.bar.style.width = this.downloaded / this.total * 100 + "%";
        console.log(this.downloaded + "/" + this.total, this.bar.style.width);
        if (this.downloaded === this.total) {
            if (this.oncomplete) this.oncomplete();
            // this.close(true);
        } 
    }
}

function fadeOut(elem) {
    let op = 1;
    const timer = setInterval(() => {
        op /= 1.2;
        console.log(op);
        if (op <= 0.05) {
            elem.remove();
            console.log("remove elem!!!");
            return clearInterval(timer);
        }
        elem.style.opacity = op;
    }, 20);
}