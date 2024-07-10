chrome.runtime.onInstalled.addListener(() => {});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "searchSpotify") {
    const track = await searchSpotify(message.query);
    chrome.runtime.sendMessage({ action: "showResult", track });
  } else if (message.action === "initiateOAuth") {
    initiateOAuth(message.trackId);
  } else if (message.action === "likeSong") {
    const result = await likeSong(message.trackId);
    if (result) {
      chrome.runtime.sendMessage({
        action: "showAlert",
        text: "Song added to your liked songs on Spotify",
      });
    } else {
      chrome.runtime.sendMessage({
        action: "showAlert",
        text: "Failed to like the song on Spotify",
      });
    }
  }
});

async function initiateOAuth(trackId) {
  try {
    const redirectUri = chrome.runtime.getManifest().oauth2.redirect_uri;
    const clientId = chrome.runtime.getManifest().oauth2.client_id;
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=user-library-modify`;

    const redirectUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        (url) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(url);
          }
        }
      );
    });
    console.log(redirectUri);
    const urlParams = new URLSearchParams(new URL(redirectUrl).search);
    const code = urlParams.get("code");

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            btoa(
              "bca55857921347a5bd60a8bdffff55db:a8985e8595674a9a8343500504dbecf7"
            ),
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}`,
      }
    );

    const data = await tokenResponse.json();
    chrome.storage.local.set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    // Call likeSong after authorization
    const result = await likeSong(trackId);
    if (result) {
      chrome.runtime.sendMessage({
        action: "showAlert",
        text: "Song added to your liked songs on Spotify",
      });
    } else {
      chrome.runtime.sendMessage({
        action: "showAlert",
        text: "Failed to like the song on Spotify",
      });
    }
  } catch (error) {
    console.error(error);
  }
}

async function searchSpotify(query) {
  const client_id = "bca55857921347a5bd60a8bdffff55db";
  const client_secret = "a8985e8595674a9a8343500504dbecf7";
  const auth = btoa(`${client_id}:${client_secret}`);

  try {
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: "grant_type=client_credentials",
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to fetch the Spotify token");
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=track`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error("Failed to search for the song on Spotify");
    }

    const searchData = await searchResponse.json();
    if (
      searchData &&
      searchData.tracks &&
      searchData.tracks.items &&
      searchData.tracks.items.length > 0
    ) {
      return searchData.tracks.items[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function likeSong(trackId) {
  try {
    const { accessToken } = await new Promise((resolve) => {
      chrome.storage.local.get("accessToken", resolve);
    });

    if (!accessToken) {
      console.error("No access token found");
      return false;
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?ids=${trackId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to like the song on Spotify");
    }

    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}
