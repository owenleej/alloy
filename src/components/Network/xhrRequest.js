export default XMLHttpRequest => {
  return (url, json) => {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status >= 200 && request.status < 300) {
            resolve({ body: request.responseText });
          } else {
            reject(
              Error(
                `Invalid response code ${request.status}. Response was ${
                  request.responseText
                }.`
              )
            );
          }
        }
      };
      request.responseType = "text";
      request.open("POST", url, true);
      request.setRequestHeader("Content-Type", "application/json");
      request.withCredentials = false;
      request.onerror = reject;
      request.onabort = reject;
      request.send(json);
    });
  };
};
