/*  Media Key Support for Firefox
 *  Copyright (c) 2014 uFFFD
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

const MK_TOPIC = "mediakey";
const KEY_NEXT = "next";
const KEY_PREVIOUS = "previous";
const KEY_STOP = "stop";
const KEY_PLAY_PAUSE = "play_pause";

const PREF_ROOT = "extensions.mediakey@uFFFD.";
const PREF_SIMKEYEVENTS = PREF_ROOT + "simulateKeyEvents";

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/devtools/Console.jsm");

let MediaKeySupport = function () {
  this.mkwin = null;
  this.simKeyEvents = false;
  this.wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
};

MediaKeySupport.prototype.sendKeyEvent = function (keyCode) {
  let enumerator = this.wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    let gBrowser = win.gBrowser;
    let num = gBrowser.browsers.length;
    for (let i = 0; i < num; i++) {
      let b = gBrowser.getBrowserAtIndex(i);
      try {
        let doc = b.contentDocument;
        let evt = doc.createEvent("KeyboardEvent");
        evt.initKeyEvent("keyup", true, true, null, // type, bubbles, cancelable, viewArg
                         false, false, false, false, // ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg,
                         keyCode, 0); // keyCodeArg, charCodeArg
        doc.dispatchEvent(evt);
      } catch (e) {
        Cu.reportError(e);
      }
    }
  }
};

MediaKeySupport.prototype.observe = function (sub, topic, data) {
  if (topic == MK_TOPIC) { // topic == "mediakey"
    if (this.simKeyEvents) {
      let keyCode;
      switch (data) {
        case KEY_NEXT: // VK_MEDIA_NEXT_TRACK (0xB0)
          keyCode = 0xB0;
          break;
        case KEY_PREVIOUS: // VK_MEDIA_PREV_TRACK (0xB1)
          keyCode = 0xB1;
          break;
        case KEY_STOP: // VK_MEDIA_STOP (0xB2)
          keyCode = 0xB2;
          break;
        case KEY_PLAY_PAUSE: // VK_MEDIA_PLAY_PAUSE (0xB3)
          keyCode = 0xB3;
          break;
        default:
          return;
      }
      this.sendKeyEvent(keyCode);
    }
  }
  else { // topic == "nsPref:changed"
    if (data == PREF_SIMKEYEVENTS) {
      this.simKeyEvents = Services.prefs.getBoolPref(data);
    }
  }
};

MediaKeySupport.prototype.register = function () {
  Services.prefs.addObserver(PREF_ROOT, this, false);

  let obs = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  obs.addObserver(this, MK_TOPIC, false);
};

MediaKeySupport.prototype.unregister = function () {
  let obs = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  obs.removeObserver(this, MK_TOPIC);

  Services.prefs.removeObserver(PREF_ROOT, this);

};

MediaKeySupport.prototype.init = function () {
  Services.scriptloader.loadSubScript("chrome://mediakeysupport/content/defaultprefs.js",
                                      { pref: setDefaultPref } );
  Cu.import("chrome://mediakeysupport/content/mk-win.js");
  this.mkwin = new MKWin();
  this.mkwin.init();
  this.simKeyEvents = Services.prefs.getBoolPref(PREF_SIMKEYEVENTS);
  this.register();
};

MediaKeySupport.prototype.unload = function () {
  this.unregister();
  Cu.unload("chrome://mediakeysupport/content/mk-win.js");
};

MediaKeySupport.prototype.unloadmkwin = function () {
  this.mkwin.unload();
  this.mkwin = null;
};

//////////////////////////////////////////////////////////////////////
// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless#Step_4.3A_Manually_handle_default_preferences
function getGenericPref(branch, prefName) {
  switch (branch.getPrefType(prefName)) {
    default:
    case 0:   return undefined;                      // PREF_INVALID
    case 32:  return getUCharPref(prefName,branch);  // PREF_STRING
    case 64:  return branch.getIntPref(prefName);    // PREF_INT
    case 128: return branch.getBoolPref(prefName);   // PREF_BOOL
  }
}

function setGenericPref(branch, prefName, prefValue) {
  switch (typeof prefValue) {
    case "string":
      setUCharPref(prefName, prefValue, branch);
      return;
    case "number":
      branch.setIntPref(prefName, prefValue);
      return;
    case "boolean":
      branch.setBoolPref(prefName, prefValue);
      return;
  }
}

function setDefaultPref(prefName, prefValue) {
  var defaultBranch = Services.prefs.getDefaultBranch(null);
  setGenericPref(defaultBranch, prefName, prefValue);
}

function getUCharPref(prefName, branch) { // Unicode getCharPref
  branch = branch ? branch : Services.prefs;
  return branch.getComplexValue(prefName, Ci.nsISupportsString).data;
}

function setUCharPref(prefName, text, branch) { // Unicode setCharPref
  var string = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
  string.data = text;
  branch = branch ? branch : Services.prefs;
  branch.setComplexValue(prefName, Ci.nsISupportsString, string);
}

//////////////////////////////////////////////////////////////////////

let mks = new MediaKeySupport();

function startup(data, reason) {
  mks.init();
}

function shutdown(data, reason) {
  mks.unloadmkwin();
  if (reason == APP_SHUTDOWN) {
    return;
  }
  mks.unload();
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
