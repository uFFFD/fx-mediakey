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

const { Cc, Ci } = require("chrome");
const { EventTarget } = require("sdk/event/target");
const events = require("sdk/system/events");
const pageMod = require("sdk/page-mod");
const self = require("sdk/self");
const simplePrefs = require("sdk/simple-prefs");
const system = require("sdk/system");

const { MKWin } = require("./mk-win");

const KEY_NEXT = "next";
const KEY_PREVIOUS = "previous";
const KEY_STOP = "stop";
const KEY_PLAY_PAUSE = "play_pause";

const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
let win;
const keyEvent = EventTarget();
let workers = [];
let activeWorkers = [];
let pm;

const sendKeyEvent = function (key) {
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key#Key_values_on_Windows_(and_char_values_of_IE)
  let keyCode;
  switch (key) {
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
  activeWorkers.forEach(function(w) {
    w.port.emit("keyup", keyCode);
  });
};

const onMediaKey = function (key) {
  // Bug 910599, affects firefox 27-
  //events.emit("mediakey", key); // nsIObserverService.notifyObservers(null, "mediakey", key);
  observerService.notifyObservers(null, "mediakey", key);
  if (simplePrefs.prefs.simulateKeyEvents) {
    sendKeyEvent(key);
  }
};

const detachWorker = function (worker, workerArray) {
  let index = workerArray.indexOf(worker);
  if (index != -1) {
    workerArray.splice(index, 1);
  }
};

const PM = function () {
  return pageMod.PageMod({
    include: ["*", "file://*"], // http, https, ftp and file
    contentScriptFile: self.data.url("worker.js"),
    attachTo: "top",
    onAttach: function (worker) {
      workers.push(worker);
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
      // http://stackoverflow.com/a/20251401
      worker.on("pageshow", function () {
        activeWorkers.push(worker);
      });
      worker.on("pagehide", function () {
        detachWorker(this, activeWorkers);
      });
    }
  });
};

const onPrefSimulateKeyEventsChanged = function () {
  if (simplePrefs.prefs.simulateKeyEvents) {
    if (!pm) {
      pm = PM();
    }
  }
  else {
    if (pm) {
      pm.destroy();
      pm = null;
      activeWorkers = [];
      workers.forEach(function (w) {
        w.destroy();
      });
      workers = [];
    }
  }
};

exports.main = function (options, callbacks) {
  console.log("load reason: " + options.loadReason);
  if (simplePrefs.prefs.simulateKeyEvents) {
    pm = PM();
  }
  simplePrefs.on("simulateKeyEvents", onPrefSimulateKeyEventsChanged);
  keyEvent.on("mediakey", onMediaKey);
  if (system.platform == "winnt") {
    win = new MKWin(keyEvent);
    win.init();
  }
  else {
    console.error(system.platform + " is not supported");
  }
};

exports.onUnload = function (reason) {
  console.log("unload reason: " + reason);
  if (win) {
    win.unload();
  }
  // Bug 856147, affects firefox 22-
  //keyEvent.off("mediakey", onMediaKey);
  keyEvent.removeListener("mediakey", onMediaKey);
  simplePrefs.removeListener("simulateKeyEvents", onPrefSimulateKeyEventsChanged);
  if (pm) {
    pm.destroy();
    workers.forEach(function (w) {
      w.destroy();
    });
  }
};
