
if (! ("aecreations" in window)) {
  window.aecreations = {};
}

if (! ("deliciousPost" in window.aecreations)) {
  window.aecreations.deliciousPost = {};
}
else {
  throw new Error("deliciousPost object already defined");
}


window.aecreations.deliciousPost = {
  _strBundle: null,
  _saveProgressIndicatorEnabled: false,

  
  handleEvent: function (aEvent)
  {
    var that = window.aecreations.deliciousPost;
      
    if (aEvent.type == "load") {
      that.init();
    }
    else if (aEvent.type == "unload") {
      // Must remove event listener references on unload to prevent
      // memory leaks.
      window.removeEventListener("load", that, false);
      window.removeEventListener("unload", that, false);
      document.getElementById("contentAreaContextMenu")
              .removeEventListener("popupshowing", 
				   that.initContentAreaContextMenu, false);

      if (that._saveProgressIndicatorEnabled) {
	that.destroySaveProgressIndicator();
      }
    }
  },


  isAustralisUI: function ()
  {
    return document.getElementById("PanelUI-menu-button") != null;
  },


  init: function ()
  {
    this._strBundle = document.getElementById("ae-deliciouspost-strings");
    this.initSaveProgressIndicator();

    var cxtMenu = document.getElementById('contentAreaContextMenu');
    cxtMenu.addEventListener('popupshowing', this.initContentAreaContextMenu, false);

    // Shortcut key to invoke the Post to Delicious dialog
    var keyEnabled = Application.prefs.getValue("extensions.aecreations.deliciouspost.enable_shortcut_key", true);
    var keyElt = document.getElementById("ae_key_postToDelicious");
    
    if (!keyEnabled && keyElt) {
      document.getElementById("mainKeyset").removeChild(keyElt);
    }
    let firstRun = Application.prefs.getValue("extensions.aecreations.deliciouspost.first_run", true);

    if (firstRun) {
      this.aeUtils.log("It appears that this is the first time you are running Delicious Post.  Welcome!");

      let toolbarBtnElt = document.getElementById("ae-deliciouspost-toolbarbutton");
      let browserNavBarElt = document.getElementById("nav-bar");
      if (browserNavBarElt && !toolbarBtnElt) {
	// Automatically add the Post to Delicious toolbar button to the
	// browser navigation bar, but only if it was not already added.
	browserNavBarElt.insertItem("ae-deliciouspost-toolbarbutton");
	browserNavBarElt.setAttribute("currentset", browserNavBarElt.currentSet);
	document.persist("nav-bar", "currentset");
      }

      Application.prefs.setValue("extensions.aecreations.deliciouspost.first_run", false);
    }
  },


  initContentAreaContextMenu: function (aEvent)
  {
    var cxtPage = document.getElementById("ae-deliciouspost-context-page");
    var cxtLink = document.getElementById("ae-deliciouspost-context-link");
    cxtPage.setAttribute("hidden", gContextMenu.onLink);
    cxtLink.setAttribute("hidden", !gContextMenu.onLink);
  },


  submit: function ()
  {
    var url, desc;
    var tabbrowser = document.getElementById("content");

    if (gContextMenu && gContextMenu.onLink) {
      var link =  gContextMenu.target;
      url = makeURLAbsolute(document.commandDispatcher.focusedWindow.document.location, link.getAttribute('href'));
      desc = gContextMenu.linkText();
    } 
    else {
      url = window.content.document.location.href;
      desc = window.content.document.title;
    }

    var notes = "";
    var selection = tabbrowser.selectedBrowser.contentWindow.getSelection();
    var notesFromSelectionEnabled = Application.prefs.getValue("extensions.aecreations.deliciouspost.notes_from_selection", true);

    if (notesFromSelectionEnabled && selection) {
      notes = selection;
    }

    var bkgrdSaveEnabled = Application.prefs.getValue("extensions.aecreations.deliciouspost.background_save", true);
    var replaceExistingBkmk = Application.prefs.getValue("extensions.aecreations.deliciouspost.replace_existing_bookmark", false);
    
    var modelessDlg = Application.prefs.getValue("extensions.aecreations.deliciouspost.modeless_submit", true);
    var wndFeatures = 'chrome';
    wndFeatures += modelessDlg ? "" : ",modal";

    var dlgArgs = {
      // in params
      url:          url,
      desc:         desc,
      notes:        notes,
      bkgrdSave:    bkgrdSaveEnabled,
      keepExisting: !replaceExistingBkmk,
      isModeless:   modelessDlg,

      // out params
      requestURL:  "",
      userid:      "",
      pswd:        "",
      userCancel:  false
    };

    var dlg = window.openDialog('chrome://aedeliciouspost/content/submit.xul',
				'aedelicious_submit_dlg', 
				wndFeatures, dlgArgs);
    dlg.focus();
  },


  postBookmark: function (aRequestURL, aDeliciousUserID, aDeliciousPswd)
  {
    var errMsg;
    var req = new XMLHttpRequest();
    req.mozBackgroundRequest = true;

    // Make an asynchronous request
    req.open('GET', aRequestURL, true, aDeliciousUserID, aDeliciousPswd);
    
    this.showSaveProgressIndicator();
    this.setSaveProgressIndicatorStatus(this.aeConstants.SAVESTATUS_SAVING)

    req.onreadystatechange = function (aEvent) {
      var that = window.aecreations.deliciousPost;
      that.aeUtils.log("AE Delicious Post: req.readyState = " + req.readyState);

      var progressIndDelay = that.aeConstants.PROGRESS_INDICATOR_DELAY;
      var showNotification = Application.prefs.getValue("extensions.aecreations.deliciouspost.show_notification", true);

      if (req.readyState == 1       // send() has not been called yet
	  || req.readyState == 2    // send() called; headers/status available
	  || req.readyState == 3) { // Downloading response
	// NOTE: This event handler doesn't seem to be firing on the above
	// 'readyState' values.
	that.showSaveProgressIndicator();
	that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_SAVING);
      }
      else if (req.readyState == 4) { // completed
	if (req.status == 200) {  // http 200 - ok
	  var responseXML = req.responseXML;
	  if (! responseXML) {
	    that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_FAILURE);
	    that.alert(that._strBundle.getString("noResponse"));
	    that.hideSaveProgressIndicator();
	    return;
	  }

	  var result = responseXML.getElementsByTagName("result");
	  if (result && result.length > 0) {
	    var resultCode = result[0].getAttribute("code");
	    if (resultCode == that.aeConstants.RESULTCODE_DONE) {
	      that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_SUCCESS);
	    }
	    else {
	      that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_FAILURE);

	      if (resultCode == that.aeConstants.RESULTCODE_ITEM_ALREADY_EXISTS) {

		if (showNotification) {
		  that.showNotificationMsg(that._strBundle.getString("itemAlreadyExists"));
		  window.setTimeout(function (aEvent) { window.aecreations.deliciousPost.hideSaveProgressIndicator() }, progressIndDelay);
		  return;
                }
		errMsg = that._strBundle.getString("itemAlreadyExists");
	      }
	      else {
		errMsg = that._strBundle.getFormattedString("postFailedResult",
							    [resultCode]);
	      }
	    }
	  }
	  else {
	    errMsg = that._strBundle.getString("unexpectedError");
	    that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_FAILURE);
	  }

	  if (errMsg) {
	    that.alert(errMsg);
	    that.hideSaveProgressIndicator();
	    return;
	  }
	  that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_SUCCESS);
	  if (showNotification) {
	    that.showNotificationMsg(that._strBundle.getString("statussuccess"));
	  }
	}
	// HTTP error (response code other than 200)
	else {
	  that.aeUtils.log("Delicious Post: HTTP status code: " + req.status);
	  try {
	    switch (req.status) {
	    case 0:
	      errMsg = that._strBundle.getString("connectionError");
	      that.aeUtils.log("req.status: case 0");
	      break;
	    case 503:
	      errMsg = that._strBundle.getString('statusthrottled');
	      break;
	    case 401:
	    case 403:
	      errMsg = that._strBundle.getString('statusauthenticationfailed');
	      break;
	    default:
	      errMsg = that._strBundle.getFormattedString("postFailedHTTPStatus", [req.status, req.statusText]);
	      break;
	    }
	  }
	  catch (e if e.result == Components.results.NS_ERROR_NOT_AVAILABLE) {
	    errMsg = that._strBundle.getString("connectionError");
	  }
	  catch (e) {
	    errMsg = that._strBundle.getString("unexpectedError");
	  }

	  that.setSaveProgressIndicatorStatus(that.aeConstants.SAVESTATUS_FAILURE);
	  that.alert(errMsg);
	  progressIndDelay = 1;
	}

	window.setTimeout(function (aEvent) { window.aecreations.deliciousPost.hideSaveProgressIndicator() }, progressIndDelay);
      }
    };

    req.send(null);
  },

  
  initSaveProgressIndicator: function ()
  {
    if (this.isAustralisUI()) {
      this.AddonManager.getAddonByID(this.aeConstants.S4E_EXTENSION_ID, function (aAddon) {
	if (aAddon && aAddon.isActive) {
          let that = window.aecreations.deliciousPost;
          that.aeUtils.log("AE Delicious Post: Status-4-Evar extension has been detected, and is currently active.");
          that._saveProgressIndicatorEnabled = true;
	}
      });
    }
  },


  setSaveProgressIndicatorStatus: function (aStatus)
  {
    let showProgressIndicatorIcon = Application.prefs.getValue("extensions.aecreations.deliciouspost.show_progress_icon", true);

    if (!this._saveProgressIndicatorEnabled || !showProgressIndicatorIcon) {
      return;
    }

    if (CustomizableUI.getPlacementOfWidget("ae-deliciouspost-save-progress") != null) {
      CustomizableUI.destroyWidget("ae-deliciouspost-save-progress");
    }

    try {
      CustomizableUI.createWidget({
	id: "ae-deliciouspost-save-progress",
        type: "custom",
        defaultArea: this.aeConstants.S4E_STATUSBAR_AREA_ID,
        onBuild: function (aDocument) {
          let that = aDocument.defaultView.aecreations.deliciouspost;
          let statusBarPanel = aDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "statusbarpanel");
          statusBarPanel.id = "ae-deliciouspost-save-progress";
	  statusBarPanel.className = "statusbarpanel-iconic";
          statusBarPanel.setAttribute("status", aStatus);

          return statusBarPanel;
        }
      });
    }
    catch (e) {
      this.aeUtils.log("AE Delicious Post: Exception thrown by CustomizableUI.createWidget(): " + e); 
    }
  },


  showSaveProgressIndicator: function ()
  {
    let showProgressIndicatorIcon = Application.prefs.getValue("extensions.aecreations.deliciouspost.show_progress_icon", true);
    if (this._saveProgressIndicatorEnabled && showProgressIndicatorIcon) {
      // ...
    }
  },


  hideSaveProgressIndicator: function ()
  {
    let showProgressIndicatorIcon = Application.prefs.getValue("extensions.aecreations.deliciouspost.show_progress_icon", true);
    if (this._saveProgressIndicatorEnabled && showProgressIndicatorIcon) {
      CustomizableUI.destroyWidget("ae-deliciouspost-save-progress");
    }
  },


  //
  // Utility methods
  //

  showNotificationMsg: function (aMessage)
  {
    let alertsSvc = Components.classes["@mozilla.org/alerts-service;1"]
                              .getService(Components.interfaces
                                                    .nsIAlertsService);
    try {
      alertsSvc.showAlertNotification("chrome://aedeliciouspost/skin/images/icon.png", this._strBundle.getString("appName"), aMessage);
    }
    catch (e) {}
  },


  alert: function (aMessage)
  {
    // TEMPORARY
    // Putting the call to nsIPromptService here until I have time to figure
    // out why it isn't working when invoked from aeUtils module
    var title = this._strBundle.getString("appName");
    var prmpt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
    prmpt.alert(window, title, aMessage);
    // END TEMPORARY
  }
};

Components.utils.import("resource://gre/modules/AddonManager.jsm",
			window.aecreations.deliciousPost);
Components.utils.import("resource://aedeliciouspost/modules/aeUtils.js",
			window.aecreations.deliciousPost);
Components.utils.import("resource://aedeliciouspost/modules/aeConstants.js",
                        window.aecreations.deliciousPost);

window.addEventListener("load", window.aecreations.deliciousPost, false);
window.addEventListener("unload", window.aecreations.deliciousPost, false);


