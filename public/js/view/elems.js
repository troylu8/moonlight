import * as songSettings from "../settings/songSettings.js";
import { togglePlay } from "../play.js";
import { data, Playlist, Song } from "../account/userdata.js";
import { openPlaylistSettings } from "../settings/playlistSettings.js";
import { removeTooltip, sendNotification, setToolTip, showError } from "./fx.js";
import { syncBtnHandler, syncData } from "../account/clientsync.js";
import { allFiles, deleteSongFile, getFileSize, missingFiles, uploadSongFile } from "../account/files.js";
import * as yt from "../new-song/getyt.js";
import { initNewSong } from "../new-song/newSong.js";
import { dragabbleEntry } from "./entryDrag.js";
const { ipcRenderer } = require("electron");

const icons = {
    options:   `<svg fill="var(--primary-color)" width="20px" height="20px" viewBox="0 0 32 32" >
                    <path d="M28.106 19.944h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.788-0.275-3.2-1.762-3.319-3.506-0.137-1.95 0.975-3.6 2.787-4.137 0.238-0.069 0.488-0.119 0.731-0.181h0.85c0.056 0.019 0.106 0.050 0.169 0.056 1.65 0.269 2.906 1.456 3.262 3.081 0.025 0.125 0.063 0.25 0.094 0.375v0.85c-0.019 0.056-0.050 0.113-0.056 0.169-0.262 1.625-1.419 2.863-3.025 3.238-0.156 0.038-0.3 0.081-0.444 0.119zM4.081 12.056l0.85 0c0.069 0.019 0.131 0.050 0.2 0.056 1.8 0.281 3.206 1.775 3.319 3.537 0.125 1.944-1 3.588-2.819 4.119-0.231 0.069-0.469 0.119-0.7 0.175h-0.85c-0.056-0.019-0.106-0.050-0.162-0.063-1.625-0.3-2.688-1.244-3.194-2.819-0.069-0.206-0.106-0.425-0.162-0.637v-0.85c0.019-0.056 0.050-0.113 0.056-0.169 0.269-1.631 1.419-2.863 3.025-3.238 0.15-0.037 0.294-0.075 0.437-0.113zM15.669 12.056h0.85c0.069 0.019 0.131 0.050 0.2 0.063 1.794 0.281 3.238 1.831 3.313 3.581 0.087 1.969-1.1 3.637-2.931 4.106-0.194 0.050-0.387 0.094-0.581 0.137h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.794-0.275-3.238-1.831-3.319-3.581-0.094-1.969 1.1-3.637 2.931-4.106 0.2-0.050 0.394-0.094 0.588-0.137z"></path>
                </svg>`,
    trash:     `<svg viewBox="0 0 24 24" >
                    <path  stroke="var(--error-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4,6h16M16,6l-.2706-.81193c-.2623-.78682-.3935-1.18023-.6367-1.47109-.2148-.25685-.4906-.45566-.8022-.5782C13.9376,3,13.523,3,12.6936,3h-1.3872c-.8294,0-1.244,0-1.59689.13878-.31159.12254-.58743.32135-.80222.5782-.24324.29086-.37437.68427-.63665,1.47109L8,6M18,6v10.2c0,1.6802,0,2.5202-.327,3.162-.2876.5645-.7465,1.0234-1.311,1.311C15.7202,21,14.8802,21,13.2,21h-2.4c-1.68016,0-2.52024,0-3.16197-.327-.56449-.2876-1.02343-.7465-1.31105-1.311C6,18.7202,6,17.8802,6,16.2L6,6m4,4.593941L14,16.2m0-5.606059L10,16.2"/>
                </svg>`,
    

    // icons matching song.state
    playable:  `<svg stroke="var(--primary-color)" viewBox="0 0 24 24">
                    <path fill="none" stroke-width="3" stroke-linejoin="round" d="M16.6582,9.28638c1.4398.89982,2.1596,1.34972,2.4065,1.92582.2156.503.2156,1.0725,0,1.5756-.2469.576-.9667,1.0259-2.4065,1.9258L9.896,18.94c-1.59795.9987-2.39693,1.4981-3.05627,1.445-.57472-.0462-1.10155-.3381-1.44533-.801C5,19.053,5,18.1108,5,16.2264v-8.45283c0-1.88438,0-2.82656.3944-3.35759.34378-.46288.87061-.75487,1.44533-.80108.65934-.053,1.45832.44636,3.05627,1.44508l6.7622,4.2264Z" transform="translate(1.525263 0.000046)" />
                </svg>`,
    active:    `<svg fill="var(--accent-color)" viewBox="0 0 24 24">
                    <path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z"/>
                </svg>`,
    error:     `<svg fill="var(--error-color)" viewBox="0 0 24 24">
                    <path d="M12.884 2.532c-.346-.654-1.422-.654-1.768 0l-9 17A.999.999 0 0 0 3 21h18a.998.998 0 0 0 .883-1.467L12.884 2.532zM13 18h-2v-2h2v2zm-2-4V9h2l.001 5H11z"/>
                </svg>`,
    
    // icons for syncStatus
    local:     `<svg fill="var(--warning-color)" viewBox="0 0 24 24" >
                    <path d="M16.71,16.29h0l-13-13A1,1,0,0,0,2.29,4.71L5.65,8.06a7,7,0,0,0-.59,2A4,4,0,0,0,6,18h9.59l2.7,2.71a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42ZM6,16a2,2,0,0,1,0-4,1,1,0,0,0,1-1,5,5,0,0,1,.2-1.39L13.59,16ZM18.42,8.22A7,7,0,0,0,12,4a6.74,6.74,0,0,0-2.32.4,1,1,0,0,0,.66,1.88A4.91,4.91,0,0,1,12,6a5,5,0,0,1,4.73,3.39,1,1,0,0,0,.78.67,3,3,0,0,1,1.85,4.79,1,1,0,0,0,.16,1.4,1,1,0,0,0,.62.22,1,1,0,0,0,.78-.38,5,5,0,0,0-2.5-7.87Z"/>
                </svg>`,
    doomed:    `<svg viewBox="0 -0.5 20 20">
                    <path stroke="var(--error-color)" clip-rule="evenodd" fill="none" fill-rule="evenodd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M5.5,12.0002c.00024-3.33952,2.35944-6.21381,5.6348-6.8651s6.5547,1.10183,7.8325,4.18721.1982,6.64369-2.5786,8.49889-6.47743,1.4905-8.8387-.871c-1.31272-1.3129-2.05013-3.0934-2.05-4.95Z" transform="translate(-2.500311-2.500443)" />
                    <path fill="var(--error-color)" d="M9.34477,14.0937c-.29295.2929-.29304.7677-.0002,1.0607.29284.2929.76773.293,1.06063.0002L9.34477,14.0937Zm3.68543-1.5631c.293-.2929.2931-.7677.0002-1.0607s-.7677-.293-1.0606-.0002l1.0604,1.0609ZM11.9695,11.47c-.2928.293-.2926.7679.0004,1.0607s.7679.2926,1.0606-.0004L11.9695,11.47Zm3.685-1.56573c.2928-.293.2926-.76787-.0004-1.06066s-.7679-.2926-1.0606.00041l1.061,1.06025ZM13.0302,11.4697c-.2929-.2928-.7678-.2927-1.0606.0002s-.2928.7678.0002,1.0607l1.0604-1.0609Zm1.5646,3.6849c.2929.2928.7678.2927,1.0606-.0002.2929-.293.2928-.7678-.0002-1.0607l-1.0604,1.0609Zm-2.6252-2.6242c.2928.2929.7677.293,1.0606.0002s.2931-.7677.0002-1.0607l-1.0608,1.0605ZM10.4054,8.84392c-.2928-.29295-.76768-.29304-1.06063-.00021s-.29304.76772-.0002,1.06066L10.4054,8.84392Zm-.0002,6.31068l2.625-2.624-1.0604-1.0609-2.62503,2.624l1.06043,1.0609Zm2.6253-2.6243l2.624-2.62603-1.061-1.06025L11.9695,11.47l1.061,1.0603Zm-1.0607.0003l2.625,2.624l1.0604-1.0609-2.625-2.624-1.0604,1.0609Zm1.0606-1.0607l-2.625-2.62598L9.34457,9.90437L11.9696,12.5304l1.0608-1.0605Z" transform="translate(-2.500318-2.499142)"/>
                </svg>`,

    check:     `<svg fill="none" viewBox="0 0 24 24">
                    <path stroke="green" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M6 12L10.2426 16.2426L18.727 7.75732"/>
                </svg>`,

    musicnote: `<svg viewBox="0 0 24 24" fill="none" >
                    <path stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12.5 8.89001V18.5M12.5 8.89001V5.57656C12.5 5.36922 12.5 5.26554 12.5347 5.17733C12.5653 5.09943 12.615 5.03047 12.6792 4.97678C12.752 4.91597 12.8503 4.88318 13.047 4.81761L17.447 3.35095C17.8025 3.23245 17.9803 3.17319 18.1218 3.20872C18.2456 3.23982 18.3529 3.31713 18.4216 3.42479C18.5 3.54779 18.5 3.73516 18.5 4.10989V7.42335C18.5 7.63069 18.5 7.73436 18.4653 7.82258C18.4347 7.90048 18.385 7.96943 18.3208 8.02313C18.248 8.08394 18.1497 8.11672 17.953 8.18229L13.553 9.64896C13.1975 9.76746 13.0197 9.82671 12.8782 9.79119C12.7544 9.76009 12.6471 9.68278 12.5784 9.57512C12.5 9.45212 12.5 9.26475 12.5 8.89001ZM12.5 18.5C12.5 19.8807 10.933 21 9 21C7.067 21 5.5 19.8807 5.5 18.5C5.5 17.1192 7.067 16 9 16C10.933 16 12.5 17.1192 12.5 18.5Z" />
                </svg>`,
    playlist:  `<svg stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24" fill="none">
                    <path d="M8 14H3"/>
                    <path d="M12 9L3 9"/>
                    <path d="M16 17.4286C16 18.8487 14.8807 20 13.5 20C12.1193 20 11 18.8487 11 17.4286C11 16.0084 12.1193 14.8571 13.5 14.8571C14.8807 14.8571 16 16.0084 16 17.4286ZM16 17.4286V11"/>
                    <path d="M18.675 8.11607L16.9205 8.95824C16.5788 9.12225 16.408 9.20426 16.2845 9.33067C16.1855 9.43211 16.1091 9.55346 16.0605 9.68666C16 9.85265 16 10.0422 16 10.4212C16 11.2976 16 11.7358 16.1911 11.9987C16.3421 12.2066 16.5673 12.3483 16.8201 12.3945C17.1397 12.453 17.5348 12.2634 18.325 11.8841L20.0795 11.0419C20.4212 10.8779 20.592 10.7959 20.7155 10.6695C20.8145 10.5681 20.8909 10.4467 20.9395 10.3135C21 10.1475 21 9.95803 21 9.57901C21 8.70256 21 8.26434 20.8089 8.00144C20.6579 7.79361 20.4327 7.65188 20.1799 7.60565C19.8603 7.54717 19.4652 7.7368 18.675 8.11607Z"/>
                    <path d="M20 4L9.5 4M3 4L5.25 4"/>
                </svg>`,

    download:  `<svg stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" fill="none" fill-rule="evenodd" viewBox="0 0 24 24" >
                    <line x1="12" y1="5" x2="12" y2="15" ></line>
                    <path d="M17,11 L12.7071,15.2929 C12.3166,15.6834 11.6834,15.6834 11.2929,15.2929 L7,11"></path>
                    <line x1="19" y1="20" x2="5" y2="20" ></line>
                </svg>`
} 

/** 
 * @param {HTMLElement} entry 
 * @param {"playable" | "active" | "error"} state
 */
export function setEntryState(entry, state) {
    entry.querySelector(".song__state").innerHTML = icons[state];

    entry.classList.remove("playable", "active", "error");
    entry.classList.add(state);

    if (state === "error")  setToolTip(entry, "[click] resolve missing file", 0);
    else                    removeTooltip(entry);
}

/** 
 * @param {HTMLElement} entry 
 * @param {"local" | "synced" | "doomed"} state
 */
export function setEntrySyncStatus(entry, syncStatus) {
    const icon = entry.querySelector(".syncStatus");

    const svgElem = icon.querySelector("svg");
    if (svgElem) icon.removeChild(svgElem);
    if (syncStatus !== "synced") icon.insertAdjacentHTML("afterbegin", icons[syncStatus]);

    let tooltipText = "";
    if (syncStatus === "local")         tooltipText = "not synced with server";
    else if (syncStatus === "doomed")   tooltipText = "will be deleted upon sync";

    icon.tooltip.innerHTML = tooltipText;
}

/**
 * @param {HTMLElement} groupElem 
 * @param {Song} song 
 * @returns {HTMLElement}
 */
function getSongEntry(groupElem, song) {
    if (!song.songEntries) return null;
    for (const entry of song.songEntries.values()) {
        if (entry.parentElement === groupElem) return entry;
    }
    return null;
}


/** 
 * @param {Song} song
 * @param {Playlist} playlist 
 * @param {HTMLElement} before add songEntry before this element
 */
export function createSongEntry(song, playlist, before) {
    if (!playlist.groupElem) return;

    // if songEntry already exists
    const e = getSongEntry(playlist.groupElem, song.id);
    if (e) return e;

    const songEntry = createElement("div", null, "song " + song.id);
    playlist.groupElem.insertBefore(songEntry, before);
    songEntry.song = song;
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <span class="song__duration"> ${getTimeDisplay(song.duration)} </span>
        </div>`

    const song__info = createElement("div", null, "song__info", songEntry.firstChild);
    
    const song__title = createElement("span", null, "song__title song__title:" + song.id, song__info, song.title);
    const song__artist = createElement("span", null, "song__artist song__artist:" + song.id, song__info, song.artist);

    const syncStatusIcon = createElement("div", null, "syncStatus", songEntry.lastChild);
    setToolTip(syncStatusIcon, "", 10).style.whiteSpace = "nowrap";

    const song__options = createElement("div", null, "song__options", songEntry.lastChild);
    song__options.innerHTML = icons.options;
    song__options.addEventListener("click", (e) => {
        songSettings.openSongSettings(song, song__title, song__artist);
        e.stopPropagation();
    });
    songEntry.addEventListener("contextmenu", (e) => {
        songSettings.openSongSettings(song, song__title, song__artist);
        e.preventDefault();
    });
    
    const song__state = createElement("div", null, "song__state");
    song__state.addEventListener("click", () => {
        if (song.state !== "playable") return;

        togglePlay(song);

        if (data.curr.viewPlaylist !== data.curr.listenPlaylist) data.updateListenPlaylist();
        data.curr.listenPlaylist.cycle.updateCurrIndex();
    });
    songEntry.firstChild.insertBefore(song__state, song__info);

    

    let menuOn = false;
    
    songEntry.addEventListener("click", () => {
        if (song.state !== "error" || menuOn) return;
        menuOn = true;
        
        songEntry.tooltip.innerHTML = "";

        const resolve__nav = createElement("nav", null, "resolve", songEntry.tooltip);

        const resolve__sync = createElement("button", null, "resolve__sync menu-option", resolve__nav, "get from server");
        // can only resolve via sync if songfile exists on server (song isnt new) and TODO: if theres wifi
        if (song.syncStatus === "synced") {
            resolve__sync.addEventListener("click", syncBtnHandler);
        }
        else resolve__sync.classList.add("menu-option__disabled");
        

        const resolve__link = createElement("button", null, "resolve__link menu-option", resolve__nav, "choose file");
        resolve__link.addEventListener("click", async () => {

            const dialog = await ipcRenderer.invoke("show-dialog", {
                title: "link file to song - " + song.title,
                properties: ['openFile'],
                filters: [
                    { name: 'music', extensions: ["mp3", "wav", "m4a", "avi"] },
                ],
            });
            if (dialog.canceled) return;
            
            try {
                const basename = await uploadSongFile(song.id, dialog.filePaths[0], false);
                missingFiles.delete(song.filename);
                song.filename = basename;
                song.size = await getFileSize(global.userDir + "/songs/" + basename);
                allFiles.set(song.filename, song);
                
                song.setState("playable");
            } catch (err) {
                if (err.message === "file in use") 
                    sendNotification("file in use by another song!", "var(--error-color)");
            }

        });
        
        //INFO: for NW
        // const resolve__link__input = createElement("input", null, "resolve__link", resolve__nav);
        // resolve__link__input.type = "file";
        // resolve__link__input.accept = "audio/*";

        // resolve__link.addEventListener("click", () => resolve__link__input.click());
        // resolve__link__input.addEventListener("change", async () => {
        //     uploadSongFile(uid, song.id, resolve__link__input.value);
        //     song.filename = basename(resolve__link__input.value);
        //     song.setState("playable");
        // });
        
    });
    songEntry.addEventListener("mouseenter", () => {
        if (song.state !== "error") return;
        menuOn = false;
        songEntry.tooltip.textContent = "[click] resolve missing file";
    });
    
    setEntryState(songEntry, song.state);
    setEntrySyncStatus(songEntry, song.syncStatus);
    dragabbleEntry(songEntry, playlist);

    song.songEntries.set(playlist, songEntry);
    return [songEntry, song__title, song__artist];
}


/** @param {Playlist} playlist  */
export function deleteSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const entry = playlist.groupElem.querySelector("." + song.id);
    
    entry.remove();
    song.songEntries.delete(entry);
}

export const mainDiv = document.getElementById("main-div");
const playlistsNav = document.getElementById("playlists__nav");
const playlistCheckboxes = document.getElementById("song-settings__playlists");
const playlistsError = document.getElementById("song-settings__playlists__error");

/** PLAYLIST OPTION IN SONG SETTINGS */
export function createPlaylistCheckboxEntry(playlist) {
    const option = createElement("div", null, "song-settings__playlists__option", playlistCheckboxes);
    playlist.checkboxDiv = option;

    const checkbox = createElement("input", "song-settings__playlist:" + playlist.id, null, option);
    checkbox.type = "checkbox";
    checkbox.playlist = playlist;
    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            songSettings.currentlyEditing.addToPlaylist(playlist);
        } 
        else {
            if (songSettings.currentlyEditing.playlists.size === 1) {
                checkbox.checked = true;
                return showError(playlistsError, "must be in at least 1 playlist");
            }
            songSettings.currentlyEditing.removeFromPlaylist(playlist);
        }
        playlistsError.textContent = "";
    })
    
    const label = createElement("label", null, null, option, playlist.title);
    label.setAttribute("for", "song-settings__playlist:" + playlist.id);
}


/** PLAYLIST ENTRY IN LEFT NAV 
 * @param {Playlist} playlist
 */
export function createPlaylistEntry(playlist) {
    
    const playlistEntry = createElement("div", "li:" + playlist.id, "playlist", playlistsNav);
    playlistEntry.innerHTML = `<div class="playlist__title"> ${playlist.title} </div>`;
    playlistEntry.addEventListener("click", () => setViewPlaylist(playlist));
    playlistEntry.addEventListener("contextmenu", (e) => {
        openPlaylistSettings(playlist);
        e.preventDefault();
    });
    playlist.playlistEntry = playlistEntry;

    const syncStatusIcon = createElement("div", null, "syncStatus", playlistEntry);
    setToolTip(syncStatusIcon, "", 10).style.whiteSpace = "nowrap";

    createElement("div", null, "expander", playlistEntry);

    const playlist__options = createElement("div", null, "playlist__options", playlistEntry);
    playlist__options.innerHTML = icons.options;
    playlist__options.addEventListener("click", (e) => {
        openPlaylistSettings(playlist);
        e.stopPropagation();
    });

    setEntrySyncStatus(playlistEntry, playlist.syncStatus);
}

/** 
 * PLAYLIST GROUP IN MAIN DIV
 * @param {Playlist} playlist
 */
function createPlaylistGroup(playlist) {
    const playlist__group = createElement("nav", "group:" + playlist.id, "playlist__group hiding-scroll", mainDiv);
    playlist.groupElem = playlist__group;

    for (const song of playlist.songs) {
        createSongEntry(song, playlist);
    }

    return playlist__group;
}

/** @type {HTMLElement} */
let activePlaylistGroup;
export const playlistHeader = document.getElementById("playlist-header");
export const playlistDesc = document.getElementById("playlist-desc");

/** 
 * @param {Playlist} playlist
 * @param {boolean} setAsListenPlaylist
 */
export function setViewPlaylist(playlist, setAsListenPlaylist) {

    if (playlist === data.curr.viewPlaylist) return;

    if (data.curr.viewPlaylist) data.curr.viewPlaylist.playlistEntry.classList.remove("view-playlist");

    data.curr.viewPlaylist = playlist;

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";

    if (!playlist) {
        playlistHeader.textContent = "-";
        playlistDesc.innerHTML = "-";
    }
    else {
        if (!playlist.groupElem) 
            playlist.groupElem = createPlaylistGroup(playlist);
    
        playlistHeader.textContent = playlist.title;
        playlistDesc.innerHTML = playlist.desc;
        songSettings.updateSongEntries();
    
        activePlaylistGroup = playlist.groupElem;
        activePlaylistGroup.style.display = "flex";
    
        if (songSettings.currentlyEditing) 
            songSettings.setLiveElements(activePlaylistGroup);
    
        playlist.playlistEntry.classList.add("view-playlist");
    }

    if (setAsListenPlaylist) data.updateListenPlaylist();
    
}

export const stragglers = document.getElementById("stragglers");
export const stragglersList = document.getElementById("stragglers__list");


export async function createStragglerEntry(basename, isDirectory) {
    stragglers.style.display = "flex";

    const stragglerEntry = createElement("div", null, "straggler", stragglersList);
    allFiles.set(basename, stragglerEntry);

    const straggler__delete = createElement("div", null, "straggler__delete", stragglerEntry);
    straggler__delete.addEventListener("click", async () => {
        await deleteSongFile(basename, isDirectory);
    });
    createElement("div", null, "svg-cont", straggler__delete).innerHTML = icons.trash;

    
    const straggler__size = createElement("div", null, "straggler__size", stragglerEntry);

    stragglerEntry.isDirectory = isDirectory;
    if (isDirectory) {
        stragglerEntry.size = 0;
        straggler__size.textContent = "dir";
    } else {
        stragglerEntry.size = await getFileSize(global.userDir + "/songs/" + basename);
        straggler__size.textContent = getSizeDisplay(stragglerEntry.size);
    }

    createElement("div", null, "straggler__basename soft-link", stragglerEntry, basename)
        .addEventListener("click", () => {
            ipcRenderer.invoke("show-file", global.userDir + "/songs/" + basename); 
        });
    
    return stragglerEntry;
}
export async function deleteStragglerEntry(basename) {
    const stragglerEntry = allFiles.get(basename);
    if (!stragglerEntry) return;
    stragglerEntry.remove();
    allFiles.delete(basename);
    if (!stragglersList.hasChildNodes()) stragglers.style.display = "none";
}


const trackerList = document.getElementById("new__tracker-list");

/**
 * @param {string} title 
 * @param {number} total total size in bytes
 * @param {function} oncancel 
 * @param {function} oncomplete 
 * @returns {object} 
 * ```
 * const obj = createTrackerEntry(...);
 * obj.add(chunkSize); // increment tracker by some amount of bytes
 * obj.setProgress(downloaded, total);
 * obj.setTitle(title);
 * ```
 */
export function createTrackerEntry(title) {

    const trackerElem = createElement("div", null, "tracker", trackerList);
    trackerElem.innerHTML = 
        `<div class="tracker__top">
            <div class="tracker__title"> ${title} </div>
            <div class="tracker__icon">
                <div class="tracker__trash svg-cont"> ${icons.trash} </div>
                <div class="tracker__check"> ${icons.check} </div>
            </div>
        </div>
        <div class="tracker__bar"></div>`
        
    return trackerElem;
}

const searchResults = document.getElementById("search-results");

export function createSearchResultEntry(searchResult) {
    const resultElem = createElement("div", null, "search-result", searchResults);
    resultElem.innerHTML = 
       `<div class="search-result__icon">${searchResult.type === "video"? icons.musicnote : icons.playlist}</div>
        <p class="search-result__title">${searchResult.title}</p>
        <p class="search-result__artist">${searchResult.author.name}</p>
        <div class="expander"></div>`;
    
    const downloadBtn = createElement("div", null, "search-result__download", resultElem);
    downloadBtn.innerHTML = `<div class="svg-cont">${icons.download}</div>`;
    downloadBtn.addEventListener("click", async () => {
        searchResults.close();

        if (searchResult.type === "list") yt.downloadPlaylist(searchResult.listId, () => {});
        else {
            if (!data.curr.viewPlaylist) return console.log("select a playlist to add song");
            
            yt.downloadSong(searchResult.videoId, (err, songData) => {
                if (songData) initNewSong(songData);  // video downloaded successfully
            });
        }
    });
}


/**  @returns {HTMLElement} */
function createElement(tag, id, classes, parent, text) {
    const elem = document.createElement(tag);
    if (id) elem.id = id;
    if (classes) elem.classList = classes;
    if (text) elem.textContent = text;
    if (parent) parent.appendChild(elem);
    return elem;
}


export function getTimeDisplay(totalSeconds) {
    totalSeconds = Math.floor(totalSeconds);

    const res = [];

    res.push(("" + totalSeconds % 60).padStart(2, "0"));
    totalSeconds = Math.floor(totalSeconds / 60);

    res.push(("" + totalSeconds % 60).padStart((totalSeconds > 60)? 2 : 1, "0"));
    totalSeconds = Math.floor(totalSeconds / 60);
    
    if (totalSeconds > 0) res.push("" + totalSeconds);

    return res.reverse().join(":");
}


export function getSizeDisplay(totalBytes) {
    let displayValue = totalBytes;
    
    const units = [" b", "kb", "mb", "gb", "tb"];

    let i;
    for (i = 0; displayValue >= 100 && i < 4; i++) {
        displayValue /= 1000;
    }
    return displayValue.toFixed((i === 0)? 0 : 2) + " " + units[i];
}