import { createSearchResultEntry } from '../view/elems.js';

const yts = require('yt-search');


export async function searchYT(query) {
    console.log("searching for ", query);
    const res = await yts(query);

    const all = res.all.filter(sr => sr.type === "video" || sr.type === "list");
    
    for (let i = 0; i < 5; i++) {
        createSearchResultEntry(all[i]);
    }
}

const search = document.getElementById("search-yt__input");
const searchResults = document.getElementById("search-results");

search.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    searchResults.style.display = "block";
    searchResults.innerHTML = "";
    searchYT(search.value);
});

document.body.addEventListener("mousedown", (e) => {
    if (searchResults.style.display === "block" && !searchResults.contains(e.target)) {
        searchResults.style.display = "none";
        searchResults.innerHTML = "";
    }
});