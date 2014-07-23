
const EXPORTED_SYMBOLS = ["aeUtils"];

const DEBUG = false;
const EXTENSION_ID = "{d93e6838-8272-4382-a0fb-36a56db176c5}";

const Cc = Components.classes;
const Ci = Components.interfaces;


var aeUtils = {

 alertEx : function (aTitle, aMessage)
 {
   var prmpt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
   prmpt.alert(null, aTitle, aMessage);
 },


 confirmEx: function (aTitle, aMessage)
 {
   var rv;
   var prmpt = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
   rv = prmpt.confirm(null, aTitle, aMessage);
   return rv;
 },


 getExtensionID: function ()
 {
   return EXTENSION_ID;
 },


 getUserProfileDir: function ()
 {
   // Throws an exception if profile directory retrieval failed.
   var dirProp = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
   var rv = dirProp.get("ProfD", Ci.nsIFile);
   if (! rv) {
     throw "Failed to retrieve user profile directory path";
   }

   return rv;
 },


 getOS: function ()
 {
   var rv;
   var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].createInstance(Ci.nsIXULRuntime);
   rv = xulRuntime.OS;

   return rv;
 },


 beep: function () 
 {
   var sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
   sound.beep();
 },


 log: function (aMessage) {
    if (DEBUG) {
      var consoleSvc = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
      consoleSvc.logStringMessage(aMessage);
    }
  }
};




