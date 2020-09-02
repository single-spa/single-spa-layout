import { setResponseHeaders } from "../../src/server/setResponseHeaders";

describe(`setResponseHeaders`, () => {
  it(`correctly validates input`, async () => {
    const fakeRes = createFakeRes();
    await expect(
      setResponseHeaders({
        applicationProps: [{ name: "app1" }],
        res: fakeRes,
        retrieveApplicationHeaders() {
          return {};
        },
        mergeHeaders() {
          return {};
        },
      })
    ).resolves.toBeUndefined();

    await expect(setResponseHeaders).rejects.toThrow();
    await expect(() => setResponseHeaders({})).rejects.toThrow();
    await expect(() =>
      setResponseHeaders({
        applicationProps: null,
        res: fakeRes,
        retrieveApplicationHeaders() {},
        mergeHeaders() {},
      })
    ).rejects.toThrow();
  });

  it(`calls merge headers on all the returned application headers`, async () => {
    const fakeRes = createFakeRes();

    const retrievedHeaders = [];

    await setResponseHeaders({
      applicationProps: [{ name: "app1" }, { name: "app2" }],
      res: fakeRes,
      retrieveApplicationHeaders(props) {
        retrievedHeaders.push(props.name);
        return { name: props.name };
      },
      mergeHeaders(headers) {
        expect(headers.map((h) => h.name)).toEqual(retrievedHeaders);
        return {};
      },
    });
  });

  it(`calls res.setHeader with all the final headers`, async () => {
    const res = createFakeRes();

    const retrievedHeaders = [];

    await setResponseHeaders({
      applicationProps: [{ name: "app1" }, { name: "app2" }],
      res,
      retrieveApplicationHeaders(props) {
        retrievedHeaders.push(props.name);
        return {};
      },
      mergeHeaders(headers) {
        return {
          "content-type": "application/javascript",
          "content-encoding": "gzip",
        };
      },
    });

    expect(res.setHeader).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      "content-type",
      "application/javascript"
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      "content-encoding",
      "gzip"
    );
  });
});

function createFakeRes() {
  return {
    status: jest.fn(),
    setHeader: jest.fn(),
  };
}
