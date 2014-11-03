// ==UserScript==
// @name        mediakey test
// @description example for user scripts, e.g. Greasemonkey
// @namespace   https://github.com/uFFFD
// @author      uFFFD
// @license     MPL 2.0
// @version     0.1
// @include     *
// @grant       none
// ==/UserScript==

"use strict";

(function(){
  window.addEventListener("keyup", function(e){
    switch(e.keyCode){
      case 0xB0:
        console.log("mediakey next");
        break;
      case 0xB1:
        console.log("mediakey previous");
        break;
      case 0xB2:
        console.log("mediakey stop");
        break;
      case 0xB3:
        console.log("mediakey play_pause");
        break;
      default:
        break;
    }
  })
})();
