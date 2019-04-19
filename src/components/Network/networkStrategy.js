export default window => {
  return (url, json) => {
    return window.fetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Conent-Type": "application/json"
      },
      referrer: "client",
      body: json
    });
  };
};
