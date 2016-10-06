restify-json-hal
================

Extends Restify with the `application/hal+json` formatter following the [JSON HAL](https://tools.ietf.org/html/draft-kelly-json-hal-08) and [URI Templates](https://tools.ietf.org/html/rfc6570) spec.

This way you easily add the basics of HATEOAS to your API and brings it that much closer to the [Glory of REST](http://martinfowler.com/articles/richardsonMaturityModel.html).

## howto
``` javascript
var restify = require('restify');
var restifyJSONHAL = require("restify-json-hal");

var server = restify.createServer();

server.use(restifyJSONHAL(server));

server.get('/', (request,response,next) => {
  response.send({msg: "root"});
  return next();
});

server.get('/echo', (request,response,next) => {
  response.send({msg: "echo"});
  return next();
});

server.get('/echo/:name', (request,response,next) => {
  response.send(request.params);
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
```

A call to `/` renders:

(remember to have the `accept: application/hal+json` header)

``` json
{
  "msg": "root",
  "_links": [
    {
      "href": "/",
      "rel": "self",
      "method": "GET"
    },
    {
      "href": "/echo",
      "rel": "getecho",
      "method": "GET"
    }
  ]
}
```

A call to `/echo` renders

``` json
{
  "msg": "echo",
  "_links": [
    {
      "href": "/echo",
      "rel": "self",
      "method": "GET"
    },
    {
      "templated": true,
      "href": "/echo/{name}",
      "rel": "getechoname",
      "method": "GET"
    }
  ]
}
```

A call to `/echo/juravenator` renders

``` json
{
  "name": "juravenator",
  "_links": [
    {
      "href": "/echo/juravenator",
      "rel": "self",
      "method": "GET"
    }
  ]
}
```

## extra parameters and options
``` javascript
var restify = require('restify');
var restifyJSONHAL = require("restify-json-hal");

var server = restify.createServer();
server.use(restify.queryParser());

server.use(restifyJSONHAL(server, {
  // add a prefix to every link
  // usefull when url rewriting happens along the way
  prefix: "/api",
  // this overrides the formatter for application/json to also
  // include JSON HAL data
  overrideJSON: true,
  // makes "_links" an object instead of an array
  makeObjects: true
}));

server.get('/', (request,response,next) => {
  response.send({msg: "root"});
  return next();
});

server.get('/echo', (request,response,next) => {
  response.send({msg: "echo"});
  return next();
});

server.get('/hello', (request,response,next) => {
  /**
   * HAL: This call does some stuff
   * @name customName
   * @param name
   * @deprecated
   * @alias get-hello
   */
   var name = request.params.name || "World";
   var msg = `Hello, ${name}`;
   response.send({msg: msg});
   return next();
});

server.get('/echo/:name', (request,response,next) => {
  response.send(request.params);
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
```

Now, calling `/` with header `accept: application/json` will render

``` json
{
  "msg": "root",
  "_links": {
    "self": {
      "href": "/api",
      "method": "GET"
    },
    "getecho": {
      "href": "/api/echo",
      "method": "GET"
    },
    "customName": {
      "href": "/api/hello{?name}",
      "deprecation": true,
      "title": "get-hello",
      "description": "This call does some stuff",
      "templated": true,
      "method": "GET"
    }
  }
}
```

## Custom links
restify-json-hal exposes the addLink function that allows you to link to another resource that would normally not be considered related.

An example:

```javascript
server.get('/books/:bookname', (request,response,next) => {
  /**
   * HAL: Gets book and author
   * @name getauthor
   */
  var author = "alan-watts";
  response.addLink("get", `/authors/${author}`);
  response.send({
    title: request.params.bookname,
    author: author
  });
  return next();
});

server.get('/authors/:authorname', (request, response, next) => {
  /**
   * HAL: Gets author and published books
   * @name getauthor
   */
  var books = ["the-way-of-zen"];
  for (var i = 0; i < books.length; i++) {
    response.addLink("get", `/books/${books[i]}`, books[i]);
  }
  response.send({
    author: request.params.authorname,
    books: books
  });
});
```

A call to `/books/the-way-of-zen` will render:

```json
{
  "title": "the-way-of-zen",
  "author": "alan-watts",
  "_links": [
    {
      "href": "/books/the-way-of-zen",
      "rel": "self",
      "description": "Gets book and author",
      "method": "GET"
    },
    {
      "rel": "getauthor",
      "method": "GET",
      "description": "Gets author and published books",
      "href": "/authors/alan-watts"
    }
  ]
}
```

A call to `/authors/alan-watts` will render:

```json
{
  "author": "alan-watts",
  "books": [
    "the-way-of-zen"
  ],
  "_links": [
    {
      "href": "/authors/alan-watts",
      "rel": "self",
      "description": "Gets author and published books",
      "method": "GET"
    },
    {
      "rel": "the-way-of-zen",
      "method": "GET",
      "description": "Gets book and author",
      "href": "/books/the-way-of-zen"
    }
  ]
}
```

## todo

- `_embedded`, somehow
- figure out how to use `profile` properly
- CURIE syntax
- how to document parameters? (probably related to `profile`)
