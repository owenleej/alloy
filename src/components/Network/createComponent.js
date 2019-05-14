import createPayload from "./createPayload";
import createResponse from "./createResponse";
import defer from "../../utils/defer";

export default ({ config, logger }, networkStrategy) => {
  let lifecycle;

  const handleResponse = ({ body, promise }) => {
    return new Promise(resolve => resolve(createResponse(JSON.parse(body))))
      .then(({ requestId, handle }) => {
        return Promise.all(
          handle.map(({ type, payload }) =>
            lifecycle.onResponseFragment(requestId, type, payload)
          )
        );
      })
      .catch(e => {
        logger.warn(e);
      })
      .finally(() => {
        if (promise) {
          promise.then(handleResponse);
        }
      });
  };

  const { collectionUrl, propertyId } = config;
  return {
    namespace: "Network",
    lifecycle: {
      onComponentsRegistered({ lifecycle: coreLifecycle }) {
        lifecycle = coreLifecycle;
      }
    },
    /**
     *
     * @param {boolean} beacon - true to send a beacon (defaults to false).  If you send
     *   a beacon, no data will be returned.
     *
     * @returns {
     *   send: call this function when you are ready to send the payload
     *   payload: payload object that will be sent
     *   complete: promise that will resolve after data from the server is all processed
     *   response: promise that resolves with the returned raw response string as body
     *   beacon: boolean with whether or not it was called with beacon = true
     * }
     *
     * Once send is called, the lifecycle method "onBeforeSend" will be triggered with
     * { payload, response, beacon } as the parameter.
     *
     * When the response is returned it will call the lifecycle method "onResponseFragment"
     * for each of the response fragements returned from the response.
     */
    newRequest(beacon = false) {
      const payload = createPayload({ beacon });
      const action = beacon ? "collect" : "interact";
      const url = `${collectionUrl}/${propertyId}/${action}`;
      const deferred = defer();
      const response = deferred.promise
        .then(() => lifecycle.onBeforeSend({ payload, response, beacon }))
        .then(() => networkStrategy(url, JSON.stringify(payload), beacon));

      const complete = beacon ? response : response.then(handleResponse);
      return { payload, complete, response, send: deferred.resolve, beacon };
    }
  };
};
