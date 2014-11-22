//////////////////////////////////////////////////////////////////////
// allow debug output via dump to be printed to the system console
// (setting it here just in case, even though PlainTextConsole also
// sets this preference)
user_pref("browser.dom.window.dump.enabled", true);
// warn about possibly incorrect code
user_pref("javascript.options.showInConsole", true);

// Allow remote connections to the debugger
user_pref("devtools.debugger.remote-enabled", true);

user_pref("extensions.sdk.console.logLevel", "info");

user_pref("extensions.checkCompatibility.nightly", false);

// Disable extension updates and notifications.
user_pref("extensions.update.enabled", false);
user_pref("extensions.update.notifyUser", false);

// From:
// http://hg.mozilla.org/mozilla-central/file/1dd81c324ac7/build/automation.py.in#l372
// Only load extensions from the application and user profile.
// AddonManager.SCOPE_PROFILE + AddonManager.SCOPE_APPLICATION
user_pref("extensions.enabledScopes", 5);
// Disable metadata caching for installed add-ons by default
user_pref("extensions.getAddons.cache.enabled", false);
// Disable intalling any distribution add-ons
user_pref("extensions.installDistroAddons", false);
// Allow installing extensions dropped into the profile folder
user_pref("extensions.autoDisableScopes", 10);

// Disable app update
user_pref("app.update.enabled", false);

// Point update checks to a nonexistent local URL for fast failures.
user_pref("extensions.update.url", "http://localhost/extensions-dummy/updateURL");
user_pref("extensions.blocklist.url", "http://localhost/extensions-dummy/blocklistURL");
// Make sure opening about:addons won't hit the network.
user_pref("extensions.webservice.discoverURL", "http://localhost/extensions-dummy/discoveryURL");

user_pref("browser.startup.homepage", "about:blank");
user_pref("startup.homepage_welcome_url", "about:blank");
user_pref("devtools.errorconsole.enabled", true);
user_pref("devtools.chrome.enabled", true);

// From:
// http://hg.mozilla.org/mozilla-central/file/1dd81c324ac7/build/automation.py.in#l388
// Make url-classifier updates so rare that they won't affect tests.
user_pref("urlclassifier.updateinterval", 172800);
// Point the url-classifier to a nonexistent local URL for fast failures.
user_pref("browser.safebrowsing.provider.0.gethashURL", "http://localhost/safebrowsing-dummy/gethash");
user_pref("browser.safebrowsing.provider.0.updateURL", "http://localhost/safebrowsing-dummy/update");

//////////////////////////////////////////////////////////////////////

user_pref("browser.safebrowsing.enabled", false);
user_pref("browser.safebrowsing.malware.enabled", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.tabs.closeWindowWithLastTab", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("extensions.ui.lastCategory", "addons://list/extension");
user_pref("general.warnOnAboutConfig", false);
user_pref("media.gmp-gmpopenh264.autoupdate", false);

user_pref("extensions.mediakey@uFFFD.simulateKeyEvents", true);

user_pref("browser.tabs.remote.autostart", true);
