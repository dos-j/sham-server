const handlerFactory = require("./handlerFactory");

let res;
let handler;

beforeEach(() => {
  handler = handlerFactory();

  res = {
    writeHead: jest.fn(),
    end: jest.fn()
  };
});

describe("Returning a Default Reply", () => {
  test("it should respond with the default reply if there are no mocked routes", async () => {
    handler({}, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "text/plain"
    });
    expect(res.end).toHaveBeenCalledWith("Not Found");
  });

  test("it should allow you to override the default reply", async () => {
    handler = handlerFactory({
      status: 418,
      headers: { "Content-Type": "text/fancy" },
      body: "Tadaaaa!"
    });

    handler({}, res);

    expect(res.writeHead).toHaveBeenCalledWith(418, {
      "Content-Type": "text/fancy"
    });
    expect(res.end).toHaveBeenCalledWith("Tadaaaa!");
  });
});

describe("Configuring mocked routes", () => {
  test("it should allow you to mock responses", () => {
    const mock = {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      },
      body: "Test"
    };
    handler.matchers.unshift({ matcher: () => true, mock });

    const req = {};
    handler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(mock.status, mock.headers);

    expect(res.end).toHaveBeenCalledWith(mock.body);
  });

  test("it should assume you want a status of 200 if you don't specify it", () => {
    const mock = {
      headers: {
        "Content-Type": "text/plain"
      },
      body: "Test"
    };
    handler.matchers.unshift({ matcher: () => true, mock });

    const req = {};
    handler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, mock.headers);

    expect(res.end).toHaveBeenCalledWith(mock.body);
  });

  test("it should assume you want a Content-Type of 'application/json' if you don't specify it", () => {
    const mock = {
      status: 200,
      body: "{}"
    };
    handler.matchers.unshift({ matcher: () => true, mock });

    const req = {};
    handler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(mock.status, {
      "Content-Type": "application/json"
    });

    expect(res.end).toHaveBeenCalledWith(mock.body);
  });

  test("it should automatically stringify the body", () => {
    const mock = {
      body: {
        a: 1
      }
    };
    handler.matchers.unshift({ matcher: () => true, mock });

    const req = {};
    handler(req, res);

    expect(res.end).toHaveBeenCalledWith(JSON.stringify(mock.body));
  });

  test("it should not return the mock if the matcher returns false", () => {
    const mock = {
      body: "{}"
    };
    handler.matchers.unshift({ matcher: () => false, mock });

    const req = {};
    handler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "text/plain"
    });
    expect(res.end).toHaveBeenCalledWith("Not Found");
  });

  test("it should give the matcher the request object to check", () => {
    const mock = {
      body: {
        a: 1
      }
    };
    const matcher = jest.fn(() => true);
    handler.matchers.unshift({ matcher: matcher, mock });

    const req = {};
    handler(req, res);

    expect(matcher).toHaveBeenCalledWith(req);
  });

  test("it should check matchers in reverse order and only check the first matcher if it returns true", () => {
    const matcherA = jest.fn(() => true);
    const matcherB = jest.fn(() => true);
    const matcherC = jest.fn(() => true);
    handler.matchers.unshift({ matcher: matcherA, mock: { body: { a: 1 } } });
    handler.matchers.unshift({ matcher: matcherB, mock: { body: { b: 2 } } });
    handler.matchers.unshift({ matcher: matcherC, mock: { body: { c: 3 } } });

    const req = {};
    handler(req, res);

    expect(matcherC).toHaveBeenCalled();
    expect(matcherB).not.toHaveBeenCalled();
    expect(matcherA).not.toHaveBeenCalled();

    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ c: 3 }));
  });

  test("it should check all matchers if none of them return true", () => {
    const matcherA = jest.fn(() => false);
    const matcherB = jest.fn(() => false);
    const matcherC = jest.fn(() => false);
    handler.matchers.unshift({ matcher: matcherA, mock: { body: { a: 1 } } });
    handler.matchers.unshift({ matcher: matcherB, mock: { body: { b: 2 } } });
    handler.matchers.unshift({ matcher: matcherC, mock: { body: { c: 3 } } });

    const req = {};
    handler(req, res);

    expect(matcherC).toHaveBeenCalled();
    expect(matcherB).toHaveBeenCalled();
    expect(matcherA).toHaveBeenCalled();

    expect(res.end).toHaveBeenCalledWith("Not Found");
  });

  test("it should be able to return the mock for a matcher in the middle of the list of matchers", () => {
    const matcherA = jest.fn(() => true);
    const matcherB = jest.fn(() => true);
    const matcherC = jest.fn(() => false);
    handler.matchers.unshift({ matcher: matcherA, mock: { body: { a: 1 } } });
    handler.matchers.unshift({ matcher: matcherB, mock: { body: { b: 2 } } });
    handler.matchers.unshift({ matcher: matcherC, mock: { body: { c: 3 } } });

    const req = {};
    handler(req, res);

    expect(matcherC).toHaveBeenCalled();
    expect(matcherB).toHaveBeenCalled();
    expect(matcherA).not.toHaveBeenCalled();

    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ b: 2 }));
  });
});

describe("Mocks that expire", () => {
  test("it should only match once", () => {
    const matcher = jest.fn(() => true);
    handler.matchers.unshift({ matcher, mock: { body: "Test" }, times: 1 });

    const req = {};
    handler(req, res);

    expect(res.end).lastCalledWith("Test");

    handler(req, res);

    expect(res.end).lastCalledWith("Not Found");
  });

  test("it should only match twice", () => {
    const matcher = jest.fn(() => true);
    handler.matchers.unshift({ matcher, mock: { body: "Test" }, times: 2 });

    const req = {};
    handler(req, res);

    expect(res.end).lastCalledWith("Test");

    handler(req, res);

    expect(res.end).lastCalledWith("Test");

    handler(req, res);

    expect(res.end).lastCalledWith("Not Found");
  });
});