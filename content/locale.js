/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// modified from addon-sdk/lib/sdk/l10n/locale.js
// https://github.com/mozilla/addon-sdk/blob/master/lib/sdk/l10n/locale.js

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");

this.EXPORTED_SYMBOLS = [
  "findClosestLocale"
];

// https://github.com/mozilla/addon-sdk/blob/master/lib/sdk/preferences/service.js
let prefs = {};

prefs.get = function get(prefName, defValue) {
  let data = null;
  switch (Services.prefs.getPrefType(prefName)) {
    case 32: return prefs.getUCharPref(prefName, defValue); // PREF_STRING
    default: return defValue;
  }
};

prefs.getUCharPref = function getUCharPref(prefName, defValue) {
  let value = null;
  try {
    value = Services.prefs.getComplexValue(prefName, Ci.nsISupportsString).data;
  }
  finally {
    return value || defValue;
  }
};

prefs.getLocalized = function getLocalized(prefName, defValue) {
  let value = null;
  try {
    value = Services.prefs.getComplexValue(prefName, Ci.nsIPrefLocalizedString).data;
  }
  finally {
    return value || defValue;
  }
};

/**
 * Gets the currently selected locale for display.
 * Gets all usable locale that we can use sorted by priority of relevance
 * @return  Array of locales, begins with highest priority
 */
const PREF_MATCH_OS_LOCALE  = "intl.locale.matchOS";
const PREF_SELECTED_LOCALE  = "general.useragent.locale";
const PREF_ACCEPT_LANGUAGES = "intl.accept_languages";

this.getPreferedLocales = function getPreferedLocales(caseSensitve) {
  let locales = [];
  function addLocale(locale) {
    locale = locale.trim();
    if (!caseSensitve)
      locale = locale.toLowerCase();
    if (locales.indexOf(locale) === -1)
      locales.push(locale);
  }

  // Most important locale is OS one. But we use it, only if
  // "intl.locale.matchOS" pref is set to `true`.
  // Currently only used for multi-locales mobile builds.
  // http://mxr.mozilla.org/mozilla-central/source/mobile/android/installer/Makefile.in#46
  if (prefs.get(PREF_MATCH_OS_LOCALE, false)) {
    let localeService = Cc["@mozilla.org/intl/nslocaleservice;1"].
                        getService(Ci.nsILocaleService);
    let osLocale = localeService.getLocaleComponentForUserAgent();
    addLocale(osLocale);
  }

  // In some cases, mainly on Fennec and on Linux version,
  // `general.useragent.locale` is a special 'localized' value, like:
  // "chrome://global/locale/intl.properties"
  let browserUiLocale = prefs.getLocalized(PREF_SELECTED_LOCALE, "") ||
                        prefs.get(PREF_SELECTED_LOCALE, "");
  if (browserUiLocale)
    addLocale(browserUiLocale);

  // Third priority is the list of locales used for web content
  let contentLocales = prefs.get(PREF_ACCEPT_LANGUAGES, "");
  if (contentLocales == "chrome://global/locale/intl.properties") {
    contentLocales = prefs.getLocalized(PREF_ACCEPT_LANGUAGES, "");
  }
  if (contentLocales) {
    // This list is a string of locales seperated by commas.
    // There is spaces after commas, so strip each item
    contentLocales.split(",").forEach(function(locale) {
      addLocale(locale.replace(/(^\s+)|(\s+$)/g, ""));
    });
  }

  // Finally, we ensure that en-US is the final fallback if it wasn't added
  addLocale("en-US");

  return locales;
};

/**
 * Selects the closest matching locale from a list of locales.
 *
 * @param  aLocales
 *         An array of available locales
 * @param  aMatchLocales
 *         An array of prefered locales, ordered by priority. Most wanted first.
 *         Locales have to be in lowercase.
 *         If null, uses getPreferedLocales() results
 * @return the best match for the currently selected locale
 *
 * Stolen from http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/internal/XPIProvider.jsm
 */
this.findClosestLocale = function findClosestLocale(aLocales, aMatchLocales) {
  aMatchLocales = aMatchLocales || getPreferedLocales();

  // Holds the best matching localized resource
  let bestmatch = null;
  // The number of locale parts it matched with
  let bestmatchcount = 0;
  // The number of locale parts in the match
  let bestpartcount = 0;

  for (let i in aMatchLocales) {
    let locale = aMatchLocales[i];
    let lparts = locale.split("-");
    for (let j in aLocales) {
      let localized = aLocales[j];
      let found = localized.toLowerCase();
      // Exact match is returned immediately
      if (locale == found)
        return localized;

      let fparts = found.split("-");
      /* If we have found a possible match and this one isn't any longer
         then we dont need to check further. */
      if (bestmatch && fparts.length < bestmatchcount)
        continue;

      // Count the number of parts that match
      let maxmatchcount = Math.min(fparts.length, lparts.length);
      let matchcount = 0;
      while (matchcount < maxmatchcount &&
             fparts[matchcount] == lparts[matchcount])
        matchcount++;

      /* If we matched more than the last best match or matched the same and
         this locale is less specific than the last best match. */
      if (matchcount > bestmatchcount ||
         (matchcount == bestmatchcount && fparts.length < bestpartcount)) {
        bestmatch = localized;
        bestmatchcount = matchcount;
        bestpartcount = fparts.length;
      }
    }
    // If we found a valid match for this locale return it
    if (bestmatch)
      return bestmatch;
  }
  return null;
};
