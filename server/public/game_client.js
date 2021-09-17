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

//Outside of Game - Handling Form Submissions to Join Game
function form_submit(submission) {
	if (submission === null) {
		console.log("Null Submission");
	} else if (submission === "") {
		console.log("Empty Submission");
	} else {
		console.log("Submission: " + submission);
		join_game(submission);
	}

	//Upon submission, we should attempt to join a game in progress with the given name.


}

//Game Configuration
var config = {
	type: Phaser.AUTO,
	width: 1300,
	height: 600,
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
var text_system; var text_coordinates; var text_resources; var text_mode_adjacencies; var text_establishments; var text_output;
var text_username; var text_habitable_range; var text_factories_settlements;
var button_scout; /*var button_connection;*/ var button_factory; var button_settlement; var button_end_turn; var button_full_view;
var can_click = true; var click = false;
var systems = []; var adjacencies = []; var settlements = []; var factories = []; var players = {}; var player = {}; var username; 
var galaxy_installed = false; var player_installed = false;
var home_systemi = -1; var habitable_range; var num_factories; var num_settlements; var minX; var maxX; var minY; var maxY;
var num_new_adjacencies = 0; 
var system_ship_sprite;
var system_sprites = []; var adjacency_sprites = []; var settlement_sprites = []; var factory_sprites = [];
var selected_system_sprite; var selected_adjacency_sprite; var selected_system; var hovered_system_sprite; var hovered_system;
var selected_mode_button;
var mode;
var adjacency_alpha = 0.2;
var adjacency_preview; var discovery_preview;
const line_width = 50; const line_height = 5;
const circle_radius = 42;
const system_width = 100;
const establishment_width = 25; const establishment_height = 150;
var test = false;
var scene;
var adjacency_lock = false;
var sidebar_width = 300;
var camera_zoom = 0.5;
var galactic_centre = {x: config.width / 2, y: config.height / 2};
var resources = 0; var turn; var latest_result = '';
// var controls;

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
	this.load.image('button_scout','assets/sprites/button_scout.png');
	this.load.image('button_end_turn','assets/sprites/button_end_turn.png');
	this.load.image('button_settlement','assets/sprites/button_settlement.png');
	this.load.image('button_factory','assets/sprites/button_factory.png');
	this.load.image('button_full_view','assets/sprites/button_full_view.png');
	this.load.image('void', 'assets/sprites/void.png');
	this.load.image('settlement', 'assets/sprites/settlement.png');
	this.load.image('factory', 'assets/sprites/factory.png');
	this.load.image('system_ship', 'assets/sprites/system_ship.png');
}

//adding assets to the world, initial game state
function create() {
	scene = this;
	scene.socket = io();
	scene.players = scene.add.group();
	// scene.cameras.main.setBounds(sidebar_width, 0, config.width - sidebar_width, config.height);
	// var cursors = scene.input.keyboard.createCursorKeys();
	// var controlConfig = {
	// 	camera: scene.cameras.main,
	// 	left: cursors.left,
	// 	right: cursors.right,
	// 	up: cursors.up,
	// 	down: cursors.down,
	// 	zoomIn: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
	// 	zoomOut: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
	// 	acceleration: 0.06,
	// 	drag: 0.0005,
	// 	maxSpeed: 1.0
	// };

	// controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

	//current_galaxy received whenever we log in.
	// scene.socket.on('current_galaxy', function (galaxy) {
	// 	// console.log("Received Galaxy:");
	// 	// console.log(galaxy);
	// 	install_galaxy(galaxy);
	// });

	//new_move received whenever another player has made a new move
	scene.socket.on('new_move', function(move) {
		// console.log("Received Move:");
		// console.log(move);
		handle_move(move);
	});

	scene.socket.on('failed_move', function(move) {
		failed_move(move);
	});

	scene.socket.on('player_disconnected', function (id) {
		console.log("Player " + id + " disconnected.");
	});

	scene.socket.on('successful_join', function(welcome_pack) {
		successful_join(welcome_pack);
	})

	scene.socket.on('failed_join', function(reason) {
		console.log("Join Failed: " + JSON.stringify(reason));
	})

	

	const sidebar_left_bg = this.add.image(mid(0, sidebar_width), config.height / 2, 'void');
	sidebar_left_bg.setScale(sidebar_width / sidebar_left_bg.width, config.height / sidebar_left_bg.height);
	sidebar_left_bg.depth = 50;

	const sidebar_right_bg = this.add.image(mid(config.width, config.width - sidebar_width), config.height / 2, 'void');
	sidebar_right_bg.setScale(sidebar_width / sidebar_right_bg.width, config.height / sidebar_right_bg.height);
	sidebar_right_bg.depth = 50;

	const sidebar_left_border = draw_path(sidebar_width, config.height/2, Math.PI / 2, config.height / line_width, 1);
	const sidebar_right_border = draw_path(config.width - sidebar_width, config.height/2, Math.PI / 2, config.height / line_width, 1);
	sidebar_left_border.depth = 55;
	sidebar_right_border.depth = 55;

	const galaxy_top = draw_path(config.width/2, (line_height / 2), 0, config.width / line_width, 1);
	const galaxy_bottom = draw_path(config.width/2, config.height - 2, 0, config.width / line_width, 1);
	const galaxy_left = draw_path((line_height / 2), config.height/2, Math.PI / 2, config.height / line_width, 1);
	const galaxy_right = draw_path(config.width - (line_height / 2), config.height/2, Math.PI / 2, config.height / line_width, 1);
	galaxy_top.depth = 55;
	galaxy_bottom.depth = 55;
	galaxy_left.depth = 55;
	galaxy_right.depth = 55;

	text_username = this.add.text(10, 10, '', {fontSize: '24px'});
	text_habitable_range = this.add.text(10, 40, '', {fontSize: '24px'});
	text_factories_settlements = this.add.text(10, 70, '', {fontSize: '12px'});
	text_username.depth = 60;
	text_habitable_range.depth = 60;
	text_factories_settlements.depth = 60;

	text_system = this.add.text(config.width - sidebar_width + 10, 10, '', { fontSize: '24px', align: 'center' });
	text_coordinates = this.add.text(config.width - sidebar_width + 10, 40, '', { fontSize: '24px', align: 'left' });
	text_resources = this.add.text(config.width - sidebar_width + 10, 70, '', { fontSize: '24px', align: 'left' });
	text_mode_adjacencies = this.add.text(config.width - sidebar_width + 10, 100, '', { fontSize: '14px', align: 'left' });
	text_output = this.add.text(config.width - sidebar_width + 10, 130, '', { fontSize: '14px' });
	text_establishments = this.add.text(config.width - sidebar_width + 10, 160, ''); //- No Settlements\n- No Factories
	text_system.depth = 60;
	text_coordinates.depth = 60;
	text_resources.depth = 60;
	text_mode_adjacencies.depth = 60;
	text_output.depth = 60;
	text_establishments.depth = 60;

	button_factory = this.add.image(config.width - sidebar_width + 50, config.height - 75, 'button_factory');
	button_settlement = this.add.image(config.width - sidebar_width + 150, config.height - 75, 'button_settlement');
	button_end_turn = this.add.image(config.width - sidebar_width + 150, config.height - 175, 'button_end_turn');
	button_scout = this.add.image(config.width - sidebar_width + 50, config.height - 175, 'button_scout');
	button_scout.setInteractive();
	button_end_turn.setInteractive();
	button_factory.setInteractive();
	button_settlement.setInteractive();
	button_scout.button_type = 'scout'
	button_end_turn.button_type = 'end_turn'
	button_factory.button_type = 'establish_factory'
	button_settlement.button_type = 'establish_settlement'
	button_scout.on('pointerup', button_tap);
	button_end_turn.on('pointerup', button_tap);
	button_factory.on('pointerup', button_tap);
	button_settlement.on('pointerup', button_tap);
	button_scout.depth = 60;
	button_end_turn.depth = 60;
	button_factory.depth = 60;
	button_settlement.depth = 60;
	disable(button_scout);
	disable(button_end_turn);
	disable(button_factory);
	disable(button_settlement);
	button_scout.setVisible(false);
	button_end_turn.setVisible(false);
	button_factory.setVisible(false);
	button_settlement.setVisible(false);

	button_full_view = this.add.image(50, config.height - 75, 'button_full_view');
	button_full_view.setInteractive();
	button_full_view.button_type = 'full_view';
	button_full_view.on('pointerup', button_tap);
	button_full_view.depth = 60;
	enable(button_full_view);
	button_full_view.setVisible(false);

	adjacency_preview = this.add.image(100,100,'path');
	adjacency_preview.setAlpha(adjacency_alpha);
	discovery_preview = this.add.image(100,100,'empty_space');
	discovery_preview.on('pointerup', discovery_tap)
	discovery_preview.setInteractive();

	adjacency_preview.setVisible(false);
	discovery_preview.setVisible(false);

	system_ship_sprite = this.add.image((config.width) / 2, (config.height / 2), 'system_ship');

	//select_button(button_scout);

	mode = 'setup';
}

//live updates - text output and previews
function update(time, delta) {
	// controls.update(time, delta);

	var pointer = this.input.activePointer;

	if (mode === 'discover') {
		preview(selected_system_sprite.x, selected_system_sprite.y, pointer.x, pointer.y, camera_zoom);
	} else {
		adjacency_preview.setVisible(false);
		discovery_preview.setVisible(false);
	}
}

//renders a preview line from point 1 (x1, y1) to point 2 (x2, y2)
function preview(x1, y1, x2, y2, zoom) {
	let angle = angleTo(x1, y1, x2, y2);
	let dist = distTo(x1, y1, x2, y2, zoom);
	let scale = (dist / (line_width * zoom))
	let midx = mid(x1,x2); let midy = mid(y1,y2);
	if (mode === 'discover' && (x2 > sidebar_width) && (x2 < config.width - sidebar_width)) {
		adjacency_preview.x = midx;
		adjacency_preview.y = midy;
		adjacency_preview.setRotation(angle);
		adjacency_preview.setVisible(true);
		adjacency_preview.setScale(scale * zoom,zoom);

		discovery_preview.x = x2;
		discovery_preview.y = y2;
		discovery_preview.setVisible(true);
	} /* else if (mode === 'finish_connection') {
		connection_preview.x = midx;
		connection_preview.y = midy;
		connection_preview.setRotation(angle);
		connection_preview.setVisible(true);
		connection_preview.setScale(scale,1);
	}*/
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
function distTo(x1, y1, x2, y2, zoom) {
	const a = x2 - x1;
	const b = y2 - y1;
	const distance = Math.sqrt((a * a) + (b * b)) - (circle_radius * zoom * 2);
	return distance >= 0 ? distance : 0;
}

//returns the average of two numbers
function mid(a,b) { return (a + b) / 2;
}

// #######
// JOINING
// #######

function join_game(name) {
	console.log("Joining game with username: " + name);
	galaxy_installed = false;
	player_installed = false;
	scene.socket.emit('join_game', name);
}

function successful_join(welcome_pack) {
	install_galaxy(welcome_pack.galaxy);
	install_player(welcome_pack.player);
}

function install_player(player_object) {
	console.log("Joined game! Player object: ");
	console.log(player_object);
	player = player_object;
	username = player_object.username;
	habitable_range = player_object.habitable_range;
	discovery_preview.setTint(range_to_color(player.habitable_range));
	home_systemi = player_object.home_systemi;
	resources = player_object.resources;
	num_settlements = player_object.num_settlements;
	num_factories = player_object.num_factories;
	latest_result = "√ Joined game as Player " + habitable_range;
	select_system(system_sprites[home_systemi]);
	if (player_object.ended) {
		console.log("install_player: ending turn");
		mode = 'end_turn';
	} else {
		console.log("install_player: de-ending turn");
		mode = 'select'
	}
	system_ship_sprite.setTint(range_to_hover(habitable_range));
	render_sidebar_right(selected_system);
	render_sidebar_left();
}

// ##########
// INSTALLING
// ##########

//installing galaxy
function install_galaxy(galaxy) {
	console.log("GALAXY: ");
	console.log(galaxy);
	systems = galaxy.systems;
	adjacencies = galaxy.adjacencies;
	settlements = galaxy.settlements;
	factories = galaxy.factories;
	players = galaxy.players;
	turn = galaxy.turn;
	install_settlements(galaxy.settlements);
	install_factories(galaxy.factories);
	install_systems(galaxy.systems);
	install_adjacencies(galaxy.adjacencies);
	minX = galaxy.minX; maxX = galaxy.maxX; minY = galaxy.minY; maxY = galaxy.maxY;
}

function install_settlements(settlements_to_install) {
	for (let sm = 0; sm < settlement_sprites.length; sm++) {
		settlement_sprites[sm].destroy(true);
	}
	settlement_sprites = []; 
	for (let sm = 0; sm < settlements_to_install.length; sm++) {
		install_settlement(settlements_to_install[sm]);
	}
}

function install_factories(factories_to_install) {
	for (let f = 0; f < factory_sprites.length; f++) {
		factory_sprites[f].destroy(true);
	}
	factory_sprites = [];
	for (let f = 0; f < factories_to_install.length; f++) {
		install_factory(factories_to_install[f]);
	}
	// console.log("INSTALLING FACTORY " + factoryi + " ON SYSTEM " + JSON.stringify(system));
	
	
	// console.log("factory " + factoryi + " on " + system.i + "/" + factories[factoryi].systemi + " colored: " + range_to_color(factories[factoryi].pe).toString(16));
	// new_factory_sprite.setTint(range_to_color(new_factory_sprite.pe));
	//new_factory_sprite.setTint(range_to_color(factories[factoryi].pe));
	
}

//installing systems
function install_systems(systems_to_install) {
	for (let s = 0; s < system_sprites.length; s++) {
		system_sprites[s].destroy(true);
	}
	
	
	system_sprites = [];
	for (let s = 0; s < systems_to_install.length; s++) {
		install_system(systems_to_install[s]);
	}
	// console.log("TESTING FACTORIES:")
	// for (let f = 0; f < factory_sprites.length; f++) {
	// 	//console.log("factory sprite " + f + " receiving color " + range_to_color(factory_sprites[f].pe).toString(16) + "/" + range_to_color(factories[f].pe).toString(16));
	// 	//factory_sprites[f].setTint(range_to_color(factory_sprites[f].pe));
	// 	console.log("f: " + f + ", factory_sprites[f].i: " + factory_sprites[f].i + ", factories[f].i: " + factories[f].i);
	// }
}

//installing system
function install_system(system) {
	const new_system_sprite = scene.add.sprite(0, 0, 'empty_space').setInteractive();
	new_system_sprite.i = system.i;
	assign_habitability(new_system_sprite, system.num);
	new_system_sprite.adjacent = [];
	new_system_sprite.connected = [];
	new_system_sprite.on('pointerup', system_tap);
	new_system_sprite.on('pointerover', system_hover);
	new_system_sprite.on('pointerout', system_out);
	new_system_sprite.setTint(range_to_color(system.pd));
	system_sprites.splice(system.i, 0, new_system_sprite);

	let establishment_angle = system.i * (5 / 6) * Math.PI;
	for (let s = 0; s < system.settlements.length; s++) {
		angle_settlement(system.settlements[s], establishment_angle);
		establishment_angle += (5 / 6) * Math.PI;
	}
	for (let f = 0; f < system.factories.length; f++) {
		angle_factory(system.factories[f], establishment_angle);
		establishment_angle += (5 / 6) * Math.PI;
	}
}

function angle_settlement(settlementi, angle) {
	let settlement_sprite = settlement_sprites[settlementi];
	settlement_sprite.setRotation(angle);
}

function angle_factory(factoryi, angle) {
	let factory_sprite = factory_sprites[factoryi];
	factory_sprite.setRotation(angle);
}

function install_settlement(settlement) {
	const new_settlement_sprite = scene.add.sprite(0, 0, 'settlement');
	new_settlement_sprite.depth = 30;
	new_settlement_sprite.i = settlement.i;
	new_settlement_sprite.pe = settlement.pe;
	new_settlement_sprite.setTint(range_to_color(new_settlement_sprite.pe));
	//console.log(settlements[settlementi]);
	//new_settlement_sprite.setTint(range_to_color(settlements[settlementi].pe));
	settlement_sprites.splice(settlement.i, 0, new_settlement_sprite);
}

function install_factory(factory) {
	const new_factory_sprite = scene.add.sprite(0, 0, 'factory');
	new_factory_sprite.depth = 30;
	new_factory_sprite.i = factory.i;
	new_factory_sprite.pe = factory.pe;
	new_factory_sprite.setTint(range_to_color(new_factory_sprite.pe));
	factory_sprites.splice(factory.i, 0, new_factory_sprite);
	//angle_factory(factoryi, angle);
}

//installing adjacencies
function install_adjacencies(adjacencies_to_install) {
	for (let a = 0; a < adjacency_sprites.length; a++) {
		adjacency_sprites[a].destroy(true);
	}
	adjacency_sprites = [];
	for (let a = 0; a < adjacencies_to_install.length; a++) {
		install_adjacency(adjacencies_to_install[a]);
	}
}

//installing adjacency
function install_adjacency(adjacency) {
	//console.log(adjacency);
	let system1 = systems[adjacency.system1i]; let system2 = systems[adjacency.system2i];
	let installed_adjacency = path(0, 0, 1, 1);//path(system1.x, system1.y, system2.x, system2.y);
	if (installed_adjacency != null) {
		adjacency_sprites.push(installed_adjacency);
		installed_adjacency.i = adjacency.i;
		system1.adjacent.push(system2.i);
		system2.adjacent.push(system1.i);
		if (adjacency.connection === true) {
			convert_to_connection(installed_adjacency);
			system1.connected.push(system2.i);
			system2.connected.push(system1.i);
		}
	} else {
		console.log("Failed to install new adjacency. How did an invalid adjacency get in here?!?");
	}
}

//installing adjacency as a connection
function install_connection(adjacency) {
	// console.log("Adjacency Sprites:");
	// console.log(adjacency_sprites);
	systems[adjacency.system1i].connected.push(adjacency.system2i);
	systems[adjacency.system2i].connected.push(adjacency.system1i);
	let adjacency_sprite = adjacency_sprites[adjacency.i];
	convert_to_connection(adjacency_sprite);
}

//  #########
//  RENDERING
//  #########

//given an xy camera location, places all known entities within the appropriate positions.
function render_galaxy(x, y, zoom) {
	//console.log("rendering_galaxy")
	render_systems(x,y,zoom);
	render_adjacencies(x,y,zoom);
	system_ship_sprite.setScale(zoom);
	discovery_preview.setScale(zoom);
}

function render_systems(x, y, zoom) {
	for (let s = 0; s < systems.length; s++) {
		//console.log("Rendering system " + s);
		render_system(s, x, y, zoom);
		//console.log(render_point);
	}
}

function render_system(systemi, x, y, zoom) {
	let system = systems[systemi]; let system_sprite = system_sprites[systemi];
	let render_point = absolute_to_canvas(system.x, system.y, x, y, zoom);
	system_sprite.setScale(zoom);
	system_sprite.x = render_point.x;
	system_sprite.y = render_point.y;
	for (let s = 0; s < system.settlements.length; s++) {
		// console.log("systemi: " + systemi + "; settlement: " + s);
		render_settlement(system.settlements[s], zoom);
	}
	for (let f = 0; f < system.factories.length; f++) {
		// console.log("systemi: " + systemi + "; factory: " + f);
		render_factory(system.factories[f], zoom);
	}
}

function render_settlement(settlementi, zoom) {
	let settlement = settlements[settlementi]; let settlement_sprite = settlement_sprites[settlementi]; 
	let system_sprite = system_sprites[settlement.systemi];
	settlement_sprite.setScale(zoom);
	settlement_sprite.x = system_sprite.x;
	settlement_sprite.y = system_sprite.y;
}

function render_factory(factoryi, zoom) {
	let factory = factories[factoryi]; let factory_sprite = factory_sprites[factoryi]; 
	let system_sprite = system_sprites[factory.systemi];
	factory_sprite.setScale(zoom);
	factory_sprite.x = system_sprite.x;
	factory_sprite.y = system_sprite.y;
}

function render_adjacencies(x, y, zoom) {
	//let adjacency; let adjacency_sprite; let system1; let system2; let system1_canvas; let system2_canvas;
	for (let a = 0; a < adjacencies.length; a++) {
		render_adjacency(a, x, y, zoom);
	}
}

function render_adjacency(adjacencyi, x, y, zoom) {
	let adjacency = adjacencies[adjacencyi]; let adjacency_sprite = adjacency_sprites[adjacencyi];
	let system1 = systems[adjacency.system1i]; let system2 = systems[adjacency.system2i];
	let system1_canvas = absolute_to_canvas(system1.x, system1.y, x, y, zoom);
	let system2_canvas = absolute_to_canvas(system2.x, system2.y, x, y, zoom);
	render_path(adjacency_sprite, system1_canvas.x, system1_canvas.y, system2_canvas.x, system2_canvas.y, zoom);
}

//updates the path of an adjacency
function render_path(path_to_render, x1, y1, x2, y2, zoom) {
	let angle = angleTo(x1, y1, x2, y2);
	let dist = distTo(x1, y1, x2, y2, zoom);
	let scale = dist / (line_width * zoom);
	let midx = mid(x1,x2); let midy = mid(y1,y2);
	path_to_render.x = midx;
	path_to_render.y = midy;
	path_to_render.setRotation(angle);
	path_to_render.setScale(scale * zoom, zoom);
}

function absolute_to_canvas(abs_x, abs_y, cam_x, cam_y, cam_zoom) {
	let cam_centred_x = abs_x - cam_x;
	let cam_centred_y = abs_y - cam_y;
	let canvas_x = galactic_centre.x + (cam_centred_x * cam_zoom);
	let canvas_y = galactic_centre.y - (cam_centred_y * cam_zoom);
	// console.log("Absolute: " + abs_x + "," + abs_y + " -> Centered: " + cam_centred_x + "," + cam_centred_y + " -> Canvas: " + canvas_x + "," + canvas_y);
	return {x:canvas_x, y:canvas_y};
}

function canvas_to_absolute(canvas_x, canvas_y, cam_x, cam_y, cam_zoom) {
	let cam_centred_x = canvas_x - galactic_centre.x;
	let cam_centred_y = galactic_centre.y - canvas_y;
	let abs_x = (cam_centred_x / cam_zoom) + cam_x;
	let abs_y = (cam_centred_y / cam_zoom) + cam_y;
	// console.log("Canvas: " + canvas_x + "," + canvas_y + " -> Centered: " + cam_centred_x + "," + cam_centred_y + " -> Absolute: " + abs_x + "," + abs_y);
	return {x:abs_x, y:abs_y};
}

//	#############
//	MOVE HANDLING
//	#############

function handle_move(move) {
	console.log("handle_move: Move:");
	console.log(move);
	//first we determine the move's type. Then we can act accordingly.
	if (move.move_type === 'end_turn') {
		if (move.player === habitable_range) {
			if (mode != 'end_turn') {
				end_turn();
			}
		}
		console.log("handle_move: end_turn: Player " + move.player + " has ended turn; remaining: " + move.remaining);
	} else if (move.move_type === 'new_turn') {
		turn = move.turn;
		resources = move.resources[habitable_range-1];
		new_turn();
		latest_result = "√ New Turn: " + turn;
	} else if (move.move_type === 'scout') {
		//system num resolved - system i, num
		//console.log(system_sprites);
		assign_habitability(system_sprites[move.systemi], move.num);
		systems[move.systemi].ps = move.player;

		if (move.player === habitable_range) {
			resources -= 1;
			num_new_adjacencies = move.num_new_adjacencies;
			mode = 'discover';
			latest_result = "√ System Scouted";
		}

	} else if (move.move_type === 'discovery') {
		//new system, new adjacency - system, adjacency
		systems.splice(move.system.i, 0, move.system);
		install_system(move.system);
		render_system(move.system.i, selected_system.x, selected_system.y, camera_zoom);
		max_min(move.system.x, move.system.y);

		handle_move({move_type: 'adjacency', adjacency: move.adjacency, player: move.player});

		if (move.player === habitable_range) {
			if (num_new_adjacencies === 0) {
				latest_result = "√ System " + move.system.i + " Discovered\n  Scouting Complete";
			} else {
				latest_result = "√ System " + move.system.i + " Discovered";
			}
		}

	} else if (move.move_type === 'adjacency') {
		//new adjacency
		adjacencies.splice(move.adjacency.i, 0, move.adjacency);
		install_adjacency(move.adjacency);
		render_adjacency(move.adjacency.i, selected_system.x, selected_system.y, camera_zoom);

		if (move.player === habitable_range) {
			num_new_adjacencies--;
			text_mode_adjacencies.setText(['mode: ' + mode + " / Adjacencies: " + num_new_adjacencies]);

			if (num_new_adjacencies === 0) {
				mode = 'select';
				latest_result = "√ Adjacency Discovered\n  Scouting Complete";
			} else {
				latest_result = "√ Adjacency Discovered";
			}
			adjacency_lock = false;
		}

	} else if (move.move_type === 'connection') {
		//new connection
		adjacencies[move.adjacencyi].connection = true;
		adjacencies[move.adjacencyi].pc = move.player;
		// console.log("New Connection:");
		// console.log(adjacencies[move.adjacencyi]);
		install_connection(adjacencies[move.adjacencyi]);

		if (move.player === habitable_range) {
			resources -= 2;
			latest_result = "√ Connected Systems " + adjacencies[move.adjacencyi].system1i + " and " + adjacencies[move.adjacencyi].system2i;
		}

	} else if (move.move_type === 'establish') {
		//new establishment
		if (move.establishment.establish_type === 'settlement') {
			systems[move.establishment.systemi].settlements.push(move.establishment.i);
			settlements.splice(move.establishment.i, 0, move.establishment);
			const num_establishments = systems[move.establishment.systemi].settlements.length + systems[move.establishment.systemi].factories.length + move.establishment.systemi;
			install_settlement(move.establishment);
			angle_settlement(move.establishment.i, num_establishments * (5/6) * Math.PI);
			render_settlement(move.establishment.i, camera_zoom);
		} else if (move.establishment.establish_type === 'factory') {
			systems[move.establishment.systemi].factories.push(move.establishment.i);
			factories.splice(move.establishment.i, 0, move.establishment);
			const num_establishments = systems[move.establishment.systemi].settlements.length + systems[move.establishment.systemi].factories.length + move.establishment.systemi;
			install_factory(move.establishment);
			angle_factory(move.establishment.i, num_establishments * (5/6) * Math.PI);
			render_factory(move.establishment.i, camera_zoom);
		}

		if (move.player === habitable_range) {
			resources -= 3;
			if (move.establishment.establish_type === 'settlement') {
				latest_result = "√ Settlement Established";
				num_settlements++;
			} else if (move.establishment.establish_type === 'factory') {
				latest_result = "√ Factory Established";
				num_factories++;
			}
		}
	} else {
		console.log("handle_move: Unknown move type: " + move.move_type)
		latest_result = "X Unknown Move: " + move.move_type;
	}
	render_sidebar_left();
	render_sidebar_right(selected_system);
}

function failed_move(move) {
	console.log("failed_move: Move:");
	console.log(move);
	if (move.move_type === 'end_turn') {

	} else if (move.move_type === 'scout_intent') {

	} else if (move.move_type === 'discover_intent') {
		adjacency_lock = false;
	} else if (move.move_type === 'adjacent_intent') {
		adjacency_lock = false;
	} else if (move.move_type === 'connect_intent') {

	} else if (move.move_type === 'establish_intent') {

	} else {
		console.log("failed_move: Unknown move type: " + move.move_type)
	}
	latest_result = "X " + move.result.reason;
	render_sidebar_right(selected_system);
}

function send_move(move) {
	move.player = player.habitable_range;
	console.log("SENDING MOVE:");
	console.log(move);
	scene.socket.emit('send_move', move);
}


//	###############
//	BUTTON HANDLERS
//	###############

//tap handler for the mode buttons; handles changing modes
function button_tap(pointer) {
	if (selected_system === null) {
		console.log("no system selected");
	} else if (this.button_type === 'scout') {
		if (this.enabled) {
			console.log("SCOUT SYSTEM");
			scout(selected_system_sprite);
		} else {
			latest_result = "X " + can_scout(selected_system).reason;
		}
	} else if (this.button_type === 'establish_factory') {
		if (this.enabled) {
			console.log("ESTABLISH FACTORY");
			establish_factory(selected_system_sprite);
		} else {
			latest_result = "X " + can_factory(selected_system).reason;
		}
	} else if (this.button_type === 'establish_settlement') {
		if (this.enabled) {
			console.log("ESTABLISH SETTLEMENT");
			establish_settlement(selected_system_sprite);
		} else {
			latest_result = "X " + can_settle(selected_system).reason;
		}
	} else if (this.button_type === 'end_turn') {
		if (this.enabled) {
			console.log("END TURN");
			end_turn();
			send_move({move_type: 'end_turn'});
		} else {
			latest_result = "X " + can_end_turn(selected_system).reason;
		}
	} else if (this.button_type === 'full_view') {
		if (this.enabled) {
			console.log("FULL VIEW");
			full_view();
		} else {
			latest_result = "X " + can_enter_full_view().reason;
		}
	} else {
		latest_result = "X Invalid Action: " + this.button_type;
		//console.log("THIS BUTTON TYPE (" + this.button_type + ") DOES NOTHING OR IS NOT ENABLED (enabled:" + this.enabled + ")");
	}
	render_sidebar_right(selected_system);
}

function end_turn() {
	console.log("end_turn: ending turn");
	mode = 'end_turn';
	render_sidebar_right(selected_system);
}

function new_turn() {
	console.log("new_turn: new turn");
	mode = 'select';
	render_sidebar_right(selected_system);
}

//visual changes for button selection
// function select_button(button) {
// 	// if (selected_mode_button != null) {
// 	// 	selected_mode_button.clearTint();
// 	// }
// 	// if (button.button_type === mode) {
// 	// 	if (button.button_type === 'establish_factory') {
// 	// 		button.button_type = 'establish_settlement';
// 	// 	} else if (button.button_type === 'establish_settlement') {
// 	// 		button.button_type = 'establish_factory';
// 	// 	}
// 	// }
// 	// mode = button.button_type;
// 	// if (button.button_type === 'scout') {
// 	// 	button.setTint(0xff0000);
// 	// } else if (button.button_type === 'connection') {
// 	// 	button.setTint(0x00ff00);
// 	// } else if (button.button_type === 'establish_settlement') {
// 	// 	button.setTint(0x00ffff);
// 	// } else if (button.button_type === 'establish_factory') {
// 	// 	button.setTint(0xff00ff)
// 	// }
// 	// selected_mode_button = button;
// 	//deselect_system();
// }

//	###############
//	SYSTEM HANDLERS
//	###############

//hover handler for systems
function system_hover(pointer) {
	if (mode === null) {
		console.log("system_hover: Invalid mode.");
	} else if (mode === 'select' || mode === 'end_turn') {
		hover_system(this);
	}
}

//dehovers systems when they are no longer hovered
function system_out(pointer) {
	if (mode === null) {
		console.log("system_out: Null mode.");
	} else if (mode === 'select' || mode === 'end_turn') {
		dehover_system();
	}
}

//tap handler for a given system; handles selecting systems
function system_tap(pointer) {
	if (mode === null) {
		console.log("system_tap: Null mode.");
	} else if (mode === 'select' || mode === 'end_turn') {
		if (this === hovered_system_sprite) {
			select_system(this);
		}
	} else {
		console.log("system_tap: No Action in " + mode + " mode.")
	}
}

function discovery_tap(pointer) {
	if (mode === null) {
		console.log("discovery_tap: Null mode.");
	} else if (mode === 'discover') {
		console.log("discovery_tap: Discovery Tapped.");
		discover(selected_system_sprite, this);
	}
}

//visual changes for system selection
function hover_system(system_sprite) {
	if (system_sprite != null) {
		if (system_sprite === selected_system_sprite) {
			//do nothing!
		} else {
			// console.log("hovering: " + JSON.stringify(systems[system_sprite.i]));
			dehover_system();
			hovered_system_sprite = system_sprite;
			hovered_system = systems[system_sprite.i];
			// console.log(range_to_hover(hovered_system.pd));
			// hovered_system_sprite.clearTint();
			hovered_system_sprite.setTint(range_to_hover(hovered_system.pd));
		}
	}
}

function select_system(system_sprite) {
	if (system_sprite != null) {
		// dehover_system();
		if (mode === 'full_view') {
			mode = returnMode;
		}
		selected_system_sprite = system_sprite;
		selected_system = systems[system_sprite.i];
		dehover_system()
		//system_sprite.setTint(0xff8800);
		render_galaxy(selected_system.x, selected_system.y, camera_zoom);
		render_sidebar_right(selected_system);

		// for (let i = 0; i < selected_system.factories.length; i++) {
		// 	console.log("factory " + selected_system.factories[i] + " should have color " + range_to_color(factories[selected_system.factories[i]].pe).toString(16) + ", but it has color " + factory_sprites[selected_system.factories[i]].tintTopLeft.toString(16));
		// 	factory_sprites[selected_system.factories[i]].setTint(range_to_color(factories[selected_system.factories[i]].pe));
		// }
	}
}

function full_view() {
	if (mode === 'discover') {
		console.log("full_view: cannot render full view while discovering.");
		return;
	} else if (mode === 'end_turn' || mode === 'select') {
		returnMode = mode;
		mode = 'full_view';
	} else if (mode === 'full_view') {
		return_from_full_view();
		return;
	} else {
		console.log("full_view: don't know what to do about mode " + mode);
		return;
	}

	const xZoom = (config.width - (2 * sidebar_width) - 50) / (maxX - minX);
	const yZoom = (config.height - 50) / (maxY - minY);
	const zoom = Math.min(xZoom, yZoom);
	const centre = {x:mid(minX, maxX), y:mid(minY, maxY)};
	console.log("Centre: " + JSON.stringify(centre) + ", Zoom: " + zoom);
	render_galaxy(centre.x, centre.y, zoom);
	render_sidebar_right(selected_system);
}

function return_from_full_view() {
	if (mode === 'full_view') {
		mode = returnMode;
		select_system(selected_system_sprite);
	} else {
		console.log("return_from_full_view: cannot return from full view when in mode: " + mode);
	}
}

//broadly deselecting any systems, resetting visual changes
function dehover_system() {
	if (hovered_system_sprite != null) {
		// console.log("dehovering: " + JSON.stringify(hovered_system));
		//hovered_system_sprite.clearTint();
		hovered_system_sprite.setTint(range_to_color(hovered_system.pd));
	}
	hovered_system_sprite = null;
	hovered_system = null;
}

function render_sidebar_right(system_to_render) {

	if (mode === 'full_view') {
		button_scout.setVisible(false);
		button_end_turn.setVisible(false);
		button_factory.setVisible(false);
		button_settlement.setVisible(false);
		text_system.setText([""]);
		text_coordinates.setText([""]);
		text_mode_adjacencies.setText([""]);
		text_resources.setText([""]);
		text_output.setText([""]);
		text_establishments.setText([""]);
		return;
	}
	//
	button_scout.setVisible(true);
	button_end_turn.setVisible(true);
	button_factory.setVisible(true);
	button_settlement.setVisible(true);

	let can_end_turn_result = can_end_turn();
	let can_scout_result = can_scout(system_to_render);
	let can_factory_result = can_factory(system_to_render);
	let can_settle_result = can_settle(system_to_render);

	can_end_turn_result.success ? enable(button_end_turn) : disable(button_end_turn);
	can_scout_result.success ? enable(button_scout) : disable(button_scout);
	can_factory_result.success ? enable(button_factory) : disable(button_factory);
	can_settle_result.success ? enable(button_settlement) : disable(button_settlement);

	text_system.setText(["System " + system_to_render.i + " (" + system_to_render.num + ") [" + system_to_render.pd + "]"]);
	text_coordinates.setText(["x:" + Math.floor(system_to_render.x) + " y:" + Math.floor(system_to_render.y)]);
	text_mode_adjacencies.setText(['mode: ' + mode + " / Adjacencies: " + num_new_adjacencies]);
	text_resources.setText(["R:" + resources + " / Turn:" + turn]);
	text_output.setText(["" + latest_result]);

	render_establishments(system_to_render);
}

function render_sidebar_left() {
	text_username.setText([username.slice(0,19)]);
	text_habitable_range.setText(["Habitable Range: " + habitable_range]);
	text_factories_settlements.setText(["Factories: " + num_factories + "\nSettlements: " + num_settlements]);
	button_full_view.setVisible(true);
}

function can_end_turn() {
	if (mode === 'end_turn') {
		return {success:false, reason:"Turn Ended"};
	}
	if (mode === 'discover') {
		return {success:false, reason:"Discovering"};
	}
	return {success:true};
}

function can_scout(system) {
	if (mode === 'end_turn') {
		return {success:false, reason:"Turn Ended"};
	}
	if (system.num > 0) {
		return {success:false, reason:"Already Scouted"};
	}
	if (system.pd != habitable_range) {
		return {success:false, reason:"Did not Discover"};
	}
	if (resources < 1) {
		return {success:false, reason:"Insufficient Resources"};
	}
	return {success:true};
}

function can_factory(system) {
	if (mode === 'end_turn') {
		return {success:false, reason:"Turn Ended"};
	}
	if (system.num === 0) {
		return {success:false, reason:"Not Scouted"};
	}
	if (!(system.num === habitable_range || system.num === ((habitable_range + 4) % 6) + 1)) {
		return {success:false, reason:"Uninhabitable (" + system.num + "!=" + habitable_range + "," + (((habitable_range + 4) % 6) + 1) + ")"};
	}
	let existing = false;
	for (let f = 0; f < system.factories.length; f++) {
		if (factories[system.factories[f]].pe === habitable_range) {
			existing = true;
		}
	}
	if (existing) {
		return {success:false, reason:"System has a " + username + " Factory"};
	}
	if (system.connected.length < 3) {
		return {success:false, reason:"Insufficient Connections (" + system.connected.length + "/3)"};
	}
	if (resources < 3) {
		return {success:false, reason:"Insufficient Resources"};
	}
	return {success:true};
}

function can_settle(system) {
	if (mode === 'end_turn') {
		return {success:false, reason:"Turn Ended"};
	}
	if (system.num === 0) {
		return {success:false, reason:"Not Scouted"};
	}
	if (!(system.num === habitable_range || system.num === ((habitable_range + 6) % 6) + 1)) {
		return {success:false, reason:"Uninhabitable (" + system.num + "!=" + habitable_range + "," + (((habitable_range + 6) % 6) + 1) + ")"};
	}
	let existing = false;
	for (let f = 0; f < system.settlements.length; f++) {
		if (settlements[system.settlements[f]].pe === habitable_range) {
			existing = true;
		}
	}
	if (existing) {
		return {success:false, reason:"System has a " + username + " Settlement"};
	}
	console.log("render_sidebar_right: NO CHECK CURRENTLY DONE TO PREEMPT IF CYCLE ENCLOSES OR NOT");
	if (resources < 3) {
		return {success:false, reason:"Insufficient Resources"};
	}
	return {success:true};
}

function can_enter_full_view() {
	if (mode === 'discover') {
		return {success:false, reason:"X Still Discovering"};
	} else {
		return {success:true};
	}
}

function render_establishments(system_to_render) {
	let settlements_factories_text = "";
	if (system_to_render.settlements.length === 0) {
		settlements_factories_text = "() No Settlements\n";
	} else {
		for (let i = 0; i < system_to_render.settlements.length; i++) {
			let settlement = settlements[system_to_render.settlements[i]];
			settlements_factories_text = settlements_factories_text + "(" + settlement.i + "/" + settlement.pe + ") " + settlement.name + " Settlement\n";
		}
	}
	if (system_to_render.factories.length === 0) {
		settlements_factories_text = settlements_factories_text + "[] No Factories";
	} else {
		for (let i = 0; i < system_to_render.factories.length; i++) {
			let factory = factories[system_to_render.factories[i]];
			settlements_factories_text = settlements_factories_text + "[" + factory.i + "/" + factory.pe + "] " + factory.material + " Factory\n";
		}
	}
	text_establishments.setText(settlements_factories_text);
}

function enable(button) {
	button.enabled = true;
	button.setAlpha(1.0);
}

function disable(button) {
	button.enabled = false;
	button.setAlpha(0.5);
}

//	########
//	SCOUTING
//	########

//randomly assigns an unscouted system a habitability value, changes the texture, and determines a random number of adjacencies.
function scout(system_sprite) {
	if (resources >= 1) {
		send_move({move_type: 'scout_intent', systemi: system_sprite.i});
	} else {
		latest_result = "X Insufficient Resources (" + resources + "/1)";
		render_sidebar_right(selected_system);
		console.log("scout: insufficient resources, aborting move: " + resources);
	}
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
		discovered_point = canvas_to_absolute(system2.x, system2.y, selected_system.x, selected_system.y, camera_zoom)
		send_move({move_type: 'discover_intent', system1i: system1.i, x: discovered_point.x, y: discovered_point.y});
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

//path checker for new adjacencies between systems at (x1, y1) and (x2, y2). Checks if new adjacency is clear of systems. returns sprite if so.
function path(x1, y1, x2, y2) {
	let angle = angleTo(x1, y1, x2, y2);
	let dist = distTo(x1, y1, x2, y2);
	let scale = dist / line_width
	let midx = mid(x1,x2); let midy = mid(y1,y2);
	// let endpoint1 = {x : midx + (Math.cos(angle) * dist / 2), y : (midy + (Math.sin(angle) * dist / 2))};
	// let endpoint2 = {x : midx - (Math.cos(angle) * dist / 2), y : (midy - (Math.sin(angle) * dist / 2))};
	// if (intersects_systems(endpoint1, endpoint2)) {
	// 	//console.log("path: Proposed adjacency intersects existing system!");
	// 	return null;
	// } else {
	let adjacent_path = draw_path(midx, midy, angle, scale, 0.2);
	adjacent_path.setInteractive();
	adjacent_path.on('pointerup', adjacency_tap);
	adjacent_path.on('pointerover', adjacency_hover);
	adjacent_path.on('pointerout', adjacency_out);
	// adjacent_path.endpoint1 = endpoint1;
	// adjacent_path.endpoint2 = endpoint2;
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
		console.log("adjacency_hover: Null Mode");
	} else if (mode === 'discover' || mode === 'end_turn') {
		//console.log("adjacency_hover: Cannot Create Connection While Mode Is: " + mode);
	} else {
		select_adjacency(this);
	}
}

//deselects adjacencies when they are no longer hovered
function adjacency_out(pointer) {
	deselect_adjacency();
}

//tap handler for adjacencies; handles building connections
function adjacency_tap(pointer) {
	console.log("adjacency_tap:")
	// console.log(this);
	if (mode === null) {
		console.log("adjacency_tap: Null Mode");
	} else if (mode === 'discover' || mode === 'end_turn') {
		console.log("adjacency_hover: Cannot Create Connection While Mode Is: " + mode);
	} else {
		if (this === selected_adjacency_sprite) {
			connect(this);
		} else {
			console.log("adjacency_tap: Tapped unhovered adjacency?");
		}
	}
}

//visual changes for adjacency selection
function select_adjacency(adjacency_sprite) {
	if (adjacency_sprite != null && adjacency_sprite.path_type === 'adjacent') {
		// console.log("selecting " + JSON.stringify(adjacencies[adjacency_sprite.i]));
		deselect_adjacency();
		selected_adjacency_sprite = adjacency_sprite;
		adjacency_sprite.setTint(range_to_color(habitable_range));
	}
}

//broadly deselecting any adjacencies, resetting visual changes
function deselect_adjacency() {
	if (selected_adjacency_sprite != null) {
		// console.log("deselecting " + JSON.stringify(adjacencies[selected_adjacency_sprite.i]));
		if (adjacencies[selected_adjacency_sprite.i].connection) {
			selected_adjacency_sprite.clearTint();
			selected_adjacency_sprite.setTint(range_to_color(adjacencies[selected_adjacency_sprite.i].pc));
		} else {
			selected_adjacency_sprite.clearTint();
		}
	}
	selected_adjacency_sprite = null;
}

//turns an adjacency into a connection between adjacent, unconnected, in-network, discovered systems and checks the connection does not violate intersection rules with the existing connection network.
function connect(adjacency_sprite) {
	// console.log(adjacencies);
	// console.log(adjacency_sprite.i);
	if (resources >= 2) {
		send_move({move_type: 'connect_intent', adjacencyi: adjacency_sprite.i});
	} else {
		console.log("connect: insufficient resources, aborting move: " + resources);
		render_sidebar_right(selected_system);
		latest_result = "X Insufficient Resources (" + resources + "/2)";
	}
}

function convert_to_connection(adjacency_sprite) {
	// console.log("convert_to_connection: " + JSON.stringify(adjacencies[adjacency_sprite.i]));
	adjacency_sprite.clearAlpha();
	adjacency_sprite.clearTint();
	adjacency_sprite.setTint(range_to_color(adjacencies[adjacency_sprite.i].pc));
	adjacency_sprite.path_type = 'connected';
}

function establish_factory(system_sprite) {
	if (resources >= 3) {
		send_move({move_type: 'establish_intent', systemi: system_sprite.i, establish_type: 'factory'});
	} else {
		latest_result = "X Insufficient Resources (" + resources + "/3)";
		render_sidebar_right(selected_system);
		console.log("establish_factory: insufficient resources, aborting move: " + resources);
	}
}

function establish_settlement(system_sprite) {
	if (resources >= 3) {
		send_move({move_type: 'establish_intent', systemi: system_sprite.i, establish_type: 'settlement'});
	} else {
		latest_result = "X Insufficient Resources (" + resources + "/3)";
		render_sidebar_right(selected_system);
		console.log("establish_settlement: insufficient resources, aborting move: " + resources);
	}
}

function range_to_color(range) {
	if (range === 1) { //RED
		return 0xff0000;
	} else if (range === 2) { //ORANGE
		return 0xff8800;
	} else if (range === 3) { //YELLOW
		return 0xffff00;
	} else if (range === 4) { //GREEN
		return 0x00ff00;
	} else if (range === 5) { //BLUE
		return 0x0000ff;
	} else if (range === 6) { //PURPLE
		return 0xff00ff;
	}
}

function range_to_hover(range) {
	//return 0x00ffff;
	if (range === 1) { //RED
		return 0xff7777;
	} else if (range === 2) { //ORANGE
		return 0xffddbb;
	} else if (range === 3) { //YELLOW
		return 0xffffcc;
	} else if (range === 4) { //GREEN
		return 0xccffcc;
	} else if (range === 5) { //BLUE
		return 0x7777ff;
	} else if (range === 6) { //PURPLE
		return 0xffccff;
	}
}

function max_min(x, y) {
	console.log("Max and Min previously: (" + minX + "<->" + maxX + "), (" + minY + "<->" + maxY + ")");
	if (x > maxX) { maxX = x; }
	if (x < minX) { minX = x; }
	if (y > maxY) { maxY = y; }
	if (y < minY) { minY = y; }
	console.log("Max and Min updated to (" + minX + "<->" + maxX + "), (" + minY + "<->" + maxY + ")");
}