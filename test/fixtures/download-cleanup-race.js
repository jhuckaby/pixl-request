// Regression test fixture for cleaning up a path download during an active write.
// This runs in a child process because the original bug terminates the process.

var Path = require('path');
var os = require('os');
var fs = require('fs');
var http = require('http');

var PixlRequest = require('../..');

var temp_file = Path.join( os.tmpdir(), 'pixl-request-cleanup-race-' + process.pid + '.bin' );
var original_create_write_stream = fs.createWriteStream;
var attempts = 0;
var finished = false;

// Delay physical writes long enough for the request idle timeout to destroy the
// stream first.  Node then completes the pending write with ERR_STREAM_DESTROYED.
var slow_fs = Object.assign( {}, fs, {
	write: function(fd, buffer, offset, length, position, callback) {
		setTimeout( function() {
			fs.write( fd, buffer, offset, length, position, callback );
		}, 150 );
	}
} );

fs.createWriteStream = function(path, options) {
	options = Object.assign( {}, options, { fs: slow_fs } );
	return original_create_write_stream.call( fs, path, options );
};

var server = http.createServer( function(req, resp) {
	attempts++;

	// Send one chunk so a file write begins, then deliberately leave the response
	// open.  pixl-request's idle timeout will clean up this attempt and retry it.
	resp.writeHead( 200, { 'Content-Type': "application/octet-stream" } );
	resp.write( Buffer.alloc(1024) );
} );

var finish = function(err) {
	if (finished) return;
	finished = true;
	clearTimeout( watchdog );
	fs.createWriteStream = original_create_write_stream;

	server.close( function() {
		try { fs.unlinkSync(temp_file); }
		catch (cleanup_err) {
			if (cleanup_err.code != 'ENOENT') err = err || cleanup_err;
		}

		if (err) {
			console.error( err.stack || err );
			process.exitCode = 1;
		}
	} );
};

var watchdog = setTimeout( function() {
	console.error("Timed out waiting for the download cleanup regression fixture");
	process.exit(1);
}, 4000 );

server.listen( 0, '127.0.0.1', function() {
	var request = new PixlRequest();
	var url = 'http://127.0.0.1:' + server.address().port + '/stall';

	request.get( url, {
		download: temp_file,
		idleTimeout: 20,
		retries: 1,
		retryDelay: 0
	}, function(err) {
		if (!err) return finish( new Error("Expected the stalled download to time out") );
		if (attempts != 2) return finish( new Error("Expected 2 download attempts, got: " + attempts) );
		finish();
	} );
} );
