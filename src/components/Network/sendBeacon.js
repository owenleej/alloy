import isFunction from "../../utils/isFunction";

export default window => {
  if (!isFunction(window.navigator.sendBeacon)) {
    return {
      canHandle: () => false,
      call: () => {
        return new Promise((resolve, reject) => {
          reject("sendBeacon is not supported on this browser.");
        });
      }
    };
  }

  return {
    canHandle: (url, json, responseRequired) => !responseRequired,
    call: (url, json) => {
      return new Promise((resolve, reject) => {
        const blob = new Blob([json], { type: "application/json" });
        if (!window.navigator.sendBeacon(url, blob)) {
          reject(Error("Unable to send beacon."));
          return;
        }
        resolve();
      });
    }
  };
};
