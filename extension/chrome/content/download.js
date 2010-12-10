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


Downloader = {
  _persist : null,
  stringBundle : null,

  init : function Downloader_init() {
    // The URL and target path are specified via window parameters
    this.url = window.arguments[0];
    this.target = window.arguments[1];

    this.progressMeter = document.getElementById("download-progress");
    this.progressLabel = document.getElementById("download-progress-label");

    // Initializing elements
    this.stringBundle = document.getElementById("download-stringbundle");
    this.progressLabel.value = this.stringBundle.getString("download.start");

    // Start the download
    this.start();
  },

  /**
   *
   */
  doCancel : function Downloader_cancel() {
    try {
      this._persist.cancelSave();
    }
    catch (e) {
      window.alert(e);
    }

    return true;
  },

  /**
   * Download the file specified by the URL to the given target path
   */
  start : function Downloader_start() {
    try {
      var uri = Cc["@mozilla.org/network/io-service;1"].
                getService(Ci.nsIIOService).
                newURI(this.url, null, null);

      // If target doesn't exist, create it
      if (!this.target.exists()) {
        this.target.create(0x00, 0644);
      }

      this._persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
                      createInstance(Ci.nsIWebBrowserPersist);
      this._persist.persistFlags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
                                   Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE |
                                   Ci.nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE;

      // Save URL as target
      this._persist.progressListener = new DownloaderListener();
      this._persist.saveURI(uri, null, null, null, null, this.target);
    }
    catch (ex) {
      window.alert(ex);
      window.close();
    }
  },

  /**
   *
   */
  stop : function Downloader_stop() {
    window.setTimeout(function () {
      window.close();
    }, 500);
  }
};


function DownloaderListener() {
}

DownloaderListener.prototype = {

  QueryInterface : function(aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
      Downloader.progressLabel.value = Downloader.stringBundle.getString("download.finished");
      Downloader.stop();
    }
  },

  onProgressChange : function(aWebProgress, aRequest,
                              aCurSelfProgress, aMaxSelfProgress,
                              aCurTotalProgress, aMaxTotalProgress) {

    // If the content size is not known switch to the undetermined display
    if (aMaxSelfProgress == -1)
      Downloader.progressMeter.mode =  "undetermined";

    // Update the label
    var curMB = aCurSelfProgress / 1024 / 1024;
    var maxMB = aMaxSelfProgress / 1024 / 1024;
    var string = Downloader.stringBundle.getFormattedString("download.progress",
                                                            [curMB.toFixed(2),
                                                             maxMB.toFixed(2)]);
    Downloader.progressLabel.value = string;

    // Update progress meter values
    Downloader.progressMeter.max = aMaxSelfProgress;
    Downloader.progressMeter.value = aCurSelfProgress;
  },

  onLocationChange : function(aWebProgress, aRequest, aLocation) {
  },

  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage) {
  },

  onSecurityChange : function(aWebProgress, aRequest, aState) {
  }
}

