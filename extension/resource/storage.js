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
  "Storage"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// Import global JS modules
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");


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

// States of the storage folder
const STATUS_NOT_INITIALIZED = "not initialized";
const STATUS_ENV_DOWNLOAD = "download";
const STATUS_ENV_SETUP = "setup";
const STATUS_READY = "ready";

const STORAGE_STATES = [
  STATUS_NOT_INITIALIZED,
  STATUS_ENV_DOWNLOAD,
  STATUS_ENV_SETUP,
  STATUS_READY
];


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

  this.readStatusFile();
}

Storage.prototype = {

  /**
   *
   */
  _dir : null,

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
  downloadEnvironment : function Storage_downloadEnvironment() {
    var envPackage = this.dir.clone();
    envPackage.append(ENVIRONMENT_PACKAGE);

    var window = Services.wm.getMostRecentWindow("MozMill:Crowd");
    window.openDialog("chrome://mozmill-crowd/content/download.xul",
                      "Download",
                      "dialog, modal, centerscreen, titlebar=no",
                      ENVIRONMENT_DATA[Services.appinfo.OS].url,
                      envPackage);
  },

  /**
   *
   */
  extractEnvironment : function Storage_extractEnvironment() {
    var envPackage = this.dir.clone();
    envPackage.append(ENVIRONMENT_PACKAGE);

    var window = Services.wm.getMostRecentWindow("MozMill:Crowd");
    window.openDialog("chrome://mozmill-crowd/content/unpack.xul",
                      "Extract",
                      "dialog, modal, centerscreen, titlebar=no",
                      envPackage,
                      this.dir.clone());
  },

  /**
   * Read the '.status' file to retrieve the latest state of the storage
   */
  readStatusFile : function Storage_readStatusFile() {
    this._status = STATUS_NOT_INITIALIZED;

    try {
      var file = this._dir.clone();
      file.append(".status");

      var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                    createInstance(Ci.nsIFileInputStream);
      var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                    createInstance(Ci.nsIConverterInputStream);
      fstream.init(file, -1, 0, 0);
      cstream.init(fstream, "UTF-8", 0, 0);

      var str = { };
      cstream.readString(0xffffffff, str);
      cstream.close();

      var value = str.value.trim();
      if (STORAGE_STATES.indexOf(value) != - 1)
        this._status = value;
    }
    catch (ex) {
    }
  }
};
