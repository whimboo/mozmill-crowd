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
 *   Henrik Skupin <hskupin@mozilla.com> (Original Author)
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

// Import global JS modules
Cu.import("resource://gre/modules/Services.jsm");

// Import local JS modules
Cu.import('resource://mozmill-crowd/application.js');
Cu.import('resource://mozmill-crowd/environment.js');
Cu.import('resource://mozmill-crowd/storage.js');
Cu.import('resource://mozmill-crowd/utils.js');

const AVAILABLE_TEST_RUNS = [{
  name : "General Test-run", script: "testrun_general.py" }, {
  name : "L10n Test-run", script: "testrun_l10n.py" }, {
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
    this.addApplicationToList(new Application());

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

    // XXX: need to unregister on unload of the window
    this._observer = new EnvironmentObserver();

    var dir = this.getStorageLocation();
    this._storage = new Storage(dir);
    this._environment = new Environment(this._storage);
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
        application = new Application(fp.file);
        this.addApplicationToList(application);
      }
      catch (e) {
        window.alert(this._stringBundle.getFormattedString("application.invalid",
                                                           [app.bundle.path]) +
                     " (" + e.message + ")");
      }
    }
  },

  checkAndSetup : function gMozmillCrowd_checkAndSetup() {
    // XXX: To be removed before landing
    return;

    var path = this._storage.dir.clone();
    path.append("mozmill-automation");

    // Until we have a reliable way to pull from the repository we will clone
    // it again for now.
    if (path.exists())
      path.remove(true);

    var repository = Utils.getPref("extensions.mozmill-crowd.repositories.mozmill-automation", "");
    this._storage.environment.run(["hg", "clone", repository, path.path]);
 },

  /**
   * XXX: Stop a test-run before closing the dialog
   */
  closeDialog : function gMozmillCrowd_closeDialog() {
    return true;
  },

  /**
   *
   */
  getStorageLocation : function gMozmillCrowd_getStorageLocation() {
    // Get the location of the storage folder
    var dir = Utils.getPref("extensions.mozmill-crowd.storage", null, false,
                            Ci.nsILocalFile);

    // If the preference hasn't been set yet, the user has to select a folder
    // Note: We do not allow spaces in the path due to issues with virtualenv
    //       (See https://bugzilla.mozilla.org/show_bug.cgi?id=623224)
    if (!dir) {
      window.alert(this._stringBundle.getString("storage.path_not_found"));
    } else if (dir.path.search(/ /) != -1) {
      window.alert(this._stringBundle.getString("storage.path_has_space"));
    }

    if (!dir || (dir.path.search(/ /) != -1)) {
      var fp = Cc["@mozilla.org/filepicker;1"].
               createInstance(Ci.nsIFilePicker);
      fp.init(window, "Select a Folder", Ci.nsIFilePicker.modeGetFolder);

      do {
        if (fp.show() !== Ci.nsIFilePicker.returnOK) {
          throw new Error(this._stringBundle.getString("execution.user_abort"));
        }

        var containsSpace = fp.file.path.search(/ /) != -1;
        if (containsSpace) {
          window.alert(this._stringBundle.getString("storage.path_has_space"));
        }
      } while (containsSpace);

      Utils.setPref("extensions.mozmill-crowd.storage", fp.file, Ci.nsILocalFile);
      return fp.file;
    } else {
      return dir;
    }
  },

  /**
   *
   */
  loadLogFile : function gMozmillCrowd_loadLogFile(aLogFile) {
    try {
      var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                    createInstance(Ci.nsIFileInputStream);
      var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                    createInstance(Ci.nsIConverterInputStream);
      fstream.init(aLogFile, -1, 0, 0);
      cstream.init(fstream, "UTF-8", 0, 0);

      gMozmillCrowd._output.value = "";
      var read = 0;
      var str = { };
      do {
        read = cstream.readString(0xffffffff, str);
        gMozmillCrowd._output.value += str.value;
      } while (read != 0);

      cstream.close();
    }
    catch (e) {
      window.alert(e.message);
    }
  },

  /**
   * Opens the preferences dialog
   */
  openPreferences : function gMozmillCrowd_openPreferences(event) {
    Services.ww.openWindow(null,
                           "chrome://mozmill-crowd/content/preferences.xul",
                           "",
                           "chrome,dialog,modal",
                           null);
  },

  startTestrun : function gMozmillCrowd_startTestrun(event) {
    var chromeTimeoutPref = 'dom.max_chrome_script_run_time';
    var chromeTimeoutValue = 20;

    try {
      // Disable the slow script warning for chrome scripts
      // XXX: Can be removed when we have non-blocking process calls
      chromeTimeoutValue = Utils.getPref(chromeTimeoutPref, chromeTimeoutValue);
      Utils.setPref(chromeTimeoutPref, -1);

      this.checkAndSetup();

      var testrun = this._testruns.selectedItem.value;
      var script = this._storage.dir.clone();
      script.append("mozmill-automation");
      script.append(testrun);

      var repository = Utils.getPref("extensions.mozmill-crowd.repositories.mozmill-tests", "");

      // Create a log which can be shown in the output window after the test-run
      // has been completed
      var logfile = this._storage.dir.clone();
      logfile.append("testrun.log");

      var args = ["python", script.path,
                  "--repository=" + repository,
                  "--logfile=" + logfile.path,
                  "--screenshot-path=" + this._storage.screenshotPath.path];

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

      this._environment.run(args);
      //this.loadLogFile(logfile);
    }
    catch (e) {
      window.alert(e.message);
    }
    finally {
      // Restore the original timeout for chrome scripts
      Utils.setPref(chromeTimeoutPref, chromeTimeoutValue);
    }
  }
};


/**
 * @class Observer used to handle nsIProcess notifications
 * @constructor
 */
function EnvironmentObserver() {
  this.register();
}

EnvironmentObserver.prototype = {
  /**
   * Observe the process for an exit notification
   *
   * @param {object} aSubject Instance of the Environment class
   * @param {string} aTopic Notification topic (process-finished, process-failed)
   * @param {string} aData Not used.
   */
  observe : function ProcessObserver_observe(aSubject, aTopic, aData) {
    Cu.reportError(aTopic + " " + gMozmillCrowd._environment._command.path +
                   " " + gMozmillCrowd._environment._process.exitValue);
    switch (aTopic) {
      case ENV_OBSERVER_TOPICS.PROCESS_STARTED_TOPIC:
        gMozmillCrowd._execButton.setAttribute('disabled', 'true');
        break;
      case ENV_OBSERVER_TOPICS.PROCESS_STOPPED_TOPIC:
        gMozmillCrowd._execButton.setAttribute('disabled', 'false');
        break;
    }
    
  },

  register : function() {
    Services.obs.addObserver(this,
                             ENV_OBSERVER_TOPICS.PROCESS_STARTED_TOPIC,
                             false);
    Services.obs.addObserver(this,
                             ENV_OBSERVER_TOPICS.PROCESS_STOPPED_TOPIC,
                             false);
  },

  unregister: function() {
    Services.obs.removeObserver(this, ENV_OBSERVER_TOPICS.PROCESS_STARTED_TOPIC);
    Services.obs.removeObserver(this, ENV_OBSERVER_TOPICS.PROCESS_STOPPED_TOPIC);
  }
};
