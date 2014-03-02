load("helpers.js");
load("dispatcher.js");
load("events.js");

function LPD8( midi_in, midi_out ) {

	var self = this;


	// -------------------------------------------------------------------
	//  Initialization
	// -------------------------------------------------------------------

	var config = {};
	var state = {
		"led": {
			"pad": [],
			"cc": []
		}
	};

	var dispatcher = new Dispatcher( midi_out, 250 );
	var events = new Events();

	this.setEventCallback = events.setCallback;

	function __init__() {
		self.clear();
		midi_in.setMidiCallback( onMidi );
		midi_in.setSysexCallback( onSysex );
		return self;
	}

	this.stop = function() {
		self.clear();
		dispatcher.stop();
		return self;
	}


	// -------------------------------------------------------------------
	//  MIDI handlers
	// -------------------------------------------------------------------

	function onMidi( status, data1, data2 ) {
		if ( isControl( status ) && inRange( data1, 0x20, 0x3f ) ) {
			return events.fire( "knob", data1 - 0x20, data2 );
		}
		if ( isControl( status ) && inRange( data1, 0x40, 0x5f ) ) {
			if ( state.led.cc[ data1 - 0x40 ] === 1 ) dispatcher.send( 0xb0, data1, 1 );
			return events.fire( "cc", data1 - 0x40, data2 );
		}
		if ( isNote( status ) && inRange( data1, 0x24, 0x43 ) ) {
			if ( state.led.pad[ data1 - 0x24 ] === 1 ) dispatcher.send( 0xb0, data1, 1 );
			return events.fire( "pad", status, data1, data2 );
		}
		printMidi( status, data1, data2 );
	}

	function onSysex( data ) {
		printSysex( data );
	}



	// -------------------------------------------------------------------
	//  Public methods
	// -------------------------------------------------------------------

	this.clear = function() {
		for ( var i = 0; i < 32; i++ ) self.setControlLed( i, 0 );
		for ( var i = 0; i < 32; i++ ) self.setPadLed( i, 0 );
		return self;
	}

	this.getControlLed = function( id ) {
		return state.led.cc[id];
	}

	this.setControlLed = function( id, value ) {
		// Blinking led [2]
		if ( value === 2 ) {
			if ( state.led.cc[id] === 2 ) return;
			state.led.cc[id] = value;
			return (function loop( led ) {
				if ( state.led.cc[id] !== 2 ) return;
				dispatcher.send( 0xb0, 0x40 + id, led );
				setTimeout( loop, 130, [(led+1)&1] );
			})(0);
		}
		// Simple on/off [1/0]
		state.led.cc[id] = value &= 1;
		dispatcher.send( 0xb0, 0x40 + id, value );
	}

	this.getPadLed = function( id ) {
		return state.led.pad[id];
	}

	this.setPadLed = function( id, value ) {
		// Blinking led [2]
		if ( value === 2 ) {
			if ( state.led.pad[id] === 2 ) return;
			state.led.pad[id] = value;
			return (function loop( led ) {
				if ( state.led.pad[id] !== 2 ) return;
				dispatcher.send( 0x90, 0x24 + id, led );
				setTimeout( loop, 130, [(led+1)&1] );
			})(0);
		}
		// Simple on/off [1/0]
		state.led.pad[id] = value &= 1;
		dispatcher.send( 0x90, 0x24 + id, value );
	}

	__init__();
}