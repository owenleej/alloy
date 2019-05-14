import xhrRequestFactory from "./xhrRequest";
import fetchFactory from "./fetch";
import sendBeaconFactory from "./sendBeacon";
import isFunction from "../../utils/isFunction";

export default window => {
  const fetch = isFunction(window.fetch)
    ? fetchFactory(window.fetch)
    : xhrRequestFactory(window.XMLHttpRequest);
  const sendBeacon =
    window.navigator && isFunction(window.navigator.sendBeacon)
      ? sendBeaconFactory(window.navigator)
      : fetch;

  return (url, json, beacon) => {
    if (beacon) {
      return sendBeacon(url, json, beacon);
    }
    return fetch(url, json, beacon);
  };
};
