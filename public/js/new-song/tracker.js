import { createTrackerEntry } from "../view/elems.js";

let closedTrackers = [];
export function removeClosedTrackerElems() {
    closedTrackers.forEach(t => t.trackerElem.remove());
    closedTrackers = [];
}

export class Tracker {

    downloaded = 0;

    constructor(title, total, oncancel, oncomplete) {
        this.total = total;
        this.oncancel = oncancel;
        this.oncomplete = oncomplete;
        
        this.trackerElem = createTrackerEntry(title);
        
        this.titleElem = this.trackerElem.querySelector(".tracker__title");
        this.iconElem = this.trackerElem.querySelector(".tracker__icon");
        this.iconElem.addEventListener("click", () => {
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
        if (this.closed) return;

        if (success) {
            this.iconElem.querySelector(".tracker__trash").style.display = "none";
            this.iconElem.querySelector(".tracker__check").style.display = "block";
        }
        else {
            this.trackerElem.classList.add("tracker__canceled");
        }

        setTimeout(() => this.bar.style.opacity = "0", 300);
        closedTrackers.push(this);

        this.closed = true;
    } 

    updateBar() {
        this.bar.style.width = this.downloaded / this.total * 100 + "%";
        if (this.downloaded === this.total) {
            if (this.oncomplete) this.oncomplete();
            this.close(true);
        }
    }
}