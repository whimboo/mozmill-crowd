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
  "Environment"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/FileUtils.jsm");

var Utils = { }; Cu.import('resource://mozmill-crowd/utils.js', Utils);


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
  _execute: function Environment__execute(aScript, aParams) {
    // TODO: Has to be a non-blocking process
    var process = Cc["@mozilla.org/process/util;1"].
                  createInstance(Ci.nsIProcess);
    process.init(aScript);
    process.run(true, aParams, aParams.length);
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
  }
}
