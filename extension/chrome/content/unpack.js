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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/FileUtils.jsm");


Unpack = {

  init : function Unpack_init() {
    // The archive and target path are specified via window parameters
    this.file = window.arguments[0];
    this.dir = window.arguments[1];

    this.progressMeter = document.getElementById("progress");

    // Start the extract process
    setTimeout(function () { Unpack.start(); }, 100);
  },

  /**
   *
   */
  doCancel : function Unpack_cancel() {
    window.alert("not implemented yet.");
  },

  /**
   * Download the file specified by the URL to the given target path
   */
  start : function Unpack_start() {
    var time = 0;

    var zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].
                    createInstance(Ci.nsIZipReader);
    zipReader.open(this.file);

    try {
      entries = zipReader.findEntries(null);
      while (entries.hasMore()) {
        var entry = entries.getNext();
        var file = this.dir.clone();

        for each (var fragment in entry.split("/"))
          file.append(fragment);

        if (!file.parent.exists()) { 
          file.parent.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                             FileUtils.PERMS_DIRECTORY);
        }

        if (zipReader.getEntry(entry).isDirectory)
          continue;

        var startTime = Date.now();
        zipReader.extract(entry, file);
        time += Date.now() - startTime;

        if (time > 100) {
          time = 0;
          sleep(10);
        }
      }
    }
    finally {
      zipReader.close();
    }

    Unpack.stop();
  },

  /**
   *
   */
  stop : function Unpack_stop() {
    window.close();
  }
};

/**
 * Sleep for the given amount of milliseconds
 * TODO: Has to be moved into a resource module
 *
 * @param {number} milliseconds
 *        Sleeps the given number of milliseconds
 */
function sleep(milliseconds) {
  // We basically just call this once after the specified number of milliseconds
  var timeup = false;
  function wait() { timeup = true; }

  var hwindow = Cc["@mozilla.org/appshell/appShellService;1"].
                getService(Ci.nsIAppShellService).
                hiddenDOMWindow;
  hwindow.setTimeout(wait, milliseconds);

  var thread = Components.classes["@mozilla.org/thread-manager;1"].
               getService().currentThread;
  while(!timeup) {
    thread.processNextEvent(true);
  }
}
