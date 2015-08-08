# Overview

This module is a very simple wrapper around Node's built-in [http](https://nodejs.org/api/http.html) library.  It provides an easy way to send an HTTP GET or POST, including things like support for HTTPS (SSL), file uploads and JSON REST style API calls.  Gzip-encoded responses are also handled automatically.

# Usage

Use [npm](https://www.npmjs.com/) to install the module:

```
	npm install pixl-request
```

Then use `require()` to load it in your code:

```javascript
	var PixlRequest = require('pixl-request');
```

Instantiate a request object and pass in an optional user agent string:

```javascript
	var request = new PixlRequest();
	var request = new PixlRequest( "My Custom Agent 1.0" );
```

Here is a simple HTTP GET example:

```javascript
	request.get( 'http://www.bitstamp.net/api/ticker/', function(err, resp, data) {
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
| [post()](#http-post) | Performs an HTTP POST request. |
| [json()](#json-rest-api) | Sends a request to a JSON REST API endpoint and parses the response. |
| [xml()](#xml-rest-api) | Sends a request to an XML REST API endpoint and parses the response. |
| [setHeader()](#default-headers) | Overrides or adds a default header for future requests. |
| [setTimeout()](#handling-timeouts) | Overrides the default socket idle timeout (milliseconds). |

# Request Types

Here are all the request types supported by the library.

## HTTP GET

```
	get( URL, CALLBACK )
	get( URL, OPTIONS, CALLBACK )
```

To perform a simple HTTP GET, call the `get()` method.  All you need to provide is the URL and a callback:

```javascript
	request.get( 'http://www.bitstamp.net/api/ticker/', function(err, resp, data) {
		if (err) console.log("ERROR: " + err);
		else {
			console.log("Status: " + resp.statusCode + " " + resp.statusMessage);
			console.log("Headers: ", resp.headers);
			console.log("Content: " + data);
		}
	} );
```

Your callback function is passed an error object (which will be false upon success), the HTTP response object from Node ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and a data buffer of the content (if any).

To specify additional options, such as custom request headers, include an object just before the callback:

```javascript
	request.get( 'http://www.bitstamp.net/api/ticker/', {
		headers: {
			'X-Custom-Header': "My custom value"	
		}
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
		console.log("Headers: ", resp.headers));
		console.log("Content: " + data);
	} );
```

Your key/value pairs will be serialized using the `application/x-www-form-urlencoded` format.  For a multipart post, see [Multipart POST](#multipart-post) below.

Your callback function is passed an error object (which will be false upon success), the HTTP response object from Node ([IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage)), and a data buffer of the content (if any).

Check out the Node [http.request](https://nodejs.org/api/http.html#http_http_request_options_callback) documentation for all the properties you can pass in the options object.

By default, connections are closed at the end of each request.  If you want to reuse a persistent connection across multiple requests, see the [Keep-Alives](#keep-alives) section below.

## Multipart POST

For a `multipart/form-data` post, which is typically better for binary data, all you need to do is pass in a `multipart` property in your options object, and set it to a true value.  Everything else is the same as a standard [HTTP POST](#http-post):

```javascript
	request.post( 'http://myserver.com/api/post', {
		multipart: true, // activate multipart/form-data
		data: {
			foo: new Buffer("Joe was here!"), 
			bar: 54321
		}
	}, 
	function(err, resp, data) {
		if (err) console.log("ERROR: " + err);
		console.log("Status: " + resp.statusCode + ' ' + resp.statusMessage);
		console.log("Headers: ", resp.headers));
		console.log("Content: " + data);
	} );
```

Note that you can use [Buffer](https://nodejs.org/api/buffer.html) objects instead of strings for your data values.

## File Uploads

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
			foo: new Buffer("Joe was here!"), 
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

## Keep-Alives

To reuse the same socket connection across multiple requests, you need to use a [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) object (provided by Node).  Simply construct an instance, set the `keepAlive` property to `true`, and pass it into the options object for your requests, using the `agent` property:

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

**Note:** If the server doesn't send back XML, or it cannot be parsed, an error will be sent to your callback.

# Default Headers

By default the request library will add the following outgoing headers to every request:

```
	User-Agent: PixlRequest 1.0.0
	Accept-Encoding: gzip
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

The default idle socket timeout for all requests is 30 seconds.  You can customize this per request by including a `timeout` property with your options object, and setting it to the number of milliseconds you want:

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

When a timeout occurs, an `error` event is emitted.  The error message will follow this syntax: `Socket Timeout (### ms)`.

# Compressed Responses

The request library automatically handles Gzip-encoded responses that come back from the remote server.  These are transparently decoded for you.  However, you should know that by default all outgoing requests include an `Accept-Encoding: gzip` header, which broadcasts our support for it.  If you do not want responses to be compressed, you can unset this header.  See the [Default Headers](#default-headers) section above.

# License

Copyright (c) 2015 Joseph Huckaby

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
