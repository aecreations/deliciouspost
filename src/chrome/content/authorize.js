/* -*- mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

Components.utils.import("resource://aedeliciouspost/modules/aeUtils.js");

const REDIR_URL = "http://aecreations.sourceforge.net/deliciouspost/postauth.html";
const APP_SECRET = "46adc8e98427262b3af685a40a1cf33d";
const APP_KEY = "5c9b5a268dc12abd7c71c026dffe9353";

var gOAuthWnd, gTimerID;


function deliciousOAuth()
{
  let oauthURL = "https://delicious.com/auth/authorize?client_id=" + APP_KEY + "&redirect_uri=" + REDIR_URL;

  gOAuthWnd = window.open(oauthURL, "aedeliciouspost_auth", "titlebar,location,scrollbars,resizable,width=640,height=320");

  gTimerID = window.setInterval(function (e) { checkIfRedirected() }, 5000);
}


function checkIfRedirected()
{
  if (!gOAuthWnd || gOAuthWnd.closed) {
    window.clearInterval(gTimerID);
    aeUtils.beep();
    aeUtils.log("AE Delicious Post: Authentication browser window closed: User Cancel");
    return;
  }

  var url = gOAuthWnd.location.href;
  url = url.substr(0, url.lastIndexOf("?"));

  aeUtils.log("AE Delicious Post: Authentication browser window URL (without the query string: " + url + "\n\nFull URL: " + gOAuthWnd.location.href);

  if (url == REDIR_URL) {
    let queryStr = gOAuthWnd.location.search;
    let requestToken = queryStr.substr(queryStr.indexOf("=") + 1);

    window.clearInterval(gTimerID);
    gOAuthWnd.close();

    aeUtils.log("Retrieved request token: " + requestToken);

    getAccessToken(requestToken);
  }
}


function getAccessToken(aRequestToken)
{
  // TO DO: This doesn't seem to work.
  var reqURL = "https://avosapi.delicious.com/api/v1/oauth/token?client_id=" + APP_KEY + "&client_secret=" + APP_SECRET + "&grant_type=code&code=" + aRequestToken + "&redirect_uri=" + REDIR_URL;

  aeUtils.log("AE Delicious Post: Exchanging request token for access token");
  aeUtils.log("Request URL:\n" + reqURL);

  var req = new XMLHttpRequest();
  //req.mozBackgroundRequest = true;
  //req.responseType = "json";

  // Make an asynchronous request
  req.open('GET', reqURL, true);

  req.onreadystatechange = function (aEvent) {
    if (req.readyState == 1       // send() has not been called yet
        || req.readyState == 2    // send() called; headers/status available
        || req.readyState == 3) { // Downloading response
      aeUtils.log("AE Delicious Post: State = " + req.readyState);
    }
    else if (req.readyState == 4) { // completed
      if (req.status == 200) {  // HTTP 200 - ok
        aeUtils.log("AE Delicious Post: HTTP 200 - ok\nRetrieving response");
        
        if (req.response) {
          var respTxt = req.responseText;
          aeUtils.log("Response: " + respTxt);
          /***
          var resp = req.response;
          var accessToken = resp["access_token"];
          window.alert("Successfully retrieved access token from Delicious!\nAccess token: " + accessToken);
          ***/
        }
        else {
          window.alert("No response from Delicious. Unable to retrieve access token!");
        }
      }
      else {
        var errStr = "HTTP status " + req.status + ": " + req.statusText;
        window.alert(errStr);
        aeUtils.log("AE Delicious Post:\n" + errStr);
      }
    }
  };

  req.send(null);
}


