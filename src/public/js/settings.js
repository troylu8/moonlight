import { setSidebarContent } from "./sidebar.js";
import * as account from "./account.js";
import { loadUserdata } from "./userdata.js";

const settings = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => setSidebarContent(settings);


document.getElementById("sign-out").addEventListener("click", () => {
    account.setAccInfo("guest");
    loadUserdata(account.guestID);
    setAccountElem(signIn);
});
