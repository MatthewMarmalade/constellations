
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
// const players = {};
// const cycles = []; const sorted_cycles = [];
const circle_radius = 40;
const cycle_limit = 4;
var line_width = 50; var line_height = 5;
var visited = {};
const starting_resources = 2;
let galaxy_loaded = false;

const galactic_centre = {x:0, y:0};
const hex_offset = {up:{x:0, y:1},	right_up:{x:0.866,y:0.5},	right_down:{x:0.866,y:-0.5}};

const home_separation = 2000;
const centre_one = 		{x:galactic_centre.x + (hex_offset.up.x * home_separation),y:galactic_centre.y + (hex_offset.up.y * home_separation)};
const centre_two = 		{x:galactic_centre.x - (hex_offset.up.x * home_separation),y:galactic_centre.y - (hex_offset.up.y * home_separation)};
const centre_three = 	{x:galactic_centre.x + (hex_offset.right_up.x * home_separation),y:galactic_centre.y + (hex_offset.right_up.y * home_separation)};
const centre_four = 	{x:galactic_centre.x - (hex_offset.right_up.x * home_separation),y:galactic_centre.y - (hex_offset.right_up.y * home_separation)};
const centre_five = 	{x:galactic_centre.x + (hex_offset.right_down.x * home_separation),y:galactic_centre.y + (hex_offset.right_down.y * home_separation)};
const centre_six = 		{x:galactic_centre.x - (hex_offset.right_down.x * home_separation),y:galactic_centre.y - (hex_offset.right_down.y * home_separation)};

const orbit_separation = 250; const max_moons = 3;
const centres = [galactic_centre, centre_one, centre_two, centre_three, centre_four, centre_five, centre_six];
const offsets = [hex_offset.up, hex_offset.right_down, {x:-1 * hex_offset.right_up.x,y:-1 * hex_offset.right_up.y}];

const filepath = './galaxy.txt';

function archive_filepath() { const length = fs.readdirSync('./archive').length; return './archive/archived_galaxy_' + length + '.txt'; }

function reload_filepath(n) { return './archive/archived_galaxy_' + n + '.txt'; }

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

	//loading and saving and suchlike
	const result = load_galaxy();
	if (result.success) {
		galaxy = result.galaxy;
		galaxy_loaded = true;
		// max_min();
	}
	// } else {
	// 	galaxy = new_galaxy();
	// 	galaxy_loaded = true;
	// 	max_min();
	// 	save_galaxy();
	// }

	//console.log(galaxy);

	io.on('connection', function (socket) {
		console.log('a user connected: ' + socket.id);
		//add_socket(socket.id);
		//socket.emit('current_galaxy', galaxy);
		//socket.broadcast.emit('new_player', players[socket.id]);

		socket.on('disconnect', function() {
			console.log('user disconnected ' + socket.id);
			disconnect_player(socket);
			// remove_socket(socket.id);
			//io.emit('player_disconnected', socket.id);
		});

		socket.on('send_move', function(move) {
			console.log('received move from: ' + socket.id + ' (' + galaxy.players[move.player-1].username + ')');
			handle_move(move, socket);
		});

		socket.on('join_game', function(username) {
			console.log('joining game: ' + socket.id + " as " + username);
			if (galaxy_loaded) {
				add_player(username, socket);
				console.log("Players after adding: " + galaxy.players.map((player) => {return player.username}));
			} else {
				socket.emit('failed_join', 'No Galaxy to Join');
			}
		});

		socket.on('leave_game', function() {
			console.log('leaving game: ' + socket.id);
			remove_player(socket);
		})

		socket.on('new_galaxy', function(galaxy_description) {
			console.log('received new galaxy: ' + JSON.stringify(galaxy_description) + ' from: ' + socket.id);
			io.emit('close_galaxy');
			galaxy = new_galaxy(galaxy_description);
			save_galaxy();
			galaxy_loaded = true;
		});
	});
}

function load_galaxy() {
	console.log("LOADING GALAXY");
	try {
		const galaxy_txt = fs.readFileSync(filepath);
		var galaxy_json = JSON.parse(galaxy_txt);
		galaxy_json = logout_all_players(galaxy_json);
		console.log("SUCCESSFUL LOAD!");
		return {success:true,galaxy:galaxy_json};
	} catch (err) {
		console.log("FAILED LOAD: " + err);
		return {success:false, reason:err};
	}
}

function logout_all_players(galaxy_json) {
	for (let p = 0; p < galaxy_json.players.length; p++) {
		galaxy_json.players[p].logged = false;
		galaxy_json.players[p].socket_id = null;
	}
	return galaxy_json;
}

function save_galaxy() {
	fs.writeFileSync(filepath, JSON.stringify(galaxy));
}

function archive_galaxy() {
	fs.writeFileSync(archive_filepath(), JSON.stringify(galaxy));
}

function reload_galaxy(n) {
	console.log("RELOADING GALAXY");
	try {
		const galaxy_txt = fs.readFileSync(reload_filepath(n));
		var galaxy_json = JSON.parse(galaxy_txt);
		galaxy_json = logout_all_players(galaxy_json);
		console.log("SUCCESSFUL RELOAD!");
		return {success:true,galaxy:galaxy_json};
	} catch (err) {
		console.log("FAILED LOAD: " + err);
		return {success:false, reason:err};
	}
}

function new_galaxy(description) {
	archive_galaxy();
	const max_players = description.max_players;
	const max_cultures = description.max_cultures;

	const systems = [];
	const adjacencies = [];
	const networks = [];
	const settlements = [];
	const factories = [];
	const players = [];
	for (let c = 0; c < max_cultures; c++) {
		systems.push(home_system(c+1), moon_system(c+1,0), moon_system(c+1,1), moon_system(c+1,2));
		adjacencies.push(moon_adjacency(c+1,0), moon_adjacency(c+1,1), moon_adjacency(c+1,2));
		networks.push([p_to_i(c+1)]);
		settlements.push(home_settlement(c+1));
		factories.push(home_factory(c+1));
	}
	for (let p = 0; p < max_players; p++) {
		players.push({});
	}
	const latest_max_min = max_min(systems);

	return {
		systems: systems,
		adjacencies: adjacencies,
		networks: networks,
		settlements: settlements,
		factories: factories,
		players: players,
		cycles: [],
		sorted_cycles: [],
		num_players: 0,
		max_players: max_players,
		max_cultures: max_cultures,
		minX: latest_max_min.minX,
		maxX: latest_max_min.maxX,
		minY: latest_max_min.minY,
		maxY: latest_max_min.maxY,
		turn: 0
	};
}

function home_system(player) {
	const i = p_to_i(player);
	return {
		x: centres[player].x, y: centres[player].y, num: player, 
		adjacent: from_a_to_b(i+1,i+max_moons), connected: [], 
		i: i, 
		name: "Home System " + i,
		settlements: [player - 1], factories: [player - 1], 
		pd:player, ps:player
	};
}

function moon_system(player, index) {
	const i = p_to_i(player);
	return {
		x: centres[player].x + (offsets[index].x * orbit_separation),
		y: centres[player].y + (offsets[index].y * orbit_separation),
		num: 0, adjacent: [i], connected: [],
		i: i + index + 1,
		name: "System " + i + index + 1,
		settlements: [], factories: [],
		pd:player, ps: 0
	};
}

function moon_adjacency(player, index) {
	return {system1i: p_to_i(player), system2i: p_to_i(player) + index + 1, connection:false, i: ((player - 1) * max_moons) + index, pc:0};
}

function p_to_i(player_num) { return ((player_num - 1) * (max_moons + 1));}

function from_a_to_b(a, b) {
	let result = [];
	for (let i = a; i <= b; i++) {
		result.push(i);
	}
	return result;
}

function home_settlement(player) {
	return {systemi: p_to_i(player), establish_type: 'settlement', name: 'Home', i: player-1, pe:player};
}

function home_factory(player) {
	return {systemi: p_to_i(player), establish_type: 'factory', material: 'Home', i: player-1, pe:player};
}

function add_player(username, socket) {
	console.log("ADDING PLAYER. Players: " + galaxy.players.map((player) => {return player.username}));
	//console.log(players[username]);
	disconnect_player(socket);
	for (let p = 0; p < galaxy.num_players; p++) {
		let player = galaxy.players[p];
		console.log("checking vs. player " + (p+1) + ": " + player.username);
		if (player.username === username) {
			if (player.logged === true) { //player has joined before and is in game now
				socket.emit('failed_join', 'player is already logged in');
				return false;
			} else if (player.logged === false) { //player has joined before and is re-logging
				player.logged = true;
				player.socket_id = socket.id;
				const welcome_pack = {player:player, galaxy:galaxy};
				socket.emit('successful_join', welcome_pack);
				// socket.emit('successful_join', player);
				// socket.emit('current_galaxy', galaxy);
				socket.broadcast.emit('player_reconnected', player);
				return true;
			}
		}
	}
	if (galaxy.num_players < galaxy.max_players) {
		galaxy.num_players++;
		const player = {username:username, logged:true, ended: false, socket_id:socket.id, habitable_range:galaxy.num_players, home_systemi:p_to_i(galaxy.num_players), resources:starting_resources, num_factories:1, num_settlements:1};
		galaxy.players.splice(galaxy.num_players - 1, 1, player);
		const welcome_pack = {player:player, galaxy:galaxy};
		socket.emit('successful_join', welcome_pack);
		// socket.emit('successful_join', player);
		
		// socket.emit('current_galaxy', galaxy);
		socket.broadcast.emit('new_player', player);
		// io.emit('new_player', player);
		return true;
	} else {
		console.log("TOO MANY PLAYERS: " + galaxy.num_players + "/" + galaxy.max_players);
		socket.emit('failed_join', 'too many players already in game');
		return false;
	}
}

function remove_player(socket) {
	for (let p = 0; p < galaxy.players.length; p++) {
		if (galaxy.players[p].socket_id === socket.id) {
			console.log("remove_player: found player to remove: " + galaxy.players[p].username);
			socket.broadcast.emit('player_left', galaxy.players[p])
			galaxy.players[p] = {};
		}
	}
}

function disconnect_player(socket) {
	// console.log("disconnect_player: Players before disconnection: " + galaxy.players.map((player) => {return player.username}));
	for (let p = 0; p < galaxy.players.length; p++) {
	    if (galaxy.players[p].socket_id === socket.id) {
	    	console.log("disconnect_player: found player to disconnect: " + galaxy.players[p].username);
        	galaxy.players[p].logged = false;
        	galaxy.players[p].socket_id = null;
        	socket.broadcast.emit('player_disconnected', galaxy.players[p]);
        	const result = can_new_turn();
        	if (result.success && result.new_turn) {
        		io.emit('new_move', {move_type:'new_turn', turn: galaxy.turn, resources: result.resources});
        	} else {
        		console.log("disconnect_player: player's disconnection did not trigger new turn, still waiting on: " + result.remaining);
        	}
	    }
	}
	// console.log("disconnect_player: Players after disconnection: " + galaxy.players.map((player) => {return player.username}));
}

//live updates - text output and previews
function update() {

}

//when a move is submitted by a player, this function routes it to execution and handles whether or not it succeeds. 
function handle_move(move, socket) {
	console.log('handle_move: move: ' + JSON.stringify(move));
	let result;
	if (move.move_type === 'end_turn') {
		result = end_turn(move.player);
		if (result.success) {
			save_galaxy();
			if (result.new_turn) {
				console.log("New turn!");
				io.emit('new_move', {move_type:'new_turn', turn: galaxy.turn, resources: result.resources});
			} else {
				console.log("Player " + move.player + " has ended turn, but we are still waiting on " + result.remaining);
				io.emit('new_move', {move_type:'end_turn', player: move.player, remaining: result.remaining});
			}
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: end_turn failed: " + result.reason);
		}
	} else if (move.move_type === 'scout_intent') {
		result = scout(move.systemi, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type:'scout', systemi:move.systemi, num:result.num, num_new_adjacencies:result.num_new_adjacencies, player:move.player});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: scout failed: " + result.reason);
		}
	} else if (move.move_type === 'adjacent_intent') {
		result = adjacent(move.system1i, move.system2i, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type: 'adjacency', adjacency: result.new_adjacency, player:move.player});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: adjacent failed: " + result.reason);
		}
	} else if (move.move_type === 'discover_intent') {
		result = discover(move.system1i, move.x, move.y, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type: 'discovery', system: result.new_system, adjacency: result.new_adjacency, player:move.player});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: discover failed: " + result.reason);
		}
	} else if (move.move_type === 'connect_intent') {
		result = connect(move.adjacencyi, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type: 'connection', adjacencyi: move.adjacencyi, player:move.player});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: connection failed: " + result.reason);
		}
	} else if (move.move_type === 'establish_intent') {
		result = establish(move.systemi, move.establish_type, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type: 'establish', establishment: result.establishment, player:move.player});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: establish failed: " + result.reason);
		}
	} else if (move.move_type === 'rename') {
		result = rename(move.systemi, move.new_name, move.player);
		if (result.success) {
			save_galaxy();
			io.emit('new_move', {move_type: 'rename', systemi: move.systemi, new_name:move.new_name});
		} else {
			move.result = result;
			socket.emit('failed_move', move);
			console.log("handle_move: rename failed: " + result.reason);
		}
	} else {
		console.log("handle_move: Unknown move type: " + move.move_type);
	}
}

function end_turn(player) {
	//check every player
	console.log("Ending turn for player: " + JSON.stringify(galaxy.players[player-1]))
	galaxy.players[player-1].ended = true;
	return can_new_turn();
}

function can_new_turn() {
	let remaining = []
	for (let p = 0; p < galaxy.num_players; p++) {
		if (galaxy.players[p].ended === false && galaxy.players[p].logged === true) {
			remaining.push(p+1);
		}
	}

	if (remaining.length > 0) {
		return {success:true, new_turn:false, remaining:remaining};
	} else {
		//new turn!
		galaxy.turn += 1;
		let resources = [];

		for (let p = 0; p < galaxy.num_players; p++) {
			galaxy.players[p].ended = false;
			galaxy.players[p].resources += collect_resources(p+1);
			resources.push(galaxy.players[p].resources);
		}

		return {success:true, new_turn:true, resources:resources};
	}
}

//returns the number of resources a player can collect at the current moment. Currently at the min(fact, sett) matching algorithm, linear explosion
function collect_resources(player) {
	const num_factories = galaxy.players[player-1].num_factories;
	const num_settlements = galaxy.players[player-1].num_settlements;
	return Math.min(num_factories, num_settlements);
}

//attempts to scout the given system and returns the number and number of new adjacencies if successful.
function scout(systemi, player) {
	let system = galaxy.systems[systemi];
	if (system != null) {
		if (system.num === 0) {
			if (system.pd === player) {
				if (galaxy.players[player-1].resources >= 1) {
					let num = Math.ceil((Math.random() * 6));
					galaxy.systems[systemi].num = num;
					galaxy.systems[systemi].ps = player;
					galaxy.players[player-1].resources -= 1;
					let num_new_adjacencies = Math.ceil((Math.random() * 3)) + 1;//Math.ceil((Math.random() * 3)) + Math.ceil((Math.random() * 3)) - 1;
					// console.log("WARNING: IGNORING NUM NEW ADJACENCIES")
					return {success:true, num: num, num_new_adjacencies: num_new_adjacencies};
				} else {
					console.log("Player " + player + " has insufficient resources, aborting move: " + galaxy.players[player-1].resources);
					return {success:false, reason:"Insufficient Resources (" + galaxy.players[player-1].resources + "/1)"};
				}
			} else {
				console.log("Player " + player + " did not discover this system, player " + system.pd + " did.");
				return {success:false, reason:"Did not Discover System"};
			}
		} else {
			console.log("scout: System " + systemi + " has already been scouted!");
			return {success:false, reason:"Already Scouted"};
		}
	} else {
		console.log("scout: System " + systemi + " does not exist in systems:");
		console.log(galaxy.systems);
		return {success:false, reason:"System does not exist"};
	}
}

//attempts to establish an adjacency between the two systems. returns the newly created adjacency object if successful.
function adjacent(system1i, system2i, player) {
	let system1 = galaxy.systems[system1i]; let system2 = galaxy.systems[system2i];
	let result = valid_adjacent(system1, system2);
	if (result.success) {
		system1.adjacent.push(system2.i);
		system2.adjacent.push(system1.i);
		let new_adjacency = {system1i: system1i, system2i: system2i, connection: false, i: galaxy.adjacencies.length, pc:0}
		galaxy.adjacencies.push(new_adjacency)
		return {success:true, new_adjacency:new_adjacency};
	} else {
		console.log("adjacent: Failed!");
		console.log({system1: system1, system2: system2});
		return result;
	}
}

//basic adjacency checks - if it's not trying to become adjacent to itself, and it's not already adjacent. if checks pass, redirects to valid_path.
function valid_adjacent(system1, system2) {
	if (system1.i === system2.i) {
		console.log("System cannot be adjacent to itself!");
		return {success:false, reason:"System cannot be Adjacent to itself"};
	}

	for (let a = 0; a < system1.adjacent.length; a++) {
		if (system1.adjacent[a] === system2.i) {
			console.log("System " + system2.i + " is in the adjacency list " + system1.adjacent + " of system " + system1.i + "!");
			return {success:false, reason:"Systems are already Adjacent"};
		}
	}

	if (valid_path(system1, system2)) {
		return {success:true};
	} else {
		return {success:false, reason:"Adjacency intersects a System"};
	}
}

//attempts to create a new system, discovered *from* the given system, at the specified coordinates. checks if we can be adjacent, etc., returns new system + adjacency if successful.
function discover(system1i, x, y, player) {
	let system1 = galaxy.systems[system1i];
	let system2 = {x: x, y: y, system_type: 'empty_system', num: 0, adjacent: [], connected: [], i: galaxy.systems.length, name: "System " + galaxy.systems.length, settlements: [], factories: [], pd:player, ps:0};
	let system_clear = !intersects_adjacencies(system2);
	if (system_clear) {
		let valid_adjacency = valid_adjacent(system1, system2);
		if (valid_adjacency.success) {
			galaxy.systems.push(system2);
			let result = adjacent(system1.i, system2.i, player);
			if (result.success) {
				return {success:true, new_system: system2, new_adjacency: result.new_adjacency};
			} else {
				return result;
			}
		} else {
			console.log("discover: Cannot discover this system, adjacency creation would be invalid.");
			return valid_adjacency;
		}
	} else {
		console.log("discover: Cannot discover this system; system is on top of existing adjacency.");
		return {success:false, reason:"New System intersects Adjacency"};
	}
	
}

//attempts to turn the specified adjacency into a connection. returns the i of the adjacency if successful.
function connect(adjacencyi, player) {
	if (galaxy.players[player-1].resources >= 2) {
		let adjacency = galaxy.adjacencies[adjacencyi];
		let result = valid_connect(adjacency, player)

		if (result.success) {
			if (!result.in_network_1) { galaxy.networks[player - 1].push(adjacency.system1i); }
			if (!result.in_network_2) { galaxy.networks[player - 1].push(adjacency.system2i); }
			let system1 = galaxy.systems[adjacency.system1i];
			let system2 = galaxy.systems[adjacency.system2i];
			system1.connected.push(system2.i);
			system2.connected.push(system1.i);

			adjacency.connection = true;
			adjacency.pc = player;
			galaxy.players[player-1].resources -= 2;

			// connection_network.push(adjacencyi);

			if (result.in_network_1 && result.in_network_2) {
				let new_cycles = dfs(adjacency.system1i);
				add_unique(new_cycles);
			}

			return {success:true, adjacencyi: adjacencyi};
		} else {
			return result;
		}
	} else {
		console.log("connect: Player " + player + " has insufficient resources: " + galaxy.players[player-1].resources);
		return {success:false, reason:"Insufficient Resources (" + galaxy.players[player-1].resources + "/2)"};
	}
}

//attempts to establish a new factory or settlement on the given system. if successful, returns the new establishment.
function establish(systemi, establish_type, player) {
	if (galaxy.players[player-1].resources >= 3) {
		let system = galaxy.systems[systemi];

		if (establish_type === 'settlement') {
			console.log("Existing settlements on system " + systemi + ": [" + system.settlements + "]");
			for (let s = 0; s < system.settlements.length; s++) {
				let existing_settlement = galaxy.settlements[system.settlements[s]];
				if (existing_settlement.pe === player) {
					console.log("There is an existing settlement: " + existing_settlement.name + " on system " + systemi);
					return {success:false, reason:"There is already a Settlement"};
				}
			}
			if (valid_settlement(systemi, player)) {
				console.log("??? The settlement is enclosed within a cycle and is valid.");
				let new_settlement = {establish_type: 'settlement', name: galaxy.players[player-1].username, systemi: systemi, i: galaxy.settlements.length, pe:player};
				system.settlements.push(new_settlement.i);
				galaxy.settlements.push(new_settlement);
				galaxy.players[player-1].resources -= 3;
				galaxy.players[player-1].num_settlements += 1;
				return {success:true, establishment: new_settlement};
			} else {
				console.log("X The proposed settlement is NOT enclosed within a cycle.");
				return {success:false, reason:"System is not Enclosed"};
			}
		} else if (establish_type === 'factory') {
			console.log("Existing factories on system " + systemi + ": [" + system.factories + "]");
			for (let f = 0; f < system.factories.length; f++) {
				let existing_factory = galaxy.factories[system.factories[f]];
				if (existing_factory.pe === player) {
					console.log("There is an existing " + existing_factory.material + " factory on system " + systemi);
					return {success:false, reason:"There is already a Factory"};
				}
			}
			if (valid_factory(systemi, player)) {
				console.log("??? The factory has >=3 connections and is valid.");
				let new_factory = {establish_type: 'factory', material: galaxy.players[player-1].username, systemi: systemi, i: galaxy.factories.length, pe:player};
				system.factories.push(new_factory.i);
				galaxy.factories.push(new_factory);
				galaxy.players[player-1].resources -= 3;
				galaxy.players[player-1].num_factories += 1;
				return {success:true, establishment: new_factory};
			} else {
				console.log("X The proposed factory does NOT have >= 3 connections.");
				return {success:false, reason:"System needs at least 3 Connections"};
			}
		} else {
			console.log("Unknown establish type: " + establish_type);
			return {success:false, reason:"Establish_type " + establish_type + " is invalid"};
		}
	} else {
		console.log("establish: Player " + player + " has insufficient resources: " + galaxy.players[player-1].resources);
		return {success:false, reason:"Insufficient resources (" + galaxy.players[player-1].resources + "/3)"};
	}
}

//checks if the given adjacency can become a connection - if it's intersecting any existing connections, for instance. if successful, also returns which nodes are already in the network
function valid_connect(adjacency, player) {
	if (adjacency.connected === true) {
		console.log("valid_connect: Adjacency " + adjacency.i + " already connected!");
		return {success:false, reason:"Already Connected"};
	}

	if (intersects_network(adjacency)) {
		console.log("valid_connect: Proposed connection intersects existing connection.");
		return {success:false, reason:"Connections would intersect"};
	}

	let in_network_1 = false;
	let in_network_2 = false;
	let network = galaxy.networks[player - 1];
	for (let n = 0; n < network.length; n++) {
		if (adjacency.system1i === network[n]) {
			in_network_1 = true;
		}
		if (adjacency.system2i === network[n]) {
			in_network_2 = true;
		}
		if (in_network_1 && in_network_2) { break; }
	}

	if (!in_network_1 && !in_network_2) {
		console.log("valid_connect: Systems " + adjacency.system1i + " and " + adjacency.system2i + " are not in network [" + network + "]");
		return {success:false, reason:"Connection must extend Network"};
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

function rename(systemi, new_name, player) {
	if (galaxy.systems[systemi].pd === player) {
		galaxy.systems[systemi].name = new_name;
		return {success:true};
	} else {
		console.log("System " + systemi + " discovered by " + galaxy.systems[systemi].pd + ", not " + player + ": ");
		console.log(galaxy.systems[systemi]);
		return {success:false,reason:"Did not Discover"};
	}
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
	for (let n = 0; n < galaxy.adjacencies.length; n++) {
		connection = galaxy.adjacencies[n];
		if (connection.connection) {
			if (intersects_connection(connection, adjacency)) {
				//console.log("Adjacency intersects existing connection network!");
				return true;
			}
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

	while (test_cycles.length > 0 && i < cycle_limit) {
		console.log("i: " + i + ": cycles remaining: " + test_cycles.length );//+ "; test_cycles: [" + test_cycles + "]");
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

	console.log("dfs: found " + new_cycles.length + " cycles: [" + new_cycles + "]");
	return new_cycles;
}

//adds new cycles to the existing collection of cycles, discarding mirrors.
function add_unique(new_cycles) {
	let new_cycle;
	let unique;
	console.log("add_unique: testing " + new_cycles.length + " cycles for uniqueness and addition"/* to [" + cycles + "]"*/);
	for (let nc = 0; nc < new_cycles.length; nc++) {
		new_cycle = new_cycles[nc].slice(); //copy the new cycle
		//new_cycle.push(new_cycle.shift()); //move start of cycle to the end
		//new_cycle.reverse(); //reverse the cycle to check for the cycle's exact mirror
		new_cycle.sort(); //sort the cycle to only store one possible permutation of the systems. For triangles this suffices to define uniqueness.
		// console.log("nc: " + nc + ": new cycle [" + new_cycles[nc] + "] flipped to -> [" + new_cycle + "]");
		unique = true;
		for (let c = 0; c < galaxy.sorted_cycles.length; c++) {
			if (JSON.stringify(new_cycle) === JSON.stringify(galaxy.sorted_cycles[c])) {
				unique = false;
				// console.log("c: " + c + ": found duplicate of [" + new_cycle + "]: [" + cycles[c] + "]");
			} else {
				// console.log("c: " + c + ": new cycle [" + new_cycle + "] is not equal to [" + cycles[c] + "]");
			}
		}
		if (unique) {
			galaxy.cycles.push(new_cycles[nc].slice()); //store unsorted cycle, that preserves ordering of nodes.
			galaxy.sorted_cycles.push(new_cycle); //store sorted cycle, to make the comparison match next time.
		}
		// console.log("nc: " + nc + ": updated cycles: [" + cycles + "]");
	}
	console.log("add_unique: number of cycles: " + galaxy.cycles.length + "; updated cycles:");
	for (let c = 0; c < galaxy.cycles.length; c++) {
		console.log("    [" + galaxy.cycles[c] + "]");
	}
}

//checks if a system can host a settlement by checking if it is enclosed within at least one cycle. Incomplete - still need to check based on ownership of connections
function valid_settlement(systemi, player) {
	if (galaxy.systems[systemi].num != player) {
		if (galaxy.systems[systemi].num != ((player + 1 + 6 - 1) % 6) + 1) {
			console.log("Player " + player + " cannot establish a settlement here; " + galaxy.systems[systemi].num + " != (" + player + "," + (((player + 1 + 6 - 1) % 6) + 1) + ")");
			return false;
		}
	}
	let all_enclosing_cycles = enclosing_cycles(systemi, player);
	let cycle_count = 0;

	for (let c = 0; c < all_enclosing_cycles.length; c++) {
		let cycle = all_enclosing_cycles[c];
		cycle_count = 0;
		for (let n = 0; n < cycle.length; n++) {
			let node1i = cycle[n];
			let node2i = cycle[(n + 1) % cycle.length];
			console.log("c: " + c + ": Testing " + node1i + " <-> " + node2i);
			if (player_owns(node1i, node2i, player)) {
				console.log("Player " + player + " does own " + node1i + " <-> " + node2i);
				cycle_count++;
			} else {
				console.log("Player " + player + " does NOT own " + node1i + " <x> " + node2i);
			}
		}
		if (cycle_count >= 3) {
			return true;
		}
	}

	return false;
}

function player_owns(node1i, node2i, player) {
	for (let a = 0; a < galaxy.adjacencies.length; a++) {
		let adjacency = galaxy.adjacencies[a];
		if ((adjacency.system1i === node1i && adjacency.system2i === node2i) || (adjacency.system1i === node2i && adjacency.system2i === node1i)) {
			console.log("Found adjacency " + node1i + " <-> " + node2i + ": ");
			console.log(adjacency);
			if (adjacency.pc === player) {
				return true;
			} else {
				return false;
			}
		}
	}
	return false;
}

//checks if a system can host a factory by checking if it has at least 3 other systems in its connected list
function valid_factory(systemi, player) {
	if (galaxy.systems[systemi].num != player) {
		if (galaxy.systems[systemi].num != ((player - 1 + 6 - 1) % 6) + 1) {
			console.log("Player " + player + " cannot establish a factory here; " + galaxy.systems[systemi].num + " != (" + player + "," + (((player - 1 + 6 - 1) % 6) + 1) + ")");
			return false;
		}
	}
	let num_connections = 0;
	for (let a = 0; a < galaxy.adjacencies.length; a++) {
		let adjacency = galaxy.adjacencies[a];
		//console.log(adjacency);
		if (adjacency.connection) {
			if (adjacency.system1i === systemi || adjacency.system2i === systemi) {
				if (adjacency.pc === player) {
					num_connections++;
				}
			}
		}
	}
	console.log(num_connections);
	if (num_connections >= 3) {
		return true;
	} else {
		return false;
	}
}

//checks every cycle to see if it encloses the given system. checks by counting the intersections with two horizontal rays.
function enclosing_cycles(systemi, player) {
	console.log("Determining the enclosing cycles of system " + systemi + ".")
	console.log("IGNORING THAT THE PLAYER ATTEMPTING THIS IS " + player);
	let system = galaxy.systems[systemi];
	latest_max_min = max_min(galaxy.systems);
	galaxy.minX = latest_max_min.minX; galaxy.maxX = latest_max_min.maxX; galaxy.minY = latest_max_min.minY; galaxy.maxY = latest_max_min.maxY; 
	let line_right = {endpoint1: system, endpoint2: {x: galaxy.maxX, y: system.y}};
	let line_left = {endpoint1: {x: galaxy.minX, y: system.y}, endpoint2: system};
	// console.log("Line Right: ");
	// console.log(line_right);
	// console.log("Line Left: ");
	// console.log(line_left);

	let count_right = 0;
	let count_left = 0;

	let enclosing = [];
	let cycle;
	let node1; let node2;
	for (let c = 0; c < galaxy.cycles.length; c++) {
		cycle = galaxy.cycles[c];
			// console.log("Testing cycle " + c + ": [" + cycle + "]");
			node2 = galaxy.systems[cycle[0]];
			node1 = galaxy.systems[cycle[cycle.length - 1]];
			// console.log("	- Testing nodes " + node1.i + " and " + node2.i + ".");
			count_right = intersects_segment(node1, node2, line_right);
			count_left = intersects_segment(node1, node2, line_left);
			for (let n = 0; n < cycle.length - 1; n++) {
				node1 = galaxy.systems[cycle[n]];
				node2 = galaxy.systems[cycle[n + 1]];
				// console.log("	- Testing nodes " + node1.i + " and " + node2.i + ".");
				count_right = count_right + intersects_segment(node1, node2, line_right);
				count_left = count_left + intersects_segment(node1, node2, line_left);
			}
			// console.log("Cycle [" + cycle + "] intersects line_right " + count_right + " times and line_left " + count_left + " times.");
			if (count_right % 2 === 1 && count_left % 2 === 1) {
				// console.log("	- system " + systemi + " is within cycle [" + cycle + "]");
				enclosing.push(cycle);
			} else {
				// console.log("	- system " + systemi + " is NOT within cycle [" + cycle + "]");
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
		//console.log("		- (" + node1.x + ", " + node1.y + ") <-> (" + node2.x + ", " + node2.y + ") INTERSECTS (" + line.endpoint1.x + ", " + line.endpoint1.y + ") <-> (" + line.endpoint2.x + ", " + line.endpoint2.y + ")");
		return 1;
	} else {
		//console.log("		- (" + node1.x + ", " + node1.y + ") <-> (" + node2.x + ", " + node2.y + ") DOES NOT INTERSECT (" + line.endpoint1.x + ", " + line.endpoint1.y + ") <-> (" + line.endpoint2.x + ", " + line.endpoint2.y + ")");
		return 0;
	}
}

//run occasionally, updates the global max and min X and Y for the system to help bound the size of the horizontal ray when determining intersections.
function max_min(systems) {
	let system = systems[0];
	let maxX = system.x; let minX = system.x; let maxY = system.y; let minY = system.y;
	for (let s = 0; s < systems.length; s++) {
		system = systems[s];
		if (system.x > maxX) { maxX = system.x; }
		if (system.x < minX) { minX = system.x; }
		if (system.y > maxY) { maxY = system.y; }
		if (system.y < minY) { minY = system.y; }
	}
	return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
	// 	galaxy.minX = minX;
	// galaxy.maxX = maxX;
	// galaxy.minY = minY;
	// galaxy.maxY = maxY;
}

window.gameLoaded();