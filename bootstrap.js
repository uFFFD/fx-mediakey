/*  Media Key Support for Firefox
 *  Copyright (c) 2014-2015 uFFFD
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

const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

const MK_TOPIC = "mediakey";
const KEY_NEXT = "next";
const KEY_PREVIOUS = "previous";
const KEY_STOP = "stop";
const KEY_PLAY_PAUSE = "play_pause";

const PREF_ROOT = "extensions.mediakey@uFFFD.";
const PREF_SIMKEYEVENTS = PREF_ROOT + "simulateKeyEvents";
const PREF_DEBUGMODE = PREF_ROOT + "debugMode";

Cu.import("resource://gre/modules/Services.jsm");

// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless#Step_10.3A_Bypass_cache_when_loading_properties_files
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "strings", function() {
  if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") < 0) {
    return loadPropertiesFile("resource://mediakeysupport/locale/" + locale + "/mks.properties");
  }
  else {
    return loadPropertiesFile("chrome://mediakeysupport/locale/mks.properties");
  }
});

function loadPropertiesFile(path)
{
  /* HACK: The string bundle cache is cleared on addon shutdown, however it doesn't appear to do so reliably.
     Errors can erratically happen on next load of the same file in certain instances. (at minimum, when strings are added/removed)
     The apparently accepted solution to reliably load new versions is to always create bundles with a unique URL so as to bypass the cache.
     This is accomplished by passing a random number in a parameter after a '?'. (this random ID is otherwise ignored)
     The loaded string bundle is still cached on startup and should still be cleared out of the cache on addon shutdown.
     This just bypasses the built-in cache for repeated loads of the same path so that a newly installed update loads cleanly. */
  return Services.strings.createBundle(path + "?" + Math.random());
}

// https://developer.mozilla.org/en-US/Add-ons/Working_with_multiprocess_Firefox#Backwards_compatibility_of_the_new_APIs
// only use message manager in firefox 17.0+
const MM_AVAILABLE = Services.vc.compare(Services.appinfo.platformVersion, "16.*") > 0;

let MediaKeySupport = function () {
  this.mkwin = null;
  this.simKeyEvents = false;
  this.debugMode = false;
  this.globalMM = null;
};

MediaKeySupport.prototype.sendKeyEvent = function (keyCode) {
  let enumerator = Services.wm.getEnumerator("navigator:browser");
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
      if (MM_AVAILABLE) {
        this.globalMM.broadcastAsyncMessage("mediakey:key", {
          keyName: data,
          keyCode: keyCode
        });
      } else {
        this.sendKeyEvent(keyCode);
      }
    }
  }
  else { // topic == "nsPref:changed"
    if (data == PREF_SIMKEYEVENTS) {
      this.simKeyEvents = Services.prefs.getBoolPref(data);
      if (MM_AVAILABLE) {
        if (this.simKeyEvents) {
          if (this.globalMM == null) {
            this.globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
          }
          this.globalMM.loadFrameScript("chrome://mediakeysupport/content/frame-script.js", true);
        }
        else {
          if (this.globalMM) {
            this.globalMM.broadcastAsyncMessage("mediakey:unload");
            this.globalMM.removeDelayedFrameScript("chrome://mediakeysupport/content/frame-script.js");
          }
        }
      }
    }
    else if (data == PREF_DEBUGMODE) {
      this.debugMode = Services.prefs.getBoolPref(data);
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
  let scheme = "chrome";
  if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") < 0) {
    scheme = "resource";
  }
  Services.scriptloader.loadSubScript(scheme + "://mediakeysupport/content/defaultprefs.js",
                                      { pref: setDefaultPref } );
  Cu.import(scheme + "://mediakeysupport/content/mk-win.js");
  this.debugMode = Services.prefs.getBoolPref(PREF_DEBUGMODE);
  this.mkwin = new MKWin();
  this.mkwin.init(this.debugMode);
  this.simKeyEvents = Services.prefs.getBoolPref(PREF_SIMKEYEVENTS);
  this.register();
  if (MM_AVAILABLE && this.simKeyEvents) {
    this.globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
    this.globalMM.loadFrameScript("chrome://mediakeysupport/content/frame-script.js", true);
  }
};

MediaKeySupport.prototype.unload = function () {
  if (MM_AVAILABLE && this.globalMM) {
    if (this.simKeyEvents) {
      this.globalMM.broadcastAsyncMessage("mediakey:unload");
    }
    this.globalMM.removeDelayedFrameScript("chrome://mediakeysupport/content/frame-script.js");
  }
  this.unregister();
  if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") > 0) {
    Cu.unload("chrome://mediakeysupport/content/mk-win.js");
  }
  else if (Services.vc.compare(Services.appinfo.platformVersion, "6.*") > 0) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=481603
    // there is no way to unload loaded JSM prior to firefox 7
    Cu.unload("resource://mediakeysupport/content/mk-win.js");
  }
};

MediaKeySupport.prototype.unloadmkwin = function () {
  this.mkwin.unload();
  this.mkwin = null;
};

MediaKeySupport.prototype.switchDebugMode = function () {
  setGenericPref(Services.prefs, PREF_DEBUGMODE, !this.debugMode);
  if (this.mkwin) {
    this.mkwin.enableDebugMode(this.debugMode);
  }
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
// Manually add/remove UI elements
// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless#Step_9.3A_bootstrap.js

function onToolsMenuPopup(evt) {
  // locale and string bundle may not be available when adding menuitems
  // give them a chance to get localized in tools menu's popupshowing event
  if (locale) {
    evt.target.removeEventListener("popupshowing", onToolsMenuPopup, false);
    let mksmenu = evt.target.ownerDocument.getElementById("mksMenu");
    if (mksmenu) {
      try {
        mksmenu.setAttribute("label", strings.GetStringFromName("mksTitle"));
      }
      catch (e) {
      }
    }
    let simKeyEvent = evt.target.ownerDocument.getElementById("mksSimKeyEvent");
    if (simKeyEvent) {
      try {
        simKeyEvent.setAttribute("label", strings.GetStringFromName("simKeyEvents"));
      }
      catch (e) {
      }
    }
    let debugMode = evt.target.ownerDocument.getElementById("mksDebugMode");
    if (debugMode) {
      try {
        debugMode.setAttribute("label", strings.GetStringFromName("debugMode"));
      }
      catch (e) {
      }
    }
    mksmenu.setAttribute("hidden", false);
  }
}

function onMKSMenuPopup(evt) {
  let simKeyEvent = evt.target.ownerDocument.getElementById("mksSimKeyEvent");
  if (simKeyEvent) {
    simKeyEvent.setAttribute("checked", mks.simKeyEvents);
  }
  let debugMode = evt.target.ownerDocument.getElementById("mksDebugMode");
  if (debugMode) {
    debugMode.setAttribute("checked", mks.debugMode);
  }
}

function onSimKeyEventClick(evt) {
  setGenericPref(Services.prefs, PREF_SIMKEYEVENTS, !mks.simKeyEvents);
}

function onDebugModeClick(evt) {
  mks.switchDebugMode();
}

function loadIntoWindow(window) {
  /* call/move your UI construction function here */
  let doc = window.document;
  let toolmenu = doc.getElementById("menu_ToolsPopup");
  if (toolmenu) {
    let mksmenu = doc.createElement("menu");
    let mkspopup = doc.createElement("menupopup");
    let simKeyEvent = doc.createElement("menuitem");
    let debugMode = doc.createElement("menuitem");

    mksmenu.setAttribute("id", "mksMenu");
    mkspopup.setAttribute("id", "mksMenuPopup");
    simKeyEvent.setAttribute("id", "mksSimKeyEvent");
    debugMode.setAttribute("id", "mksDebugMode");

    let mksLabel = "Media Key Support";
    let simKeyEventLabel = "Simulate Key Events";
    let debugModeLabel = "Debug Mode";
    if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") > 0 || locale) {
      try {
        mksLabel = strings.GetStringFromName("mksTitle");
      }
      catch (e) {
      }
      try {
        simKeyEventLabel = strings.GetStringFromName("simKeyEvents");
      }
      catch (e) {
      }
      try {
        debugModeLabel = strings.GetStringFromName("debugMode");
      }
      catch (e) {
      }
    }
    else {
      mksmenu.setAttribute("hidden", true);
      toolmenu.addEventListener("popupshowing", onToolsMenuPopup, false);
    }
    mksmenu.setAttribute("label", mksLabel);
    simKeyEvent.setAttribute("label", simKeyEventLabel);
    debugMode.setAttribute("label", debugModeLabel);

    simKeyEvent.setAttribute("type", "checkbox");
    simKeyEvent.setAttribute("autocheck", false);
    simKeyEvent.addEventListener("command", onSimKeyEventClick, false);

    debugMode.setAttribute("type", "checkbox");
    debugMode.setAttribute("autocheck", false);
    debugMode.addEventListener("command", onDebugModeClick, false);

    mkspopup.appendChild(simKeyEvent);
    mkspopup.appendChild(debugMode);
    mksmenu.appendChild(mkspopup);
    toolmenu.appendChild(mksmenu);

    mkspopup.addEventListener("popupshowing", onMKSMenuPopup, false);
  }
}

function unloadFromWindow(window) {
  /* call/move your UI tear down function here */
  let doc = window.document;
  let simKeyEvent = doc.getElementById("mksSimKeyEvent");
  if (simKeyEvent) {
    simKeyEvent.removeEventListener("command", onSimKeyEventClick, false);
  }
  let debugMode = doc.getElementById("mksDebugMode");
  if (debugMode) {
    debugMode.removeEventListener("command", onDebugModeClick, false);
  }
  let mkspopup = doc.getElementById("mksMenuPopup");
  if (mkspopup) {
    mkspopup.removeEventListener("popupshowing", onMKSMenuPopup, false);
  }
  let toolmenu = doc.getElementById("menu_ToolsPopup");
  let mksmenu = doc.getElementById("mksMenu");
  if (toolmenu && mksmenu) {
    toolmenu.removeChild(mksmenu);
  }
}

function forEachOpenWindow(todo) { // Apply a function to all open browser windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    todo(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
  }
}

let WindowListener = {
  onOpenWindow: function(xulWindow) {
    let window;
    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIDOMWindowInternal
    if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") < 0) {
      window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindowInternal);
    }
    else {
      window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindow);
    }
    function onWindowLoad() {
      window.removeEventListener("load", onWindowLoad, false);
      if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
        loadIntoWindow(window);
      }
    }
    window.addEventListener("load", onWindowLoad, false);
  },
  onCloseWindow: function(xulWindow) { },
  onWindowTitleChange: function(xulWindow, newTitle) { }
};

//////////////////////////////////////////////////////////////////////

let mks = new MediaKeySupport();
let locale = null;

function startup(data, reason) {
  if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") < 0) {
    // http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-more-resources/
    let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    let alias = Services.io.newFileURI(data.installPath);
    if (!data.installPath.isDirectory())
      alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
    resource.setSubstitution("mediakeysupport", alias);

    // findClosestLocale
    Cu.import("resource://gre/modules/NetUtil.jsm");
    NetUtil.asyncFetch("resource://mediakeysupport/chrome.manifest", function(aInputStream, aResult) {
      if (!Components.isSuccessCode(aResult)) {
        return;
      }
      let data = NetUtil.readInputStreamToString(aInputStream, aInputStream.available(), { charset: "utf-8" });
      let availableLocales = [];
      data.split("\n").forEach(function(line) {
        if (line.indexOf("locale") == 0) {
          let a = line.split(/\s+/);
          if (a.length == 4) {
            availableLocales.push(a[2]);
          }
        }
      });
      Cu.import("resource://mediakeysupport/content/locale.js");
      locale = findClosestLocale(availableLocales);
      if (Services.vc.compare(Services.appinfo.platformVersion, "6.*") > 0) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=481603
        // there is no way to unload loaded JSM prior to firefox 7
        Cu.unload("resource://mediakeysupport/content/locale.js");
      }
    });
  }
  else if (Services.vc.compare(Services.appinfo.platformVersion, "9.*") < 0) {
    Cm.addBootstrappedManifestLocation(data.installPath);
  }

  mks.init();

  Services.wm.addListener(WindowListener);
  forEachOpenWindow(loadIntoWindow);
}

function shutdown(data, reason) {
  mks.unloadmkwin();

  if (reason == APP_SHUTDOWN) {
    return;
  }

  Services.wm.removeListener(WindowListener);
  forEachOpenWindow(unloadFromWindow);

  mks.unload();
  if (Services.vc.compare(Services.appinfo.platformVersion, "7.*") < 0) {
    // http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-more-resources/
    let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    resource.setSubstitution("mediakeysupport", null);
  }
  else if (Services.vc.compare(Services.appinfo.platformVersion, "9.*") < 0) {
    Cm.removeBootstrappedManifestLocation(data.installPath);
  }
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
