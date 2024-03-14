
var path = document.location.pathname;
var dirname = path.substring(path.indexOf('/')+1, path.lastIndexOf('/'));

const audio = new Audio();
let currentSong = dirname + "/resources/songs/summertime.mp3";


function togglePlay(song) {
    if ((song === undefined ||  song === currentSong) && !audio.paused) {
        audio.pause();
        return;
    }

    const toBePlayed = song ?? currentSong;
    console.log("now playing " + toBePlayed);

    // setting a new audio.src will reset seek to beginning
    if (toBePlayed != audio.src) {
        audio.src = toBePlayed;
        currentSong = audio.src;
    }
    
    audio.play();
}

document.getElementById("play").onclick = () => togglePlay();


document.getElementById("prev").onclick = () => {
    fetch("http://127.0.0.1:5000/newfile/somesuffix", 
          {method:"POST"}).then(res => console.log("woaw"));
};


