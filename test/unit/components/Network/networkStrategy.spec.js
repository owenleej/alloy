import networkStrategyFactory from "../../../../src/components/Network/networkStrategy";

const mockServerClient = window.mockServerClient || (() => {});

describe("mockserver", () => {
  const requestBody = JSON.stringify({ id: "myrequest" });

  let client;
  let networkStrategy;

  [
    ["window", window],
    ["XMLHttpRequest", { XMLHttpRequest: window.XMLHttpRequest }]
  ].forEach(([name, testingWindow]) => {
    describe(name, () => {
      beforeEach(done => {
        networkStrategy = networkStrategyFactory(testingWindow);
        client = mockServerClient("localhost", 1080);
        client.reset().then(() => done());
      });

      const mockResponse = (code, body) => {
        return client.mockAnyResponse({
          httpRequest: {
            method: "POST",
            path: "/myapi",
            body: {
              type: "JSON",
              json: requestBody,
              matchType: "STRICT"
            }
          },
          httpResponse: {
            statusCode: code,
            body
          }
        });
      };

      [200].forEach(code => {
        it(`handles successful response code ${code}`, done => {
          mockResponse(code, "mybody").then(() => {
            networkStrategy("http://localhost:1080/myapi", requestBody)
              .then(({ body }) => {
                expect(body).toEqual("mybody");
                done();
              })
              .catch(done.fail);
          });
        });
      });

      it("handles successful response code 204 (no content)", done => {
        mockResponse(204, "mybody").then(() => {
          networkStrategy("http://localhost:1080/myapi", requestBody)
            .then(({ body }) => {
              expect(body).toEqual("");
              done();
            })
            .catch(done.fail);
        });
      });

      [301, 400, 403, 500].forEach(code => {
        it(`handles error response code ${code}`, done => {
          mockResponse(code, "mybody").then(() => {
            networkStrategy("http://localhost:1080/myapi", requestBody)
              .then(done.fail)
              .catch(error => {
                expect(error).toBeDefined();
                done();
              });
          });
        });
      });

      it("handles a dropped connection", done => {
        client
          .mockAnyResponse({
            httpRequest: {
              method: "POST",
              path: "/myapi"
            },
            httpError: {
              dropConnection: true
            }
          })
          .then(() => {
            networkStrategy("http://localhost:1080/myapi", requestBody)
              .then(done.fail)
              .catch(error => {
                expect(error).toBeDefined();
                done();
              });
          });
      });

      it("sends a beacon", done => {
        client
          .mockAnyResponse({
            httpRequest: {
              method: "POST",
              path: "/myapi"
            },
            httpResponse: {
              statusCode: 204
            }
          })
          .then(() => {
            networkStrategy("http://localhost:1080/myapi", requestBody, true)
              .then(() => {
                setTimeout(() => {
                  client
                    .verify(
                      {
                        method: "POST",
                        path: "/myapi",
                        body: requestBody
                      },
                      1,
                      1
                    ) // verify atLeast 1, atMost 1 times called
                    .then(done, done.fail);
                }, 1000);
              })
              .catch(done.fail);
          });
      });
    });
  });
});
