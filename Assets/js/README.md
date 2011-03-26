jsGET
==============================================
Copyright (C) Fabian Vogelsteller [frozeman.de]
published under the GNU General Public License version 3

This program is free software;
you can redistribute it and/or modify it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program;
if not,see <http://www.gnu.org/licenses/>.
_____________________________________________

### AUTHOR
Fabian Vogelsteller <http://frozeman.de>

### DESCRIPTION
jsGET is a http GET-Variables clone for javascript, using the hash part of the URL (index.html#...).
You can set and get variables, and run a listener to hash changes, e.g. when the the history back button gets pressed.
This allows you to create a usable history navigation in your ajax application. It should work with all A-grade browsers.

### VERSION
0.1

### INSTALLATION
Just include the jsGET.js in your website/webapplication and use the jsGET object with its methods to set, get, remove history hash variables.
See the demo.html for examples.

### Properties
- vars:         (object) the hash variables object loaded by get(), set(), remove(), or clear() or load().
- vars.current: (object) the current variables.
- vars.old:     (object) the old variables, before they where changed with set(), remove(), clear(), load() or the browser history back button.
- vars.changed: (object) the variabels which have changed since the last call of get(), set(), remove(), or clear(), load() or the browser history back button.

### Methods
- load():                                 loads the current hash variables into the vars.current property as JSON object.
- clear():                                clears the hash part of the URL. (because it's not completely possible, it sets it to "#_")
- get(get):                               (string) try to get a hash variable with the given name.
- set(set):                               (string,number,object) sets the given parameters to the hash variales. If it's a string it should have the following format: "key=value".
- remove(remove):                         (string,array) the variable name(s) which should be removed from the hash variables
- addListener(listener,callAlways,bind):  (listener: function, callAlways: boolean, bind: object instance) creates a listener which calls the given function, when a hash change appears. The called function will get the vars property (vars.current,vars.old,vars.changed) and use the "bind" parameter as "this", when specified.
The return of the addListener() method is a setInterval ID and must be passed to the removeListener() method to stop the listening.
When callAlways is FALSE, it only calls when the browser history buttons are pressed and not when get(), set(), remove() or clear() is called.
- removeListener(listenerID):             (the setInterval Id received from a addListener() method) removes a listener set with the addListener() method.

### ATTENTION!
Everytime you call set(), remove() or clear() a new hash string will be set,
that means you also create a new history step in the browser history!

These are 'special' characters to jsGET and will therefor be encoded when they are part of a key or value:
  # & =
