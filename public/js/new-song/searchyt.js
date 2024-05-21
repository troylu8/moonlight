import { createSearchResultEntry } from '../view/elems.js';
const yts = require('yt-search');


export async function searchYT(query) {
    const res = await yts(query);

    const all = res.all.filter(sr => sr.type === "video" || sr.type === "list");
    
    searchResults.innerHTML = "";
    if (all.length === 0) searchResults.innerHTML = "no results found."
    else for (const result of all) createSearchResultEntry(result);
}

let searchOpen = false;

const searchBtn = document.getElementById("search-yt__btn");
const glassSVG = document.getElementById("search-yt__glass");
const xSVG = document.getElementById("search-yt__x");

const searchInput = document.getElementById("search-yt__input");
const searchResults = document.getElementById("search-results");

searchBtn.addEventListener("click", () => {
    searchOpen = !searchOpen;
    
    searchInput.style.display = searchOpen? "block" : "none";
    glassSVG.style.display = searchOpen? "none" : "block";
    xSVG.style.display = searchOpen? "block" : "none";

    if (!searchOpen) searchResults.close();
});

searchResults.close = (hideSearchBar) => {
    searchResults.style.display = "none";
    searchResults.innerHTML = "";

    searchInput.style.borderRadius = "5px";
    searchInput.style.outline = "";

    searchInput.value = "";

    if (hideSearchBar) {
        searchInput.style.display = xSVG.style.display = "none";
        glassSVG.style.display = "block";
        searchOpen = false;
    }
}

searchInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    searchResults.style.display = "block";
    searchInput.style.borderRadius = "5px 5px 0 0";
    searchInput.style.outline = "solid 3px var(--accent-color)";
    
    let c = 0;
    const loadingAnimation = setInterval(() => {
        searchResults.innerHTML = "searching" + "...".substring(0, c++ % 4);
    }, 100);

    await searchYT(searchInput.value);
    
    clearInterval(loadingAnimation);
});

document.body.addEventListener("mousedown", (e) => {
    if (searchResults.style.display === "block" && !searchResults.parentElement.contains(e.target)) 
        searchResults.close();
});

