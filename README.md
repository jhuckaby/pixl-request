# Overview

This module is a very simple wrapper around Node's built-in [http](https://nodejs.org/api/http.html) library for making HTTP requests.  It provides an easy way to send an HTTP GET or POST, including things like support for HTTPS (SSL), file uploads and JSON REST style API calls.  Compressed responses are also handled automatically.

# Table of Contents

<!-- toc -->
- [Usage](#usage)
- [Method List](#method-list)
- [Request Types](#request-types)
	* [HTTP GET](#http-get)
	* [HTTP HEAD](#http-head)
	* [HTTP POST](#http-post)
		+ [Pure Data POST](#pure-data-post)
		+ [Multipart POST](#multipart-post)
		+ [File Uploads](#file-uploads)
	* [HTTP PUT](#http-put)
	* [HTTP DELETE](#http-delete)
	* [File Downloads](#file-downloads)
		+ [Advanced Stream Control](#advanced-stream-control)
	* [Keep-Alives](#keep-alives)
	* [JSON REST API](#json-rest-api)
	* [XML REST API](#xml-rest-api)
- [Default Headers](#default-headers)
- [Handling Timeouts](#handling-timeouts)
- [Automatic Redirects](#automatic-redirects)
- [Automatic Errors](#automatic-errors)
- [Automatic Retries](#automatic-retries)
- [Compressed Responses](#compressed-responses)
- [Performance Metrics](#performance-metrics)
- [DNS Caching](#dns-caching)
	* [Flushing the Cache](#flushing-the-cache)
- [SSL Certificate Validation](#ssl-certificate-validation)
- [License](#license)

# Usage

Use [npm](https://www.npmjs.com/) to install the module:

```
npm install pixl-request
```

Then use `require()` to load it in your code:

```javascript
var PixlRequest = require('pixl-request');
```

Instantiate a request object and pass in an optional user agent string (you can also set this later via a header):

```javascript
var request = new PixlRequest();
var request = new PixlRequest( "My Custom Agent 1.0" );
```

Here is a simple HTTP GET example:

```javascript
request.get( 'https://www.bitstamp.net/api/ticker/', function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

And here is a simple JSON REST API request:

```javascript
request.json( 'http://myserver.com/api', { foo: "test", bar: 123 }, function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "JSON Response: ", data );
} );
```

# Method List

Here are all the methods available in the request library:

| Method Name | Description |
|---------------|-------------|
| [get()](#http-get) | Performs an HTTP GET request. |
| [head()](#http-head) | Performs an HTTP HEAD request. |
| [post()](#http-post) | Performs an HTTP POST request. |
| [put()](#http-put) | Performs an HTTP PUT request. |
| [delete()](#http-delete) | Performs an HTTP DELETE request. |
| [json()](#json-rest-api) | Sends a request to a JSON REST API endpoint and parses the response. |
| [xml()](#xml-rest-api) | Sends a request to an XML REST API endpoint and parses the response. |
| [setHeader()](#default-headers) | Overrides or adds a default header for future requests. |
| [setTimeout()](#handling-timeouts) | Overrides the default socket timeout (milliseconds). |
| [setFollow()](#automatic-redirects) | Overrides the default behavior for following redirects. |
| [setAutoDecompress()](#compressed-responses) | Overrides the default behavior of decompressing responses. |
| [setDNSCache()](#dns-caching) | Enable DNS caching and set the TTL in seconds. |
| [flushDNSCache()](#flushing-the-cache) | Flush all IPs from the internal DNS cache. |

# Request Types

Here are all the request types supported by the library.

## HTTP GET

```
get( URL, CALLBACK )
get( URL, OPTIONS, CALLBACK )
```

To perform a simple HTTP GET, call the `get()` method.  All you need to provide is the URL and a callback:

```javascript
request.get( 'https://www.bitstamp.net/api/ticker/', function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
		console.log("Content: " + data);
	}
} );
```

Your callback function is passed an error object (which will be false upon success), the HTTP response object from Node ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and a data buffer of the content (if any).

Note that an "error" in this case is something like a TCP connection failure, DNS lookup failure, socket timeout, connection aborted, or other internal client library failure.  By default, HTTP response codes like 404 or 500 are *not* considered errors, so make sure to look at `resp.statusCode` if you are expecting an HTTP 200.  However, if you *want* non-200 response codes to be considered errors, see [Automatic Errors](#automatic-errors) below.

To specify additional options, such as custom request headers or HTTP authentication, include an object just before the callback:

```javascript
request.get( 'https://www.bitstamp.net/api/ticker/', {
	headers: {
		'X-Custom-Header': "My custom value"	
	},
	auth: "username:password"
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
		console.log("Content: " + data);
	}
} );
```

Check out the Node [http.request](https://nodejs.org/api/http.html#http_http_request_options_callback) documentation for all the properties you can pass in the options object.

By default, connections are closed at the end of each request.  If you want to reuse a persistent connection across multiple requests, see the [Keep-Alives](#keep-alives) section below.

## HTTP HEAD

```
head( URL, CALLBACK )
head( URL, OPTIONS, CALLBACK )
```

An HTTP HEAD request will not contain any data in the response, only the response code and headers.  Example:

```js
request.head( 'http://myserver.com/index.html', function(err, resp) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
	}
} );
```

## HTTP POST

```
post( URL, OPTIONS, CALLBACK )
```

To perform a HTTP POST, call the `post()` method.  Provide a URL, an options object with a `data` property containing your key/value pairs, and a callback function:

```javascript
request.post( 'http://myserver.com/api/post', {
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
	console.log("Headers: ", resp.headers);
	console.log("Content: " + data);
} );
```

Your key/value pairs will be serialized using the `application/x-www-form-urlencoded` format.  For a multipart post, see [Multipart POST](#multipart-post) below.

Your callback function is passed an error object (which will be false upon success), the HTTP response object from Node ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and a data buffer of the content (if any).

Note that an "error" in this case is something like a TCP connection failure, DNS lookup failure, socket timeout, connection aborted, or other internal client library failure.  By default, HTTP response codes like 404 or 500 are *not* considered errors, so make sure to look at `resp.statusCode` if you are expecting an HTTP 200.  However, if you *want* non-200 response codes to be considered errors, see [Automatic Errors](#automatic-errors) below.

Check out the Node [http.request](https://nodejs.org/api/http.html#http_http_request_options_callback) documentation for all the properties you can pass in the options object.

By default, connections are closed at the end of each request.  If you want to reuse a persistent connection across multiple requests, see the [Keep-Alives](#keep-alives) section below.

### Pure Data POST

To specify your own raw POST data without any key/value pre-formatting, simply pass a `Buffer` object as the `data` property value, then include your own `Content-Type` header in the `headers` object.  Example:

```js
var buf = Buffer.from("VGhpcyBpcyBhIHRlc3QhIPCfmJw=", "base64");

request.post( 'http://myserver.com/api/post', {
	data: buf,
	headers: {
		'Content-Type': "application/octet-stream"
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
	console.log("Headers: ", resp.headers);
	console.log("Content: " + data);
} );
```

### Multipart POST

For a `multipart/form-data` post, which is typically better for binary data, all you need to do is pass in a `multipart` property in your options object, and set it to a true value.  Everything else is the same as a standard [HTTP POST](#http-post):

```javascript
request.post( 'http://myserver.com/api/post', {
	multipart: true, // activate multipart/form-data
	data: {
		foo: Buffer.from("Joe was here!"), 
		bar: 54321
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
	console.log("Headers: ", resp.headers);
	console.log("Content: " + data);
} );
```

Note that you can use [Buffer](https://nodejs.org/api/buffer.html) objects instead of strings for your data values.

### File Uploads

To upload files, use `post()` and include a `files` object with your options, containing key/pair pairs.  Each file needs an identifier key (POST field name), and a value which should be a path to the file on disk:

```javascript
request.post( 'http://myserver.com/api/upload', {
	files: {
		kitten1: '/images/SillyKitten1.jpg',
		kitten2: '/images/SillyKitten2.jpg'
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

The file path can also be a readable stream, if you happen to have one of those already open:

```javascript
var stream = fs.createReadStream('/images/SillyKitten1.jpg');

request.post( 'http://myserver.com/api/upload', {
	files: {
		file1: stream
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

If you want to customize the filename of the uploaded file, set your file value to an array, with the first element containing the file path (or a stream), and the second element the desired filename:

```javascript
files: {
	file1: ['/images/SillyKitten1.jpg', "A-New-Filename.JPG"]
}
```

You can combine file uploads with other POST data fields, just by including a `data` property in your options, similar to a standard HTTP POST.  You can of course include any other options keys as well, such as custom headers:

```javascript
request.post( 'http://myserver.com/api/post', {
	files: {
		file1: '/images/SillyKitten1.jpg'
	},
	data: {
		foo: Buffer.from("Joe was here!"), 
		bar: 54321
	},
	headers: {
		'X-Custom-Header': "My custom value"	
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

Including a `files` property automatically sets `multipart/form-data` mode, so you don't need to include the `multipart` boolean flag in this case.

## HTTP PUT

```
put( URL, OPTIONS, CALLBACK )
```

To send an `HTTP PUT`, you can use the `put()` method.  This works identically to `post()` in every way, except that the HTTP method is changed from `POST` to `PUT`.  You can send all the various data types, upload files, etc.  Example:

```js
request.put( 'http://myserver.com/api/put', {
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
	console.log("Headers: ", resp.headers);
	console.log("Content: " + data);
} );
```

Note that data (i.e. request body) is optional, and can be omitted.

## HTTP DELETE

```
delete( URL, OPTIONS, CALLBACK )
```

To send an `HTTP DELETE`, you can use the `delete()` method.  This works identically to `post()` in every way, except that the HTTP method is changed from `POST` to `DELETE`.  You can send all the various data types, upload files, etc.  Example:

```js
request.delete( 'http://myserver.com/api/delete', {
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
	console.log("Headers: ", resp.headers);
	console.log("Content: " + data);
} );
```

Note that data (i.e. request body) is optional, and can be omitted.

## File Downloads

If you want to download the response data to a file, instead of loading it all into an in-memory Buffer object, you can specify a `download` property in your `options` object, passed to either `get()` or `post()`.  Set this property to a filesystem path, and a file will be created and written to.  Your callback will still be fired when the download is complete, and passed the response object with access to headers, etc.  Example:

```js
request.get( 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Gustav_chocolate.jpg', {
	download: '/var/tmp/myimage.jpg'
}, 
function(err, resp) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
	}
} );
```

Your callback will only be invoked when the file is *completely* downloaded and written to the stream.  If the response is encoded (compressed), this is handled transparently for you using an intermediate stream.  Your file will contain the final decompressed data, and no memory will be used.

Alternatively, if you already have an open stream object, you can pass that to the `download` property.  Example:

```js
var stream = fs.createWriteStream( '/var/tmp/myimage.jpg' );

request.get( 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Gustav_chocolate.jpg', {
	download: stream
}, 
function(err, resp) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
	}
} );
```

### Advanced Stream Control

If you need more control over the response stream, you can provide a `pre_download` property in your `options` object, passed to either `get()` or `post()`.  Set this property to a callback function, which will be called *before* the data is downloaded, but *after* the HTTP response headers are parsed.  This allows you to essentially intercept the response and set up your own stream pipe.  Example:

```js
var stream = fs.createWriteStream( '/var/tmp/myimage.jpg' );

request.get( 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Gustav_chocolate.jpg', {
	download: stream,
	pre_download: function(err, resp) {
		// setup stream pipe ourselves
		resp.pipe( stream );
		return true;
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
	}
} );
```

Your `pre_download` function can optionally return `false`, which will inform the library that you did not set up a stream pipe, and it should fire the original callback with a data buffer instead.

## Keep-Alives

To reuse the same socket connection across multiple requests, you have two options.  First, you can use the built-in Keep-Alive handler by calling the `setKeepAlive()` method and passing `true`.  Example:

```js
request.setKeepAlive( true );
```

This will attempt to use HTTP Keep-Alives for all HTTP and HTTPS requests, by using two global [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) objects (one per protocol).  Note that you can configure the options passed to the agents by specifying them as a secondary object to the `setKeepAlive()` method:

```js
request.setKeepAlive( true, {
	keepAlive: true,
	keepAliveMsecs: 1000,
	maxSockets: 256,
	maxFreeSockets: 256,
	timeout: 5000
} );
```

Alternatively, you can use your own [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) object (provided by Node).  Simply construct an instance, set the `keepAlive` property to `true`, and pass it into the options object for your requests, using the `agent` property:

```javascript
var http = require('http');
var agent = new http.Agent({ keepAlive: true });

request.get( 'http://myserver.com/api/get', {
	agent: agent, // custom agent for connection pooling
	headers: {
		'X-Custom-Header': "My custom value"	
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

You can then use the same `agent` object for subsequent requests on the same host (provided the server you are connecting to also supports Keep-Alives).

## JSON REST API

```
json( URL, JSON, CALLBACK )
json( URL, JSON, OPTIONS, CALLBACK )
```

The `json()` method is designed for sending requests to JSON REST APIs.  If you want to send a JSON REST style HTTP POST to an API endpoint, and expect to receive a JSON formatted response, this wraps up all the serialization and parsing for you.  Example:

```javascript
request.json( 'http://myserver.com/api', { foo: "test", bar: 123 }, function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

This will serialize the object into a JSON string, and send it as the HTTP POST data to the provided URL, with a Content-Type of `application/json`.  It also expects the response back from the server to be JSON, and will parse it for you.  Your callback will be passed an error (false on success), the HTTP response object ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and the parsed JSON object.

You can also specify options such as custom request headers using this API.  Simply include an options object just before your callback (similar to the `get()` and `post()` methods).  Example:

```javascript
var json = {
	foo: "test", 
	bar: 123
};

request.json( 'http://myserver.com/api', json, {
	headers: {
		'X-Custom-Header': "My custom value"	
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

If you pass `null` or `false` as the JSON data argument, the request will be sent as a `GET` instead of a `POST`.  You can also customize the HTTP method by passing a `method` property into the `options` object.  For example, the following would send as a `HTTP PUT` with the JSON serialized in the request body:

```js
var json = {
	foo: "test", 
	bar: 123
};

request.json( 'http://myserver.com/api', json, {
	method: "PUT", // override the default method here
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

You can also send a custom request method with no body:

```js
request.json( 'http://myserver.com/delete/user/345', false, {
	method: "DELETE", // override the default method here
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

**Note:** If the server doesn't send back JSON, or it cannot be parsed, an error will be sent to your callback.

## XML REST API

```
xml( URL, XML, CALLBACK )
xml( URL, XML, OPTIONS, CALLBACK )
```

The `xml()` method is designed for sending requests to XML REST APIs.  If you want to send a XML REST style HTTP POST to an API endpoint, and expect to receive a XML formatted response, this wraps up all the serialization and parsing for you.  Example:

```javascript
request.xml( 'http://myserver.com/api', { foo: "test", bar: 123 }, function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

This will serialize the object into an XML document (using the [pixl-xml](https://www.npmjs.com/package/pixl-xml) package), and send it as the HTTP POST data to the provided URL, with a Content-Type of `text/xml`.  It also expects the response back from the server to be XML, and will parse it for you.  Your callback will be passed an error (false on success), the HTTP response object ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and the parsed XML document.

You can also specify options such as custom request headers using this API.  Simply include an options object just before your callback (similar to the `get()` and `post()` methods).  Example:

```javascript
var xml = {
	foo: "test", 
	bar: 123
};

request.xml( 'http://myserver.com/api', xml, {
	headers: {
		'X-Custom-Header': "My custom value"	
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

Please note that [pixl-xml](https://www.npmjs.com/package/pixl-xml) discards the XML root node element when parsing XML, and similarly the request library doesn't expect one when serializing.  Meaning, you should omit the XML root node element (just include the contents), and expect the server XML result to be parsed in a similar fashion.

For example, if you wanted to send this XML:

```xml
<?xml version="1.0"?>
<Document>
	<foo>test</foo>
	<bar>123</bar>
</Document>
```

Then just include an object with `foo` and `bar` properties:

```javascript
{
	foo: "test", 
	bar: 123
}
```

See the [pixl-xml](https://www.npmjs.com/package/pixl-xml) documentation for details, including how to include attributes, etc.

By default, the XML will be serialized to a document with `<Request>` as the root node name.  However if you are posting to an API that requires a specific XML root node name, you can set it with the `xmlRootNode` property in the options object.  Example of this:

```javascript
var xml = {
	foo: "test", 
	bar: 123
};

request.xml( 'http://myserver.com/api', xml, {
	xmlRootNode: 'Document'
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

If you pass `null` or `false` as the XML data argument, the request will be sent as a `GET` instead of a `POST`.  You can also customize the HTTP method by passing a `method` property into the `options` object.  For example, the following would send as a `HTTP PUT` with the XML serialized in the request body:

```js
var xml = {
	foo: "test", 
	bar: 123
};

request.xml( 'http://myserver.com/api', xml, {
	method: "PUT", // override the default method here
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

You can also send a custom request method with no body:

```js
request.xml( 'http://myserver.com/delete/user/234', false, {
	method: "DELETE", // override the default method here
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log( "Success: ", data );
} );
```

**Note:** If the server doesn't send back XML, or it cannot be parsed, an error will be sent to your callback.

# Default Headers

By default the request library will add the following outgoing headers to every request:

```
User-Agent: PixlRequest 1.0.0
Accept-Encoding: gzip, deflate, br
```

You can override these by passing in custom headers with your request:

```javascript
request.post( 'http://myserver.com/api/post', {
	headers: {
		'User-Agent': "My Request Library!",
		'Accept-Encoding': "none"
	},
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	}
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

Or by overriding your class instance defaults before making a request:

```javascript
request.setHeader( 'Accept-Encoding', "none" );
```

You can also replace the entire header set by rewriting the `defaultHeaders` property:

```javascript
request.defaultHeaders = {
	'User-Agent': "My Request Library!",
	'Accept-Encoding': "none"
};
```

# Handling Timeouts

PixlRequest handles timeouts by measuring the "time to first byte", from the start of the request.  This is *not* an idle timeout, and *not* a connect timeout.  It is simply the maximum amount of time allowed from the start of the request, to the first byte received.  The Node.js [socket.setTimeout()](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) method is not used, because we have found it to be totally unreliable, especially with Keep-Alives.

The default socket timeout for all requests is 30 seconds.  You can customize this per request by including a `timeout` property with your options object, and setting it to the number of milliseconds you want:

```javascript
request.post( 'http://myserver.com/api/post', {
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	},
	timeout: 10 * 1000, // 10 second timeout
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

Or by resetting the default on your class instance, using the `setTimeout()` method:

```javascript
request.setTimeout( 10 * 1000 ); // 10 seconds
```

When a timeout occurs, an `error` event is emitted.  The error message will follow this syntax: `Socket Timeout (### ms)`.  Note that a socket timeout results in the socket being destroyed ([request.abort()](https://nodejs.org/api/http.html#http_request_abort) is called on the request object, which in turn destroys the socket).

# Automatic Redirects

The default behavior for handling redirect responses (i.e. `HTTP 302` and friends) is to *not* follow them automatically, and instead return the original 3xx response for your callback to handle.  You can change this by including a `follow` property with your options object, and setting it to the maximum number of redirects you want to allow:

```javascript
request.post( 'http://myserver.com/api/post', {
	data: {
		full_name: "Fred Smith", 
		gender: "male",
		age: 35
	},
	follow: 2, // auto-follow up to 2 redirects
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else console.log("Success: " + data);
} );
```

Alternatively, you can set a class instance default by calling the `setFollow()` method:

```javascript
request.setFollow( 2 ); // auto-follow up to 2 redirects
```

If you want to follow an unlimited number of redirects, set this to boolean `true` (not advised).  To disable the auto-follow behavior, set it to `0` or `false`.

The library recognizes HTTP codes 301, 302, 307 and 308 as "redirect" responses, as long as a `Location` header accompanies them.

# Automatic Errors

When using `get()` or `post()`, HTTP response codes like 404 or 500 are *not* considered errors, so you have to look at `resp.statusCode` if you are expecting an HTTP 200.  However, this is configurable.  If you would like all non-200 response codes to be considered errors, call the `setAutoError()` method and pass `true`.  Example:

```js
request.setAutoError( true );
```

Note that if you allow [redirects](#automatic-redirects), they will not generate an error.

To customize which response codes are considered "successful" and should *not* generate an error, call the `setSuccessMatch()` method, and pass in a new one.  The default match is shown here, which considered any HTTP response code in the 200 - 299 range to be successful:

```js
request.setSuccessMatch( /^2\d\d$/ );
```

Note that this regular expression also affects the [json()](#json-rest-api) and [xml()](#xml-rest-api) wrapper methods.

# Automatic Retries

By default errors are not retried, and your callback is fired immediately on the first error.  However, you can enable automatic retries by either including a `retries` property in your options object (set to the maximum number of retries you want to allow), or by calling the `setRetries()` method, and specifying the maximum amount for all requests:

```js
request.setRetries( 5 );
```

This example would make up to 6 total attempts (the initial attempt plus up to 5 retries), before ultimately failing the operation and firing your callback with the last error encountered.

For the purpose of automatic retries an "error" is considered to be any core error emitted on the request object, such as a DNS lookup failure, TCP connect failure, socket timeout, or any HTTP response code in the `5xx` range (500 - 599), such as an `Internal Server Error`.  Any other errors, for example anything in the `4xx` range, are *not* retried, as they are typically considered to be more permanent.

# Compressed Responses

The request library automatically handles Brotli, Gzip and Deflate encoded responses that come back from the remote server.  These are transparently decoded for you.  However, you should know that by default all outgoing requests include an `Accept-Encoding: gzip, deflate, br` header, which broadcasts our support for it.  If you do not want responses to be compressed, you can unset this header.  See the [Default Headers](#default-headers) section above.

Alternately, if you would prefer that the library not do anything regarding compression, and pass the compressed response directly through without touching it, call the `setAutoDecompress()` method, and pass in `false`:

```js
request.setAutoDecompress( false );
```

# Performance Metrics

The request library keeps high resolution performance metrics on every HTTP request, including the DNS lookup time, socket connect time, request send time, wait time, receive time, decompress time, and total elapsed time.  These are all tracked using the [pixl-perf](https://www.npmjs.com/package/pixl-perf) module, and passed to your callback as the 4th argument.  Example:

```js
request.get( 'https://www.bitstamp.net/api/ticker/', function(err, resp, data, perf) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Performance: ", perf.metrics());
	}
} );
```

This would output something like the following:

```
Status: 200 OK
Performance: { 
  scale: 1000,
  perf: { 
     total: 548.556,
     dns: 25.451,
     connect: 120.155,
     send: 270.92,
     wait: 122.2,
     receive: 3.462,
     decompress: 4.321 
  },
  counters: { 
    bytes_sent: 134, 
    bytes_received: 749 
  } 
}
```

All the `perf` values are in milliseconds (represented by the `scale`).  Here are descriptions of all the metrics:

| Metric | Description |
|--------|-------------|
| `dns` | Time to resolve the hostname to an IP address via DNS.  Omitted if cached, or you specify an IP on the URL. |
| `connect` | Time to connect to the remote socket (omitted if using Keep-Alives and reusing a host). |
| `send` | Time to send the request data (typically for POST / PUT).  Also includes SSL handshake time (if HTTPS). |
| `wait` | Time spent waiting for the server response (after request is sent). |
| `receive` | Time spent downloading data from the server (after headers received). |
| `decompress` | Time taken to decompress the response (if encoded with Brotli, Gzip or Deflate). |
| `total` | Total time of the entire HTTP transaction. |

As indicated above, some of the properties may be omitted depending on the situation.  For example, if you are using a shared [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) with Keep-Alives, then subsequent requests to the same host won't perform a DNS lookup or socket connect, so those two metrics will be omitted.  Similarly, if the response from the server isn't compressed, then the `decompress` metric will be omitted.

Note that the `send` metric includes the SSL / TLS handshake time, if using HTTPS.  Also, this metric may be `0` if using plain HTTP GET or HEAD, as it is mainly used to measure the POST or PUT data send time (i.e. uploading file data).

The `bytes_sent` and `bytes_received` values in the `counters` object represent the total amount of raw bytes sent and received over the socket.  This includes the raw request line and request/response headers.

See the [pixl-perf](https://www.npmjs.com/package/pixl-perf) module for more details.

# DNS Caching

You can optionally have the library cache DNS lookups in RAM, for faster subsequent requests on the same hostnames.  You can also specify the TTL (time to live) to control how long hostnames will be cached.  This means it will only request a DNS lookup for a given hostname once every N seconds.  To enable this feature, call `setDNSCache()` and specify the number of seconds for the TTL:

```js
request.setDNSCache( 300 ); // 5 minute TTL
```

This will cache hostnames and their IP addresses in RAM for 5 minutes.  Meaning, during that time subsequent requests to the same hostname will not require a DNS lookup.  After 5 minutes, the cache objects will expire, and the next request will perform another DNS lookup.

Note that while the feature can be enabled or disabled per request object, the DNS cache itself is global.  Meaning, it is shared by all `pixl-request` objects in the same process.

## Flushing the Cache

To flush the DNS cache (i.e. eject all the IPs from it), call the `flushDNSCache()` method.  Example:

```js
request.flushDNSCache();
```

# SSL Certificate Validation

If you are trying to connect to a host via HTTPS and getting certificate errors, you may have to bypass Node's SSL certification validation.  To do this, set the `rejectUnauthorized` options property to `false`.  Example:

```js
request.get( 'https://www.bitstamp.net/api/ticker/', {
	rejectUnauthorized: false
}, 
function(err, resp, data) {
	if (err) console.log("ERROR: " + err);
	else {
		console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
		console.log("Headers: ", resp.headers);
		console.log("Content: " + data);
	}
} );
```

Please only do this if you understand the security ramifications, and *completely trust* the host you are connecting to, and the network you are on.  Skipping the certificate validation step should really only be done in special circumstances, such as testing your own internal server with a self-signed cert.

# License

**The MIT License**

*Copyright (c) 2015 - 2019 Joseph Huckaby.*

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
