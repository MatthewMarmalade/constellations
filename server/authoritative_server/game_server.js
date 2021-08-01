//Game Configuration
var config = {
	type: Phaser.HEADLESS,
	autoFocus: false,
	width: 1300,
	height: 700,
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

//Game Initialization
var game = new Phaser.Game(config);

var galaxy = {};
const players = {};
const connection_network = [];
const circle_radius = 40;
var line_width = 50; var line_height = 5;

var scene;

//	########################
//	INITIALIZATION + UPDATES
//	########################

//loading initial assets
function preload() {

}

//adding assets to the world, initial game state
function create() {
	scene = this;

	galaxy = {
		systems: [
			{x: config.width / 2, y: config.height / 2, system_type: '1_system', num: 1, adjacent: [1], connected: [], i: 0},
			{x: config.width * 0.4, y: config.height / 2, system_type: '2_system', num: 2, adjacent: [0], connected: [], i: 1},
			{x: config.width * 0.6, y: config.height * 0.2, system_type: 'empty_system', num: 0, adjacent: [], connected: [], i: 2}
		],
		adjacencies: [
			{system1i: 0, system2i: 1, connection:false, i: 0}
		],
		networks: [
			[0]
		]
	}



	io.on('connection', function (socket) {
		console.log('a user connected: ' + socket.id);
		players[socket.id] = addPlayer(socket.id);
		socket.emit('current_galaxy', galaxy);
		socket.broadcast.emit('new_player', players[socket.id]);


		// let move_adjacency = {system1: 1, system2: 2, connection:false, i:1};
		// let move = {move_type: 'adjacency', adjacency: move_adjacency};

		// let move_system = {x: config.width * 1/3, y: config.height * 2/3, system_type: 'empty_system', num: 0, adjacent: [], i: 3};
		// let move = {move_type: 'discovery', system: move_system};

		// let move = {move_type: 'connection', adjacencyi: 0};

		// let move = {move_type: 'scout', systemi: 2, num: 3};
		// socket.emit('new_move', move);


		socket.on('disconnect', function() {
			console.log('user disconnected' + socket.id);
			console.log('all players: ' + JSON.stringify(players));
			removePlayer(self, socket.id);
			delete players[socket.id];
			io.emit('player_disconnected', socket.id);
		});

		socket.on('send_move', function(move) {
			console.log('received move from: ' + socket.id);
			handle_move(move, socket);
		})
	});
}

function addPlayer(id) {
	const player = {id:id}
	console.log("New Player: " + player.id);
	return player;
}

function removePlayer(id) {
	console.log("Removed Player: " + id);
}

//live updates - text output and previews
function update() {

}

function handle_move(move, socket) {
	console.log(move);
	let result;
	if (move.move_type === 'scout_intent') {
		result = scout(move.systemi);
		if (result.success) {
			io.emit('new_move', {move_type:'scout', systemi:move.systemi, num:result.num, num_new_adjacencies:result.num_new_adjacencies});
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: scout failed:");
		}
	} else if (move.move_type === 'adjacent_intent') {
		result = adjacent(move.system1i, move.system2i);
		if (result.success) {
			io.emit('new_move', {move_type: 'adjacency', adjacency: result.new_adjacency});
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: adjacent failed:");
		}
	} else if (move.move_type === 'discover_intent') {
		result = discover(move.system1i, move.x, move.y);
		if (result.success) {
			io.emit('new_move', {move_type: 'discovery', system: result.new_system, adjacency: result.new_adjacency})
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: discover failed:");
		}
	} else if (move.move_type === 'connect_intent') {
		result = connect(move.adjacencyi);
		if (result.success) {
			io.emit('new_move', {move_type: 'connection', adjacencyi: move.adjacencyi})
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: connection failed:");
		}
	} else {
		console.log("handle_move: Unknown move type: " + move.move_type);
	}
}

function scout(systemi) {
	let system = galaxy.systems[systemi];
	if (system != null) {
		let num = Math.ceil((Math.random() * 6));
		galaxy.systems[systemi].num = num;
		// assign_habitability(system_sprite, num);
		let num_new_adjacencies = Math.ceil((Math.random() * 6));
		// text3.setText("Adjacencies: " + num_new_adjacencies);
		console.log("WARNING: IGNORING NUM NEW ADJACENCIES")
		return {success:true, num: num, num_new_adjacencies: 2};
	} else {
		console.log("scout: System " + systemi + " does not exist in systems:");
		console.log(galaxy.systems);
		return {success:false};
	}
}

function adjacent(system1i, system2i) {
	let system1 = galaxy.systems[system1i]; let system2 = galaxy.systems[system2i];
	if (valid_adjacent(system1, system2)) {
		system1.adjacent.push(system2.i);
		system2.adjacent.push(system1.i);
		let new_adjacency = {system1i: system1i, system2i: system2i, connection: false, i: galaxy.adjacencies.length}
		galaxy.adjacencies.push(new_adjacency)
		return {success:true, new_adjacency:new_adjacency};
	} else {
		console.log("adjacent: Failed!");
		console.log({system1: system1, system2: system2});
		return {success:false};
	}
}

function valid_adjacent(system1, system2) {
	if (system1.i === system2.i) {
		console.log("System cannot be adjacent to itself!");
		return false;
	}

	for (let a = 0; a < system1.adjacent.length; a++) {
		if (system1.adjacent[a] === system2.i) {
			console.log("System " + system2.i + " is in the adjacency list " + system1.adjacent + " of system " + system1.i + "!");
			return false;
		}
	}

	return valid_path(system1, system2);
}

function discover(system1i, x, y) {
	let system1 = galaxy.systems[system1i];
	let system2 = {x: x, y: y, system_type: 'empty_system', num: 0, adjacent: [], connected: [], i: galaxy.systems.length};
	let system_clear = !intersects_adjacencies(system2);
	if (system_clear) {
		let valid_adjacency = valid_adjacent(system1, system2);
		if (valid_adjacency) {
			// system2.setTexture('empty_system');
			// system2.num = 0;
			// systems.push(system2);
			galaxy.systems.push(system2);
			let result = adjacent(system1.i, system2.i);
			if (result.success) {
				return {success:true, new_system: system2, new_adjacency: result.new_adjacency};
			} else {
				return {success:false};
			}
		} else {
			console.log("discover: Cannot discover this system, adjacency creation would be invalid.");
		}
	} else {
		console.log("discover: Cannot discover this system; system is on top of existing adjacency.");
	}
	return {success:false};
}

function connect(adjacencyi) {
	let adjacency = galaxy.adjacencies[adjacencyi];

	if (valid_connect(adjacency)) {
		let system1 = galaxy.systems[adjacency.system1i];
		let system2 = galaxy.systems[adjacency.system2i];
		system1.connected.push(system2.i);
		system2.connected.push(system1.i);

		adjacency.connection = true;

		connection_network.push(adjacencyi);

		return {success:true, adjacencyi: adjacencyi};
	} else {
		return {success:false};
	}
}

function valid_connect(adjacency) {
	if (adjacency.connected === true) {
		console.log("valid_connect: Adjacency " + adjacency.i + " already connected!");
		return false;
	}

	if (intersects_network(adjacency)) {
		console.log("valid_connect: Proposed connection intersects existing connection.");
		return false;
	}

	let in_network_1 = false;
	let in_network_2 = false;
	for (let n = 0; n < galaxy.networks[0].length; n++) {
		if (adjacency.system1i === galaxy.networks[0][n]) {
			in_network_1 = true;
		}
		if (adjacency.system2i === galaxy.networks[0][n]) {
			in_network_2 = true;
		}
		if (in_network_1 && in_network_2) { break; }
	}

	if (!in_network_1 && !in_network_2) {
		console.log("valid_connect: Systems " + adjacency.system1i + " and " + adjacency.system2i + " are not in network [" + galaxy.networks[0] + "]");
		return false;
	} else {
		console.log("valid_connect: Connection Valid")
		if (!in_network_1) { galaxy.networks[0].push(adjacency.system1i); }
		if (!in_network_2) { galaxy.networks[0].push(adjacency.system2i); }
		return true;
	}
}

//path checker for new adjacencies between systems at (x1, y1) and (x2, y2). Checks if new adjacency is clear of systems.
function valid_path(system1, system2) {
	let endpoints = get_endpoints(system1, system2);
	return (!intersects_systems(endpoints.endpoint1, endpoints.endpoint2));
}

function get_endpoints(system1, system2) {
	let angle = angleTo(system1.x, system1.y, system2.x, system2.y);
	let dist = distTo(system1.x, system1.y, system2.x, system2.y);
	let scale = dist / line_width
	let midx = mid(system1.x, system2.x); let midy = mid(system1.y, system2.y);
	let endpoint1 = {x : midx + (Math.cos(angle) * dist / 2), y : (midy + (Math.sin(angle) * dist / 2))};
	let endpoint2 = {x : midx - (Math.cos(angle) * dist / 2), y : (midy - (Math.sin(angle) * dist / 2))};
	return {endpoint1: endpoint1, endpoint2: endpoint2}
}

//helper function for path that checks if the proposed adjacency intersects any existing systems
function intersects_systems(endpoint1, endpoint2) {
	var system;

	//create rectangle
	let angle = angleTo(endpoint1.x, endpoint1.y, endpoint2.x, endpoint2.y) + (Math.PI / 2);
	let a = {x:endpoint1.x + (Math.cos(angle) * circle_radius), y:endpoint1.y + (Math.sin(angle) * circle_radius)};
	let b = {x:endpoint1.x - (Math.cos(angle) * circle_radius), y:endpoint1.y - (Math.sin(angle) * circle_radius)};
	let c = {x:endpoint2.x + (Math.cos(angle) * circle_radius), y:endpoint2.y + (Math.sin(angle) * circle_radius)};
	let d = {x:endpoint2.x - (Math.cos(angle) * circle_radius), y:endpoint2.y - (Math.sin(angle) * circle_radius)};

	let rectangle_area = 0; let sab = 0; let sbc = 0; let scd = 0; let sda = 0;
	let intersects = false;

	for (let ds = 0; ds < galaxy.systems.length; ds++) {
		system = galaxy.systems[ds];
		//console.log("Checking system: " + system.i);
		rectangle_area = area(a, b, c) + area(a, d, c);
		sab = area(system, a, b);
		sbc = area(system, b, c);
		scd = area(system, c, d);
		sda = area(system, d, a);
		if (sab + sbc + scd + sda < rectangle_area) {
			//console.log("System " + system.i + " intersects the rectangle! ");
			//system.setTint(0x00ffff);
			intersects = true;
		}
	}
	return intersects;
}

//helper function for discover that checks if the proposed system intersects any existing adjacencies
function intersects_adjacencies(system) {
	//console.log("Checking system: " + system.i + " to see if it is on top of any of the " + adjacency_network.length + " existing adjacencies.");
	let angle = 0; let a = {x:0,y:0}; let b = {x:0,y:0}; let c = {x:0,y:0}; let d = {x:0,y:0};
	let rectangle_area = 0; let sab = 0; let sbc = 0; let scd = 0; let sda = 0;
	let intersects = false;
	let endpoint1; let endpoint2;
	for (let an = 0; an < galaxy.adjacencies.length; an++) {
		endpoint1 = galaxy.systems[galaxy.adjacencies[an].system1i];
		endpoint2 = galaxy.systems[galaxy.adjacencies[an].system2i];

		angle = angleTo(endpoint1.x, endpoint1.y, endpoint2.x, endpoint2.y) + (Math.PI / 2);
		a.x = endpoint1.x + (Math.cos(angle) * circle_radius); a.y = endpoint1.y + (Math.sin(angle) * circle_radius);
		b.x = endpoint1.x - (Math.cos(angle) * circle_radius); b.y = endpoint1.y - (Math.sin(angle) * circle_radius);
		c.x = endpoint2.x + (Math.cos(angle) * circle_radius); c.y = endpoint2.y + (Math.sin(angle) * circle_radius);
		d.x = endpoint2.x - (Math.cos(angle) * circle_radius); d.y = endpoint2.y - (Math.sin(angle) * circle_radius);

		rectangle_area = area(a, b, c) + area(a, d, c);
		sab = area(system, a, b);
		sbc = area(system, b, c);
		scd = area(system, c, d);
		sda = area(system, d, a);
		if (sab + sbc + scd + sda < rectangle_area) {
			//console.log("System intersects existing adjacency!");
			return true;
		}
	}
	return false;
}

//intersection checker helper function, returns the area of a triangle specified by points a, b, and c.
function area(a, b, c) { return Math.abs((a.x * (b.y - c.y)) + (b.x * (c.y - a.y)) + (c.x * (a.y - b.y))) / 2;
}

//returns angle between point 1 (x1, y1) and point 2 (x2, y2) compared to the x-axis
function angleTo(x1, y1, x2, y2) {
	let divide_by_zero_offset = 0;
	if (x1 === x2) {
		divide_by_zero_offset = 1;
	}
	let angle = Math.atan((y2 - y1) / (x2 - x1 + divide_by_zero_offset));
	if (x2 < x1) {
		angle = angle + Math.PI;
	}
	return angle;
}

//returns the distance between a system at (x1, x2) and another system at (y1, y2) (not including the interior of the circles)
function distTo(x1, y1, x2, y2) {
	const a = x2 - x1;
	const b = y2 - y1;
	const distance = Math.sqrt((a * a) + (b * b)) - (circle_radius * 2);
	return distance >= 0 ? distance : 0;
}

//returns the average of two numbers
function mid(a,b) { return (a + b) / 2;
}

//checks if a proposed adjacency intersects any of the connections in the existing connection network
function intersects_network(adjacency) {
	//returns if a given adjacency intersects any other connection in the network - if so, it cannot become a connection.
	var connection;
	for (let n = 0; n < connection_network.length; n++) {
		connection = galaxy.adjacencies[connection_network[n]];
		if (intersects(connection, adjacency)) {
			//console.log("Adjacency intersects existing connection network!");
			return true;
		}
	}
	//console.log("Adjacency does not intersect existing connection network!");
	return false;
}

//checks if a proposed adjacency intersects a given existing connection
function intersects(connection, adjacency) {
	const p = get_endpoints(galaxy.systems[connection.system1i], galaxy.systems[connection.system2i]);
	const q = get_endpoints(galaxy.systems[adjacency.system1i], galaxy.systems[adjacency.system2i]);
	const p1 = p.endpoint1;
	const p2 = p.endpoint2;
	const q1 = q.endpoint1;
	const q2 = q.endpoint2;

	// console.log("Testing intersection of: (" + p1.x + "," + p1.y + ")-(" + p2.x + "," + p2.y + ") and (" + q1.x + "," + q1.y + ")-(" + q2.x + "," + q2.y + ")");

	let o1 = orientation(p1, p2, q1);
	let o2 = orientation(p1, p2, q2);
	let o3 = orientation(q1, q2, p1);
	let o4 = orientation(q1, q2, p2);

	// console.log("Orientations: " + o1 + ", " + o2 + ", " + o3 + ", " + o4)

	if (o1 != o2 && o3 != o4) { return true; }
	if (o1 === 'collinear' && q_between_collinear_p_r(p1, q1, p2)) { return true; }
	if (o2 === 'collinear' && q_between_collinear_p_r(p1, q2, p2)) { return true; }
	if (o3 === 'collinear' && q_between_collinear_p_r(q1, p1, q2)) { return true; }
	if (o4 === 'collinear' && q_between_collinear_p_r(q1, p2, q2)) { return true; }

	return false;
}

//helper function for checking intersection that returns the geometric orientation of 3 points in space - clockwise, counterclockwise, or collinear
function orientation(p, q, r) {
	let o = (q.y - p.y) * (r.x - q.x);
	let t = (r.y - q.y) * (q.x - p.x);
	// console.log("o: " + o + "; t: " + t);
	if (o === t) { return 'collinear'; } //collinear
	if (o > t) { return 'clockwise'; } //clockwise
	if (o < t) { return 'counter-clockwise'; } //counter-clockwise
}

//helper function for checking intersection that, when given 3 collinear points, returns if q falls between p and r (true) or outside of p and r (false)
function q_between_collinear_p_r(p, q, r) { 
	return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

window.gameLoaded();