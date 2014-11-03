// ==UserScript==
// @name        mediakey test
// @description example for addons and userChromeJS scripts
// @namespace   https://github.com/uFFFD
// @author      uFFFD
// @license     MPL 2.0
// @version     0.1
// ==/UserScript==

"use strict";

(function() {
  Components.utils.import("resource://gre/modules/devtools/Console.jsm");

  const mkTopic = "mediakey";

  const mediaKeyOb = function() {};
  mediaKeyOb.prototype = {
    observe: function (subject, topic, data) {
      console.log("in userChromeJS: " + topic + " : " + data);
    },
    register: function () {
      const obs = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);
      obs.addObserver(this, mkTopic, false);
    },
    unregister: function() {
      const obs = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);
      obs.removeObserver(this, mkTopic);
    }
  };

  let ob = new mediaKeyOb();
  ob.register();
})();
