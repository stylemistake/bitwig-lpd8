loadAPI(1);

load("lib/helpers.js");
load("lib/lpd8.js");

host.defineController(
	"stylemistake", "Akai LPD8",
	"0.1", "CF55D6D0-A1A2-11E3-A5E2-0800200C9A66"
);
host.defineMidiPorts( 1, 1 );
host.addDeviceNameBasedDiscoveryPair( ["LPD8 MIDI 1"], ["LPD8 MIDI 1"] );
host.addDeviceNameBasedDiscoveryPair( ["LPD8"], ["LPD8"] );

var controller, transport, userctl, tracks, application;

function init() {
	// Initialize

	// Set note input for regular pads
	host.getMidiInPort(0).createNoteInput( "LPD8", "80????" );
	host.getMidiInPort(0).createNoteInput( "LPD8", "90????" );

	controller = new LPD8(
		host.getMidiInPort(0),
		host.getMidiOutPort(0)
	);

	application = host.createApplication();
	transport = host.createTransport();
	tracks = host.createTrackBank( 2, 0, 1 );
	userctl = host.createUserControlsSection( 64 );

	// -------------------------------------------------------------------
	//  User mappings
	// -------------------------------------------------------------------
	
	for ( var i = 0; i < 32; i += 1 ) {
		userctl.getControl(i).setLabel( "Knob " + (i>>3+1) + "-" + (i&7+1) );
	}
	controller.setEventCallback( "knob", function( id, value ) {
		userctl.getControl( id ).set( value, 128 );
	});


	// -------------------------------------------------------------------
	//  Clip launcher
	// -------------------------------------------------------------------

	// Actions
	controller.setEventCallback( "cc", function( id, value ) {
		if ( value !== 0 ) {
			var led_current = controller.getControlLed( id + 4 );
			if ( inRange( id, 0, 1 ) ) {
				if ( led_current === 1 ) controller.setControlLed( id + 4, 2 );
				return tracks.getTrack( id ).stop();
			}
			if ( inRange( id, 4, 5 ) ) {
				return tracks.getTrack( id - 4 ).getClipLauncherSlots().launch(0);
			}
			if ( id === 7 ) return tracks.scrollScenesUp();
			if ( id === 3 ) return tracks.scrollScenesDown();
			// if ( id === 2 ) return tracks.scrollTracksUp();
			// if ( id === 6 ) return tracks.scrollTracksDown();
			if ( id === 6 ) return tracks.launchScene(0);
			if ( id === 2 ) return tracks.getClipLauncherScenes().stop();
		}
	});

	// Led feedback for clips
	for ( var i = 0; i < 2; i += 1 ) (function( i, slots ) {
		slots.setIndication( true );
		var state = 0;
		slots.addIsPlayingObserver( function( slot, is_playing ) {
			controller.setControlLed( i + 4, state = is_playing ? 1 : 0 );
		});
		slots.addIsQueuedObserver( function( slot, is_queued ) {
			controller.setControlLed( i + 4, is_queued ? 2 : state );
		});
	})( i, tracks.getTrack(i).getClipLauncherSlots() );

	// Rewrite presets on LPD8
	host.getMidiOutPort(0).sendSysex(
		"F0 47 7F 75 61 00 3A 01 00 24 00 40 00 25 01 41" +
		"00 26 02 42 00 27 03 43 00 28 04 44 00 29 05 45" +
		"00 2A 06 46 00 2B 07 47 00 20 00 7F 21 00 7F 22" +
		"00 7F 23 00 7F 24 00 7F 25 00 7F 26 00 7F 27 00" +
		"7F F7 F0 47 7F 75 61 00 3A 02 00 2C 00 48 00 2D" +
		"01 49 00 2E 02 4A 00 2F 03 4B 00 30 04 4C 00 31" +
		"05 4D 00 32 06 4E 00 33 07 4F 00 28 00 7F 29 00" +
		"7F 2A 00 7F 2B 00 7F 2C 00 7F 2D 00 7F 2E 00 7F" +
		"2F 00 7F F7 F0 47 7F 75 61 00 3A 03 00 34 00 50" +
		"00 35 01 51 00 36 02 52 00 37 03 53 00 38 04 54" +
		"00 39 05 55 00 3A 06 56 00 3B 07 57 00 30 00 7F" +
		"31 00 7F 32 00 7F 33 00 7F 34 00 7F 35 00 7F 36" +
		"00 7F 37 00 7F F7 F0 47 7F 75 61 00 3A 04 00 3C" +
		"00 58 00 3D 01 59 00 3E 02 5A 00 3F 03 5B 00 40" +
		"04 5C 00 41 05 5D 00 42 06 5E 00 43 07 5F 00 38" +
		"00 7F 39 00 7F 3A 00 7F 3B 00 7F 3C 00 7F 3D 00" +
		"7F 3E 00 7F 3F 00 7F F7"
	);

	// Select first preset
	setTimeout( function() {
		host.getMidiOutPort(0).sendSysex("F0 47 7F 75 62 00 01 01 F7");
		host.showPopupNotification("LPD8 plugged in");
	}, 80 );
}

function exit() {
	// Clean up mess after Bitwig
	tracks.getTrack(0).getClipLauncherSlots().setIndication( false );
	tracks.getTrack(1).getClipLauncherSlots().setIndication( false );
}
