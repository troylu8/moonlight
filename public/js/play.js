import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";
import { data, Song } from "./userdata.js";

const audio = new Audio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** `null` when shuffle is off 
 * @type {Array<string>} song history, contains ids instead of object references so that deleted songs can be garbage collected */
export let history = null;
console.log(data.settings.shuffle, "shuffle");
/** @type {number} points to current song */
export let historyIndex = -1;

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

    if (history && history[historyIndex] != song.id ) {
        history.push(song.id);
        historyIndex = history.length-1;
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
        // if there is only 1 node
        if (SongNode.last.next === SongNode.last.next.next) {
            SongNode.last = null;
            if (SongNode.all) SongNode.all = [];
            console.log("deleted sole node");
            return;
        };

        // if shuffle
        if (data.settings.shuffle) {
            const lastInArr = SongNode.all[SongNode.all.length-1];
            swap(SongNode.all, this.index, SongNode.all.length-1);
            lastInArr.index = this.index;
        }

        if (this === SongNode.last) {
            SongNode.last = this.prev;
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }

    static addNodeToEnd(song) {
        let newNode;

        // if no nodes, create sole node (points to itself)
        if (!SongNode.last) {
            newNode = new SongNode(song);
            newNode.next = newNode;
            newNode.prev = newNode;
        }
        else newNode = new SongNode(song, SongNode.last, SongNode.last.next);

        SongNode.last = newNode;
        if (SongNode.all) SongNode.all.push(newNode);
    }

    static addNode(song, shuffle) {
        if (!SongNode.last || !shuffle) return this.addNodeToEnd(song);

        // add a copy of the other node to the end...
        const other = SongNode.all[Math.floor(Math.random() * SongNode.all.length)];
        SongNode.addNodeToEnd(other.song);

        // ...then edit the original other node to feature new song
        other.song = song;
        song.songNode = other;
    }

    static createCycle(playlist, shuffle, loopShuffledPlaylist) {

        const songNodes = Array.from(playlist.songs).map(s => s.songNode ?? new SongNode(s));
        
        // if SongNode.all == null (shuffle was off previously) then shuffle evenly
        if (shuffle && songNodes.length > 3) {

            randomize(songNodes);
            for (const i in songNodes) songNodes[i].index = Number(i);
            
            if (loopShuffledPlaylist) {
                const currentIndex = data.curr.song.songNode.index;

                // kick away recently played songs so they arent played again soon
                const recentlyPlayed = new Set();
                let p = data.curr.song.songNode;
                for (let i = 0; i < songNodes.length/4; i++) {
                    p = p.prev;
                    recentlyPlayed.add(p);
                }
                kickAway(songNodes, currentIndex, recentlyPlayed);

                // randomimze current song
                swap(
                    songNodes, currentIndex, 
                    rand(currentIndex, currentIndex + recentlyPlayed.size-1) % songNodes.length
                );
                setSong(songNodes[currentIndex].song);
            }
        }
                        
        for (let i = 0; i < songNodes.length; i++) {
            songNodes[i].prev = songNodes[i === 0 ? songNodes.length-1 : i-1 ];
            songNodes[i].next = songNodes[(i+1) % songNodes.length];
        }

        SongNode.all = shuffle? songNodes : null;        

        // last is the previous of the current song upon creating cycle
        SongNode.last = data.curr.song.songNode.prev;

        data.curr.listenPlaylist = playlist;
    }

    static updatePlaylistCycle(loopShuffledPlaylist) {
        SongNode.createCycle(data.curr.viewPlaylist, data.settings.shuffle, loopShuffledPlaylist);
        console.log("updated cycle");
    }

    static print() {

        if (SongNode.last == null) return console.log("no song nodes");

        const arr = [];
        
        for (let p = SongNode.last.next; p !== SongNode.last; p = p.next) {
            arr.push(p.song.title);
        }
        arr.push(SongNode.last.song.title);

        console.log("all nodes: ", arr);
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

    // if not shuffling, play next song
    if (!data.settings.shuffle)
        return togglePlay(data.curr.song.songNode.next.song);

    // if not at the top of history stack, play next in stack
    if (historyIndex < history.length-1) {
        console.log("not at top of history yet");
        console.log(historyIndex, history.map(id => data.songs.get(id).title));

        return togglePlay( data.songs.get(history[++historyIndex]) );
    }
    
    setSong(data.curr.song.songNode.next.song);

    if (data.curr.song.songNode.prev === SongNode.last) 
        SongNode.updatePlaylistCycle(true);

    audio.play();
    
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    if (!data.settings.shuffle) 
        togglePlay(data.curr.song.songNode.prev.song);
    
    else {
        togglePlay( data.songs.get(history[historyIndex--]) );
    }
        
})

export function setShuffle(shuffle) {
    if (data.settings.shuffle === shuffle) return;

    data.settings.shuffle = shuffle;
    SongNode.updatePlaylistCycle();

    history = data.settings.shuffle? [] : null;
    historyIndex = -1;

    console.log("shuffle ", data.settings.shuffle);
    shuffleBtn.innerText = data.settings.shuffle? "sh" : "__";
}

const shuffleBtn = document.getElementById("shuffle")
shuffleBtn.addEventListener("click", () => setShuffle(!data.settings.shuffle))