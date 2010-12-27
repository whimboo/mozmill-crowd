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
  "gAppInfo", "gDirService", "gPrefService", "gWindowWatcher",
  "readIniFile",
  "getPref", "setPref"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// Lazily load necessary XPCOM services
XPCOMUtils.defineLazyServiceGetter(this, "gAppInfo",
                                   "@mozilla.org/xre/app-info;1",
                                   "nsIXULAppInfo");

XPCOMUtils.defineLazyServiceGetter(this, "gDirService",
                                   "@mozilla.org/file/directory_service;1",
                                   "nsIProperties");

XPCOMUtils.defineLazyServiceGetter(this, "gPrefService",
                                   "@mozilla.org/preferences-service;1",
                                   "nsIPrefService");

XPCOMUtils.defineLazyServiceGetter(this, "gWindowWatcher",
                                   "@mozilla.org/embedcomp/window-watcher;1",
                                   "nsIWindowWatcher");


/////////////////////////////
// SECTION: File handling

/**
 * Read the specified ini file and store its data in a JSON object
 *
 * @param {nsIFile} aIniFile
 *        Ini file to retrieve the content from
 * @returns {object} Content of the ini file
 */
function readIniFile(aIniFile) {
  // Parse the ini file to retrieve all values
  var factory = Cc["@mozilla.org/xpcom/ini-processor-factory;1"].
                getService(Ci.nsIINIParserFactory);
  var parser = factory.createINIParser(aIniFile);

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


/////////////////////////////
// SECTION: Preferences

// Cached instances for accessing preferences
var gPrefBranch = gPrefService.QueryInterface(Ci.nsIPrefBranch);

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
