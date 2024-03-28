import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";
import { data, Playlist, Song } from "./userdata.js";

const audio = new Audio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** 
 * @type {Array<string>} song history, contains ids instead of object references so that deleted songs can be garbage collected */
export const history = [];
/** @type {number} points to current song */
export let historyIndex = -1;

function inThePresent() {
    return historyIndex === history.length-1;
}

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
}

export function togglePlay(song) {
    song = song ?? data.curr.song;

    // same song
    if (song === data.curr.song) {
        if (data.curr.song == null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
    }
    
    // new song
    else {
        setSong(song);
        audio.play();
    }

    if (inThePresent() && history[historyIndex] != song.id) {
        history.push(song.id);
        historyIndex++;
    }

}

document.getElementById("play").onclick = () => togglePlay();

const volume = document.getElementById("volume-slider");

addSliderDragEvent(volume, () => {
    audio.volume = volume.value / 100;
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
    
    constructor(cycle, song, prev, next) {
        /** @type {SongNode} */
        this.next = next;
        if (next) next.prev = this;

        /** @type {SongNode} */
        this.prev = prev;
        if (prev) prev.next = this;

        /** @type {Song} */
        this.song = song;

        /** @type {PlaylistCycle} */
        this.cycle = cycle;
        cycle.nodes.set(song, this);

        this.index = (prev)? prev.index + 1 : 0;
    }

    delete() {
        this.cycle.nodes.delete(this);

        // if this node is alone
        if (this.next === this) {
            return console.log("deleted sole node");
        };

        if (this.cycle.all) {
            const lastInArr = this.cycle.all[this.cycle.all.length-1];
            swap(this.cycle.all, this.index, this.cycle.all.length-1);
            lastInArr.index = this.index;
        }

        if (this === this.cycle.last) {
            this.cycle.last = this.prev;
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }
}

export class PlaylistCycle {

    /** @type {SongNode} `SongNode` of last song in current playlist order */
    last;

    /**
     * sole purpose is to be used to generate random SongNodes in O(1) amortized
     * 
     * IF SONGS ARE ADDED OR REMOVED, THIS WON'T BE IN ORDER!
     * 
     * `cycle.last` ISNT ALWAYS THE LAST ELEMENT IN THIS ARR
     * @type {Array<SongNode>} `null` when shuffle is off */
    all;

    constructor(playlist) {
        /** @type {Playlist} */
        this.playlist = playlist;

        /** @type {Map<Song, SongNode>} */
        this.nodes = new Map();

        for (const song of playlist.songs) 
            this.addNodeToEnd(song);
    }

    addNodeToEnd(song) {
        let newNode;

        // if no nodes, create sole node (points to itself)
        if (!this.last) {
            newNode = new SongNode(this, song);
            newNode.next = newNode;
            newNode.prev = newNode;
        }
        else newNode = new SongNode(this, song, this.last, this.last.next);

        this.last = newNode;
        if (this.all) this.all.push(newNode);
        this.nodes.set(song, newNode);
    }
    
    addNode(song, shuffle) {
        console.log("adding ", song.title, "to", this.playlist.title);
        if (!this.last || !shuffle || !this.all) return this.addNodeToEnd(song);

        // add a copy of the other node to the end...
        const other = this.all[Math.floor(Math.random() * this.all.length)];
        this.addNodeToEnd(other.song);

        // ...then edit the original other node to feature new song
        other.song = song;
    }

    update(shuffle, loopingShuffledPlaylist) {
        const nodesArr = Array.from(this.playlist.songs).map(s => this.nodes.get(s));
        
        let currentSongNode = this.nodes.get(data.curr.song);

        // if cycle.all == null (shuffle was off previously) then shuffle evenly
        if (shuffle && nodesArr.length > 3) {

            randomize(nodesArr);
            for (const i in nodesArr) nodesArr[i].index = Number(i);
            
            if (loopingShuffledPlaylist) {
                const currentIndex = currentSongNode.index;

                // kick away recently played songs so they arent played again soon
                const recentlyPlayed = new Set();
                let p = currentSongNode;
                for (let i = 0; i < nodesArr.length/4; i++) {
                    p = p.prev;
                    recentlyPlayed.add(p);
                }
                kickAway(nodesArr, currentIndex, recentlyPlayed);

                // randomimze current song
                swap(
                    nodesArr, currentIndex, 
                    rand(currentIndex, currentIndex + recentlyPlayed.size-1) % nodesArr.length
                );
                setSong(nodesArr[currentIndex].song);
                currentSongNode = this.nodes.get(data.curr.song);
            }
        }
                        
        for (let i = 0; i < nodesArr.length; i++) {
            nodesArr[i].prev = nodesArr[i === 0 ? nodesArr.length-1 : i-1 ];
            nodesArr[i].next = nodesArr[(i+1) % nodesArr.length];
        }

        this.all = shuffle? nodesArr : null;

        // last is the previous of the current song upon creating cycle
        this.last = currentSongNode.prev;

        // console.log("updated cycle");
        // this.print();
    }

    print() {

        if (this.last == null) return console.log("no song nodes");

        const arr = [];
        console.log(this.last.cycle === this);
        for (let p = this.last.next; p !== this.last; p = p.next) {
            arr.push(p.song.title);
        }
        arr.push(this.last.song.title);

        console.log(this.playlist.title, "all nodes: ", arr);
        console.log(this.last);
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

function randomize(arr) {
    for (let i = 0; i < arr.length; i++) 
        swap(arr, i, rand(i, arr.length-1));
    return arr;
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



document.getElementById("next").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    const nextSongNode = data.curr.listenPlaylist.cycle.nodes.get(data.curr.song).next;
    
    // if not shuffling, play next song
    if (!data.settings.shuffle)
        return togglePlay(nextSongNode.song);

    // if not at the top of history stack, play next in stack
    if (!inThePresent()) {
        console.log("not at top of history yet");
        console.log(historyIndex, history.map(id => data.songs.get(id).title));

        return togglePlay( data.songs.get(history[++historyIndex]) );
    }
    
    setSong(nextSongNode.song);

    if (nextSongNode.prev === data.curr.listenPlaylist.cycle.last) {
        data.curr.listenPlaylist.cycle.update(true, true);
    }

    togglePlay();
    
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    
    if (!data.settings.shuffle) {
        const nextSong = data.curr.listenPlaylist.cycle.nodes.get(data.curr.song).prev.song;
        togglePlay(nextSong);
    }
    
    else if (historyIndex > 0) {
        togglePlay( data.songs.get(history[--historyIndex]) );
        console.log("going bakc");
    }

    else {
        setSong(data.curr.song);
        audio.play();
        console.log("no more history");
    }
        
        
})

export function setShuffle(shuffle) {
    if (data.settings.shuffle === shuffle) return;

    data.settings.shuffle = shuffle;
    data.curr.listenPlaylist.cycle.update();

    console.log("shuffle ", data.settings.shuffle);
    shuffleBtn.innerText = data.settings.shuffle? "sh" : "__";
}

const shuffleBtn = document.getElementById("shuffle")
shuffleBtn.addEventListener("click", () => setShuffle(!data.settings.shuffle))