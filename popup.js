document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["extractTitle.js"],
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const query = results[0].result;
          chrome.runtime.sendMessage({ action: "searchSpotify", query });
        } else {
          document.getElementById("error").style.display = "block";
        }
      }
    );
  });
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showResult") {
      const track = message.track;
      if (track) {
        document.getElementById("result").style.display = "block";
        document.getElementById("play-song").onclick = () => {
          chrome.tabs.create({ url: track.external_urls.spotify });
        };
        document.getElementById("like-song").onclick = () => {
          // Store track ID for later use during OAuth flow
          chrome.storage.local.set({ trackId: track.id }, () => {
            chrome.runtime.sendMessage({
              action: "initiateOAuth",
              trackId: track.id,
            });
          });
        };
      } else {
        document.getElementById("error").style.display = "block";
      }
    } else if (message.action === "showAlert") {
      alert(message.text);
    }
  });
});