const Cc = Components.classes;
const Ci = Components.interfaces;

const PREF_SERVICE = Cc["@mozilla.org/preferences-service;1"].
                     getService(Ci.nsIPrefService);
const PREF_BRANCH =  PREF_SERVICE.QueryInterface(Ci.nsIPrefBranch);

const TEST_RUNS = [
  {name : "BFT Test-run", script: "testrun_bft.py"},
  {name : "Add-ons Test-run", script: "testrun_addons.py"},
];

var gMozmillCrowd = {

  init : function gMozmillCrowd_init() {
    var menulist = document.getElementById("selectTestrun");
    var popup = document.getElementById("selectTestrunPopup");

    for each (var testrun in TEST_RUNS) {
      var menuitem = document.createElement("menuitem");
      menuitem.setAttribute("value", testrun.script);
      menuitem.setAttribute("label", testrun.name);
      menuitem.setAttribute("crop", "center");
  
      popup.appendChild(menuitem);
    }
  },

  /**
   * Browse for an application to use for the test-run.
   */
  browseForApplication : function gMozmillCrowd_browseForApplication(event) {
    var recentApplications = [ ];

    // Let the user select an application
    var fp = Cc["@mozilla.org/filepicker;1"].
             createInstance(Ci.nsIFilePicker);

    fp.init(window, "Select a File", Ci.nsIFilePicker.modeOpen);
    if (fp.show() == Ci.nsIFilePicker.returnOK) {
      var menulist = document.getElementById("selectApplication");
      var popup = document.getElementById("selectApplicationPopup");
      var separator = document.getElementById("browseApplicationSeparator");

      var menuitem = document.createElement("menuitem");
      menuitem.setAttribute("value", fp.file);
      menuitem.setAttribute("label", fp.file.path);
      menuitem.setAttribute("crop", "center");

      popup.insertBefore(menuitem, separator);
      menulist.selectedItem = menuitem;
    }
  },

  /**
   * XXX: Stop a test-run before closing the dialog
   */
  closeDialog : function gMozmillCrowd_closeDialog() {
    return true;
  },

  openPreferences : function gMozmillCrowd_openPreferences(event) {
    window.openDialog("chrome://mozmill-crowd/content/preferences.xul", "", "chrome,dialog");
  },

  startTestrun : function gMozmillCrowd_startTestrun(event) {
    
  }
};
