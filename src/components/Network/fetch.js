export default fetch => {
  return (url, json) => {
    return fetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json"
      },
      referrer: "client",
      body: json
    })
    .then(response => {
      if (response.ok) {
        return response.text();
      }
      throw Error(`Bad response code: ${response.code}`);
    })
    .then(text => Promise.resolve({ body: text }));
  };
};
