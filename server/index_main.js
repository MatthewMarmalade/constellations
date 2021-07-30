const express = require('express');
const app = express();
const _path = require('path');
const jsdom = require('jsdom');

const server = require('http').Server(app);
const io = require('socket.io')(server);

const Datauri = require('datauri');
const datauri = new Datauri();
const { JSDOM } = jsdom;

app.use(express.static(__dirname + '/public/'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public/index_client.html');
});

function setupAuthoritativePhaser() {
	JSDOM.fromFile(_path.join(__dirname, 'authoritative_server/index_server.html'), {
		runScripts: "dangerously",
		resources: "usable",
		pretendToBeVisual:true
	}).then((dom) => {
		dom.window.gameLoaded = () => {
			server.listen(8081, function () {
				console.log('Listening on ' + server.address().port);
			});
		};
		dom.window.io = io;
		dom.window.URL.createObjectURL = (blob) => {
			if (blob) {
				return datauri.format(blob.type, blob[Object.getOwnPropertySymbols(blob)[0]]._buffer).content;
			}
		};
		dom.window.URL.revokeObjectUrl = (objectURL) => {};
	}).catch((error) => {
		console.log(error.message);
	});
}

setupAuthoritativePhaser();