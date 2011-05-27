// Adds the Mozmill Crowd toolbar button to the addon bar on firstrun
function MozmillCrowd_onLoad() {
  window.removeEventListener("load", arguments.callee, false);

  let firstRun = Services.prefs.getBoolPref("extensions.mozmill-crowd.firstrun");

  if (firstRun) {
    let addonBar = document.getElementById("addon-bar");
    let currentSet = addonBar.currentSet;

    if (currentSet.indexOf("mozmill-crowd_toolbarButton") == -1) {
      addonBar.currentSet += ",mozmill-crowd_toolbarButton";
      addonBar.setAttribute("currentset", addonBar.currentSet);
      document.persist("addon-bar", "currentset");
      addonBar.collapsed = false;
      Services.prefs.setBoolPref("extensions.mozmill-crowd.firstrun", false);
    }
  }
}

window.addEventListener("load", MozmillCrowd_onLoad, false);
