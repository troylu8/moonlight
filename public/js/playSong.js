const path = require('path');

console.log("aaa");

const audio = new Audio();
let currentSong = "/resources/songs/summertime.mp3";

function togglePlay(song) {
    console.log("toggle");
    if ((song === undefined ||  song === currentSong) && !audio.paused) {
        console.log("pause");

        audio.pause();
        return;
    }

    currentSong = song ?? currentSong;
    console.log("now playing " + currentSong);

    if (currentSong != audio.src) {
        
        audio.src = currentSong;
        console.log("new song");
        console.log(path.resolve(__dirname, currentSong), audio.src);
    }

    
    audio.play();
}


console.log("abc" != "abc");