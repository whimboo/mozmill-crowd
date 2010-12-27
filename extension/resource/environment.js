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

var EXPORTED_SYMBOLS = [
  "Environment"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/FileUtils.jsm");

var utils = { }; Cu.import('resource://mozmill-crowd/utils.js', utils);


// XXX: Can be removed once the download of the environment is handled
// outside of the Environment class
var gAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
var gXulRuntime = gAppInfo.QueryInterface(Ci.nsIXULRuntime);

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

// XXX: Has to be handled outside of the environment module
const FOLDER_NAME = "crowd";

/**
 * XXX: remove window parameter once preparation is handled outside
 */
function Environment(aWindow, aDir) {
  this._dirSrv = utils.gDirService;

  this.window = aWindow;
  this._dir = aDir || this.getDefaultDir();

  this._readConfigFile();
}

Environment.prototype = {
  /**
   *
   */
  _scripts : null,

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
  _readConfigFile : function Environment__readConfigFile() {
    var iniFile = this.dir.clone();
    iniFile.append("mozmill-env");
    iniFile.append("config");
    iniFile.append("mozmill-crowd.ini");

    var contents = utils.readIniFile(iniFile);
    this._scripts = contents.scripts;
  },

  /**
   *
   */
  download : function Environment_download() {
    var target = this.dir.clone();
    target.append("mozmill-env.zip");

    this.window.openDialog("chrome://mozmill-crowd/content/download.xul",
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
    this.window.openDialog("chrome://mozmill-crowd/content/unpack.xul",
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
    this.window.alert("Test Environment has to be downloaded.");

    var target = this.dir.clone();
    target.append("mozmill-env.zip");

    try {
      this.dir.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                      FileUtils.PERMS_DIRECTORY);

      this.download(target);
      this.extract(target, this.dir.clone());

      // XXX: Should only be part of the constructor, once the env setup is handled
      // outside of the Environment
      this._readConfigFile();

      this.setup();
    }
    catch (e) {
      this.window.alert("Failure in setting up the test environment: " + e.message);
    }
  },

  /**
   *
   */
  run: function Environment_run(aApplication, aTestrun) {
    var testrun_script = this.dir.clone();
    testrun_script.append("mozmill-automation");
    testrun_script.append(aTestrun);

    var repository = utils.getPref("extensions.mozmill-crowd.repositories.mozmill-tests", "");

    var args = ["python", testrun_script.path, "--repository=" + repository];

    /// XXX: Bit hacky at the moment
    if (aTestrun == "testrun_addons.py") {
      var trust_unsecure = utils.getPref("extensions.mozmill-crowd.trust_unsecure_addons", false);
      if (trust_unsecure)
        args = args.concat("--with-untrusted");
    }

    // Send results to brasstack
    var send_report = utils.getPref("extensions.mozmill-crowd.report.send", false);
    var report_url = utils.getPref("extensions.mozmill-crowd.report.server", "");
    if (send_report && report_url != "")
      args = args.concat("--report=" + report_url);

    args = args.concat(aApplication.bundle)

    var script = this.dir.clone();
    script.append("mozmill-env");
    script.append(this._scripts.run);

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
      script.append(this._scripts.setup);
      this.execute(script, [ ]);

      var repository = utils.getPref("extensions.mozmill-crowd.repositories.mozmill-automation", "");

      script = this.dir.clone();
      script.append("mozmill-env");
      script.append(this._scripts.run);

      this.execute(script, ["hg", "clone", repository, path.path]);
    }
  },

  /**
   *
   */
  stop : function Environment_stop() {
  }
}
