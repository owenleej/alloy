const browserSupportsXmlHttpRequest = XMLHttpRequest => {
  if (typeof XMLHttpRequest !== "undefined") {
    if ("withCredentials" in new XMLHttpRequest()) {
      return true;
    }
  }
  return false;
};

export default XMLHttpRequest => {
  if (!browserSupportsXmlHttpRequest(XMLHttpRequest)) {
    return {
      canHandle: () => false,
      call: () =>
        new Promise((resolve, reject) => {
          reject("This browser does not support XMLHttpRequest.");
        })
    };
  }

  return {
    canHandle: () => true,
    call: (url, json) => {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
          if (request.readyState == 4) {
            if (request.status == 200) {
              resolve(request.responseText);
            } else {
              reject(Error(request.responseText));
            }
          }
        };
        request.open("POST", url, true);
        request.withCredentials = true;
        request.send(json);
      });
    }
  };
};
