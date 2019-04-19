import isFunction from "../../utils/isFunction";

export default window => {
  return (url, json) => {
    const fetchPromise = window.fetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json"
      },
      referrer: "client",
      body: json
    });
    return new Promise((resolve, reject) => {
      fetchPromise
        .then(response => {
          if (response.ok) {
            resolve({ body: response.body.text });
          } else {
            reject({ body: response.body.text });
          }
        })
        .catch(error => {
          reject({ error });
        });
    });
  };

  if (!isFunction(window.fetch)) {
    return {
      canHandle: () => false,
      call: () => {
        throw new Exception("fetch is not supported on this browser.");
      }
    };
  }

  return {
    canHandle: () => true,
    call: (url, json) => {
      return window.fetch(url, {
        method: "POST",
        cache: "no-cache",
        headers: {
          "Conent-Type": "application/json"
        },
        referrer: "client",
        body: json
      });
    }
  };
};
