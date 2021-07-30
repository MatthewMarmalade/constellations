//TODO and PLANS and STUFF
/*
	- Two establishment buttons, one for each type of building, with associated modes
	- Establishing Factories (connection detection, factory sprite)
	- Establishing Settlements (path detection, settlement sprite, custom name)
	- Habitability constraints
	- Homeworld visually special

	- Scrollability and resizing

	- Multiplayer and Persistent State

	- Resources
	- Favor
	- Goals

	- Custom constructs / storytelling
*/

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

//Variable Initialization
// var text1; var text2; var text3;
// var button_scout; var button_connection; var button_establish;
// var can_click = true; var click = false;
// var systems = []; var discovered_systems = [];
// var home_system; var system_network = []; var connection_network = [];
// var adjacencies; var adjacency_network = [];
// var selected_system; var selected_adjacency;
// var selected_mode_button;
// var mode;
// var adjacency_alpha = 0.2;
// var adjacency_preview; var connection_preview;
// var line_width = 50; var line_height = 5;
// var circle_radius = 40;
// var test = false;
var scene;

//	########################
//	INITIALIZATION + UPDATES
//	########################

//loading initial assets
function preload() {
	// this.load.image('empty_space','assets/sprites/empty_space.png');
	// this.load.image('empty_system','assets/sprites/empty_system.png');
	// this.load.image('1_system','assets/sprites/1_system.png');
	// this.load.image('2_system','assets/sprites/2_system.png');
	// this.load.image('3_system','assets/sprites/3_system.png');
	// this.load.image('4_system','assets/sprites/4_system.png');
	// this.load.image('5_system','assets/sprites/5_system.png');
	// this.load.image('6_system','assets/sprites/6_system.png');
	// this.load.image('path','assets/sprites/path.png');
	// // this.load.image('connection','assets/sprites/connection.png');
	// this.load.image('button_scout','assets/sprites/button_scout.png');
	// this.load.image('button_connection','assets/sprites/button_connection.png');
	// this.load.image('button_establish','assets/sprites/button_establish.png');
}

//adding assets to the world, initial game state
function create() {
	scene = this;

	galaxy = {
		systems: [
			{x: config.width / 2, y: config.height / 2, system_type: '1_system', num: 1, i: 0},
			{x: config.width * 0.4, y: config.height / 2, system_type: '2_system', num: 2, i: 1},
			{x: config.width * 0.6, y: config.height * 0.2, system_type: 'empty_system', num: 0, i: 2}
		],
		adjacencies: [
			{system1: 0, system2: 1, connection:false}
		]
	}



	io.on('connection', function (socket) {
		console.log('a user connected: ' + socket.id);
		players[socket.id] = addPlayer(socket.id);
		socket.emit('current_galaxy', galaxy);
		socket.broadcast.emit('new_player', players[socket.id]);


		socket.on('disconnect', function() {
			console.log('user disconnected' + socket.id);
			console.log('all players: ' + JSON.stringify(players));
			removePlayer(self, socket.id);
			delete players[socket.id];
			io.emit('player_disconnected', socket.id);
		});
	});
	/*
	adder = this;

	text1 = this.add.text(10, 10, 'Constellations', { fontSize: '32px', align: 'center'});
	text2 = this.add.text(10, config.height * 8/10, "CONSOLE", { fontSize: '24px', align: 'left'});
	text3 = this.add.text(10, config.height * 9/10, "CONSOLE", { fontSize: '24px', align: 'left'});

	button_establish = this.add.image(config.width - 150, config.height - 100, 'button_establish');
	button_connection = this.add.image(config.width - 250, config.height - 100, 'button_connection');
	button_scout = this.add.image(config.width - 350, config.height - 100, 'button_scout');
	button_scout.setInteractive();
	button_connection.setInteractive();
	button_establish.setInteractive();
	button_scout.button_type = 'scout'
	button_connection.button_type = 'connection'
	button_establish.button_type = 'establish'
	button_scout.on('pointerup', button_tap);
	button_connection.on('pointerup', button_tap);
	button_establish.on('pointerup', button_tap);

	adjacency_preview = this.add.image(100,100,'path');
	adjacency_preview.setAlpha(adjacency_alpha);
	connection_preview = this.add.image(100,100,'path');
	adjacency_preview.setVisible(false);
	connection_preview.setVisible(false);

	//for loop creates a hex grid of systems
	let left = 100;
	let right = config.width - 100;
	let nx = 6;
	let dx = (right - left) / nx;
	let top = 100;
	let bottom = config.height - 100;
	let ny = 5;
	let dy = (bottom - top) / ny;

	var offset = dx / 2;

	let i = 0;

	for (let y = top; y < bottom; y = y + dy) {
		offset = offset === 0 ? dx / 2 : 0;
		for (let x = left; x < right; x = x + dx) {
			var system = this.add.sprite(x + offset, y, 'empty_space').setInteractive();
			system.num = -1;
			system.i = i;
			i++;
			system.adjacent = [];
			system.connected = [];
			system.state = 'empty';
			system.on('pointerup', system_tap);
			system.on('pointerover', system_hover);
			system.on('pointerout', system_out);
			systems.push(system);
		}
	}


	let start = Math.floor(systems.length / 2);
	home_system = systems[start];
	discovered_systems.push(home_system);
	system_network = [start];
	scout(systems[start]);
	adjacencies = 6;
	discover(home_system, systems[start + 1]);
	discover(home_system, systems[start - 1]);
	discover(home_system, systems[start - nx]);
	discover(home_system, systems[start - nx - 1]);
	discover(home_system, systems[start + nx]);
	discover(home_system, systems[start + nx - 1]);

	select_system(home_system);

	select_button(button_scout);
	*/
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
	// var pointer = this.input.activePointer;
	// if (selected_adjacency != null) {
	// 	text2.setText([
	// 		'p1: (' + Math.floor(selected_adjacency.endpoint1.x) + ', ' + Math.floor(selected_adjacency.endpoint1.y) + '); ' + 
	// 		'p2: (' + Math.floor(selected_adjacency.endpoint2.x) + ', ' + Math.floor(selected_adjacency.endpoint2.y) + '); ' + 
	// 		'systems: ' + systems.length + ', ' +
	// 		'mode: ' + mode
	// 	]);
	// } else if (selected_system != null) {
	// 	text2.setText([
	// 		'system: ' + selected_system.i + ', ' + 
	// 		'systems: ' + systems.length + ', ' +
	// 		'mode: ' + mode
	// 	]);
	// } else {
	// 	text2.setText([
	// 		'unselected, ' + 
	// 		'systems: ' + systems.length + ', ' +
	// 		'mode: ' + mode
	// 	]);
	// }

	// if (mode === 'discover') {
	// 	preview(selected_system.x, selected_system.y, pointer.x, pointer.y);
	// } else {
	// 	adjacency_preview.setVisible(false);
	// }

	// if (mode === 'finish_connection') {
	// 	preview(selected_system.x, selected_system.y, pointer.x, pointer.y);
	// } else {
	// 	connection_preview.setVisible(false);
	// }
}

// //renders a preview line from point 1 (x1, y1) to point 2 (x2, y2)
// function preview(x1, y1, x2, y2) {
// 	let angle = angleTo(x1, y1, x2, y2);
// 	let dist = distTo(x1, y1, x2, y2);
// 	let scale = (dist / line_width)
// 	let midx = mid(x1,x2); let midy = mid(y1,y2);
// 	if (mode === 'discover') {
// 		adjacency_preview.x = midx;
// 		adjacency_preview.y = midy;
// 		adjacency_preview.setRotation(angle);
// 		adjacency_preview.setVisible(true);
// 		adjacency_preview.setScale(scale,1);
// 	} else if (mode === 'finish_connection') {
// 		connection_preview.x = midx;
// 		connection_preview.y = midy;
// 		connection_preview.setRotation(angle);
// 		connection_preview.setVisible(true);
// 		connection_preview.setScale(scale,1);
// 	}
// }

// //returns angle between point 1 (x1, y1) and point 2 (x2, y2) compared to the x-axis
// function angleTo(x1, y1, x2, y2) {
// 	let divide_by_zero_offset = 0;
// 	if (x1 === x2) {
// 		divide_by_zero_offset = 1;
// 	}
// 	let angle = Math.atan((y2 - y1) / (x2 - x1 + divide_by_zero_offset));
// 	if (x2 < x1) {
// 		angle = angle + Math.PI;
// 	}
// 	return angle;
// }

// //returns the distance between a system at (x1, x2) and another system at (y1, y2) (not including the interior of the circles)
// function distTo(x1, y1, x2, y2) {
// 	const a = x2 - x1;
// 	const b = y2 - y1;
// 	const distance = Math.sqrt((a * a) + (b * b)) - (circle_radius * 2);
// 	return distance >= 0 ? distance : 0;
// }

// //returns the average of two numbers
// function mid(a,b) { return (a + b) / 2;
// }

// //	###############
// //	BUTTON HANDLERS
// //	###############

// //tap handler for the mode buttons; handles changing modes
// function button_tap(pointer) {
// 	if (mode === null) {
// 		console.log("button_tap: Invalid mode.");
// 	} else if (mode === 'scout') {
// 		select_button(this);
// 	} else if (mode === 'connection') {
// 		select_button(this);
// 	} else if (mode === 'establish') {
// 		select_button(this);
// 	} else {
// 		console.log("Mode '" + mode + "' does not allow switching between scouting, connecting, and establishing");
// 	}
// }

// //visual changes for button selection
// function select_button(button) {
// 	if (selected_mode_button != null) {
// 		selected_mode_button.clearTint();
// 	}
// 	mode = button.button_type;
// 	if (button.button_type === 'scout') {
// 		button.setTint(0xff0000);
// 	} else if (button.button_type === 'connection') {
// 		button.setTint(0x00ff00);
// 	} else if (button.button_type === 'establish') {
// 		button.setTint(0x0000ff);
// 	}
// 	selected_mode_button = button;
// 	deselect_system();
// }

// //	###############
// //	SYSTEM HANDLERS
// //	###############

// //hover handler for systems
// function system_hover(pointer) {
// 	if (mode === null) {
// 		console.log("system_hover: Invalid mode.");
// 	} else if (mode === 'scout') {
// 		if (this.num === 0) {
// 			select_system(this);
// 		}
// 	} else if (mode === 'establish') {
// 		if (this.num > 0) {
// 			select_system(this);
// 		}
// 	}
// }

// //deselects systems when they are no longer hovered
// function system_out(pointer) {
// 	if (mode === null) {
// 		console.log("system_out: Invalid mode.");
// 	} else if (mode === 'scout') {
// 		deselect_system();
// 	} else if (mode === 'establish') {
// 		deselect_system();
// 	}
// }

// //tap handler for a given system; handles scouting and establishing
// function system_tap(pointer) {
// 	if (mode === null) {
// 		console.log("system_tap: Invalid mode.");
// 	} else if (mode === 'scout') {
// 		if (this.num === 0) {
// 			if (this === selected_system) {
// 				scout(this);
// 				mode = 'discover';
// 			} else {
// 				console.log("scout: Tapped unhovered system?");
// 			}
// 		}
// 	} else if (mode === 'discover') {
// 		if (this.num === -1) {
// 			discover(selected_system, this);
// 		} else if (this.num === 0) {
// 			adjacent(selected_system, this);
// 		} else if (this.num >= 0) {
// 			adjacent(selected_system, this);
// 		}
// 	} else if (mode === 'establish') {
// 		if (this.num >= 0) {
// 			if (this === select_system) {
// 				establish(this);
// 			} else {
// 				console.log("establish: Tapped unhovered system?");
// 			}
// 		}
// 	}
// }

// //visual changes for system selection
// function select_system(system) {
// 	if (system != null) {
// 		if (selected_system != null) {
// 			selected_system.clearTint();
// 		}
// 		selected_system = system;
// 		if (mode === 'scout') {
// 			system.setTint(0xff0000);
// 		} else if (mode === 'connection') {
// 			system.setTint(0x00ff00);
// 		} else if (mode === 'establish') {
// 			system.setTint(0x0000ff);
// 		}
// 	}
// }

// //broadly deselecting any systems, resetting visual changes
// function deselect_system() {
// 	if (selected_system != null) {
// 		selected_system.clearTint();
// 	}
// 	selected_system = null;
// }

// //	########
// //	SCOUTING
// //	########

// //randomly assigns an unscouted system a habitability value, changes the texture, and determines a random number of adjacencies.
// function scout(system) {
// 	if (system != null) {
// 		var num = Math.ceil((Math.random() * 6));
// 		system.num = num;
// 		if (num === 1) {
// 			system.setTexture('1_system');
// 		} else if (num === 2) {
// 			system.setTexture('2_system');
// 		} else if (num === 3) {
// 			system.setTexture('3_system');
// 		} else if (num === 4) {
// 			system.setTexture('4_system');
// 		} else if (num === 5) {
// 			system.setTexture('5_system');
// 		} else if (num === 6) {
// 			system.setTexture('6_system');
// 		} else {
// 			console.log("ERROR: " + num + " is out of the acceptable range for a num.");
// 		}
// 		adjacencies = Math.ceil((Math.random() * 6));
// 		text3.setText("Adjacencies: " + adjacencies);
// 	}
// }

// //adding new adjacencies that create additional systems. Checks new system is clear of adjacencies, and adds a new system
// function discover(system1, system2) {
// 	if (system2 != null) {
// 		let system_clear = !intersects_adjacencies(system2);
// 		if (system_clear) {
// 			let adjacency_clear = adjacent(system1, system2);
// 			if (adjacency_clear) {
// 				system2.setTexture('empty_system');
// 				system2.num = 0;
// 				discovered_systems.push(system2);
// 			}
// 		} else {
// 			console.log("discover: Cannot discover this system; system is on top of existing adjacency")
// 		}
// 	}
// }

// //adding new adjacencies, regardless of if they are new systems or not. Checks new adjacency is clear of systems, and adds a path
// function adjacent(system1, system2) {
// 	//MARK: Prevent multiple adjacencies from occuring. Probably means each system should maintain a list of adjacent systems. Which will get pretty memory-heavy pretty quick but oh well.
// 	var already_adjacent = false;
// 	for (let a = 0; a < system1.adjacent.length; a++) {
// 		if (system1.adjacent[a] === system2.i) {
// 			console.log("System " + system2.i + " is in the adjacency list " + system1.adjacent + " of system " + system1.i + "!");
// 			already_adjacent = true;
// 		}
// 	}
// 	if (already_adjacent) {
// 		console.log("Already Adjacent!")
// 	} else if (adjacencies > 0) {
// 		let new_adjacency = path(system1.x, system1.y, system2.x, system2.y);
// 		if (new_adjacency != null) {
// 			system1.adjacent.push(system2.i);
// 			system2.adjacent.push(system1.i);
// 			new_adjacency.system1 = system1.i;
// 			new_adjacency.system2 = system2.i;
// 			adjacency_network.push(new_adjacency);
// 			//new_adjacency.path_type = 'adjacency';
// 			adjacencies--;
// 			text3.setText("Adjacencies: " + adjacencies);
// 			if (adjacencies === 0) {
// 				mode = 'scout';
// 				deselect_system();
// 			}
// 			return true;
// 		} else {
// 			console.log("adjacent: Cannot add new adjacency here; it intersects an existing discovered system.");
// 		}
// 	} else {
// 		console.log("ERROR: Out of adjacencies!");
// 	}
// 	return false;
// }

// //path checker for new adjacencies between systems at (x1, y1) and (x2, y2). Checks if new adjacency is clear of systems.
// function path(x1, y1, x2, y2) {
// 	let angle = angleTo(x1, y1, x2, y2);
// 	let dist = distTo(x1, y1, x2, y2);
// 	let scale = dist / line_width
// 	let midx = mid(x1,x2); let midy = mid(y1,y2);
// 	let endpoint1 = {x : midx + (Math.cos(angle) * dist / 2), y : (midy + (Math.sin(angle) * dist / 2))};
// 	let endpoint2 = {x : midx - (Math.cos(angle) * dist / 2), y : (midy - (Math.sin(angle) * dist / 2))};
// 	if (intersects_systems(endpoint1, endpoint2)) {
// 		//console.log("path: Proposed adjacency intersects existing system!");
// 		return null;
// 	} else {
// 		let adjacent_path = draw_path(midx, midy, angle, scale, 0.2);
// 		adjacent_path.setInteractive();
// 		adjacent_path.on('pointerup', adjacency_tap);
// 		adjacent_path.on('pointerover', adjacency_hover);
// 		adjacent_path.on('pointerout', adjacency_out);
// 		new_path.endpoint1 = endpoint1;
// 		new_path.endpoint2 = endpoint2;
// 		return adjacent_path;
// 	}
// }

// //helper function for path that adds the actual asset.
// function draw_path(midx, midy, angle, scale, alpha) {
// 	new_path = adder.add.image(midx, midy, 'path');
// 	new_path.setRotation(angle);
// 	new_path.setScale(scale,1);
// 	new_path.setAlpha(alpha);
// 	new_path.path_type = 'adjacent';
// 	return new_path;
// }

// //helper function for path that checks if the proposed adjacency intersects any existing systems
// function intersects_systems(endpoint1, endpoint2) {
// 	var system;

// 	//create rectangle
// 	let angle = angleTo(endpoint1.x, endpoint1.y, endpoint2.x, endpoint2.y) + (Math.PI / 2);
// 	let a = {x:endpoint1.x + (Math.cos(angle) * circle_radius), y:endpoint1.y + (Math.sin(angle) * circle_radius)};
// 	let b = {x:endpoint1.x - (Math.cos(angle) * circle_radius), y:endpoint1.y - (Math.sin(angle) * circle_radius)};
// 	let c = {x:endpoint2.x + (Math.cos(angle) * circle_radius), y:endpoint2.y + (Math.sin(angle) * circle_radius)};
// 	let d = {x:endpoint2.x - (Math.cos(angle) * circle_radius), y:endpoint2.y - (Math.sin(angle) * circle_radius)};
// 	// adder.add.image(a.x, a.y, 'empty_space').setTint(0x0000ff);
// 	// adder.add.image(b.x, b.y, 'empty_space').setTint(0x00ff00);
// 	// adder.add.image(c.x, c.y, 'empty_space').setTint(0xff0000);
// 	// adder.add.image(d.x, d.y, 'empty_space').setTint(0xffff00);

// 	let rectangle_area = 0; let sab = 0; let sbc = 0; let scd = 0; let sda = 0;
// 	let intersects = false;

// 	for (let ds = 0; ds < discovered_systems.length; ds++) {
// 		system = discovered_systems[ds];
// 		//console.log("Checking system: " + system.i);
// 		rectangle_area = area(a, b, c) + area(a, d, c);
// 		sab = area(system, a, b);
// 		sbc = area(system, b, c);
// 		scd = area(system, c, d);
// 		sda = area(system, d, a);
// 		if (sab + sbc + scd + sda < rectangle_area) {
// 			//console.log("System " + system.i + " intersects the rectangle! ");
// 			//system.setTint(0x00ffff);
// 			intersects = true;
// 		}
// 	}
// 	return intersects;
// }

// //helper function for discover that checks if the proposed system intersects any existing adjacencies
// function intersects_adjacencies(system) {
// 	//console.log("Checking system: " + system.i + " to see if it is on top of any of the " + adjacency_network.length + " existing adjacencies.");
// 	let angle = 0; let a = {x:0,y:0}; let b = {x:0,y:0}; let c = {x:0,y:0}; let d = {x:0,y:0};
// 	let rectangle_area = 0; let sab = 0; let sbc = 0; let scd = 0; let sda = 0;
// 	let intersects = false;
// 	for (let an = 0; an < adjacency_network.length; an++) {
// 		test_adjacency = adjacency_network[an];

// 		angle = angleTo(test_adjacency.endpoint1.x, test_adjacency.endpoint1.y, test_adjacency.endpoint2.x, test_adjacency.endpoint2.y) + (Math.PI / 2);
// 		a.x = test_adjacency.endpoint1.x + (Math.cos(angle) * circle_radius); a.y = test_adjacency.endpoint1.y + (Math.sin(angle) * circle_radius);
// 		b.x = test_adjacency.endpoint1.x - (Math.cos(angle) * circle_radius); b.y = test_adjacency.endpoint1.y - (Math.sin(angle) * circle_radius);
// 		c.x = test_adjacency.endpoint2.x + (Math.cos(angle) * circle_radius); c.y = test_adjacency.endpoint2.y + (Math.sin(angle) * circle_radius);
// 		d.x = test_adjacency.endpoint2.x - (Math.cos(angle) * circle_radius); d.y = test_adjacency.endpoint2.y - (Math.sin(angle) * circle_radius);

// 		rectangle_area = area(a, b, c) + area(a, d, c);
// 		sab = area(system, a, b);
// 		sbc = area(system, b, c);
// 		scd = area(system, c, d);
// 		sda = area(system, d, a);
// 		if (sab + sbc + scd + sda < rectangle_area) {
// 			//console.log("System intersects existing adjacency!");
// 			//test_adjacency.setTint(0x00ffff);
// 			return true;
// 		} else {
// 			//test_adjacency.setTint(0x008800);
// 		}
// 	}
// 	return false;
// }

// //intersection checker helper function, returns the area of a triangle specified by points a, b, and c.
// function area(a, b, c) { return Math.abs((a.x * (b.y - c.y)) + (b.x * (c.y - a.y)) + (c.x * (a.y - b.y))) / 2;
// }

// //	################################
// //	ADJACENCY HANDLERS + CONNECTIONS
// //	################################

// //hover handler for adjacencies, shows tooltip for changing adjacencies to connections
// function adjacency_hover(pointer) {
// 	if (mode === null) {
// 		console.log("adjacency_hover: Invalid Mode");
// 	} else if (mode === 'connection') {
// 		select_adjacency(this);
// 	}
// }

// //deselects adjacencies when they are no longer hovered
// function adjacency_out(pointer) {
// 	if (mode === null) {
// 		console.log("adjacency_out: Invalid Mode");
// 	} else if (mode === 'connection') {
// 		deselect_adjacency();
// 	}
// }

// //tap handler for adjacencies; handles building connections
// function adjacency_tap(pointer) {
// 	if (mode === null) {
// 		console.log("adjacency_tap: Invalid Mode");
// 	} else if (mode === 'connection') {
// 		if (this === selected_adjacency) {
// 			connect(this);
// 		} else {
// 			console.log("adjacency_tap: Tapped unhovered adjacency?");
// 		}
// 	}
// }

// //visual changes for adjacency selection
// function select_adjacency(adjacency) {
// 	if (adjacency != null && adjacency.path_type === 'adjacent') {
// 		if (selected_adjacency != null) {
// 			selected_adjacency.clearTint();
// 		}
// 		selected_adjacency = adjacency;
// 		adjacency.setTint(0x00ff00);
// 	}
// }

// //broadly deselecting any adjacencies, resetting visual changes
// function deselect_adjacency() {
// 	if (selected_adjacency != null) {
// 		selected_adjacency.clearTint();
// 	}
// 	selected_adjacency = null;
// }

// //turns and adjacency into a connection between adjacent, unconnected, in-network, discovered systems and checks the connection does not violate intersection rules with the existing connection network.
// function connect(adjacency) {
// 	if (adjacency.path_type === 'connected') {
// 		console.log("Already Connected!");
// 	} else if (adjacency.path_type === 'adjacent') {
// 		var in_network_1 = false;
// 		var in_network_2 = false;
// 		for (let n = 0; n < system_network.length; n++) {
// 			if (adjacency.system1 === system_network[n]) {
// 				in_network_1 = true;
// 			}
// 			if (adjacency.system2 === system_network[n]) {
// 				in_network_2 = true;
// 			}
// 			if (in_network_1 && in_network_2) { break; }
// 		}
// 		if (in_network_1) {console.log("System " + adjacency.system1 + " is in network [" + system_network + "] so we can extend it with a connection!");}
// 		if (in_network_2) {console.log("System " + adjacency.system2 + " is in network [" + system_network + "] so we can extend it with a connection!");}

// 		if (in_network_1 || in_network_2) {
// 			if (!intersects_network(adjacency)) {
// 				let system1 = systems[adjacency.system1];
// 				let system2 = systems[adjacency.system2];
// 				system1.connected.push(system2.i);
// 				system2.connected.push(system1.i);
// 				if (!in_network_1) { system_network.push(system1.i); }
// 				if (!in_network_2) { system_network.push(system2.i); }
// 				adjacency.clearAlpha();
// 				adjacency.clearTint();
// 				adjacency.path_type = 'connected';
// 				connection_network.push(adjacency);
// 			} else {
// 				console.log("Proposed connection intersects existing connection.");
// 			}
// 		} else {
// 			console.log("Systems " + adjacency.system1 + " and " + adjacency.system2 + " are not in network [" + system_network + "]");
// 		}
// 	} else {
// 		console.log("Invalid adjacency type: " + adjacency.path_type);
// 	}
// }

// //checks if a proposed adjacency intersects any of the connections in the existing connection network
// function intersects_network(adjacency) {
// 	//returns if a given adjacency intersects any other connection in the network - if so, it cannot become a connection.
// 	var connection;
// 	for (let n = 0; n < connection_network.length; n++) {
// 		connection = connection_network[n];
// 		if (intersects(connection, adjacency)) {
// 			//console.log("Adjacency intersects existing connection network!");
// 			return true;
// 		}
// 	}
// 	//console.log("Adjacency does not intersect existing connection network!");
// 	return false;
// }

// //checks if a proposed adjacency intersects a given existing connection
// function intersects(connection, adjacency) {
// 	const p1 = connection.endpoint1;
// 	const p2 = connection.endpoint2;
// 	const q1 = adjacency.endpoint1
// 	const q2 = adjacency.endpoint2

// 	//console.log("Testing intersection of: (" + p1.x + "," + p1.y + ")-(" + p2.x + "," + p2.y + ") and (" + q1.x + "," + q1.y + ")-(" + q2.x + "," + q2.y + ")");

// 	let o1 = orientation(p1, p2, q1);
// 	let o2 = orientation(p1, p2, q2);
// 	let o3 = orientation(q1, q2, p1);
// 	let o4 = orientation(q1, q2, p2);

// 	//console.log("Orientations: " + o1 + ", " + o2 + ", " + o3 + ", " + o4)

// 	if (o1 != o2 && o3 != o4) { return true; }
// 	if (o1 === 'collinear' && q_between_collinear_p_r(p1, q1, p2)) { return true; }
// 	if (o2 === 'collinear' && q_between_collinear_p_r(p1, q2, p2)) { return true; }
// 	if (o3 === 'collinear' && q_between_collinear_p_r(q1, p1, q2)) { return true; }
// 	if (o4 === 'collinear' && q_between_collinear_p_r(q1, p2, q2)) { return true; }

// 	return false;
// }

// //helper function for checking intersection that returns the geometric orientation of 3 points in space - clockwise, counterclockwise, or collinear
// function orientation(p, q, r) {
// 	let o = (q.y - p.y) * (r.x - q.x);
// 	let t = (r.y - q.y) * (q.x - p.x);
// 	//console.log("o: " + o + "; t: " + t);
// 	if (o == t) { return 'collinear'; } //collinear
// 	if (o > t) { return 'clockwise'; } //clockwise
// 	if (o < t) { return 'counter-clockwise'; } //counter-clockwise
// }

// //helper function for checking intersection that, when given 3 collinear points, returns if q falls between p and r (true) or outside of p and r (false)
// function q_between_collinear_p_r(p, q, r) { 
// 	return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
// }

window.gameLoaded();