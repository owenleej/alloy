import createComponent from "../../../../src/components/Network/createComponent";

describe("Network::createComponent", () => {
  const config = {
    collectionUrl: "https://alloy.mysite.com/v1",
    propertyId: "mypropertyid"
  };

  const nullLifecycle = {
    onBeforeSend: () => undefined,
    onResponseFragment: () => undefined
  };

  it("calls interact by default", done => {
    const networkStrategy = url => {
      return new Promise(() => {
        expect(url).toEqual(
          "https://alloy.mysite.com/v1/mypropertyid/interact"
        );
        done();
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { send, beacon } = component.newRequest();
    expect(beacon).toBeFalse();
    send();
  });

  it("can call collect", done => {
    const networkStrategy = url => {
      return new Promise(() => {
        expect(url).toEqual("https://alloy.mysite.com/v1/mypropertyid/collect");
        done();
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { send, beacon } = component.newRequest(true);
    expect(beacon).toBeTrue();
    send();
  });

  it("sends the payload", done => {
    const networkStrategy = (url, json) => {
      return new Promise(() => {
        expect(JSON.parse(json).events[0]).toEqual({ id: "myevent1" });
        done();
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { payload, send } = component.newRequest();
    payload.addEvent({ id: "myevent1" });
    send();
  });

  it("resolves the returned promise", done => {
    const networkStrategy = () => {
      return new Promise(resolve => {
        resolve({
          body: JSON.stringify({ requestId: "myrequestid", handle: [] })
        });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { promise, send } = component.newRequest();
    promise.then(({ response }) => {
      expect(response.requestId).toEqual("myrequestid");
      expect(response.handle).toEqual([]);
      done();
    });
    send();
  });

  it("rejects the returned promise", done => {
    const networkStrategy = () => {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject({ body: "badbody", exception: Error("myerror") });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { promise, send } = component.newRequest();
    promise.catch(({ body, exception }) => {
      expect(body).toEqual("badbody");
      expect(exception.message).toEqual("myerror");
      done();
    });
    send();
  });

  it("rejects the returned promise due to invalid json", done => {
    const networkStrategy = () => {
      return new Promise(resolve => {
        resolve({ body: "badbody" });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { promise, send } = component.newRequest();
    promise.catch(({ body, exception }) => {
      expect(body).toEqual("badbody");
      expect(exception).toBeDefined();
      done();
    });
    send();
  });

  it("allows components to handle response fragments", done => {
    const lifecycle = {
      onBeforeSend: () => undefined,
      onResponseFragment: (requestId, type, payload) => {
        expect(requestId).toEqual("myrequestid");
        expect(type).toEqual("mytype");
        expect(payload).toEqual({ id: "myfragmentid" });
        done();
      }
    };
    const response = {
      requestId: "myrequestid",
      handle: [
        {
          type: "mytype",
          payload: { id: "myfragmentid" }
        }
      ]
    };
    const networkStrategy = () => {
      return new Promise(resolve => {
        resolve({ body: JSON.stringify(response) });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle });
    component.newRequest().send();
  });

  [true, false].forEach(b => {
    it(`allows components to get the request info (beacon = ${b})`, done => {
      let requestPayload;
      let requestPromise;
      const lifecycle = {
        onBeforeSend: ({ payload, promise, beacon, send }) => {
          expect(send).toBeUndefined();
          expect(payload).toBe(requestPayload);
          expect(promise).toBe(requestPromise);
          expect(beacon).toBe(b);
          done();
        },
        onResponseFragment: () => undefined
      };
      const networkStrategy = () => new Promise(() => undefined);
      const component = createComponent({ config }, networkStrategy);
      component.lifecycle.onComponentsRegistered({ lifecycle });
      const { payload, promise, send } = component.newRequest(b);
      requestPayload = payload;
      requestPromise = promise;
      send();
    });
  });

  it("handles response fragments in streaming responses", done => {
    let i = 0;
    const lifecycle = {
      onBeforeSend: () => undefined,
      onResponseFragment: (requestId, type, payload) => {
        i += 1;
        expect(requestId).toBe("myrequestid");
        expect(type).toBe("mytype");
        expect(payload.id).toBe(`payload${i}`);
        if (i === 2) {
          done();
        }
      }
    };
    const response1 = {
      requestId: "myrequestid",
      handle: [{ type: "mytype", payload: { id: "payload1" } }]
    };
    const response2 = {
      requestId: "myrequestid",
      handle: [{ type: "mytype", payload: { id: "payload2" } }]
    };
    const networkStrategy = () => {
      return new Promise(resolve1 => {
        const promise = new Promise(resolve2 => {
          resolve2({ body: JSON.stringify(response2) });
        });
        resolve1({ body: JSON.stringify(response1), promise });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle });
    component.newRequest().send();
  });

  it("handles json errors in streaming responses", done => {
    const networkStrategy = () => {
      return new Promise(resolve1 => {
        const promise = new Promise(resolve2 => {
          resolve2({ body: "badbody2" });
        });
        resolve1({ body: "badbody1", promise });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { promise, send } = component.newRequest();
    promise.catch(({ body: body1, promise: promise1 }) => {
      expect(body1).toEqual("badbody1");
      promise1.catch(({ body: body2, promise: promise2 }) => {
        expect(body2).toEqual("badbody2");
        expect(promise2).toBeUndefined();
        done();
      });
    });
    send();
  });

  it("handles network errors in streaming responses", done => {
    const networkStrategy = () => {
      return new Promise(resolve1 => {
        const promise = new Promise(resolve2 => {
          resolve2({ body: "badbody2" });
        });
        resolve1({ body: "badbody1", promise });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { promise, send } = component.newRequest();
    promise.catch(({ body: body1, promise: promise1 }) => {
      expect(body1).toEqual("badbody1");
      promise1.catch(({ body: body2, promise: promise2 }) => {
        expect(body2).toEqual("badbody2");
        expect(promise2).toBeUndefined();
        done();
      });
    });
    send();
  });
});
