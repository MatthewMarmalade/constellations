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
	type: Phaser.AUTO,
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
// var players = {};

//Variable Initialization
var text1; var text2; var text3; var text4;
var button_scout; var button_connection; var button_establish;
var can_click = true; var click = false;
var systems = []; var adjacencies = []; var settlements = []; var factories = [];
var home_system; var connection_network = [];
var num_new_adjacencies; 
var system_sprites = []; var adjacency_sprites = [];
var selected_system_sprite; var selected_adjacency; var selected_system;
var selected_mode_button;
var mode;
var adjacency_alpha = 0.2;
var adjacency_preview; var connection_preview; var discovery_preview;
var line_width = 50; var line_height = 5;
var circle_radius = 40;
var test = false;
var scene;
var adjacency_lock = false;

//	########################
//	INITIALIZATION + UPDATES
//	########################

//loading initial assets
function preload() {
	this.load.image('empty_space','assets/sprites/empty_space.png');
	this.load.image('empty_system','assets/sprites/empty_system.png');
	this.load.image('1_system','assets/sprites/1_system.png');
	this.load.image('2_system','assets/sprites/2_system.png');
	this.load.image('3_system','assets/sprites/3_system.png');
	this.load.image('4_system','assets/sprites/4_system.png');
	this.load.image('5_system','assets/sprites/5_system.png');
	this.load.image('6_system','assets/sprites/6_system.png');
	this.load.image('path','assets/sprites/path.png');
	// this.load.image('connection','assets/sprites/connection.png');
	this.load.image('button_scout','assets/sprites/button_scout.png');
	this.load.image('button_connection','assets/sprites/button_connection.png');
	this.load.image('button_establish','assets/sprites/button_establish.png');
}

//adding assets to the world, initial game state
function create() {
	scene = this;
	scene.socket = io();
	scene.players = scene.add.group();
	scene.cameras.main.setBounds(0, 0, 4000, 4000);
	var cursors = scene.input.keyboard.createCursorKeys();
	var controlConfig = {
		camera: scene.cameras.main,
		left: cursors.left,
		right: cursors.right,
		up: cursors.up,
		down: cursors.down,
		zoomIn: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
		zoomOut: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
		acceleration: 0.06,
		drag: 0.0005,
		maxSpeed: 1.0
	};

	controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

	//current_galaxy received whenever we log in.
	scene.socket.on('current_galaxy', function (galaxy) {
		// console.log("Received Galaxy:");
		// console.log(galaxy);
		render_galaxy(galaxy);
	});

	//new_move received whenever another player has made a new move
	scene.socket.on('new_move', function(move) {
		// console.log("Received Move:");
		// console.log(move);
		handle_move(move);
	})

	scene.socket.on('failed_move', function(move) {
		failed_move(move);
	})

	scene.socket.on('player_disconnected', function (id) {
		console.log("Player " + id + " disconnected.");
	})

	// text1 = this.add.text(10, 10, 'Constellations', { fontSize: '32px', align: 'center'});
	text2 = this.add.text(10, config.height * 8/10, "CONSOLE", { fontSize: '24px', align: 'left'});
	text3 = this.add.text(10, config.height * 9/10, "CONSOLE", { fontSize: '24px', align: 'left'});
	// text4 = this.add.text(100, 100, 'Testing Movement Off-Screen');

	button_establish = this.add.image(config.width - 150, config.height - 100, 'button_establish');
	button_connection = this.add.image(config.width - 250, config.height - 100, 'button_connection');
	button_scout = this.add.image(config.width - 350, config.height - 100, 'button_scout');
	button_scout.setInteractive();
	button_connection.setInteractive();
	button_establish.setInteractive();
	button_scout.button_type = 'scout'
	button_connection.button_type = 'connection'
	button_establish.button_type = 'establish_settlement'
	button_scout.on('pointerup', button_tap);
	button_connection.on('pointerup', button_tap);
	button_establish.on('pointerup', button_tap);

	adjacency_preview = this.add.image(100,100,'path');
	adjacency_preview.setAlpha(adjacency_alpha);
	connection_preview = this.add.image(100,100,'path');
	discovery_preview = this.add.image(100,100,'empty_space');
	discovery_preview.on('pointerup', discovery_tap)
	discovery_preview.setInteractive();

	adjacency_preview.setVisible(false);
	connection_preview.setVisible(false);
	discovery_preview.setVisible(false);

	select_button(button_scout);
}

//live updates - text output and previews
function update(time, delta) {
	controls.update(delta);
	
	var pointer = this.input.activePointer;
	if (selected_adjacency != null) {
		text2.setText([
			'adjacency: ' + selected_adjacency.i + '; ' +
			'p1: (' + Math.floor(selected_adjacency.endpoint1.x) + ', ' + Math.floor(selected_adjacency.endpoint1.y) + '); ' + 
			'p2: (' + Math.floor(selected_adjacency.endpoint2.x) + ', ' + Math.floor(selected_adjacency.endpoint2.y) + '); ' + 
			'systems: ' + systems.length + ', ' +
			'mode: ' + mode
		]);
	} else if (selected_system_sprite != null) {
		text2.setText([
			'system: ' + selected_system_sprite.i + ', ' + 
			'settlements: [' + selected_system.settlements + '], ' + 
			'factories: [' + selected_system.factories + '], ' + 
			'mode: ' + mode
		]);
	} else {
		text2.setText([
			'unselected, ' + 
			'systems: ' + systems.length + ', ' +
			'mode: ' + mode
		]);
	}

	if (mode === 'discover') {
		preview(selected_system_sprite.x, selected_system_sprite.y, pointer.x, pointer.y);
	} else {
		adjacency_preview.setVisible(false);
		discovery_preview.setVisible(false);
	}

	if (mode === 'finish_connection') {
		preview(selected_system_sprite.x, selected_system_sprite.y, pointer.x, pointer.y);
	} else {
		connection_preview.setVisible(false);
	}

	// text4.x += 1;
	// text3.setText('Location: ' + text4.x + ", " + text4.y);
}

//renders a preview line from point 1 (x1, y1) to point 2 (x2, y2)
function preview(x1, y1, x2, y2) {
	let angle = angleTo(x1, y1, x2, y2);
	let dist = distTo(x1, y1, x2, y2);
	let scale = (dist / line_width)
	let midx = mid(x1,x2); let midy = mid(y1,y2);
	if (mode === 'discover') {
		adjacency_preview.x = midx;
		adjacency_preview.y = midy;
		adjacency_preview.setRotation(angle);
		adjacency_preview.setVisible(true);
		adjacency_preview.setScale(scale,1);

		discovery_preview.x = x2;
		discovery_preview.y = y2;
		discovery_preview.setVisible(true);
	} else if (mode === 'finish_connection') {
		connection_preview.x = midx;
		connection_preview.y = midy;
		connection_preview.setRotation(angle);
		connection_preview.setVisible(true);
		connection_preview.setScale(scale,1);
	}
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

// #########
// RENDERING
// #########

//rendering galaxy
function render_galaxy(galaxy) {
	console.log("GALAXY: ")
	console.log(galaxy);
	systems = galaxy.systems;
	adjacencies = galaxy.adjacencies;
	settlements = galaxy.settlements;
	factories = galaxy.factories;
	render_systems(galaxy.systems);
	render_adjacencies(galaxy.adjacencies);
}

//rendering systems
function render_systems(systems_to_render) {
	for (let s = 0; s < system_sprites.length; s++) {
		system_sprites[s].destroy(true);
	}
	system_sprites = [];
	for (let s = 0; s < systems_to_render.length; s++) {
		render_system(systems_to_render[s]);
	}
}

//rendering system
function render_system(system) {
	const new_system_sprite = scene.add.sprite(system.x, system.y, 'empty_space').setInteractive();
	new_system_sprite.i = system.i;
	assign_habitability(new_system_sprite, system.num);
	new_system_sprite.adjacent = [];
	new_system_sprite.connected = [];
	new_system_sprite.on('pointerup', system_tap);
	new_system_sprite.on('pointerover', system_hover);
	new_system_sprite.on('pointerout', system_out);
	system_sprites.splice(system.i, 0, new_system_sprite);
}

//rendering adjacencies
function render_adjacencies(adjacencies_to_render) {
	for (let a = 0; a < adjacency_sprites.length; a++) {
		adjacency_sprites[a].destroy(true);
	}
	adjacency_sprites = [];
	for (let a = 0; a < adjacencies_to_render.length; a++) {
		render_adjacency(adjacencies_to_render[a]);
	}
}

//rendering adjacency
function render_adjacency(adjacency) {
	//console.log(adjacency);
	let system1 = systems[adjacency.system1i]; let system2 = systems[adjacency.system2i];
	let rendered_adjacency = path(system1.x, system1.y, system2.x, system2.y);
	if (rendered_adjacency != null) {
		adjacency_sprites.push(rendered_adjacency);
		rendered_adjacency.i = adjacency.i;
		system1.adjacent.push(system2.i);
		system2.adjacent.push(system1.i);
		if (adjacency.connection === true) {
			convert_to_connection(rendered_adjacency);
			system1.connected.push(system2.i);
			system2.connected.push(system1.i);
		}
	} else {
		console.log("Failed to render new adjacency. How did an invalid adjacency get in here?!?");
	}
}

function render_connection(adjacency) {
	// console.log("Adjacency Sprites:");
	// console.log(adjacency_sprites);
	let adjacency_sprite = adjacency_sprites[adjacency.i];
	convert_to_connection(adjacency_sprite);
}

//	#############
//	MOVE HANDLING
//	#############

function handle_move(move) {
	console.log("handle_move: Move:");
	console.log(move);
	//first we determine the move's type. Then we can act accordingly.
	if (move.move_type === 'scout') {
		//system num resolved - system i, num
		console.log(system_sprites);
		assign_habitability(system_sprites[move.systemi], move.num);
		num_new_adjacencies = move.num_new_adjacencies;
		text3.setText('Adjacencies: ' + num_new_adjacencies);

	} else if (move.move_type === 'discovery') {
		//new system, new adjacency - system, adjacency
		systems.splice(move.system.i, 0, move.system);
		render_system(move.system);

		handle_move({move_type: 'adjacency', adjacency: move.adjacency});

	} else if (move.move_type === 'adjacency') {
		//new adjacency
		adjacencies.splice(move.adjacency.i, 0, move.adjacency);
		render_adjacency(move.adjacency);
		num_new_adjacencies--;
		text3.setText('Adjacencies: ' + num_new_adjacencies);
		if (num_new_adjacencies === 0) {
			mode = 'scout';
		}
		adjacency_lock = false;

	} else if (move.move_type === 'connection') {
		//new connection
		adjacencies[move.adjacencyi].connection = true;
		// console.log("New Connection:");
		// console.log(adjacencies[move.adjacencyi]);
		render_connection(adjacencies[move.adjacencyi]);

	} else if (move.move_type === 'establish') {
		//new establishment
		if (move.establishment.establish_type === 'settlement') {
			systems[move.establishment.systemi].settlements.push(move.establishment.i);
			settlements.splice(move.establishment.i, 0, move.establishment);
		} else if (move.establishment.establish_type === 'factory') {
			systems[move.establishment.systemi].factories.push(move.establishment.i);
			factories.splice(move.establishment.i, 0, move.establishment);
		}

	} else {
		console.log("handle_move: Unknown move type: " + move.move_type)
	}
}

function failed_move(move) {
	console.log("failed_move: Move:");
	console.log(move);
	if (move.move_type === 'scout_intent') {

	} else if (move.move_type === 'discover_intent') {
		adjacency_lock = false;
	} else if (move.move_type === 'adjacent_intent') {
		adjacency_lock = false;
	} else if (move.move_type === 'connect_intent') {

	} else if (move.move_type === 'establish_intent') {

	} else {
		console.log("failed_move: Unknown move type: " + move.move_type)
	}
}

function send_move(move) {
	scene.socket.emit('send_move', move);
}


//	###############
//	BUTTON HANDLERS
//	###############

//tap handler for the mode buttons; handles changing modes
function button_tap(pointer) {
	if (mode === null) {
		console.log("button_tap: Invalid mode.");
	} else if (mode === 'scout') {
		select_button(this);
	} else if (mode === 'connection') {
		select_button(this);
	} else if (mode === 'establish_factory' || mode === 'establish_settlement') {
		select_button(this);
	} else {
		console.log("Mode '" + mode + "' does not allow switching between scouting, connecting, and establishing");
	}
}

//visual changes for button selection
function select_button(button) {
	if (selected_mode_button != null) {
		selected_mode_button.clearTint();
	}
	if (button.button_type === mode) {
		if (button.button_type === 'establish_factory') {
			button.button_type = 'establish_settlement';
		} else if (button.button_type === 'establish_settlement') {
			button.button_type = 'establish_factory';
		}
	}
	mode = button.button_type;
	if (button.button_type === 'scout') {
		button.setTint(0xff0000);
	} else if (button.button_type === 'connection') {
		button.setTint(0x00ff00);
	} else if (button.button_type === 'establish_settlement') {
		button.setTint(0x00ffff);
	} else if (button.button_type === 'establish_factory') {
		button.setTint(0xff00ff)
	}
	selected_mode_button = button;
	deselect_system();
}

//	###############
//	SYSTEM HANDLERS
//	###############

//hover handler for systems
function system_hover(pointer) {
	if (mode === null) {
		console.log("system_hover: Invalid mode.");
	} else if (mode === 'scout') {
		if (this.num === 0) {
			select_system(this);
		}
	} else if (mode === 'establish_factory' || mode === 'establish_settlement') {
		if (this.num > 0) {
			select_system(this);
		}
	}
}

//deselects systems when they are no longer hovered
function system_out(pointer) {
	if (mode === null) {
		console.log("system_out: Invalid mode.");
	} else if (mode === 'scout') {
		deselect_system();
	} else if (mode === 'establish_factory' || mode === 'establish_settlement') {
		deselect_system();
	}
}

//tap handler for a given system; handles scouting and establishing
function system_tap(pointer) {
	if (mode === null) {
		console.log("system_tap: Invalid mode.");
	} else if (mode === 'scout') {
		if (this.num === 0) {
			if (this === selected_system_sprite) {
				scout(this);
				mode = 'discover';
			} else {
				console.log("scout: Tapped unhovered system?");
			}
		}
	} else if (mode === 'discover') {
		if (this.num === -1) {
			discover(selected_system_sprite, this);
		} else if (this.num === 0) {
			adjacent(selected_system_sprite, this);
		} else if (this.num >= 0) {
			adjacent(selected_system_sprite, this);
		}
	} else if (mode === 'establish_settlement' || mode === 'establish_factory') {
		if (this.num >= 0) {
			if (this === selected_system_sprite) {
				establish(this);
			} else {
				console.log("establish: Tapped unhovered system?");
			}
		}
	}
}

function discovery_tap(pointer) {
	if (mode === null) {
		console.log("discovery_tap: Invalid mode.");
	} else if (mode === 'discover') {
		console.log("discovery_tap: Discovery Tapped.");
		discover(selected_system_sprite, this);
	}
}

//visual changes for system selection
function select_system(system_sprite) {
	if (system_sprite != null) {
		if (selected_system_sprite != null) {
			selected_system_sprite.clearTint();
		}
		selected_system_sprite = system_sprite;
		selected_system = systems[system_sprite.i];
		if (mode === 'scout') {
			system_sprite.setTint(0xff0000);
		} else if (mode === 'connection') {
			system_sprite.setTint(0x00ff00);
		} else if (mode === 'establish_settlement' || mode === 'establish_factory') {
			system_sprite.setTint(0x0000ff);
		}
	}
}

//broadly deselecting any systems, resetting visual changes
function deselect_system() {
	if (selected_system_sprite != null) {
		selected_system_sprite.clearTint();
	}
	selected_system_sprite = null;
	selected_system = null;
}

//	########
//	SCOUTING
//	########

//randomly assigns an unscouted system a habitability value, changes the texture, and determines a random number of adjacencies.
function scout(system_sprite) {
	send_move({move_type: 'scout_intent', systemi: system_sprite.i});
}

function assign_habitability(system_sprite, num) {
	system_sprite.num = num;
	systems[system_sprite.i].num = num;
	if (num === 0) {
		system_sprite.setTexture('empty_system');
	} else if (num === 1) {
		system_sprite.setTexture('1_system');
	} else if (num === 2) {
		system_sprite.setTexture('2_system');
	} else if (num === 3) {
		system_sprite.setTexture('3_system');
	} else if (num === 4) {
		system_sprite.setTexture('4_system');
	} else if (num === 5) {
		system_sprite.setTexture('5_system');
	} else if (num === 6) {
		system_sprite.setTexture('6_system');
	} else {
		console.log("ERROR: " + num + " is out of the acceptable range for a num.");
	}
}

//adding new adjacencies that create additional systems. Checks new system is clear of adjacencies, and adds a new system
function discover(system1, system2) {
	if (num_new_adjacencies > 0 && adjacency_lock === false) {
		send_move({move_type: 'discover_intent', system1i: system1.i, x: system2.x, y: system2.y});
		adjacency_lock = true;
	} else {
		console.log("Too soon after previous adjacency (" + adjacency_lock + ") or no new adjacencies remaining ( "+ num_new_adjacencies + " )!");
	}
}

//adding new adjacencies, regardless of if they are new systems or not. Checks new adjacency is clear of systems, and adds a path
function adjacent(system1, system2) {
	//MARK: Prevent multiple adjacencies from occuring. Probably means each system should maintain a list of adjacent systems. Which will get pretty memory-heavy pretty quick but oh well.
	if (num_new_adjacencies > 0 && adjacency_lock === false) {
		send_move({move_type: 'adjacent_intent', system1i:system1.i, system2i:system2.i});
		adjacency_lock = true;
	} else {
		console.log("Too soon after previous adjacency (" + adjacency_lock + ") or no new adjacencies remaining ( "+ num_new_adjacencies + " )!");
	}

}

//path checker for new adjacencies between systems at (x1, y1) and (x2, y2). Checks if new adjacency is clear of systems.
function path(x1, y1, x2, y2) {
	let angle = angleTo(x1, y1, x2, y2);
	let dist = distTo(x1, y1, x2, y2);
	let scale = dist / line_width
	let midx = mid(x1,x2); let midy = mid(y1,y2);
	let endpoint1 = {x : midx + (Math.cos(angle) * dist / 2), y : (midy + (Math.sin(angle) * dist / 2))};
	let endpoint2 = {x : midx - (Math.cos(angle) * dist / 2), y : (midy - (Math.sin(angle) * dist / 2))};
	// if (intersects_systems(endpoint1, endpoint2)) {
	// 	//console.log("path: Proposed adjacency intersects existing system!");
	// 	return null;
	// } else {
	let adjacent_path = draw_path(midx, midy, angle, scale, 0.2);
	adjacent_path.setInteractive();
	adjacent_path.on('pointerup', adjacency_tap);
	adjacent_path.on('pointerover', adjacency_hover);
	adjacent_path.on('pointerout', adjacency_out);
	adjacent_path.endpoint1 = endpoint1;
	adjacent_path.endpoint2 = endpoint2;
	return adjacent_path;
	// }
}

//helper function for path that adds the actual asset.
function draw_path(midx, midy, angle, scale, alpha) {
	let new_path = scene.add.image(midx, midy, 'path');
	new_path.setRotation(angle);
	new_path.setScale(scale,1);
	new_path.setAlpha(alpha);
	new_path.path_type = 'adjacent';
	return new_path;
}

//	################################
//	ADJACENCY HANDLERS + CONNECTIONS
//	################################

//hover handler for adjacencies, shows tooltip for changing adjacencies to connections
function adjacency_hover(pointer) {
	if (mode === null) {
		console.log("adjacency_hover: Invalid Mode");
	} else if (mode === 'connection') {
		select_adjacency(this);
	}
}

//deselects adjacencies when they are no longer hovered
function adjacency_out(pointer) {
	if (mode === null) {
		console.log("adjacency_out: Invalid Mode");
	} else if (mode === 'connection') {
		deselect_adjacency();
	}
}

//tap handler for adjacencies; handles building connections
function adjacency_tap(pointer) {
	console.log("adjacency_tap:")
	console.log(this);
	if (mode === null) {
		console.log("adjacency_tap: Invalid Mode");
	} else if (mode === 'connection') {
		if (this === selected_adjacency) {
			connect(this);
		} else {
			console.log("adjacency_tap: Tapped unhovered adjacency?");
		}
	}
}

//visual changes for adjacency selection
function select_adjacency(adjacency) {
	if (adjacency != null && adjacency.path_type === 'adjacent') {
		if (selected_adjacency != null) {
			selected_adjacency.clearTint();
		}
		selected_adjacency = adjacency;
		adjacency.setTint(0x00ff00);
	}
}

//broadly deselecting any adjacencies, resetting visual changes
function deselect_adjacency() {
	if (selected_adjacency != null) {
		selected_adjacency.clearTint();
	}
	selected_adjacency = null;
}

//turns an adjacency into a connection between adjacent, unconnected, in-network, discovered systems and checks the connection does not violate intersection rules with the existing connection network.
function connect(adjacency_sprite) {
	// console.log(adjacencies);
	// console.log(adjacency_sprite.i);
	
	send_move({move_type: 'connect_intent', adjacencyi: adjacency_sprite.i});

	
}

function convert_to_connection(adjacency) {
	adjacency.clearAlpha();
	adjacency.clearTint();
	adjacency.path_type = 'connected';
}

function establish(system_sprite) {
	if (mode === 'establish_settlement') {
		send_move({move_type: 'establish_intent', systemi: system_sprite.i, establish_type: 'settlement'});
	} else if (mode === 'establish_factory') {
		send_move({move_type: 'establish_intent', systemi: system_sprite.i, establish_type: 'factory'});
	}
}