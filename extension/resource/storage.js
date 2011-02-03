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
  "Storage", "StorageStates"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// Import global JS modules
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// Import local JS modules
Cu.import('resource://mozmill-crowd/environment.js');
Cu.import('resource://mozmill-crowd/utils.js');

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

const ENVIRONMENT_PACKAGE = "mozmill-env.zip";
const STATUS_FILENAME     = ".status";

var StorageStates = {
  STATE_UNKNOWN         : "unkown",
  STATE_FAILURE         : "failure",
  STATE_DOWNLOADING     : "downloading",
  STATE_EXTRACTING      : "extracting",
  STATE_INITIALIZE      : "initialize",
  STATE_INITIALIZING    : "initializing",
  STATE_SETUP_REPO      : "setup repository",
  STATE_SETTING_UP_REPO : "seting up repository",
  STATE_UPDATE_PENDING  : "pending update",
  STATE_READY           : "ready"
};


/**
 *
 * @param {nsIFile} aDir
 *        Directory, which is used to store all extension related files
 */
function Storage(aDir) {
  // Check if the storage exists, otherwise create it
  this._dir = aDir;
  if (!this.dir.exists) {
    this.dir.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                    FileUtils.PERMS_DIRECTORY);
  }

  this._status = this.readStatusFromFile();
}

Storage.prototype = {

  /**
   *
   */
  _dir : null,

  /**
   *
   */
  _environment : null,

  /**
   *
   */
  _status : null,

  /**
   *
   */
  get dir() {
    return this._dir;
  },

  /**
   *
   */
  get environmentPath() {
    var dir = this.dir.clone();
    dir.append("mozmill-env");

    return dir;
  },

  /**
   *
   */
  get exists() {
    return this.dir.exists();
  },

  /**
   *
   */
  get screenshotPath() {
    var path = this.dir.clone();
    path.append("screenshots");

    return path;
  },

  /**
   *
   */
  get status() {
    return this._status;
  },

  /**
   *
   */
  set status(aStatus) {
    this._status = aStatus;

    this.writeStatusToFile(this._status);
  },

  /**
   *
   */
  _createEnvironment : function Storage_createEnvironment() {
    if (!this._environment)
      this._environment = new Environment(this.environmentPath);
  },

  /**
   *
   */
  execute : function Storage_execute(aParams) {
    if (this.status == StorageStates.STATE_READY) {
      this._environment.run(aParams);
    }
    else {
      throw new Error("Environment hasn't been fully setup yet");
    }
  },

  /**
   *
   */
  handleStatus : function Storage_handleStatus() {
    switch (this.status) {
      // Environment hasn't been downloaded yet
      case StorageStates.STATE_UNKNOWN:
      case StorageStates.STATE_DOWNLOADING:
        try {
          var envPackage = this.dir.clone();
          envPackage.append(ENVIRONMENT_PACKAGE);
      
          var window = Services.wm.getMostRecentWindow("MozMill:Crowd");
          window.openDialog("chrome://mozmill-crowd/content/download.xul",
                            "Download",
                            "dialog, modal, centerscreen, titlebar=no",
                            ENVIRONMENT_DATA[Services.appinfo.OS].url,
                            envPackage);

          this.status = StorageStates.STATE_EXTRACTING;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.STATE_FAILURE;
        }

      // Extract downloaded environment
      case StorageStates.STATE_EXTRACTING:
        try {
          var envPackage = this.dir.clone();
          envPackage.append(ENVIRONMENT_PACKAGE);

          var window = Services.wm.getMostRecentWindow("MozMill:Crowd");
          window.openDialog("chrome://mozmill-crowd/content/unpack.xul",
                            "Extract",
                            "dialog, modal, centerscreen, titlebar=no",
                            envPackage,
                            this.dir.clone());

          this.status = StorageStates.STATE_INITIALIZE;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.STATE_DOWNLOADING;
        }

      // Initialize environment
      case StorageStates.STATE_INITIALIZE:
        try {
          this._createEnvironment();
          this._environment.setup();

          this.status = StorageStates.STATE_INITIALIZING;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.STATE_FAILURE;
        }

      // Initialize environment
      case StorageStates.STATE_INITIALIZING:
        try {
          this._createEnvironment();
          if (!this._environment.isRunning)
            this.status = StorageStates.STATE_SETUP_REPO;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.STATE_FAILURE;
        }

      // Clone the mozmill automation repository
      case StorageStates.STATE_SETUP_REPO:
        try {
          this._createEnvironment();

          var path = this.dir.clone();
          path.append("mozmill-automation");
  
          // Until we have a reliable way to pull from the repository we will clone
          // it again for now.
          if (path.exists())
            path.remove(true);
      
          var repository = Utils.getPref("extensions.mozmill-crowd.repositories.mozmill-automation", "");
          this._environment.run(["hg", "clone", repository, path.path]);
  
            this.status = StorageStates.STATE_SETTING_UP_REPO;
            break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.STATE_FAILURE;
        }

      // Wait while repository is cloned
      case StorageStates.STATE_SETTING_UP_REPO:
        try {
          this._createEnvironment();
          if (!this._environment.isRunning)
            this.status = StorageStates.STATE_READY;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.FAILURE;
        }

      // Ready state
      case StorageStates.STATE_READY:
        this._createEnvironment();

        try {
          
          if (!this._environment.isRunning)
            this.status = StorageStates.STATE_READY;
          break;
        }
        catch (ex) {
          Cu.reportError(ex);
          this.status = StorageStates.FAILURE;
        }
    }
  },

  /**
   * Read the '.status' file to retrieve the latest state of the storage
   */
  readStatusFromFile : function Storage_readStatusFromFile() {
    var status = StorageStates.STATE_UNKNOWN;

    try {
      var file = this._dir.clone();
      file.append(STATUS_FILENAME);

      var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                    createInstance(Ci.nsIFileInputStream);
      var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                    createInstance(Ci.nsIConverterInputStream);
      fstream.init(file, -1, 0, 0);
      cstream.init(fstream, "UTF-8", 0, 0);

      var str = { };
      cstream.readString(0xffffffff, str);
      cstream.close();

      // Check for validity of the read-in state
      var value = str.value.trim();
      for (var prop in StorageStates) {
        if (StorageStates[prop] === value) {
          status = value;
          break;
        }
      }
    }
    catch (ex) {
    }
    
    return status;
  },

  /**
   *
   */
  writeStatusToFile : function Storage_writeStatusToFile(aStatus) {
    try {
      var file = this._dir.clone();
      file.append(STATUS_FILENAME);

      var fstream = Cc["@mozilla.org/network/file-output-stream;1"].
                    createInstance(Ci.nsIFileOutputStream);
      fstream.init(file, 0x02 | 0x08 | 0x20, -1, 0);
      fstream.write(aStatus, aStatus.length);
      fstream.close();
    }
    catch (ex) {
      Cu.reportError(ex);
    }
  }
};
