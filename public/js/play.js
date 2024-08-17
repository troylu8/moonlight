import { addDragEvent } from "./view/fx.js";
import { getTimeDisplay } from "./view/elems.js";
import { setSpin, updateVolumeIcon } from "./view/fx.js";
import { data, Playlist, Song } from "./account/userdata.js";
const { ipcRenderer } = require("electron");




class SpinningAudio extends Audio {
    play() {
        if (this.src === "") return;
        
        // add to history
        if ((inThePresent() && history[historyIndex] != data.curr.song.id)) {
            history.push(data.curr.song.id);
            historyIndex++;
        }

        setSpin(true);
        return super.play();
    }
    pause() {
        setSpin(false);
        return super.pause();
    }

    /** @param {boolean} muted */
    set muted(muted) {
        super.muted = muted;
        if (muted) updateVolumeIcon(0);
        else updateVolumeIcon(this.volume);
    }

    /** @param {number} val */
    set volume(val) {
        super.volume = val;
        updateVolumeIcon(val);
    }

    get volume() { return super.volume; }
    get muted() { return super.muted; }
}
export let audio = new SpinningAudio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** 
 * @type {Array<string>} song history, contains ids instead of object references so that deleted songs can be garbage collected */
let history = [];
/** @type {number} points to current song */
let historyIndex = -1;

function inThePresent() {
    return historyIndex === history.length-1;
}
export function beheadHistory() {
    history = history.slice(0, historyIndex + 1);
}

/** set a new currently playing song, will reset seek to beginning
 * @param {Song} song 
 * @returns {boolean} `true` if successful, `false` if `song.state === "error"`
*/
export function setSong(song) {
    // set previous song to "playable" state
    if (data.curr.song && data.curr.song.state !== "error") data.curr.song.setState("playable");

    // if setting song to none
    if (!song) {
        audio.src = "";
        data.curr.song = null;

        titleElem.textContent = "-";
        artistElem.textContent = "-";

        setSpin(false);
        return true;
    };

    if (song.state === "error") return false;

    const path = global.userDir + `/songs/${encodeURIComponent(song.filename)}`;

    audio.src = path;
    data.curr.song = song;

    titleElem.textContent = song.title;
    artistElem.textContent = song.artist;

    toBeDeleted.delete();

    song.setState("active");

    return true;
}

/**
 * @param {Song} song 
 * @returns {boolean} `true` if successful, `false` if `song.state === "error"`
 */
export function togglePlay(song) {
    song = song ?? data.curr.song;

    if (!song || song.state === "error") return false;

    // same song
    if (song === data.curr.song) {
        if (data.curr.song == null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
        return true;
    }

    // new song
    if ( !setSong(song) ) return false;
    audio.play();

    return true;
}

/** if song is removed from playlist while it is playing, remove song from playlist cycle upon next song */
export const toBeDeleted = {
    /** @type {Playlist} */
    playlist: null,
    /** @type {Song} */
    song: null,

    set(playlist, song) {
        this.playlist = playlist;
        this.song = song;
    },

    delete() {
        if (this.playlist) {
            this.playlist.cycle.deleteSong(this.song);
            this.playlist = null;
            this.song = null;
        }
    }
}


document.getElementById("play").addEventListener("click", () => togglePlay());
document.getElementById("playlist-play").addEventListener("click", () => {
    if (data.curr.viewPlaylist.songs.size === 0) return;

    if (data.curr.viewPlaylist === data.curr.listenPlaylist) return togglePlay();

    data.updateListenPlaylist();

    if (data.settings.shuffle) togglePlay(data.curr.listenPlaylist.cycle.shuffleArr[0]);
    else togglePlay(data.curr.listenPlaylist.groupElem.firstElementChild.song);
    
});


const seek = document.getElementById("seek__slider");
const seekPassed = document.getElementById("seek__passed");
const seekTotal = document.getElementById("seek__total");


audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration);
    seekTotal.textContent = getTimeDisplay(audio.duration);
    seekPassed.textContent = "0:00".padStart(seekTotal.textContent.length);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime;
    seek.updateSliderColors(); 
    seekPassed.textContent = getTimeDisplay(audio.currentTime).padStart(seekTotal.textContent.length);
});
audio.addEventListener("ended", () => {
    if (data.curr.listenPlaylist.songs.size === 1) {
        setSong(data.curr.song);
        audio.play();
    }
    else nextBtn.dispatchEvent(new Event("click"));
});

addDragEvent(seek, 
    () => {
        seekPassed.textContent = getTimeDisplay(seek.value).padStart(seekTotal.textContent.length);
    },
    () => {
        if (data.settings["pause-while-seek"]) audio.pause();
    },
    () => {
        if (data.settings["pause-while-seek"]) audio.play();
    }
); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value; });


export class PlaylistCycle {

    /** @type {Array<Song>} */
    shuffleArr = [];
    currIndex;

    constructor(playlist) {
        /** @type {Playlist} */
        this.playlist = playlist;

        /** @type {Map<Song, number>} song -> index in `shuffleArr`*/
        this.songIndexes = new Map();

        for (const song of playlist.songs) this.addSong(song)
    }

    addSong(song, afterCurrent) {
        this._insertSongRandom(song, afterCurrent);
    }

    deleteSong(song) {
        const i = this.songIndexes.get(song);
        this.shuffleArr[i] = this.shuffleArr[this.shuffleArr.length-1];
        this.songIndexes.set(this.shuffleArr[i], i);
        
        this.shuffleArr.pop();
        this.songIndexes.delete(song);
    }
    
    /** inserts a node randomly into `shuffleOrder`
     * @returns {number} the index which it was inserted
     */
    _insertSongRandom(song, afterCurrent) {

        // push new song to end of arr
        this.shuffleArr.push(song);

        const n = this.shuffleArr.length;
        if (n === 1) return this.songIndexes.set(song, 0);

        // swap with random song
        const i = Math.floor(rand(afterCurrent? this.currIndex+1 : 0, n-1));
        swap(this.shuffleArr, i, n-1);

        this.songIndexes.set(song, i);
        this.songIndexes.set(this.shuffleArr[n-1], n-1);

        return i;
    }

    _reshuffle(randomizeCurrSong) {

        this.shuffleArr = [];
        this.currIndex = 0;

        for (const song of this.playlist.songs) {
            const i = this._insertSongRandom(song, false);
            if (!randomizeCurrSong && song === data.curr.song) this.currIndex = i;
        }

        const recentsArr = history.slice( -Math.ceil(this.shuffleArr.length/4) ).map(sid => data.songs.get(sid));
        const recents = new Set(recentsArr);
        kickAway(this.shuffleArr, randomizeCurrSong? this.currIndex : (this.currIndex + 1) % this.shuffleArr.length, recents);
    }

    updateCurrIndex() {
        this.currIndex = this.songIndexes.get(data.curr.song);
    }

    async setSongPrev(playSong) {
        if (!data.curr.song) return;
        if (data.curr.listenPlaylist.songs.size <= 1 && !toBeDeleted.playlist) return;
        
        // SHUFFLE OFF: prev in cycle
        if (!data.settings.shuffle) {
            const start = data.curr.song.songEntries.get(this.playlist);
            let entry = start;
            do {
                entry = entry.previousElementSibling ?? entry.parentElement.lastElementChild;
                if (entry === start) return;
            } 
            while ( !entry.song || !setSong(entry.song) );
        }
        
        // SHUFFLE ON: history
        else {
            let song;
            do {
                if (historyIndex === 0) {
                    setSong(data.curr.song); // if no more history, replay curr song from beginning
                    return audio.play();
                } 
                song = data.songs.get(history[--historyIndex]);
            } while ( !song || !setSong(song) ); // if song was deleted || song.state === "error"
        }

        if (playSong) audio.play();
    }

    async setSongNext(playSong) {
        if (!data.curr.song) return;
        if (data.curr.listenPlaylist.songs.size <= 1 && !toBeDeleted.playlist) return;

        // if not at the top of history stack, play next in stack
        if (!inThePresent()) {
            
            let song;
            do {
                song = data.songs.get(history[++historyIndex]);
            } while ( !song || !setSong(song) ); // if song was deleted || song.state === "error"
    
            if (playSong) audio.play();
            return;
        }
        
        // SHUFFLE OFF
        if (!data.settings.shuffle) {
            const start = data.curr.song.songEntries.get(this.playlist);
            let entry = start;
            do {
                entry = entry.nextElementSibling ?? entry.parentElement.firstElementChild;
                if (entry === start) return;
            } 
            while ( !entry.song || !setSong(entry.song) );
        }
        // SHUFFLE ON
        else {
            let song;
            do {

                song = this.shuffleArr[++this.currIndex];

                if (!song) {
                    this._reshuffle(true);
                    song = this.shuffleArr[0];
                }

                // nullify songs we just played so that we reshuffle upon encountering an already played segment
                this.shuffleArr[this.currIndex - 1] = null;

            } while ( !setSong(song) );
        
        }

        if (playSong) audio.play();
    }

}

function rand(min, max) {
    return min + Math.floor(Math.random() * ((max - min) + 1));
}
function swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

/**
 * any items in `banned` are not allowed to be within `banned.size` spaces in front of `start`
 * @param {Array<T>} arr
 * @param {number} start starting index
 * @param {Set<T>} banned 
 */
function kickAway(arr, start, banned) {
    const n = banned.size;

    let space = arr.length - n;

    let door = (start + n) % arr.length;
    for (let c = 0; c < n; c++) {
        const i = (start + c) % arr.length;
        while (banned.has(arr[i])) {
            let out = i;
            while (banned.has(arr[out])) {
                out = rand(door, door + space-1) % arr.length;
            }
            swap(arr, i, out);
        }
    }

    return arr;
}
const nextBtn = document.getElementById("next");
nextBtn.addEventListener("click", () => 
    data.curr.listenPlaylist.cycle.setSongNext(true)
);
const prevBtn = document.getElementById("prev");
prevBtn.addEventListener("click", async () => 
    data.curr.listenPlaylist.cycle.setSongPrev(true)
);

const shuffleSvg = document.getElementById("shuffle-svg");

export function setShuffle(shuffle) {
    data.settings.shuffle = shuffle;
    
    if (shuffle && data.curr.listenPlaylist) data.curr.listenPlaylist.cycle.updateCurrIndex();
    
    shuffleSvg.style.stroke = shuffle? "var(--accent-color)" : "var(--primary-color)";
}

document.getElementById("shuffle").addEventListener("click", () => setShuffle(!data.settings.shuffle));


document.body.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;

    if (e.key === " ") togglePlay();
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") prevBtn.click();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") nextBtn.click();
});

ipcRenderer.on("MediaPreviousTrack", () => prevBtn.click());
ipcRenderer.on("MediaNextTrack", () => nextBtn.click());
ipcRenderer.on("MediaStop ", () => audio.pause());
ipcRenderer.on("MediaPlayPause", () => togglePlay());