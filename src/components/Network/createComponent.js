import createPayload from "./createPayload";
import createResponse from "./createResponse";

export default ({ config }, networkStrategy) => {
  let lifecycle;

  const handleResponse = (resolve, reject) => ({
    body,
    promise: networkPromise
  }) => {
    let promise;
    if (networkPromise) {
      promise = new Promise((nextResolve, nextReject) => {
        networkPromise
          .then(handleResponse(nextResolve, nextReject))
          .catch(({ nextBody, nextException }) =>
            // eslint-disable-next-line prefer-promise-reject-errors
            nextReject({ body: nextBody, exception: nextException })
          );
      });
    }
    try {
      const response = createResponse(JSON.parse(body));
      resolve({ response, promise });
      const { requestId, handle } = response;
      handle.forEach(({ type, payload }) => {
        lifecycle.onResponseFragment(requestId, type, payload);
      });
    } catch (exception) {
      // We need to be able to pass the promise inside the reject so that clients can handle
      // success and failure of the next streaming response.
      // eslint-disable-next-line prefer-promise-reject-errors
      reject({ body, promise, exception });
    }
  };

  const { collectionUrl, propertyId } = config;
  return {
    namespace: "Network",
    lifecycle: {
      onComponentsRegistered({ lifecycle: coreLifecycle }) {
        lifecycle = coreLifecycle;
      }
    },
    newRequest(beacon = false) {
      let send;
      const payload = createPayload({ beacon });
      const promise = new Promise((resolve, reject) => {
        send = () => {
          const action = beacon ? "collect" : "interact";
          const url = `${collectionUrl}/${propertyId}/${action}`;
          lifecycle.onBeforeSend({ payload, promise, beacon });
          const networkPromise = networkStrategy(url, payload.toJson());
          networkPromise
            .then(handleResponse(resolve, reject))
            // eslint-disable-next-line prefer-promise-reject-errors
            .catch(({ body, exception }) => reject({ body, exception }));
        };
      });

      return { payload, promise, send, beacon };
    }
  };
};
