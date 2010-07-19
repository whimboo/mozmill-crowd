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

// Chrome URL of the extension
const CHROME_URL = "chrome://mozmill-crowd/content/";

const ENVIRONMENT_PATH = "mozmill-crowd";
const ENVIRONMENT_INTERPRETER = "/bin/bash"
const ENVIRONMENT_WRAPPER = "start.sh";

// Executable files for Firefox
const EXECUTABLES = {
    "Darwin" : "firefox-bin",
    "Linux" : "firefox-bin",
    "WINNT" : "firefox.exe"
};

const AVAILABLE_TEST_RUNS = [
  {name : "BFT Test-run", script: "testrun_bft.py"},
  {name : "Add-ons Test-run", script: "testrun_addons.py"},
];


const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const CLASS_APP_INFO = Cc["@mozilla.org/xre/app-info;1"];
const CLASS_DIRECTORY_SERVICE = Cc["@mozilla.org/file/directory_service;1"];
const CLASS_LOCAL_FILE = Cc["@mozilla.org/file/local;1"];
const CLASS_PREF_SERVICE = Cc["@mozilla.org/preferences-service;1"];
const CLASS_PROCESS = Cc["@mozilla.org/process/util;1"];
const CLASS_SCRIPTABLE_INPUT_STREAM = Cc["@mozilla.org/scriptableinputstream;1"];
const CLASS_THREAD_MANAGER = Cc["@mozilla.org/thread-manager;1"];
const CLASS_WINDOW_WATCHER = Cc["@mozilla.org/embedcomp/window-watcher;1"];

const CLASS_IPC_SERVICE = Cc["@mozilla.org/process/ipc-service;1"];
const CLASS_IPC_TRANSPORT = Cc["@mozilla.org/process/pipe-transport;1"];
const CLASS_PROCESS_INFO = Cc["@mozilla.org/xpcom/process-info;1"];

const FACTORY_INI_PARSER = Cc["@mozilla.org/xpcom/ini-processor-factory;1"];

// Default folders
const DIR_APPLICATION = "CurProcD";
const DIR_PROFILE = "ProfD";
const DIR_TMP = "TmpD";

// Application specific information
var gAppInfo = CLASS_APP_INFO.getService(Ci.nsIXULAppInfo);
var gXulRuntime = gAppInfo.QueryInterface(Ci.nsIXULRuntime);

// Cached instances for accessing preferences
var gPrefService = CLASS_PREF_SERVICE.getService(Ci.nsIPrefService);
var gPrefBranch = gPrefService.QueryInterface(Ci.nsIPrefBranch);
var gWindowWatcher = CLASS_WINDOW_WATCHER.getService(Ci.nsIWindowWatcher);

var ipcService = CLASS_IPC_SERVICE.getService(Ci.nsIIPCService);
var processInfo = CLASS_PROCESS_INFO.getService(Ci.nsIProcessInfo);


/**
 * Executes the specified test-run with the given application
 */
function mcuExecuteTestrun(aAppPath, aScriptName, aListener) {
  // Get a handle of the bash interpreter
  var cmd = CLASS_LOCAL_FILE.createInstance(Ci.nsILocalFile);
  cmd.initWithPath(ENVIRONMENT_INTERPRETER);

  var env = mcuGetTestEnvironmentPath();

  // Wrapper script to start virtual environment and execute the test-run
  var wrapper_script = env.clone();
  wrapper_script.append(ENVIRONMENT_WRAPPER);

  // Selected test-run script from the mozmill-automation repository
  var testrun_script = env.clone();
  testrun_script.append("mozmill-automation");
  testrun_script.append(aScriptName);

  var args = [
    wrapper_script.path,
    env.path,
    testrun_script.path
  ];

  /// XXX: Bit hacky at the moment
  if (aScriptName == "testrun_addons.py") {
    var trust_unsecure = getPref("extensions.mozmill-crowd.trust_unsecure_addons", false);
    if (trust_unsecure)
      args = args.concat("--with-untrusted");
  }

  // Send results to brasstack
  var send_report = getPref("extensions.mozmill-crowd.report.send", false);
  var report_url = getPref("extensions.mozmill-crowd.report.server", "");
  if (send_report && report_url != "")
    args = args.concat("--report=" + report_url);

  // Add binary
  args = args.concat(mcuGetAppBundle(aAppPath));

  var pipeTrans = CLASS_IPC_TRANSPORT.createInstance(Ci.nsIPipeTransport);
  pipeTrans.init(cmd, args, args.length, [], 0, 0, "", true, true, null);
  pipeTrans.loggingEnabled = true;
  
  pipeTrans.asyncRead(aListener, null, 0, -1, 0);

  return pipeTrans;

  //var process = CLASS_PROCESS.createInstance(Ci.nsIProcess);
  //process.init(cmd);
  //process.run(false, args, args.length);
}

/**
 * Get the application bundle path on OS X
 *
 * @param string aPath
 *        Path to the application folder
 *
 * @returns Path to the application bundle
 */
function mcuGetAppBundle(aPath) {
  if (gXulRuntime.OS == "Darwin") {
    return /(.*\.app).*/.exec(aPath)[1];
  } else {
    return aPath;
  }
}

/**
 * Retrieve application details from the application.ini file
 *
 * @param string aPath
 *        Path to the application executable
 *
 * @returns Object with the information
 */
function mcuGetAppDetails(aPath) {
  // Get a reference to the application.ini file
  var iniFile = CLASS_LOCAL_FILE.createInstance(Ci.nsILocalFile);
  iniFile.initWithPath(aPath);
  iniFile = iniFile.parent;
  iniFile.append("application.ini");
  iniFile.isFile();

  // Parse the ini file to retrieve all values
  var parser = FACTORY_INI_PARSER.getService(Ci.nsIINIParserFactory).
               createINIParser(iniFile);

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
}

/**
 * Get the path of the currently running application
 *
 * @returns Path of the application
 */
function mcuGetCurAppPath() {
  var dir = CLASS_DIRECTORY_SERVICE.
            getService(Ci.nsIProperties).get(DIR_APPLICATION, Ci.nsIFile);
  dir.append(EXECUTABLES[gXulRuntime.OS]);

  return dir.path;
}

/**
 * Retrieve the location of test-run environment from within the users profile
 *
 * @returns The environment path as nsILocalFile instance
 */
function mcuGetTestEnvironmentPath() {
  var dir = CLASS_DIRECTORY_SERVICE.
            getService(Ci.nsIProperties).get(DIR_PROFILE, Ci.nsIFile);
  dir.append(ENVIRONMENT_PATH);

  return dir;
}

/**
 *
 */
function mcuPrepareTestrunEnvironment() {
  // Check if the test-run environment exists
  var envTestrun = mcuGetTestEnvironmentPath();
  if (!envTestrun.exists()) {
    alert("Test environment doesn't exist yet.")
    return false;
  }

  return true;
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

var outputProcessThread = function(threadID, result) {
  this.threadID = threadID;
  this.result = result;
};

outputProcessThread.prototype = {
  run: function() {
    try {
      Components.reportError(this.result.type);
      debugger;
      switch (this.result.type) {
        case "string":
          var listbox = gMozmillCrowd._output;
          listbox.appendItem(this.result.content, null);
          listbox.ensureIndexIsVisible(listbox.itemCount - 1);
          break;
        case "end":
          gMozmillCrowd._applications.disabled = false;
          gMozmillCrowd._testruns.disabled = false;
          gMozmillCrowd._execButton.label = this._stringBundle.getString("startTestrun.label");

          break;
        default:
      }
    } catch(err) {
      Components.utils.reportError(err);
    }
  },
  
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};
