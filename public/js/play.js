import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";
import { data, Song } from "./userdata.js";

const audio = new Audio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** @type {function} get next song, `null` when shuffle is off */
export let nextSongShuffle = null;
/** @type {Array<Song>} song history, `null` when shuffle is off */
const songHistory = null;

/** set a new currently playing song, will reset seek to beginning*/
export function setSong(song) {
    if (!song) return;
    if (song === "none") {
        audio.src = "";
        data.curr.song = null;

        titleElem.innerText = "-";
        artistElem.innerText = "-";
        data.curr.song = undefined
        return;
    };

    //TODO: WHEN USING ELECTRON, USE ./ INSTEAD OF ../
    audio.src = "../resources/songs/" + encodeURIComponent(song.filename);
    data.curr.song = song;

    titleElem.innerText = song.title;
    artistElem.innerText = song.artist;

    if (songHistory) songHistory.push(song);
}

export function togglePlay(song) {
    // same song
    if (song === undefined || song === data.curr.song) {
        if (data.curr.song == null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
    }
    
    // new song
    else {
        setSong(song);
        audio.play();
    }

}

document.getElementById("play").onclick = () => togglePlay();

const volume = document.getElementById("volume__slider");

addSliderDragEvent(volume, () => {
    audio.volume = volume.value / 100;
    console.log(audio.volume);
})


const mute = document.getElementById("mute");
mute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    mute.innerText = audio.muted? "unmute" : "mute";
});


const seek = document.getElementById("seek__slider");
const seekPassed = document.getElementById("seek__passed");
const seekTotal = document.getElementById("seek__total");


audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration);
    seekTotal.innerText = getTimeDisplay(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime;
    seek.updateSliderColors(); 
    seekPassed.innerText = getTimeDisplay(audio.currentTime);
})

addSliderDragEvent(seek, () => {
    seekPassed.innerText = getTimeDisplay(seek.value);
}); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value; });


export class SongNode {
    
    /** @type {SongNode} `SongNode` of last song in current playlist order */
    static last;

    /**
     * sole purpose is to be used to generate random SongNodes in O(1) amortized
     * 
     * NOT NECESSARILY IN ORDER!!!
     * 
     * `SongNode.last` ISNT ALWAYS THE LAST ELEMENT IN THIS ARR
     * @type {Array<SongNode>} `null` when shuffle is off */
    static all;

    constructor(song, prev, next) {
        /** @type {SongNode} */
        this.next = next;
        if (next) next.prev = this;

        /** @type {SongNode} */
        this.prev = prev;
        if (prev) prev.next = this;

        /** @type {Song} */
        this.song = song;

        this.index = (prev)? prev.index + 1 : 0;

        song.songNode = this;
    }

    delete() {
        if (SongNode.last.next === SongNode.last.next.next) {
            SongNode.last = null;
            if (SongNode.all) SongNode.all = [];
            console.log("deleted sole node");
            return;
        };

        if (SongNode.all) {
            const lastInArr = SongNode.all[SongNode.all.length-1];
            swap(SongNode.all, this.index, SongNode.all.length-1);
            lastInArr.index = this.index;
        }

        if (this === SongNode.last) {
            SongNode.last = this.prev;

            if (SongNode.all) SongNode.all.pop();
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }

    static addNodeToEnd(song) {
        const newNode = new SongNode(song, SongNode.last, SongNode.last.next);
        SongNode.last = newNode;
        if (SongNode.all) SongNode.all.push(newNode);
        return newNode;
    }

    static addNode(song, shuffle) {
        if (shuffle) {
            
            const other = SongNode.all[Math.floor(Math.random() * SongNode.all.length)];
            console.log("other ", other);
            // add a copy of the other node to the end...
            SongNode.addNodeToEnd(other.song);

            // ...then edit the original other node to feature new song
            other.song = song;
            song.songNode = other;
        }
        else this.addNodeToEnd(song);
    }

    static createCycle(playlist, shuffle) {
        data.curr.listenPlaylist = playlist;

        const songNodes = Array.from(playlist.songs).map(s => new SongNode(s));
        if (shuffle) randomizeN(songNodes, Math.ceil(songNodes.length/4));
        console.log("n " + Math.ceil(songNodes.length/4));
        console.log(songNodes.map(n => n.song.title));
        
        SongNode.last = songNodes[songNodes.length-1];
        
        for (let i = 0; i < songNodes.length; i++) {
            songNodes[i].prev = songNodes[i === 0 ? songNodes.length-1 : i-1 ];
            songNodes[i].next = songNodes[(i+1) % songNodes.length];
        }

        SongNode.all = shuffle? songNodes : null;
    
        return data.curr.song.songNode;
    }
    static updatePlaylistCycle(playlist, shuffle) {
        console.log("starting", playlist.songs);
        data.curr.song.songNode = SongNode.createCycle(playlist, shuffle);
        console.log("updated");
    }

    static print() {

        if (SongNode.last == null) return console.log("no song nodes");

        console.log("SongNode.all", SongNode.all? SongNode.all.map(n => n.song.title) : "null" );
        
        for (let p = SongNode.last.next; p !== SongNode.last; p = p.next) {
            console.log(p.song.title);
        }
        console.log("last", SongNode.last.song.title);
        console.log(SongNode.last.next);
    }
}

function rand(min, max) {
    return min + Math.floor(Math.random() * ((max - min) + 1));
}
function swap(arr, i, j) {
    console.log("swapping", i, j);
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

/** randomize array - the last n terms of original array cannot be in the first n terms of new array */
function randomizeN(arr, n) {
    let i = 0;
    for (; i < n; i++) {
        swap(arr, i, rand(i, arr.length-n-1));
    }
    for (; i < arr.length; i++) {
        swap(arr, i, rand(i, arr.length-1));
    }
    return arr;
}



document.getElementById("next").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;
     
    // if not at the top of history stack, play next in stack
    console.log(data.curr.song === SongNode.last);
    if (data.curr.song === SongNode.last) {
        SongNode.updatePlaylistCycle(data.curr.listenPlaylist, data.settings.shuffle);
    }

    togglePlay(data.curr.song.songNode.next.song);
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    togglePlay(data.curr.song.songNode.prev.song);
})