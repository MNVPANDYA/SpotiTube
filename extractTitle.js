function getYouTubeTitle() {
  if (window.location.hostname !== "www.youtube.com") {
    return null;
  }
  const titleElement = document.querySelector("head > title");
  //console.log(titleElement.innerHTML);
  return titleElement.innerHTML;
}

getYouTubeTitle();
