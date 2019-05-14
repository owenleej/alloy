export default navigator => {
  return (url, json) => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([json], { type: "text/plain; charset=UTF-8" });
      if (!navigator.sendBeacon(url, blob)) {
        reject(Error("Unable to send beacon."));
        return;
      }
      resolve();
    });
  };
};
