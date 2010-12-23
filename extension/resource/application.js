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

// XXX: temporary until refactoring has been finished
var Cc = Components.classes;
var Ci = Components.interfaces;

var EXPORTED_SYMBOLS = ["Application"];

/**
 *
 */
function Application(aPath) {
  this._appInfo = Cc["@mozilla.org/xre/app-info;1"].
                  getService(Ci.nsIXULAppInfo);
  this._dirSrv = Cc["@mozilla.org/file/directory_service;1"].
                 getService(Ci.nsIProperties);

  this._path = aPath || this.currentAppPath();
}

Application.binaries = {
  "Darwin" : "firefox-bin",
  "Linux" : "firefox-bin",
  "WINNT" : "firefox.exe"
};

Application.prototype = {

  /**
   *
   */
  get appInfo() {
    return this._appInfo;
  },

  /**
   *
   */
  get XULRuntime() {
    return this._appInfo.QueryInterface(Ci.nsIXULRuntime);
  },

  /**
   * Get the application bundle path on OS X
   *
   * @param string aPath
   *        Path to the application folder
   *
   * @returns Path to the application bundle
   */
  get bundle() {
    if (this.XULRuntime.OS == "Darwin") {
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
    var iniFile = Cc["@mozilla.org/file/local;1"].
                  createInstance(Ci.nsILocalFile);
    iniFile.initWithPath(this._path);
    iniFile = iniFile.parent;
    iniFile.append("application.ini");
    iniFile.isFile();

    // Parse the ini file to retrieve all values
    var factory = Cc["@mozilla.org/xpcom/ini-processor-factory;1"].
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
    dir.append(Application.binaries[this.XULRuntime.OS]);

    return dir.path;
  }
}
