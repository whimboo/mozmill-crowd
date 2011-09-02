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
 * The Original Code is Mozmill Crowd code.
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

Cu.import("resource://gre/modules/FileUtils.jsm");

var Environment = { }; Cu.import('resource://mozmill-crowd/environment.js', Environment);
var Utils = { }; Cu.import('resource://mozmill-crowd/utils.js', Utils);


// XXX: For now lets use constants. Has to be moved out to a web service which
// will return the latest package and the hash
const ENVIRONMENT_DATA = {
  Darwin : { url : "https://mozqa.com/mozmill-env/mac-latest.zip" },
  Linux :  { url : "https://mozqa.com/mozmill-env/linux-latest.zip" },
  WINNT :  { url : "https://mozqa.com/mozmill-env/windows-latest.zip" }
};

// XXX: Has to be removed once we use the PHP script to download the environment
var gXulRuntime = Utils.gAppInfo.QueryInterface(Ci.nsIXULRuntime);


const ENVIRONMENT_DIR = "mozmill-env";
const ENVIRONMENT_PACKAGE = "mozmill-env.zip";


/**
 *
 * @param {nsIFile} aDir
 *        Directory, which is used to store all extension related files
 */
function Storage(aDir) {
  this._dirSrv = Utils.gDirService;

  this._dir = aDir;

  this.setup();
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
  get dir() {
    return this._dir;
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
  get environment() {
    if (!this._environment)
      this._createEnvironment();

    return this._environment;
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
  _createEnvironment : function Storage__createEnvironment() {
    var envDir = this.dir.clone();
    envDir.append(ENVIRONMENT_DIR);

    this._environment = new Environment.Environment(envDir);
  },

  /**
   *
   */
  download : function Storage_download(aURL, aFile) {
    var window = Utils.gWindowMediator.getMostRecentWindow("Mozmill:Crowd");
    window.openDialog("chrome://mozmill-crowd/content/download.xul",
                      "Download",
                      "dialog, modal, centerscreen, titlebar=no",
                      aURL,
                      aFile);
  },

  /**
   *
   */
  extract : function Storage_extract(aFile, aDir) {
    var window = Utils.gWindowMediator.getMostRecentWindow("Mozmill:Crowd");
    window.openDialog("chrome://mozmill-crowd/content/unpack.xul",
                      "Extract",
                      "dialog, modal, centerscreen, titlebar=no",
                      aFile,
                      aDir);
  },

  /**
   *
   */
  setup : function Storage_setup() {
    // Check if the storage exists, otherwise create it
    if (!this.dir.exists) {
      this.dir.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                      FileUtils.PERMS_DIRECTORY);
    }

    // For now lets only check for the downloaded test environment. In the
    // future we will have to store the version of the environment to be able
    // to check for updates and install those.
    var envPackage = this.dir.clone();
    envPackage.append(ENVIRONMENT_PACKAGE);

    if (!envPackage.exists()) {
      this.download(ENVIRONMENT_DATA[gXulRuntime.OS].url, envPackage);
    }

    // Extract the test environment if it hasn't been done yet
    var envDir = this.dir.clone();
    envDir.append(ENVIRONMENT_DIR);

    if (!envDir.exists()) {
      this.extract(envPackage, this.dir);
    }

    // Prepare the environment
    this._createEnvironment();
    this.environment.setup();
  }
};
