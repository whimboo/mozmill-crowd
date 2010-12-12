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


const FOLDER_NAME = "crowd";
const ID = "mozmill-crowd@qa.mozilla.org"
const VERSION = "0.1pre";

// Executable files for Firefox
const EXECUTABLES = {
    "Darwin" : "firefox-bin",
    "Linux" : "firefox-bin",
    "WINNT" : "firefox.exe"
};

const AVAILABLE_TEST_RUNS = [{
  name : "General Test-run", script: "testrun_general.py" }, {
  name : "Add-ons Test-run", script: "testrun_addons.py" }
];

// XXX: For now lets use constants. Has to be moved out to a web service which
// will return the latest package and the hash
const ENVIRONMENT_DATA = {
  Darwin : {
    url : "n/a",
    filename : "n/a"
  },
  Linux : {
    url : "n/a",
    filename : "n/a"
  },
  WINNT : {
    url : "http://people.mozilla.com/~hskupin/mozmill-crowd/mozmill-win.exe",
    filename : "mozmill-win.exe"
  }
};

const DIRECTORY_SERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const INI_PARSER_CONTRACTID = "@mozilla.org/xpcom/ini-processor-factory;1";

// Default folders
const DIR_TMP = "TmpD";

// Application specific information
var gAppInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
var gXulRuntime = gAppInfo.QueryInterface(Ci.nsIXULRuntime);

// Cached instances for accessing preferences
var gPrefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
var gPrefBranch = gPrefService.QueryInterface(Ci.nsIPrefBranch);


/**
 *
 */
function Application(aPath) {
  this._dirSrv = Cc[DIRECTORY_SERVICE_CONTRACTID].
                 getService(Ci.nsIProperties);

  this._path = aPath || this.currentAppPath();
}

Application.prototype = {

  /**
   * Get the application bundle path on OS X
   *
   * @param string aPath
   *        Path to the application folder
   *
   * @returns Path to the application bundle
   */
  get bundle() {
    if (gXulRuntime.OS == "Darwin") {
      return /(.*\.app).*/.exec(this._path)[1];
    } else {
      return this._path;
    }
  },

  /**
   * Retrieve application details from the application.ini file
   *
   * @param string aPath
   *        Path to the application executable
   *
   * @returns Object with the information
   */
  get details() {
    // Get a reference to the application.ini file
    var iniFile = Cc[LOCAL_FILE_CONTRACTID].
                  createInstance(Ci.nsILocalFile);
    iniFile.initWithPath(this._path);
    iniFile = iniFile.parent;
    iniFile.append("application.ini");
    iniFile.isFile();

    // Parse the ini file to retrieve all values
    var factory = Cc[INI_PARSER_CONTRACTID].
                  getService(Ci.nsIINIParserFactory);
    var parser = factory.createINIParser(iniFile);

    var contents = { };
    var sectionsEnum = parser.getSections();
    while (sectionsEnum && sectionsEnum.hasMore()) {
      var section = sectionsEnum.getNext();
      var keys = { };

      var keysEnum = parser.getKeys(section);
      while (keysEnum && keysEnum.hasMore()) {
        var key = keysEnum.getNext();

        keys[key] = parser.getString(section, key);
      }

      contents[section] = keys;
    }

    return contents;
  },

  get path() {
    return this._path;
  },

  /**
   * Get the path of the currently running application
   *
   * @returns Path of the application
   */
  currentAppPath: function Application_currentAppPath() {
    var dir = this._dirSrv.get("CurProcD", Ci.nsIFile);
    dir.append(EXECUTABLES[gXulRuntime.OS]);

    return dir.path;
  }
}


function Environment(aDir) {
  this._dirSrv = Cc[DIRECTORY_SERVICE_CONTRACTID].
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
    return (this._process != null);
  },

  /**
   *
   */
  download : function Environment_download() {
    var target = this.dir.clone();
    target.append(ENVIRONMENT_DATA[gXulRuntime.OS].filename);

    window.openDialog("chrome://mozmill-crowd/content/download.xul",
                      "Download",
                      "dialog, modal, centerscreen, titlebar=no",
                      ENVIRONMENT_DATA[gXulRuntime.OS].url,
                      target);
  },

  /**
   *
   */
  execute: function Environment_execute(aScript, aApplication, aTestrun) {
    var script = null;
    var process = null;

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

    // TODO: Has to be a non-blocking process
    process = Cc["@mozilla.org/process/util;1"].
              createInstance(Ci.nsIProcess);
    process.init(script);
    process.run(true, args, args.length);
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
  install : function Environment_install() {
    var process = null;

    var archive = this.dir.clone();
    archive.append(ENVIRONMENT_DATA[gXulRuntime.OS].filename);

    if (archive.exists()) {
      process = Cc["@mozilla.org/process/util;1"].
                createInstance(Ci.nsIProcess);
      process.init(archive);
      process.run(true, ["-y"], 1);
    }
  },

  /**
   *
   */
  prepare: function Environment_prepare() {
    if (this.dir.exists())
      return;

    // If the environment hasn't been setup yet, download and install the package
    window.alert("Test Environment has to be downloaded.");
    //this.dir.create(0x01, 0755);
    this.download();
    this.install();
  },

  /**
   *
   */
  stop : function Environment_stop() {
    if (this.isActive) {
      this._process.kill();
    }
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
