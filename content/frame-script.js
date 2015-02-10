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

function emitKeyEvent(event) {
  let evt = content.document.createEvent("KeyboardEvent");
  evt.initKeyEvent("keyup", true, true, null, // type, bubbles, cancelable, viewArg
                   false, false, false, false, // ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg,
                   event.data.keyCode, 0); // keyCodeArg, charCodeArg
  content.document.dispatchEvent(evt);
}

function unload(event) {
  removeMessageListener("mediakey:unload", unload);
  removeMessageListener("mediakey:key", emitKeyEvent);
}

addMessageListener("mediakey:key", emitKeyEvent);
addMessageListener("mediakey:unload", unload);
