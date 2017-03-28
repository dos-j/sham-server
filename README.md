# sham-it
[![NPM Version](https://img.shields.io/npm/v/sham-it.svg)](https://www.npmjs.com/package/sham-it)
[![Build Status](https://circleci.com/gh/dos-j/sham-it.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/dos-j/sham-it) [![Coverage](https://img.shields.io/codecov/c/github/dos-j/sham-it.svg)](https://codecov.io/gh/dos-j/sham-it) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
 [![dependencies](https://david-dm.org/dos-j/sham-it.svg)](https://david-dm.org/dos-j/sham-it) [![devDependencies](https://david-dm.org/dos-j/sham-it/dev-status.svg)](https://david-dm.org/dos-j/sham-it#info=devDependencies) [![Known Vulnerabilities](https://snyk.io/test/github/dos-j/sham-it/badge.svg)](https://snyk.io/test/github/dos-j/sham-it) [![License](	https://img.shields.io/github/license/dos-j/sham-it.svg)](https://github.com/dos-j/sham-it/blob/master/LICENSE)

Sham-It allows you to easily create mock web services that you can use within your tests.

When you need to test a web service which depends on third party web services you are forced to choose between loading the entire platform, creating complicated stub services or mocking out the parts of your codebase that call external services.

As the size of your platform gets bigger, trying to load all of it at once will grind your integration tests to a halt. This inevitably forces you to choose between stub services and mocking out huge chucks of the api.

As the number of tests you write increases, the complexity of your stub services will also have to increase to send your api down the paths you need to test. You will also need to come up with inventive solutions to change your api's responses between tests and check that it was called.

With mocking classes and functions there are plenty of easy to use options for mocking out individual calls within the tests you are writing and writing expectations that they were cakked. Unfortunately with this approach, you aren't testing how your service behaves across the network and the code you've replace with mocks won't get tested.

With sham-it you get the best of both worlds. Each sham that you create is a http server which means you only need to point your code at a different uri. Each sham also provides methods for mocking requests and records a list of all the requests so that you can write expectations about the http calls your code is making.

All of the code to create mock routes and write expectations can be done within your test functions, giving you the convenience and flexibility you get when using mocking libraries as well as the confidence that a network request was made.

## Getting Started

First intall the npm module:
```
npm install sham-it
```

Then in JavaScript follow the steps below to use sham-it to create a sham, mock out an endpoint, call it then check it was called.
```js
// Step 1: Import sham-it
const shamIt = require("sham-it");

(async function() {
  // Step 2: Create a new sham using the defaults
  const sham = await shamIt();

  // or...
  // create a new sham with all options
  const shamWithOptions = await shamIt({
    // ip is the IP Address that the node server powering sham will listen on
    ip: "0.0.0.0", // 0.0.0.0 is the default

    // port is the Port that the sham can be access on
    port: 9001, // If not specified portfinder (https://www.npmjs.com/package/portfinder) will find you the next available port.

    // defaultReply is used when a mocked route isn't matched
    defaultReply: {
      status: 404, // 404 is the default status of the defaultReply

      headers: { "Content-Type": "text/plain" }, // "Content-Type": "text/plain" is the default header of the defaultReply

      body: "Not Found" // "Not Found" is the default body of the default reply
    }
  });

  // Step 3: Check the properties available on the sham
  console.log(`ip: ${sham.ip}`);
  console.log(`port: ${sham.port}`);
  console.log(`listening: ${sham.listening}`);
  console.log(`calls: ${sham.calls.length}`);

  // Step 4: Mock out an endpoint
  const matcher = sham.when(
    // matcher function that is checked. (Required, will throw an error if not supplied)
    req => {
      // You could use the node built-in url module to parse the request
      const {
        pathname
      } = require("url").parse(req.url);

      return req.method === "GET" && pathname === "/a/b/c";
    },
    // Mocked response that's returned if the matcher function returns true (Required, will throw an error if not supplied)
    {
      status: 200, // Optional: Defaults to 200
      headers: { "Content-Type": "application/json" }, // Optional: Defaults to { "Content-Type": "application/json" }
      body: { my: "data" } // If an object is supplied it is automatically stringified using JSON.stringify(...)
    }

    // Optional: You can also pass in a 3rd parameter for the number of times the matcher should match. After which it will be deleted.
    // If no value is specified then the matcher will match an unlimited number of times.
  );
  console.log(matcher); // { matcher: [Function], mock: { status: ..., headers: ..., body: ... }, calls: [] }

  // Step 5: Send a request to the sham
  const request = require("request");

  // Step 6: Fire a request against the sham
  await new Promise((resolve, reject) =>
    request(
      {
        uri: `http://localhost:${sham.port}/a/b/c`,
        json: true
      },
      (err, res, body) => {
        if (err) return reject(err);

        const statusCode = res.statusCode;
        const contentType = res.headers["content-type"];

        console.log(statusCode === matcher.mock.status); // true
        console.log(contentType === matcher.mock.headers["Content-Type"]); // true

        console.log(body.my === matcher.mock.body.my); // true

        resolve(body);
      }
    ));
  // You can also now see the call in either the matcher's list of calls or the sham's list of calls
  console.log(matcher.calls.length); // 1
  console.log(sham.calls.length); // 1

  // In your tests you can expect that sham received the correct request by doing (jest example)

  // expect(matcher.calls).toContainEqual(
  //    expect.objectContaining({
  //        request: expect.objectContaining({
  //            method: "GET",
  //            url: "/a/b/c"
  //        })
  //    })
  //);

  // Step 7: Reset the mocked routes and calls
  sham.reset();
  console.log(sham.calls); // 0

  // Step 8: Close the sham to stop it listening
  sham.close();
  shamWithOptions.close();
  console.log(`listening: ${sham.listening}`);
})();

```

## Examples

The sham-it repo contains the following testing examples.

### Testing a function which calls an api you want to mock

The [request-example.js](https://github.com/dos-j/sham-it/tree/master/examples/request-example.js) and [request-example.test.js](https://github.com/dos-j/sham-it/tree/master/examples/request-example.test.js) are examples of testing a function which is using request to send requests to an api.

Instead of mocking out the request library, you could use sham-it to run integration tests and make sure that the right http calls will actually be sent.

### Testing a web service which calls an api you want to mock

The [supertest-example.js](https://github.com/dos-j/sham-it/tree/master/examples/supertest-example.js) and [supertest-example.test.js](https://github.com/dos-j/sham-it/tree/master/examples/supertest-example.test.js) are examples of testing an express api which (using request) calls an external api to validate the incoming requests.

When trying to run integration tests against API's having to mock out calls to external services can be difficult and in doing so undermines the value of the tests. With sham-it you can run integration tests against mock/stub api's, but still get the same convenience and flexibility provided by mocking libraries.

## Roadmap

For our future plans and roadmap we are using GitHub Projects. You can see our projects [here](https://github.com/dos-j/sham-it/projects)

## Issues

If you find any problems with sham-it or have any feature requests please [log them here](https://github.com/dos-j/sham-it/issues?state=open).

## Contributing

Pull requests are more than welcome!

## Maintainers
* [Jason Hewison](https://github.com/JasonHewison)

## License

Licensed under [MIT](./LICENSE).

