/**
 * @file DeliciousPostLogin.js
 *
 * @author Alex Eng <aeng.aecreations@gmail.com>
 */

const EXPORTED_SYMBOLS = ['saveLogin', 
			  'updateLogin', 
			  'deleteLogin',
			  'getPassword',
			  'loginExists'
			 ];


//
// Private constants and variables
//

const DEBUG = false;

const HOSTNAME    = "chrome://aedeliciouspost/";
const HTTP_REALM  = "Delicious Post";

var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");

var _pswdMgr = Components.classes["@mozilla.org/login-manager;1"]
                         .getService(Components.interfaces.nsILoginManager);


//
// Public functions
//

/**
 * Saves user login info containing the given username and password.
 *
 * @param aUsername  The username
 * @param aPassword  The password
 *
 * @return Boolean value set to true if save was successful, or false if
 *         the save failed.
 */
function saveLogin(aUsername, aPassword)
{
  var loginInfo = new nsLoginInfo(HOSTNAME, null, HTTP_REALM, aUsername, aPassword, "", "");

  _log("saveLogin(): Saving login info for username `" + aUsername + "'");

  try {
    _pswdMgr.addLogin(loginInfo);
  }
  catch (e) {
    _log("saveLogin(): Error saving login: " + e);
    return false;
  }
  
  return true;
}


/**
 * Updates the password that was saved for the user with the given username.
 *
 * @param aUsername     The username
 * @param aOldPassword  The old password
 * @param aNewPassword  The new password
 *
 * @return Boolean value set to true if update was successful, or false
 *         if it was not.
 */
function updateLogin(aUsername, aOldPassword, aNewPassword)
{
  var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
  var oldLoginInfo;

  for (let i = 0; i < logins.length; i++) {
    if (logins[i].username == aUsername && logins[i].password == aOldPassword) {
      oldLoginInfo = logins[i];
      _log("updateLogin(): Found login info for username `" + aUsername + "'");
      break;
    }
  }

  if (! oldLoginInfo) {
    _log("updateLogin(): Can't find login info for username `" + aUsername + "', nothing to update");
    return false;
  }

  var newLoginInfo = new nsLoginInfo(HOSTNAME, null, HTTP_REALM, aUsername, aNewPassword, "", "");

  try {
    _pswdMgr.modifyLogin(oldLoginInfo, newLoginInfo);
  }
  catch (e) {
    _log("updateLogin(): Password update failed: " + e);
    return false;
  }

  _log("updateLogin(): Password updated successfully for username `" + aUsername + "'");

  return true;
}


/**
 * Removes the login info associated with the given username.
 *
 * @param aUsername  The username
 *
 * @return Boolean value set to true if removal was successful, false if
 *         removal failed.
 */
function deleteLogin(aUsername)
{
  // Find the user for this extension, then remove the login info.  This allows
  // for removing the stored password without knowing what the password is.
  var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);

  for (let i = 0; i < logins.length; i++) {
    if (logins[i].username == aUsername) {
      _log("deleteLogin(): Removing login info for username `" + aUsername + "'");
      try {
	_pswdMgr.removeLogin(logins[i]);
      }
      catch (e) {
	_log("deleteLogin(): Login deletion failed: " + e);
	return false;
      }

      return true;
    }
  }

  return false;
}


/**
 * Returns the password associated with the given username.
 * 
 * @param aUsername  The username
 *
 * @return String containing the password.  If login info not found for the
 *         given username, then the return value is undefined.
 */
function getPassword(aUsername)
{
  var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
  var rv;

  for (let i = 0; i < logins.length; i++) {
    if (logins[i].username == aUsername) {
      _log("getPassword(): Found login info for username `" + aUsername + "'; retrieving password");

      rv = logins[i].password;
      break;
    }
  }

  if (rv === undefined) {
    _log("getPassword(): Can't find login info for username `" + aUsername + "'");
  }

  return rv;
}


/**
 * Returns true if the login info for the given username exists, false
 * otherwise.
 *
 * @param aUsername  The username
 *
 * @return Boolean value set to true if login exists, or false if it does not.
 */
function loginExists(aUsername)
{
  var logins = _pswdMgr.findLogins({}, HOSTNAME, null, HTTP_REALM);
  var rv = false;

  for (let i = 0; i < logins.length; i++) {
    if (logins[i].username == aUsername) {
      rv = true;
      break;
    }
  }

  _log("loginExists(): It is " + rv + " that the login exists for username `" + aUsername + "'");

  return rv;
}


//
// Private functions
//

function _log(aMessage)
{
  if (DEBUG) {
    var consoleSvc = Components.classes["@mozilla.org/consoleservice;1"]
                               .getService(Components.interfaces
					             .nsIConsoleService);
    consoleSvc.logStringMessage("aeDeliciousPostLogin::" + aMessage);
  }
}
