
setSliderColors(document.getElementById("progress"), "#FF0000", "#DEE2E6");
setSliderColors(document.getElementById("volume"), "#FF0000", "#DEE2E6");

function setSliderColors(slider, left, right) {
    slider.oninput = function() {
        this.style.background = `linear-gradient(to right, ${left} 0%, ${left} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} 100%)`
    }
    slider.oninput();
}
