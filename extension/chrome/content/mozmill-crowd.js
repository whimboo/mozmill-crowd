/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MozMill Crowd code.
 *
 * The Initial Developer of the Original Code is the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Henrik Skupin <hskupin@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var Application = { }; Cu.import('resource://mozmill-crowd/application.js', Application);
var Storage = { }; Cu.import('resource://mozmill-crowd/storage.js', Storage);
var Utils = { }; Cu.import('resource://mozmill-crowd/utils.js', Utils);

const AVAILABLE_TEST_RUNS = [{
  name : "General Test-run", script: "testrun_general.py" }, {
  name : "Add-ons Test-run", script: "testrun_addons.py" }
];


/**
 *
 */
var gMozmillCrowd = {
  /**
   * Initialize the Mozmill Crowd extension
   */
  init : function gMozmillCrowd_init() {
    // Cache main ui elements
    this._applications = document.getElementById("selectApplication");
    this._testruns = document.getElementById("selectTestrun");
    this._output = document.getElementById("testrunResults");
    this._execButton = document.getElementById("startStopTestrun");
    this._stringBundle = document.getElementById("mozmill-crowd-stringbundle");

    // Add the current application as default
    this.addApplicationToList(new Application.Application());

    // Populate the test-run drop down with allowed test-runs
    var popup = document.getElementById("selectTestrunPopup");

    AVAILABLE_TEST_RUNS.forEach(function(testrun) {
      var menuitem = document.createElement("menuitem");
      menuitem.setAttribute("label", testrun.name);
      menuitem.setAttribute("crop", "center");
      menuitem.value = testrun.script;

      popup.appendChild(menuitem);
    });

    this._testruns.selectedIndex = 0;
  },

  /**
   * Adds the specified application to the application drop down
   *
   * @param string aPath
   *        Path to the application folder
   */
  addApplicationToList : function gMozmillCrowd_addApplicationToList(aApplication) {
    var details = aApplication.details;
    var tooltip = details.App.Name + " " + details.App.Version;

    var menuitem = document.createElement("menuitem");
    menuitem.setAttribute("label", aApplication.bundle.path);
    menuitem.setAttribute("tooltiptext", tooltip);
    menuitem.setAttribute("crop", "start");
    menuitem.value = aApplication;

    var popup = document.getElementById("selectApplicationPopup");
    popup.insertBefore(menuitem, popup.childNodes[0]);
    this._applications.selectedItem = menuitem;
  },

  /**
   * Browse for an application to use for the test-run.
   */
  browseForApplication : function gMozmillCrowd_browseForApplication(event) {
    var application = null;

    var fp = Cc["@mozilla.org/filepicker;1"].
             createInstance(Ci.nsIFilePicker);
    fp.init(window, "Select a File", Ci.nsIFilePicker.modeOpen);
    if (fp.show() == Ci.nsIFilePicker.returnOK) {
      try {
        application = new Application.Application(fp.file);
        this.addApplicationToList(application);
      }
      catch (e) {
        window.alert(this._stringBundle.getFormattedString("exception.invalid_application",
                                                           [app.bundle.path]) +
                     " (" + e.message + ")");
      }
    }
  },

  /**
   * XXX: Stop a test-run before closing the dialog
   */
  closeDialog : function gMozmillCrowd_closeDialog() {
    return true;
  },

  /**
   * Opens the preferences dialog
   */
  openPreferences : function gMozmillCrowd_openPreferences(event) {
    Utils.gWindowWatcher.openWindow(null,
                                    "chrome://mozmill-crowd/content/preferences.xul",
                                    "",
                                    "chrome,dialog,modal",
                                    null);
  },

  checkAndSetup : function gMozmillCrowd_checkAndSetup() {
    var dirSrv = Utils.gDirService;
    var dir = dirSrv.get("ProfD", Ci.nsIFile);
    dir.append("crowd");

    this._storage = new Storage.Storage(dir);

    var path = this._storage.dir.clone();
    path.append("mozmill-automation");

    if (!path.exists()) {
      var repository = Utils.getPref("extensions.mozmill-crowd.repositories.mozmill-automation", "");
      this._storage.environment.run(["hg", "clone", repository, path.path]);
    }
  },

  startTestrun : function gMozmillCrowd_startTestrun(event) {
    this.checkAndSetup();

    while (gMozmillCrowd._output.getRowCount() != 0) {
      gMozmillCrowd._output.removeItemAt(0);
    }

    var testrun = this._testruns.selectedItem.value;
    var script = this._storage.dir.clone();
    script.append("mozmill-automation");
    script.append(testrun);

    var repository = Utils.getPref("extensions.mozmill-crowd.repositories.mozmill-tests", "");

    var args = ["python", script.path, "--repository=" + repository];

    // XXX: Bit hacky at the moment
    if (testrun == "testrun_addons.py") {
      var trust_unsecure = Utils.getPref("extensions.mozmill-crowd.trust_unsecure_addons", false);
      if (trust_unsecure)
        args = args.concat("--with-untrusted");
    }

    // Send results to brasstack
    var send_report = Utils.getPref("extensions.mozmill-crowd.report.send", false);
    var report_url = Utils.getPref("extensions.mozmill-crowd.report.server", "");
    if (send_report && report_url != "")
      args = args.concat("--report=" + report_url);

    // XXX: The automation scripts don't support the binary yet
    args = args.concat(this._applications.selectedItem.value.bundle.path);

    this._storage.environment.run(args);
  }
};
