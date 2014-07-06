

Components.utils.import("resource://aedeliciouspost/modules/aeUtils.js");
Components.utils.import("resource://aedeliciouspost/modules/aeConstants.js");
Components.utils.import("resource://aedeliciouspost/modules/aeDeliciousPostLogin.js");

var oldpswd;
var dlgArgs = window.arguments[0];


function alertEx(aMessage)
{
  aeUtils.alertEx("", aMessage);
}


function delicious_post_dialog_init() {
  var username='';
  var password='';
	
  const preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

  if (preferencesService.prefHasUserValue('extensions.aecreations.deliciouspost.username')) {
    var username=preferencesService.getCharPref('extensions.aecreations.deliciouspost.username');
    
    if (preferencesService.getBoolPref('extensions.aecreations.deliciouspost.use_password_manager')==true) {
      password = getPassword(username) || "";
      oldpswd = password;
      document.getElementById('delicious-post-dialog-password').setAttribute('value',password);
      document.getElementById('delicious-post-dialog-use_password_manager').setAttribute('checked',true);
    }
    else {
      aeUtils.log("delicious_post_dialog_init(): no password was saved for user " + username);
    }
  }

  var privBkmksEnabled = preferencesService.getBoolPref("extensions.aecreations.deliciouspost.allow_private_bookmarks");
  if (privBkmksEnabled) {
    var privateBkmkElt = document.getElementById("delicious-post-dialog-private");
    privateBkmkElt.hidden = false;

    var alwaysPrivate = Application.prefs.getValue("extensions.aecreations.deliciouspost.always_private", false);
    if (alwaysPrivate) {
      privateBkmkElt.checked = true;
    }
  }

  var description = dlgArgs.desc; // this is passed to the dialog by the delicious_post_submit() function in context.js
  var url = dlgArgs.url;
  var notes = dlgArgs.notes;
	
  // set the values in the dialog
  document.getElementById('delicious-post-dialog-username').value = username;
  document.getElementById('delicious-post-dialog-url').value = url;
document.getElementById('delicious-post-dialog-description').value = description;
  document.getElementById('delicious-post-dialog-extended').value = notes;

  // Set initially-focused dialog box field
  var dlgField;
  if (Application.prefs.getValue('extensions.aecreations.deliciouspost.initial_focus_on_url_field', false)) {
    dlgField = document.getElementById('delicious-post-dialog-url');
  }
  else {
    dlgField = document.getElementById('delicious-post-dialog-tags');
  }

  dlgField.select();
  dlgField.focus();
}


function delicious_post_dialog_accept() {

  function getEncodedStr(aString)
  {
    let isDblEncodeSpecChars = Application.prefs.getValue("extensions.aecreations.deliciouspost.double_encode_special_chars", true);
    if (! isDblEncodeSpecChars) {
      return aString;
    }

    // See <https://github.com/zmanring/chrome-ext-delicious/pull/56> for
    // how an author of a Delicious extension for Google Chrome handled an
    // issue similar to Delicious Post issue #2.
    let rv = "";
    let strArray = aString.split("");

    if (typeof(aString) === "string") {
      for (let i = 0; i < aString.length; i++) {
	if (aString.charCodeAt(i) > 127) {
	  let chr = "";

	  // Handling of some commonly-used special chars that aren't decoded
	  // properly by Delicious after posting.
	  switch (aString.charCodeAt(i)) {
	  case 0x2018: // Left single quotation mark
	  case 0x2019: // Right single quotation mark
	    chr = "'";
	    break;
	  case 0x2014: // Em dash
	    chr = "--";
	    break;
	  case 0x00AB:  // Left-pointing double angle quotation mark
	    chr = "<<";
	    break;
	  case 0x00BB:  // Right-pointing double angle quotation mark
	    chr = ">>";
	    break;
	  case 0x25B6:  // Black right-pointing triangle
	    chr = "";   // (used in YouTube page titles for playing videos)
	    break;
	  case 0x2022:  // Bullet
	  case 0x00B7:  // Middle dot
	    chr = "-";
	    break;
	  default:
	    chr = strArray[i];
	    break;
	  }
	  rv += encodeURIComponent(chr);
	}
	else {
	  rv += strArray[i];
	}
      }
    }
    return rv;
  }


  delicious_postDialog();
	
  // general stuff
  var strBundle=document.getElementById('delicious-post-stringbundle');

  // get values entered in the form
  var username=document.getElementById('delicious-post-dialog-username').value;
  var password=document.getElementById('delicious-post-dialog-password').value;

  // minimal sanity check
  if ((username=='')||(password=='')) {
    delicious_resetDialog(1);
    alertEx(strBundle.getString('supplyLogin'));
    return false;
  }

  var url=document.getElementById('delicious-post-dialog-url').value;
  var description=document.getElementById('delicious-post-dialog-description').value;
  var extended=document.getElementById('delicious-post-dialog-extended').value;
  var tags=document.getElementById('delicious-post-dialog-tags').value;

  // handle the login saving stuff first
  const preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");
  preferencesService.setCharPref('extensions.aecreations.deliciouspost.username',username);
  if (document.getElementById('delicious-post-dialog-use_password_manager').checked==true) {

    // Save new login
    if (! oldpswd) {
      saveLogin(username, password);
    }
    // Modify existing login
    if (oldpswd && password != oldpswd) {
      updateLogin(username, oldpswd, password);
    }

    preferencesService.setBoolPref('extensions.aecreations.deliciouspost.use_password_manager',true);
  } else {
    // Remove saved password
    deleteLogin(username);
    preferencesService.setBoolPref('extensions.aecreations.deliciouspost.use_password_manager',false);
  }

  // work out the correct ISO datestamp (no need for timezone offset, we're using UTC throughout)
  var d = new Date();
  var isodatestamp = delicious_post_pad0(d.getUTCFullYear(),4)+'-'+delicious_post_pad0((d.getUTCMonth()+1),2)+'-'+delicious_post_pad0(d.getUTCDate(),2)+'T'+delicious_post_pad0(d.getUTCHours(),2)+':'+delicious_post_pad0(d.getUTCMinutes(),2)+':'+delicious_post_pad0(d.getUTCSeconds(),2)+'Z';

  var privateBkmk = document.getElementById("delicious-post-dialog-private").checked;

  // build the entire query string
  var querystring = aeConstants.DELICIOUS_API_URL 
    + 'posts/add?url=' + encodeURIComponent(url) 
    + '&description=' + encodeURIComponent(getEncodedStr(description)) 
    + '&extended=' + encodeURIComponent(getEncodedStr(extended))
    + '&tags=' + encodeURIComponent(tags) 
    + '&dt=' + isodatestamp;

  if (privateBkmk) {
    querystring += "&shared=no";
  }

  if (dlgArgs.keepExisting) {
    querystring += "&replace=no";
  }
  else {
    querystring += "&replace=yes";
  }

  // Encode the username and password as they will be sent as part of the
  // HTTP request
  username = encodeURIComponent(username);
  password = encodeURIComponent(password);

  // Fix those pesky single and double quotes.
  querystring = querystring.replace(/\'/g, "%27");
  querystring = querystring.replace(/\"/g, "%22");
  
  var debugMsg = "URL:\t\t" + url + "\nDescription:\t" + description + "\nNotes:\t" + extended + "\nPrivate:\t" + privateBkmk + "\n\nQuery string: \"" + querystring + "\"";

  if (dlgArgs.bkgrdSave) {
    debugMsg = "Saving new del.icio.us bookmark in the background.\n\n" + debugMsg;
    dlgArgs.requestURL = querystring;
    dlgArgs.userid = username;
    dlgArgs.pswd = password;

    aeUtils.log(debugMsg);

    var hostAppWnd = window.opener;

    // If the originating browser window was closed prior to the user clicking
    // Post, then just post the URL from this dialog
    if (! hostAppWnd.closed) {
      if (hostAppWnd && hostAppWnd.aecreations && hostAppWnd.aecreations.deliciousPost) {
	var aeDeliciousPost = hostAppWnd.aecreations.deliciousPost;
	aeDeliciousPost.postBookmark(querystring, username, password);

	return true;
      }
      else {
	// This should never happen
	window.alert("Error: Cannot find Delicious Post overlay object");
	return true;
      }
    }
  }

  // start a new XMLHttpRequest 
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.mozBackgroundRequest = true;

  xmlhttp.open('GET',querystring,true,username,password);

  xmlhttp.onreadystatechange = function (aEvent) {
    var dlgElt = document.getElementById("delicious-post-dialog");
    var errMsg;

    if (xmlhttp.readyState == 1) {  // loading
      aeUtils.log("readyState = 1");
      dlgElt.style.cursor = "wait";
    }
    else if (xmlhttp.readyState == 4) {  // completed
      aeUtils.log("readyState = 4");
      dlgElt.style.cursor = "auto";
      
      if (xmlhttp.status == 200) { // http ok
	var responseXML = xmlhttp.responseXML;
	if (! responseXML) {
	  alertEx(strBundle.getString("noResponse"));
	  return;
	}

	var result = responseXML.getElementsByTagName("result");
	var errMsg;

	if (result && result.length > 0) {
	  var resultCode = result[0].getAttribute("code");

	  if (resultCode == aeConstants.RESULTCODE_DONE) {
	    window.close();
	  }
	  else if (resultCode == aeConstants.RESULTCODE_ITEM_ALREADY_EXISTS) {
	    errMsg = strBundle.getString("itemAlreadyExists");
	  }
	  else {
	    errMsg = strBundle.getFormattedString("postFailedResult",
						  [resultCode]);
	  }
	}

	if (errMsg) {
	  alertEx(errMsg);
	}
	window.close();
      }
      else {
	aeUtils.log("Delicious Post: HTTP status code: " + xmlhttp.status);
	try {  // Exception thrown if no network connection
	  switch (xmlhttp.status) {
	  case 0:
	    errMsg = strBundle.getString("connectionError");
	    break;
	    
	  case 503:
	    errMsg = strBundle.getString("statusthrottled");
	    break;

	  case 401:
	  case 403:
	    errMsg = strBundle.getString("statusauthenticationfailed");
	    break;

	  default:
	    errMsg = strBundle.getFormattedString("postFailedHTTPStatus", [req.status, req.statusText]);
	    break;
	  }
	}
	catch (e if e.result == Components.results.NS_ERROR_NOT_AVAILABLE) {
	  errMsg = strBundle.getString("connectionError");
	}
	catch (e) {
	  errMsg = strBundle.getString("unexpectedError");
	}
	alertEx(errMsg);
	delicious_resetDialog(0);
      }
    }
  };

  xmlhttp.send(null);
  return false;
}


function delicious_post_dialog_cancel() {
  Application.prefs.setValue("extensions.aecreations.deliciouspost.submit_dlg_coords", window.screenX + "," + window.screenY);
  dlgArgs.userCancel = true;
  return true;
}


function delicious_autofillPassword(username) {
  if (document.getElementById('delicious-post-dialog-use_password_manager').checked==true) {
    var password = getPassword(username);
    document.getElementById('delicious-post-dialog-password').setAttribute('value',password);
  }
}

// helper function to pad numbers to required length (http://www.propix.hu/www/Clock/Clock.html)
function delicious_post_pad0(string, newlength) {
  var pad = '';
  var len = newlength-String(string).length;
  var i;
  for (i = 0; i<len; i++) {
    pad += '0';
  }
  return pad+string;
}


function delicious_postDialog() {	
  // temporarily disable accept/cancel buttons
  var dlg = document.getElementById('delicious-post-dialog');
  dlg.setAttribute('wait-cursor', true);
  dlg.getButton('accept').setAttribute('disabled', true);
}


function delicious_resetDialog(index) {
  var dlg = document.getElementById('delicious-post-dialog');
  dlg.removeAttribute('wait-cursor');
  dlg.getButton('accept').setAttribute('disabled', false);
  document.getElementById('delicious-post-dialog-tabbox').setAttribute('selectedIndex', index);
}



