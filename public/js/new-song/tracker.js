
class Tracker {

    downloaded = 0;
    total;

    constructor(title, total, oncomplete) {
        this.total = total;
        this.oncomplete = oncomplete;
    }

    add(chunkSize) {
        this.downloaded += chunkSize;
        this.bar.style.width = percent * 100 + "%";

        if (this.downloaded === this.total) this.oncomplete();
    }

    cancel() {
        setTimeout(() => loadingBar.style.opacity = "0", 200);
    }
}