

const sliders = document.getElementsByClassName("slider");
for (const s of sliders) {
    setSliderColors(s, "#FF0000", "#DEE2E6");
}

function setSliderColors(slider, left, right) {
    slider.oninput = function() {
        this.style.background = `linear-gradient(to right, ${left} 0%, ${left} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} 100%)`
    }
    slider.oninput();
}

export function addSliderDragEvent(slider, ondrag) {
    if (slider.dragging === undefined) {
        slider.dragging = false;
        slider.addEventListener("mousedown", () => { slider.dragging = true; });
        slider.addEventListener("mouseup", () => { slider.dragging = false; });
    }
    slider.addEventListener("mousemove", (e) => { if (slider.dragging) ondrag(e); });
}