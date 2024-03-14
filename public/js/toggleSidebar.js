let open = false;

const toggleSidebar = () => {
    document.body.style.setProperty("--sidebar-div-width", open? "0" : "350px");
    open = !open;
}

document.getElementById("settings").onclick = () => toggleSidebar();