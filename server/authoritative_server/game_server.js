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
const cycles = [];
const circle_radius = 40;
var line_width = 50; var line_height = 5;
var visited = {};

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
			{x: config.width / 2, y: config.height / 2, num: 1, adjacent: [1], connected: [], i: 0, settlements: [], factories: []},
			{x: config.width * 0.4, y: config.height / 2, num: 2, adjacent: [0], connected: [], i: 1, settlements: [], factories: []},
			{x: config.width * 0.6, y: config.height * 0.2, num: 0, adjacent: [], connected: [], i: 2, settlements: [], factories: []}
		],
		adjacencies: [
			{system1i: 0, system2i: 1, connection:false, i: 0}
		],
		networks: [
			[0]
		],
		settlements: [
		],
		factories: [
		],
		maxX: null,
		minX: null
	}

	max_min();



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

//adding a new player. Incomplete!
function addPlayer(id) {
	const player = {id:id}
	console.log("New Player: " + player.id);
	return player;
}

//removing a player from the list of players. Incomplete!
function removePlayer(id) {
	console.log("Removed Player: " + id);
}

//live updates - text output and previews
function update() {

}

//when a move is submitted by a player, this function routes it to execution and handles whether or not it succeeds. 
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
			io.emit('new_move', {move_type: 'discovery', system: result.new_system, adjacency: result.new_adjacency});
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: discover failed:");
		}
	} else if (move.move_type === 'connect_intent') {
		result = connect(move.adjacencyi);
		if (result.success) {
			io.emit('new_move', {move_type: 'connection', adjacencyi: move.adjacencyi});
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: connection failed:");
		}
	} else if (move.move_type === 'establish_intent') {
		result = establish(move.systemi, move.establish_type);
		if (result.success) {
			io.emit('new_move', {move_type: 'establish', establishment: result.establishment});
		} else {
			socket.emit('failed_move', move);
			console.log("handle_move: establish failed:");
		}
	} else {
		console.log("handle_move: Unknown move type: " + move.move_type);
	}
}

//attempts to scout the given system and returns the number and number of new adjacencies if successful.
function scout(systemi) {
	let system = galaxy.systems[systemi];
	if (system != null) {
		if (system.num === 0) {
			let num = Math.ceil((Math.random() * 6));
			galaxy.systems[systemi].num = num;
			// assign_habitability(system_sprite, num);
			let num_new_adjacencies = Math.ceil((Math.random() * 3)) + Math.ceil((Mat.random() * 4)) - 1;
			// text3.setText("Adjacencies: " + num_new_adjacencies);
			// console.log("WARNING: IGNORING NUM NEW ADJACENCIES")
			return {success:true, num: num, num_new_adjacencies: num_new_adjacencies};
		} else {
			console.log("scout: System " + systemi + " has already been scouted!");
			return {success:false};
		}
	} else {
		console.log("scout: System " + systemi + " does not exist in systems:");
		console.log(galaxy.systems);
		return {success:false};
	}
}

//attempts to establish an adjacency between the two systems. returns the newly created adjacency object if successful.
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

//basic adjacency checks - if it's not trying to become adjacent to itself, and it's not already adjacent. if checks pass, redirects to valid_path.
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

//attempts to create a new system, discovered *from* the given system, at the specified coordinates. checks if we can be adjacent, etc., returns new system + adjacency if successful.
function discover(system1i, x, y) {
	let system1 = galaxy.systems[system1i];
	let system2 = {x: x, y: y, system_type: 'empty_system', num: 0, adjacent: [], connected: [], i: galaxy.systems.length, settlements: [], factories: []};
	let system_clear = !intersects_adjacencies(system2);
	if (system_clear) {
		let valid_adjacency = valid_adjacent(system1, system2);
		if (valid_adjacency) {
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

//attempts to turn the specified adjacency into a connection. returns the i of the adjacency if successful.
function connect(adjacencyi) {
	let adjacency = galaxy.adjacencies[adjacencyi];
	let result = valid_connect(adjacency)

	if (result.success) {
		if (!result.in_network_1) { galaxy.networks[0].push(adjacency.system1i); }
		if (!result.in_network_2) { galaxy.networks[0].push(adjacency.system2i); }
		let system1 = galaxy.systems[adjacency.system1i];
		let system2 = galaxy.systems[adjacency.system2i];
		system1.connected.push(system2.i);
		system2.connected.push(system1.i);

		adjacency.connection = true;

		connection_network.push(adjacencyi);

		if (result.in_network_1 && result.in_network_2) {
			let new_cycles = dfs(adjacency.system1i);
			add_unique(new_cycles);
		}

		return {success:true, adjacencyi: adjacencyi};
	} else {
		return {success:false};
	}
}

//attempts to establish a new factory or settlement on the given system. if successful, returns the new establishment.
function establish(systemi, establish_type) {
	let system = galaxy.systems[systemi];

	if (establish_type === 'settlement') {
		console.log("Existing settlements on system " + systemi + ": [" + system.settlements + "]");
		for (let s = 0; s < system.settlements.length; s++) {
			let existing_settlement = galaxy.settlements[system.settlements[s]];
			console.log("There is an existing settlement: " + existing_settlement.name + " on system " + systemi);
			return {success:false};
		}
		if (valid_settlement(systemi)) {
			console.log("√ The settlement is enclosed within a cycle and is valid.");
			let new_settlement = {establish_type: 'settlement', name: "Miranda", systemi: systemi, i: galaxy.settlements.length};
			system.settlements.push(new_settlement.i);
			galaxy.settlements.push(new_settlement);
			return {success:true, establishment: new_settlement};
		} else {
			console.log("X The proposed settlement is NOT enclosed within a cycle.");
			return {success:false};
		}
	} else if (establish_type === 'factory') {
		console.log("Existing factories on system " + systemi + ": [" + system.factories + "]");
		for (let f = 0; f < system.factories.length; f++) {
			let existing_factory = galaxy.factories[system.factories[f]];
			console.log("There is an existing " + existing_factory.material + " factory on system " + systemi);
			return {success:false};
		}
		if (valid_factory(systemi)) {
			console.log("√ The factory has >=3 connections and is valid.");
			let new_factory = {establish_type: 'factory', material: "Birthday Party Invitations", systemi: systemi, i: galaxy.factories.length};
			system.factories.push(new_factory.i);
			galaxy.factories.push(new_factory);
			return {success:true, establishment: new_factory};
		} else {
			console.log("X The proposed factory does NOT have >= 3 connections.");
			return {success:false};
		}
	} else {
		console.log("Unknown establish type: " + establish_type);
		return {success:false};
	}
}

//checks if the given adjacency can become a connection - if it's intersecting any existing connections, for instance. if successful, also returns which nodes are already in the network
function valid_connect(adjacency) {
	if (adjacency.connected === true) {
		console.log("valid_connect: Adjacency " + adjacency.i + " already connected!");
		return {success:false};
	}

	if (intersects_network(adjacency)) {
		console.log("valid_connect: Proposed connection intersects existing connection.");
		return {success:false};
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
		return {success:false};
	} else {
		console.log("valid_connect: Connection Valid")
		return {success:true,in_network_1:in_network_1,in_network_2:in_network_2};
	}
}

//path checker for new adjacencies between systems at (x1, y1) and (x2, y2). Checks if new adjacency is clear of systems.
function valid_path(system1, system2) {
	let endpoints = get_endpoints(system1, system2);
	return (!intersects_systems(endpoints.endpoint1, endpoints.endpoint2));
}

//given two systems, gets the endpoints of the line between them. Notably, gets these endpoints offset from the centres, so they just go to the circle's arc.
function get_endpoints(system1, system2) {
	let angle = angleTo(system1.x, system1.y, system2.x, system2.y);
	let dist = distTo(system1.x, system1.y, system2.x, system2.y);
	//let scale = dist / line_width
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
	let intersects_system = false;

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
			intersects_system = true;
		}
	}
	return intersects_system;
}

//helper function for discover that checks if the proposed system intersects any existing adjacencies
function intersects_adjacencies(system) {
	//console.log("Checking system: " + system.i + " to see if it is on top of any of the " + adjacency_network.length + " existing adjacencies.");
	let angle = 0; let a = {x:0,y:0}; let b = {x:0,y:0}; let c = {x:0,y:0}; let d = {x:0,y:0};
	let rectangle_area = 0; let sab = 0; let sbc = 0; let scd = 0; let sda = 0;
	// let intersects_adjacency = false;
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
		if (intersects_connection(connection, adjacency)) {
			//console.log("Adjacency intersects existing connection network!");
			return true;
		}
	}
	//console.log("Adjacency does not intersect existing connection network!");
	return false;
}

//checks if a proposed adjacency intersects a given existing connection
function intersects_connection(connection, adjacency) {
	const p = get_endpoints(galaxy.systems[connection.system1i], galaxy.systems[connection.system2i]);
	const q = get_endpoints(galaxy.systems[adjacency.system1i], galaxy.systems[adjacency.system2i]);

	return intersects(p, q);
}

//checks if two lines p and q (with endpoint1 and endpoint2, both of which are xy points) intersect each other.
function intersects(p, q) {
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

//returns a list of cycles containing a specified node
function dfs(systemi) {

	let test_cycles = [[systemi]];
	let test_cycles_length;
	let test_cycles_swap = [];
	let test_cycle;
	let test_cycle_extended;
	let latest_systemi;
	let latest_connected;
	let previous_systemi;
	let new_cycles = [];
	let i = 0;
	let backtrack;

	// console.log("dfs: testing " + test_cycles.length + " cycles: [" + test_cycles + "]");

	while (test_cycles.length > 0 && i < 10) {
		console.log("i: " + i + ": cycles remaining: " + test_cycles.length + "; test_cycles: [" + test_cycles + "]");
		test_cycles_length = test_cycles.length;
		for (let t = 0; t < test_cycles_length; t++) {
			test_cycle = test_cycles[t];
			// console.log("t: " + t + ": test_cycle: " + test_cycle);
			latest_systemi = test_cycle[test_cycle.length - 1];
			previous_systemi = test_cycle[Math.max(test_cycle.length, 2) - 2];
			latest_connected = galaxy.systems[latest_systemi].connected;
			// console.log("t: " + t + ": system " + latest_systemi + " connected to: [" + latest_connected + "]");
			for (let lc = 0; lc < latest_connected.length; lc++) {
				backtrack = false;
				for (let s = 0; s < test_cycle.length; s++) {
					if (latest_connected[lc] === test_cycle[s]) {
						// console.log("lc: " + lc + ": backtrack found: " + latest_connected[lc] + " in [" + test_cycle + "]");
						backtrack = true;
					}
				}
				test_cycle_extended = test_cycle.slice();
				test_cycle_extended.push(latest_connected[lc]);

				if (!backtrack) {
					// console.log("lc: " + lc + ": extension: [" + test_cycle + "] -> [" + test_cycle_extended + "]");
					test_cycles.push(test_cycle_extended.slice());
				} else {
					if (latest_connected[lc] === systemi && latest_connected[lc] != previous_systemi) {
						// console.log("lc: " + lc + ": cycle found: [" + test_cycle + "]");
						new_cycles.push(test_cycle.slice());
					} else {
						// console.log("lc: " + lc + ": backtrack: [" + test_cycle + "] -> " + latest_connected[lc]);
					}
				}
			}
		}
		test_cycles.splice(0, test_cycles_length);
		i++;
	}

	// console.log("dfs: found " + new_cycles.length + " cycles: [" + new_cycles + "]");
	return new_cycles;
}

//adds new cycles to the existing collection of cycles, discarding mirrors.
function add_unique(new_cycles) {
	let new_cycle;
	let unique;
	console.log("add_unique: testing [" + new_cycles + "] for uniqueness and addition to [" + cycles + "]");
	for (let nc = 0; nc < new_cycles.length; nc++) {
		new_cycle = new_cycles[nc].slice(); //copy the new cycle
		new_cycle.push(new_cycle.shift()); //move start of cycle to the end
		new_cycle.reverse(); //reverse the cycle to check for the cycle's exact mirror
		// console.log("nc: " + nc + ": new cycle [" + new_cycles[nc] + "] flipped to -> [" + new_cycle + "]");
		unique = true;
		for (let c = 0; c < cycles.length; c++) {
			if (JSON.stringify(new_cycle) === JSON.stringify(cycles[c])) {
				unique = false;
				// console.log("c: " + c + ": found duplicate of [" + new_cycle + "]: [" + cycles[c] + "]");
			} else {
				// console.log("c: " + c + ": new cycle [" + new_cycle + "] is not equal to [" + cycles[c] + "]");
			}
		}
		if (unique) {
			cycles.push(new_cycles[nc].slice());
		}
		// console.log("nc: " + nc + ": updated cycles: [" + cycles + "]");
	}
	console.log("add_unique: number of cycles: " + cycles.length + "; updated cycles:");
	for (let c = 0; c < cycles.length; c++) {
		console.log("    [" + cycles[c] + "]");
	}
}

//checks if a system can host a settlement by checking if it is enclosed within at least one cycle. Incomplete - still need to check based on ownership of connections
function valid_settlement(systemi) {
	let all_enclosing_cycles = enclosing_cycles(systemi);

	if (all_enclosing_cycles.length === 0) {
		return false;
	} else {
		return true;
	}
}

//checks if a system can host a factory by checking if it has at least 3 other systems in its connected list
function valid_factory(systemi) {
	let num_connections = galaxy.systems[systemi].connected.length;
	if (num_connections >= 3) {
		return true;
	} else {
		return false;
	}
}

//checks every cycle to see if it encloses the given system. checks by counting the intersections with two horizontal rays.
function enclosing_cycles(systemi) {
	console.log("Determining the enclosing cycles of system " + systemi + ".")
	let system = galaxy.systems[systemi];
	max_min();
	let line_right = {endpoint1: system, endpoint2: {x: galaxy.maxX, y: system.y}};
	let line_left = {endpoint1: {x: galaxy.minX, y: system.y}, endpoint2: system};
	console.log("Line Right: ");
	console.log(line_right);
	console.log("Line Left: ");
	console.log(line_left);

	let count_right = 0;
	let count_left = 0;

	let enclosing = [];
	let cycle;
	let node1; let node2;
	for (let c = 0; c < cycles.length; c++) {
		cycle = cycles[c];
		console.log("Testing cycle " + c + ": [" + cycle + "]");
		node2 = galaxy.systems[cycle[0]];
		node1 = galaxy.systems[cycle[cycle.length - 1]];
		console.log("	- Testing nodes " + node1.i + " and " + node2.i + ".");
		count_right = intersects_segment(node1, node2, line_right);
		count_left = intersects_segment(node1, node2, line_left);
		for (let n = 0; n < cycle.length - 1; n++) {
			node1 = galaxy.systems[cycle[n]];
			node2 = galaxy.systems[cycle[n + 1]];
			console.log("	- Testing nodes " + node1.i + " and " + node2.i + ".");
			count_right = count_right + intersects_segment(node1, node2, line_right);
			count_left = count_left + intersects_segment(node1, node2, line_left);
		}
		console.log("Cycle [" + cycle + "] intersects line_right " + count_right + " times and line_left " + count_left + " times.");
		if (count_right % 2 === 1 && count_left % 2 === 1) {
			console.log("	- system " + systemi + " is within cycle [" + cycle + "]");
			enclosing.push(cycle);
		} else {
			console.log("	- system " + systemi + " is NOT within cycle [" + cycle + "]");
		}
	}

	console.log("All enclosing cycles: ");
	console.log(enclosing);
	return enclosing;
}

//checks if a given line intersects the line made by a two-node segment in the cycle.
function intersects_segment(node1, node2, line) {
	let connection = {endpoint1: {x: node1.x, y: node1.y}, endpoint2: {x: node2.x, y: node2.y}};
	if (intersects(connection, line)) {
		console.log("		- (" + node1.x + ", " + node1.y + ") <-> (" + node2.x + ", " + node2.y + ") INTERSECTS (" + line.endpoint1.x + ", " + line.endpoint1.y + ") <-> (" + line.endpoint2.x + ", " + line.endpoint2.y + ")");
		return 1;
	} else {
		console.log("		- (" + node1.x + ", " + node1.y + ") <-> (" + node2.x + ", " + node2.y + ") DOES NOT INTERSECT (" + line.endpoint1.x + ", " + line.endpoint1.y + ") <-> (" + line.endpoint2.x + ", " + line.endpoint2.y + ")");
		return 0;
	}
}

//run occasionally, updates the global max and min X and Y for the system to help bound the size of the horizontal ray when determining intersections.
function max_min() {
	let system = galaxy.systems[0];
	let maxX = system.x; let minX = system.x;
	for (let s = 0; s < galaxy.systems.length; s++) {
		system = galaxy.systems[s];
		if (system.x > maxX) { maxX = system.x; }
		if (system.x < minX) { minX = system.x; }
	}
	galaxy.minX = minX;
	galaxy.maxX = maxX;
}

window.gameLoaded();