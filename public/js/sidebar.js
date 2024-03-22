export let open = false;

export const setSidebarOpen = (val) => {
    if (open === val) return;
    document.body.style.setProperty("--sidebar-div-width", val? "350px" : "0px");
    open = val;
}
export const toggleSidebar = () => {
    setSidebarOpen(!open);
};


let currentContent = null;

export function setSidebarContent(elem, toggle) {
    if (currentContent === elem) {
        if (toggle) toggleSidebar();
        else        setSidebarOpen(true);
        return;
    }

    if (currentContent !== null) currentContent.style.display = "none";
    
    currentContent = elem;
    currentContent.style.display = "flex";

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => setSidebarOpen(false);

