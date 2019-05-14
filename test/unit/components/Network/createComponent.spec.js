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
    expect(beacon).toBe(false);
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
    expect(beacon).toBe(true);
    send();
  });

  it("sends the payload", done => {
    const networkStrategy = (url, json) => {
      return new Promise(resolve => {
        expect(JSON.parse(json).events[0]).toEqual({ id: "myevent1" });
        resolve();
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
    const { response, send } = component.newRequest();
    response
      .then(({ body }) => {
        const { requestId, handle } = JSON.parse(body);
        expect(requestId).toEqual("myrequestid");
        expect(handle).toEqual([]);
        done();
      })
      .catch(done.fail);
    send();
  });

  it("rejects the returned promise", done => {
    const networkStrategy = () => {
      return new Promise((resolve, reject) => {
        reject(Error("myerror"));
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { response, send } = component.newRequest();
    response.catch(error => {
      expect(error.message).toEqual("myerror");
      done();
    });
    send();
  });

  it("resolves the promise even with invalid json", done => {
    const networkStrategy = () => {
      return new Promise(resolve => {
        resolve({ body: "badbody" });
      });
    };
    const component = createComponent({ config }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { response, send } = component.newRequest();
    response
      .then(({ body }) => {
        expect(body).toEqual("badbody");
        done();
      })
      .catch(done.fail);
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
        onBeforeSend: ({ payload, response, beacon, send }) => {
          expect(send).toBeUndefined();
          expect(payload).toBe(requestPayload);
          expect(response).toBe(requestPromise);
          expect(beacon).toBe(b);
          done();
        },
        onResponseFragment: () => undefined
      };
      const networkStrategy = () => new Promise(() => undefined);
      const component = createComponent({ config }, networkStrategy);
      component.lifecycle.onComponentsRegistered({ lifecycle });
      const { payload, response, send } = component.newRequest(b);
      requestPayload = payload;
      requestPromise = response;
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
    const { response, send } = component.newRequest();
    response.then(({ body: body1, promise: promise1 }) => {
      expect(body1).toEqual("badbody1");
      promise1.then(({ body: body2, promise: promise2 }) => {
        expect(body2).toEqual("badbody2");
        expect(promise2).toBeUndefined();
        done();
      });
    });
    send();
  });

  it("logs json parse errors", done => {
    const networkStrategy = () => {
      return new Promise(resolve => {
        resolve({ body: "badbody1" });
      });
    };
    const logger = jasmine.createSpyObj("logger", ["warn"]);
    const component = createComponent({ config, logger }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { send, complete } = component.newRequest();
    send();
    complete
      .then(() => {
        expect(logger.warn).toHaveBeenCalledTimes(1);
        done();
      })
      .catch(done.fail);
  });

  it("doesn't try to parse the response on a beacon call", done => {
    const networkStrategy = () => {
      return Promise.resolve();
    };
    const logger = jasmine.createSpyObj("logger", ["warn"]);
    const component = createComponent({ config, logger }, networkStrategy);
    component.lifecycle.onComponentsRegistered({ lifecycle: nullLifecycle });
    const { send, complete } = component.newRequest(true);
    send();
    complete
      .then(() => {
        expect(logger.warn).not.toHaveBeenCalled();
        done();
      })
      .catch(done.fail);
  });

  /*
  it("logs onResponseFragment lifecycle errors");

  it("logs network errors", done => {
    done();
  });
  */
});
