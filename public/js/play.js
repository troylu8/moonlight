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
    seek.max = Math.floor(audio.duration * 5);
    seekTotal.innerText = getTimeDisplay(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime * 5;
    seek.updateSliderColors(); 
    seekPassed.innerText = getTimeDisplay(audio.currentTime);
})

addSliderDragEvent(seek, () => {
    seekPassed.innerText = getTimeDisplay(seek.value / 5);
}); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value / 5; });


export class SongNode {
    
    /** @type {SongNode} `SongNode` of last song in current playlist */
    static last;

    constructor(song, prev, next) {
        /** @type {SongNode} */
        this.next = next;
        if (next) next.prev = this;

        /** @type {SongNode} */
        this.prev = prev;
        if (prev) prev.next = this;

        /** @type {Song} */
        this.song = song;

        song.songNode = this;
    }

    delete() {
        if (SongNode.last.next === SongNode.last.next.next) {
            SongNode.last = null;
            console.log("deleted sole node");
            return;
        };

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }

    /**
     * @param {Song} song
     * @param {SongNode} ref the `SongNode` to insert `song.songNode` after
     */ 
    static addNodeAfter(song, ref) {
        song.songNode = new SongNode(song, ref, ref.next);
        if (ref === SongNode.last) SongNode.last = song.songNode;
    }

    static addNodeToEnd(song) {
        SongNode.addNodeAfter(song, SongNode.last);
    }

    static createCycle(playlist) {
        data.curr.listenPlaylist = playlist;

        const songNodes = Array.from(playlist.songs).map(s => new SongNode(s));
        SongNode.first = songNodes[0];
        SongNode.last = songNodes[songNodes.length-1];
        
        for (let i = 0; i < songNodes.length; i++) {
            songNodes[i].prev = songNodes[i === 0 ? songNodes.length-1 : i-1 ];
            songNodes[i].next = songNodes[(i+1) % songNodes.length];
        }
    
        return data.curr.song.songNode;
    }
    static updatePlaylistCycle() {
        data.curr.song.songNode = SongNode.createCycle(data.curr.viewPlaylist);
    }

    static print() {
        if (SongNode.last == null) return console.log("no song nodes");
        for (let p = SongNode.last.next; p !== SongNode.last; p = p.next) {
            console.log(p.song.title);
        }
        console.log("last", SongNode.last.song.title);
    }
}

document.getElementById("next").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;
     
    // if not at the top of history stack, play next in stack
    
    // if shuffle is on, use shuffle algo. otherwise get next `SongNode` 
    togglePlay(nextSongShuffle? nextSongShuffle() : data.curr.song.songNode.next.song);
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    if (nextSongShuffle && songHistory.length === 0) {
        console.log("song history empty");
        return;
    }

    // if shuffle is on, take from `songHistory`. otherwise get prev `SongNode` 
    togglePlay(nextSongShuffle? songHistory.pop() : data.curr.song.songNode.prev.song)
})