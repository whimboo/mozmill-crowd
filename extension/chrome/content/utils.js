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
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/FileUtils.jsm");

const FOLDER_NAME = "crowd";
const ID = "mozmill-crowd@qa.mozilla.org"
const VERSION = "0.1pre";

const AVAILABLE_TEST_RUNS = [{
  name : "General Test-run", script: "testrun_general.py" }, {
  name : "Add-ons Test-run", script: "testrun_addons.py" }
];

// XXX: For now lets use constants. Has to be moved out to a web service which
// will return the latest package and the hash
const ENVIRONMENT_DATA = {
  Darwin : {
    url : "http://people.mozilla.com/~hskupin/mozmill-crowd/mozmill-mac.zip"
  },
  Linux : {
    url : "http://people.mozilla.com/~hskupin/mozmill-crowd/mozmill-linux.zip"
  },
  WINNT : {
    url : "http://people.mozilla.com/~hskupin/mozmill-crowd/mozmill-windows.zip"
  }
};

// Default folders
const DIR_TMP = "TmpD";

// Application specific information
var gAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
var gXulRuntime = gAppInfo.QueryInterface(Ci.nsIXULRuntime);

// Cached instances for accessing preferences
var gPrefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
var gPrefBranch = gPrefService.QueryInterface(Ci.nsIPrefBranch);


function Environment(aDir) {
  this._dirSrv = Cc["@mozilla.org/file/directory_service;1"].
                 getService(Ci.nsIProperties);

  this._dir = aDir || this.getDefaultDir();
}

Environment.prototype = {

  /**
   *
   */
  get dir() {
    return this._dir;
  },

  /**
   *
   */
  get isActive() {

  },

  /**
   *
   */
  download : function Environment_download() {
    var target = this.dir.clone();
    target.append("mozmill-env.zip");

    window.openDialog("chrome://mozmill-crowd/content/download.xul",
                      "Download",
                      "dialog, modal, centerscreen, titlebar=no",
                      ENVIRONMENT_DATA[gXulRuntime.OS].url,
                      target);
    this.extract(target, this.dir.clone());
  },

  /**
   *
   */
  execute: function Environment_execute(aScript, aParams) {
    // TODO: Has to be a non-blocking process
    var process = Cc["@mozilla.org/process/util;1"].
                  createInstance(Ci.nsIProcess);
    process.init(aScript);
    process.run(true, aParams, aParams.length);
  },

  /**
   *
   */
  getDefaultDir: function Environment_getDefaultDir() {
    var dir = this._dirSrv.get("ProfD", Ci.nsIFile);
    dir.append(FOLDER_NAME);

    return dir;
  },

  /**
   *
   */
  extract : function Environment_extract(aFile, aDir) {
    window.openDialog("chrome://mozmill-crowd/content/unpack.xul",
                      "Extract",
                      "dialog, modal, centerscreen, titlebar=no",
                      aFile,
                      aDir);
  },

  /**
   *
   */
  prepare: function Environment_prepare() {
    if (this.dir.exists())
      return;

    // If the environment hasn't been setup yet, download and install the package
    window.alert("Test Environment has to be downloaded.");

    var target = this.dir.clone();
    target.append("mozmill-env.zip");

    try {
      this.dir.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                      FileUtils.PERMS_DIRECTORY);

      this.download(target);
      this.extract(target, this.dir.clone());
      this.setup();
    }
    catch (e) {
      window.alert("Failure in setting up the test environment: " + e.message);
    }
  },

  /**
   *
   */
  run: function Environment_run(aScript, aApplication, aTestrun) {
    var script = null;

    if (aScript != "") {
      var script = this.dir.clone();
      script.append("mozmill-env");
      script.append(aScript);
    }
    else {
      throw new Error("No script specified.");
    }

    var testrun_script = this.dir.clone();
    testrun_script.append("mozmill-automation");
    testrun_script.append(aTestrun);

    var repository = getPref("extensions.mozmill-crowd.repositories.mozmill-tests", "");

    var args = ["python", testrun_script.path,
                "--repository=" + repository];

    /// XXX: Bit hacky at the moment
    if (aTestrun == "testrun_addons.py") {
      var trust_unsecure = getPref("extensions.mozmill-crowd.trust_unsecure_addons", false);
      if (trust_unsecure)
        args = args.concat("--with-untrusted");
    }

    // Send results to brasstack
    var send_report = getPref("extensions.mozmill-crowd.report.send", false);
    var report_url = getPref("extensions.mozmill-crowd.report.server", "");
    if (send_report && report_url != "")
      args = args.concat("--report=" + report_url);

    args = args.concat(aApplication.bundle)

    this.execute(script, args);
  },

  /**
   *
   */
  setup: function Environment_setup() {
    var path = this.dir.clone();
    path.append("mozmill-automation");

    if (!path.exists()) {
      var script = this.dir.clone();
      script.append("mozmill-env");
      script.append("setup.cmd");
      this.execute(script, [ ]);

      var repository = getPref("extensions.mozmill-crowd.repositories.mozmill-automation", "");

      script = this.dir.clone();
      script.append("mozmill-env");
      script.append("run.cmd");

      this.execute(script, ["hg", "clone", repository, path.path]);
    }
  },

  /**
   *
   */
  stop : function Environment_stop() {
  }
}

/**
 * Retrieve the value of an individual preference.
 *
 * @param {string} prefName
 *        The preference to get the value of.
 * @param {boolean/number/string} defaultValue
 *        The default value if preference cannot be found.
 * @param {boolean/number/string} defaultBranch
 *        If true the value will be read from the default branch (optional)
 * @param {string} interfaceType
 *        Interface to use for the complex value (optional)
 *        (nsILocalFile, nsISupportsString, nsIPrefLocalizedString)
 *
 * @return The value of the requested preference
 * @type boolean/int/string/complex
 */
function getPref(prefName, defaultValue, defaultBranch, interfaceType) {
  try {
    branch = defaultBranch ? gPrefService.getDefaultBranch("") : gPrefBranch;

    // If interfaceType has been set, handle it differently
    if (interfaceType != undefined) {
      return branch.getComplexValue(prefName, interfaceType);
    }

    switch (typeof defaultValue) {
      case ('boolean'):
        return branch.getBoolPref(prefName);
      case ('string'):
        return branch.getCharPref(prefName);
      case ('number'):
        return branch.getIntPref(prefName);
      default:
        return undefined;
    }
  } catch(e) {
    return defaultValue;
  }
}

/**
 * Set the value of an individual preference.
 *
 * @param {string} prefName
 *        The preference to set the value of.
 * @param {boolean/number/string/complex} value
 *        The value to set the preference to.
 * @param {string} interfaceType
 *        Interface to use for the complex value
 *        (nsILocalFile, nsISupportsString, nsIPrefLocalizedString)
 *
 * @return Returns if the value was successfully set.
 * @type boolean
 */
function setPref(prefName, value, interfaceType) {
  try {
    switch (typeof value) {
      case ('boolean'):
        gPrefBranch.setBoolPref(prefName, value);
        break;
      case ('string'):
        gPrefBranch.setCharPref(prefName, value);
        break;
      case ('number'):
        gPrefBranch.setIntPref(prefName, value);
        break;
      default:
        gPrefBranch.setComplexValue(prefName, interfaceType, value);
    }
  } catch(e) {
    return false;
  }

  return true;
}
