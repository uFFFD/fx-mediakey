# Media Key Support for Firefox

Add support for global media keys.

Currently only support Windows.

Special thanks to [Alexandre Poirot] (http://blog.techno-barje.fr/) for his great js-ctypes tutorials and the idea of using message-only window:

- http://blog.techno-barje.fr/post/2010/08/27/jsctypes-win32api-jetpack-jetintray/
- https://github.com/ochameau/jetintray

## How to build

1. download addon sdk from https://github.com/mozilla/addon-sdk or https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/
  * apply patches from [cfx-patch] (https://github.com/uFFFD/cfx-patch) (optional)
2. clone this repo
3. activate addon sdk
4. `make xpi` or `cfx xpi --templatedir template` or `cfx xpi`

## How to use

### In chrome code

For example, in extension code or [userChromeJS] (http://userchromejs.mozdev.org/) script:

1. observe `mediakey` topic, and check `data`:
  * next
  * previous
  * stop
  * play_pause
2. communicate with content scripts

see examples/mk_test.uc.js

### In content script (not recommended)

For example, in [Greasemonkey] (https://addons.mozilla.org/firefox/addon/greasemonkey/) script:

1. enable "Simulate Key Events"
2. listen to `keyup` event, and check `keyCode`:
  * 0xB0 / 176 (next)
  * 0xB1 / 177 (previous)
  * 0xB2 / 178 (stop)
  * 0xB3 / 179 (play_pause)

see examples/mk_test.user.js

## License

GNU General Public License v3.0
http://www.gnu.org/copyleft/gpl.html
