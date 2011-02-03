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

var EXPORTED_SYMBOLS = [
  "Environment", "EnvObserverTopics"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// Import global JS modules
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// Import local JS modules
Cu.import('resource://mozmill-crowd/utils.js');


var EnvObserverTopics = {
  PROCESS_STARTED: "mozmill-crowd-process-started",
  PROCESS_STOPPED: "mozmill-crowd-process-finished"
}

/**
 *
 */
function Environment(aDir) {
  this._dir = aDir;

  this._readConfigFile();
}

Environment.prototype = {
  /**
   * 
   */
  _lastCommand : null,

  /**
   * 
   */
  _lastParams : null,

  /**
   * 
   */
  _process : null,

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
  get exitValue() {
    return this._process ? this._process.exitValue : -1;
  },

  /**
   *
   */
  get isRunning() {
    return (this._process && this._process.isRunning);
  },

  /**
   *
   */
  _execute: function Environment__execute(aCommand, aParams) {
    try {
      // Do not execute another process while another one is currently running
      if (this.isRunning) {
        throw new Error("Another process is still running: " + this._lastCommand.path);
      }

      this._process = Cc["@mozilla.org/process/util;1"].
                      createInstance(Ci.nsIProcess);
      this._process.init(aCommand);
      this._process.runwAsync(aParams, aParams.length,
                              new ProcessObserver(this));

      this._lastCommand = aCommand;
      this._lastParams = aParams;

      Services.obs.notifyObservers(null, EnvObserverTopics.PROCESS_STARTED, null);
    }
    catch (ex) {
      this._process = null;

      Cu.reportError(ex);
      throw new Error("Failed to execute: '" + aCommand.path);
    }
  },

  /**
   *
   */
  _readConfigFile : function Environment__readConfigFile() {
    var iniFile = this.dir.clone();
    iniFile.append("config");
    iniFile.append("mozmill-crowd.ini");

    var contents = Utils.readIniFile(iniFile);
    this._scripts = contents.scripts;
  },

  /**
   * Runs the specified command with the given parameters
   */
  run: function Environment_run(aParams) {
    var script = this.dir.clone();
    script.append(this._scripts.run);

    this._execute(script, aParams);
  },

  /**
   * Runs the setup routine of the test environment. It has to be called
   * when the folder gets moved or updates for tools have to be installed
   */
  setup: function Environment_setup() {
    var script = this.dir.clone();
    script.append(this._scripts.setup);

    this._execute(script, [ ]);
  },

  /**
   *
   */
  stop : function Environment_stop() {
    if (this._process)
      this._process.kill();
  }
};


/**
 * @class Observer used to handle nsIProcess notifications
 * @constructor
 */
function ProcessObserver() {
}

ProcessObserver.prototype = {
  /**
   * Observe the process for notifications and forward
   *
   * @param {object} aSubject Instance of the nsIProcess
   * @param {string} aTopic Notification topic (process-finished, process-failed)
   * @param {string} aData Not used.
   */
  observe : function ProcessObserver_observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "process-finished":
      case "process-failed":
        Services.obs.notifyObservers(null, EnvObserverTopics.PROCESS_STOPPED, null);
    }
  }
};
