import { Playlist } from "../account/userdata.js";
import { addDragEvent } from "./fx.js";

/**
 * @param {HTMLElement} entry 
 * @param {Playlist} playlist 
 */
export function dragabbleEntry(entry, playlist) {
    entry.querySelector(".song__options").addEventListener("mousedown", e => e.stopPropagation());
    entry.querySelector(".song__state").addEventListener("mousedown", e => e.stopPropagation());

    function mouseInTopHalf(entry, y) {
        const rect = entry.getBoundingClientRect();
        return y < ( rect.y + rect.height/2 );
    }
    function nextSongEntry(entry) {
        do entry = entry.nextElementSibling;
        while (entry && !entry.song);
        return entry;
    }

    let pos;

    /** the dragging entry will be dropped before this entry */
    let destination;
    let dragBuffer;

    addDragEvent(entry, 
        (e) => {
            entry.style.top = (pos[1] += e.movementY) + "px";

            const hoveringEntry = document.elementFromPoint(pos[0], e.clientY).closest(".song");
            if (hoveringEntry) {
                destination = mouseInTopHalf(hoveringEntry, e.clientY)? hoveringEntry : nextSongEntry(hoveringEntry);
                entry.parentElement.insertBefore(dragBuffer, destination);
            }
        },

        (e) => {
            const rect = entry.getBoundingClientRect();
            entry.style.width = rect.width + "px";
            entry.style.height = rect.height + "px";
            entry.style.top = rect.y + "px";
            entry.style.left = rect.x + "px";
            entry.style.position = "fixed";
            entry.style.pointerEvents = "none";
            entry.style.backgroundColor = "var(--background-color)";
            pos = [rect.x, rect.y];

            dragBuffer = document.createElement("div");
            dragBuffer.className = "drag__buffer";
            dragBuffer.style.minHeight = rect.height + "px";
            entry.parentElement.insertBefore(dragBuffer, entry);

            destination = entry;
        },

        (e) => {
            ["width", "height", "top", "left", "position", "pointer-events", "background-color"]
                .forEach(p => entry.style.removeProperty(p));
            
            dragBuffer.replaceWith(entry);
            dragBuffer = destination = null;

            playlist.setSyncStatus("local");
        }
    )
}

