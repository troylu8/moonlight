import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";
import { setSpin } from "./fx.js";
import { data, Playlist, Song } from "./userdata.js";

class SpinningAudio extends Audio {
    play() {
        super.play();
        setSpin(true);
    }
    pause() {
        super.pause();
        setSpin(false);
    }
}
export const audio = new SpinningAudio();

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

document.getElementById("play").addEventListener("click", () => togglePlay());




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
        // if this node is alone
        if (this.next === this) {
            this.cycle.last = null;
            return console.log("deleted sole node");
        };

        if (this === this.cycle.last) {
            this.cycle.last = this.prev;
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }
}

export class PlaylistCycle {

    /** `SongNode` of last song in playlist (unshuffled)
     * @type {SongNode} `null` when shuffle is ON */
    last;

    /** @type {Array<Song>} */
    shuffleArr = [];
    currIndex;

    constructor(playlist) {
        /** @type {Playlist} */
        this.playlist = playlist;

        /** @type {Map<Song, SongNode>}*/
        this.nodes = new Map();

        /** @type {Map<Song, number>} song -> index in `shuffleArr`*/
        this.songIndexes = new Map();

        for (const song of playlist.songs) 
            this.addSong(song)
    }

    addSong(song, afterCurrent) {
        this._appendNode(song);
        this._insertSongRandom(song, afterCurrent);
    }

    deleteSong(song) {
        this.nodes.get(song).delete();
        console.log("deleting??");

        const i = this.songIndexes.get(song);
        swap(this.shuffleArr, i, this.shuffleArr.length-1);
        this.songIndexes.set(this.shuffleArr[i], i);
        
        this.shuffleArr.pop();
        this.songIndexes.delete(song);
    }

    /** adds node to end */
    _appendNode(song) {
        let newNode;

        // if no nodes, create sole node (points to itself)
        if (!this.last) {
            newNode = new SongNode(this, song);
            newNode.next = newNode;
            newNode.prev = newNode;
        }
        else newNode = new SongNode(this, song, this.last, this.last.next);

        this.last = newNode;
    }
    
    /** inserts a node randomly into `shuffleOrder`
     * @returns {number} the index which it was inserted
     */
    _insertSongRandom(song, afterCurrent) {

        console.log("adding ", song.title, "to", this.playlist.title, " after? ", afterCurrent);        

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
        console.log("reshuffling..");

        this.shuffleArr = [];
        this.currIndex = 0;

        for (const song of this.playlist.songs) {
            const i = this._insertSongRandom(song, false);
            if (!randomizeCurrSong && song === data.curr.song) this.currIndex = i;
        }

        const recentsArr = history.slice( -Math.ceil(this.shuffleArr.length/4) ).map(sid => data.songs.get(sid));
        const recents = new Set(recentsArr);
        console.log("recents:", recentsArr.map(s => s.title));
        kickAway(this.shuffleArr, randomizeCurrSong? this.currIndex : (this.currIndex + 1) % this.shuffleArr.length, recents);
    }

    updateCurrIndex() {
        console.log("updated curr index");
        this.currIndex = this.songIndexes.get(data.curr.song);
    }

    /** @returns {Song} */
    nextSong() {

        if (!data.settings.shuffle) 
            return this.nodes.get(data.curr.song).next.song;
        

        const next = this.shuffleArr[++this.currIndex];
        if (!next) {
            this._reshuffle(true);
            return this.shuffleArr[0];
        }
        // nullify songs we just played so that we reshuffle upon encountering an already played segment
        this.shuffleArr[this.currIndex - 1] = null; 
        return next;
    }

    print() {

        if (this.last == null) return console.log("no song nodes");

        const arr = [];
        for (let p = this.last.next; p !== this.last; p = p.next) {
            arr.push(p.song.title);
        }
        arr.push(this.last.song.title);

        // console.log("songnodes: ", arr);
        console.log("shuffleArr: ", this.shuffleArr.map(s => (s == null)? "null" : s.title));
        console.log("currIndex: ", this.currIndex);
    }
}

// update(shuffle, loopingShuffledPlaylist) {
//     const nodesArr = Array.from(this.playlist.songs).map(s => this.shuffleIndexes.get(s));
    
//     let currentSongNode = this.shuffleIndexes.get(data.curr.song);

//     // if cycle.all == null (shuffle was off previously) then shuffle evenly
//     if (shuffle && nodesArr.length > 3) {

//         randomize(nodesArr);
//         for (const i in nodesArr) nodesArr[i].index = Number(i);
        
//         if (loopingShuffledPlaylist) {
//             const currentIndex = currentSongNode.index;

//             // kick away recently played songs so they arent played again soon
//             const recentlyPlayed = new Set();
//             let p = currentSongNode;
//             for (let i = 0; i < nodesArr.length/4; i++) {
//                 p = p.prev;
//                 recentlyPlayed.add(p);
//             }
//             kickAway(nodesArr, currentIndex, recentlyPlayed);

//             // randomimze current song
//             swap(
//                 nodesArr, currentIndex, 
//                 rand(currentIndex, currentIndex + recentlyPlayed.size-1) % nodesArr.length
//             );
//             setSong(nodesArr[currentIndex].song);
//             currentSongNode = this.shuffleIndexes.get(data.curr.song);
//         }
//     }
                    
//     for (let i = 0; i < nodesArr.length; i++) {
//         nodesArr[i].prev = nodesArr[i === 0 ? nodesArr.length-1 : i-1 ];
//         nodesArr[i].next = nodesArr[(i+1) % nodesArr.length];
//     }

//     this.shuffleArr = shuffle? nodesArr : null;

//     // last is the previous of the current song upon creating cycle
//     this.last = currentSongNode.prev;

//     // console.log("updated cycle");
//     // this.print();
// }


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
            console.log("kicking ", arr[i]);
        }
    }

    return arr;
}



document.getElementById("next").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;
    

    // if not at the top of history stack, play next in stack
    if (!inThePresent()) {
        console.log("not at top of history yet");
        console.log(historyIndex, history.map(id => data.songs.get(id).title));

        return togglePlay( data.songs.get(history[++historyIndex]) );
    }

    togglePlay( data.curr.listenPlaylist.cycle.nextSong() );
    
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    
    if (!data.settings.shuffle) {
        const nextSong = data.curr.listenPlaylist.cycle.shuffleIndexes.get(data.curr.song).prev.song;
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
    data.settings.shuffle = shuffle;
    
    if (shuffle) data.curr.listenPlaylist.cycle.updateCurrIndex();
    
    console.log("shuffle ", shuffle);
    shuffleBtn.innerText = shuffle? "sh" : "__";
}

const shuffleBtn = document.getElementById("shuffle")
shuffleBtn.addEventListener("click", () => setShuffle(!data.settings.shuffle))