import type { Stop, WorkshopView } from "../state/TrainContext";

export type Vec3 = [number, number, number];

// Initial camera position, on the -x side of the track, looking at the train.
export const CAMERA_POSITION: Vec3 = [
  -5.552903814384558, 1.0595020092319951, -0.09906038769694253,
];

// Low sun behind the train, warm dusk mood. Also lights the smoke shader.
export const SUN_POSITION: Vec3 = [-30, 6, -20];

// Image-based lighting for the standard materials (a halved copy of drei's
// "sunset" preset, served from public/).
export const ENVIRONMENT_MAP = "/hdri/sunset.hdr";

// Face of every text in the scene (drei <Text>, which reads woff but not
// woff2): the HTML board's font-mono.
export const SCENE_FONT = "/fonts/geist-mono-600.woff";

// Length of one rails.glb tile once resized (see ScrollingTiles): the forest
// tiles scroll in the same units.
export const RAIL_TILE_LENGTH = 12.5;

// `offset`, if any, is camera-controls' focal offset (the camera moved
// right, down and back, in world units): it slides the picture without
// turning it.
export type CameraShot = { position: Vec3; target: Vec3; offset?: Vec3 };

// One shot per mode, where CameraControls.setLookAt() animates to (see
// TrainScene). Framed with CameraControls in #debug mode, read off the
// "Camera" monitor.
export const RIDE_CAMERA: CameraShot = {
  position: CAMERA_POSITION,
  target: [0, 0, 0],
};

// Station shots, in order:
// 1. STATION_CAMERA, wide, while the train pulls in and just after it stops.
// 2. STATION_VIEW_CAMERA, STOP_SETTLE_MS after the stop: three-quarter
//    view over the train onto the station, where the board can be clicked.
// 3. BOARD_CAMERA once the board is clicked, back to 2 on "× Fermer".
export const STATION_CAMERA: CameraShot = {
  position: [-2.4, 1.2, -1.2],
  target: [1.6, 0.0, 1.0],
};

export const STOP_SETTLE_MS = 300;

export const STATION_VIEW_CAMERA: CameraShot = {
  position: [0.409, 0.663, -1.572],
  target: [2.154, 0.153, -0.719],
};

// Square to the board, near enough for its rows to read, with the driver
// propped against its side. Update with STATION_BOARD / STATION_DRIVER.
export const BOARD_CAMERA: CameraShot = {
  position: [1.675, 0.151, 1.086],
  target: [3.106, 0.119, 1.086],
};

// Below this width (px), Tailwind's `sm`, the screen is a phone's: the
// panels are sheets over the bottom, and the stops have their own shots.
export const PHONE_BREAKPOINT = 640;

// The station on phones: further back and higher, the driver and the board
// in view so they can still be tapped. Then the board, whole.
export const STATION_PHONE_CAMERA: CameraShot = {
  position: [0.697, 0.985, -3.512],
  target: [2.981, 0.191, -1.121],
};

export const BOARD_PHONE_CAMERA: CameraShot = {
  position: [1.319, 0.155, 0.934],
  target: [3.106, 0.115, 0.934],
};

// Home shots, same sequence as the station's 1 and 2. The view leaves the
// desk in the part of the frame the about panel doesn't cover. Update with
// HOME_DESK. Keep HOME_CAMERA close to STATION_CAMERA: Forest's cull zone
// is sized from the latter.
export const HOME_CAMERA: CameraShot = {
  position: [-2.4, 1.3, -1.6],
  target: [2.6, 0.1, 0.4],
};

export const HOME_VIEW_CAMERA: CameraShot = {
  position: [0.798, 0.63, -1.054],
  target: [3.767, -0.124, 0.311],
};

// The home on phones: from high above the track, the terrace and the desk
// slid by the offset into the room above the bottom sheet.
export const HOME_PHONE_CAMERA: CameraShot = {
  position: [0.56, 2.116, 1.403],
  target: [3.977, -0.005, -0.226],
  offset: [0, 1.133, 0],
};

type StopShots = { arrival: CameraShot; view: CameraShot; phone: CameraShot };

export const STOP_CAMERAS: Record<Stop, StopShots> = {
  station: {
    arrival: STATION_CAMERA,
    view: STATION_VIEW_CAMERA,
    phone: STATION_PHONE_CAMERA,
  },
  home: {
    arrival: HOME_CAMERA,
    view: HOME_VIEW_CAMERA,
    phone: HOME_PHONE_CAMERA,
  },
};

// In the workshop the camera faces the low sun, which phones' wider view
// brings into the frame: the sky's glow (mie) and the bloom ease down by
// these shares, at GLARE_EASING (exponential, per second).
export const WORKSHOP_GLARE = { mie: 0.85, bloom: 0.7 };
export const GLARE_EASING = 3;

// The workshop, one shot per tab: the whole locomotive side on, or close on
// the driver through the cab's side. Framed for the whole screen, then
// pulled back and shifted to fit beside the panel (WORKSHOP_FRAME).
export const CUSTOM_CAMERAS: Record<WorkshopView, CameraShot> = {
  train: {
    position: [3.0, 0.85, 0.6],
    target: [0, -0.05, -0.1],
  },
  driver: {
    position: [1.25, 0.7, 0.0],
    target: [0, 0.12, -0.6],
  },
};

// Vertical field of view, in degrees. Screens narrower than FIT_ASPECT
// (portrait) widen it to see as wide as a FIT_ASPECT screen would, up to
// MAX_FOV (see fittedFov in TrainScene).
export const CAMERA_FOV = 45;
export const FIT_ASPECT = 1;
export const MAX_FOV = 70;

// The room the workshop's panel takes, in step with its classes
// (ui/Workshop): a card `width` px wide (margin included) on the right, or
// on phones a sheet over the bottom `sheet` share of the height. Then the
// size, in world units, each shot's subject needs in the rest. The train's
// is a little short of its length, so on phones its buffers may be cut
// rather than the camera backing into the forest.
export const WORKSHOP_FRAME: {
  width: number;
  sheet: number;
  subject: Record<WorkshopView, { width: number; height: number }>;
} = {
  width: 404,
  sheet: 0.5,
  subject: {
    train: { width: 2.1, height: 1.4 },
    driver: { width: 0.8, height: 0.6 },
  },
};

// Approach to a stop (see useStopApproach). The train stays at z = 0 and
// the world scrolls: a stop appears STOP_DISTANCE ahead, and the train
// brakes so the platform's centre stops at z = 0 after ARRIVE_DURATION
// seconds. On departure, the stop is hidden once past STOP_EXIT_Z.
export const STOP_DISTANCE = 14;
export const ARRIVE_DURATION = 1.6;
export const STOP_EXIT_Z = -40;

// At a stop, the fittings pop in one after the other with this spring, this
// far apart, and so do the hints at the click (see StationHints).
export const POP_SPRING = {
  mass: 1,
  tension: 220,
  friction: 9,
  precision: 0.001,
};
export const POP_STAGGER_MS = 70;

// At a stop the driver leaves the cab and pops up on the platform or at
// the desk this long after, with this spring (see Train, Station, Home).
export const DRIVER_SWAP_DELAY_MS = 250;
export const DRIVER_SPRING = {
  mass: 1,
  tension: 260,
  friction: 12,
  precision: 0.001,
};

// Both stops stand on the side of the track opposite the camera, out to
// STOP_CLEAR_X (the station's roof is the furthest): Forest keeps that side
// clear out to there. STOP_HALF_LENGTH is half a stop's length along the
// track, stairs included: small details may grow by the track, and shrink
// away within it of a stop in sight.
export const STOP_SIDE = -Math.sign(CAMERA_POSITION[0]);
export const STOP_CLEAR_X = 5.6;
export const STOP_HALF_LENGTH = 2.8;

// Station (models/StationDecor) in its ground frame (origin at the platform
// centre, at track level; x across the track, + away from it; z along it):
// scale in world units per station unit, edgeX = x of the platform's
// track-side edge, z = shift along the track.
export const STATION_PLACEMENT = {
  scale: 0.17,
  edgeX: -0.7,
  z: 0,
};

// Departures board (models/StationBoard) on the platform, parallel to it,
// in the station's ground frame. lift = gap between the ground and the
// board's bottom edge (the platform is about 0.27 high). Rotations in
// radians, about the board's feet: yaw from facing the track squarely, then
// tilt (+ tips the top forward) and roll in the board's own frame.
export const STATION_BOARD = {
  x: -0.41,
  z: 0.85,
  lift: 0.45,
  yaw: 0,
  tilt: 0,
  roll: 0,
  scale: 0.28,
};

// Driver on the platform (models/Station): standing left of the board, or
// once it's open, propped against its right side, turned from facing +z by
// `propped.yaw` (any further toward the camera, it would hide the board's
// rows in BOARD_CAMERA). scale in world units per driver unit.
export const STATION_DRIVER = {
  standing: { x: -0.45, z: -0.9 },
  propped: { yaw: -0.35 },
  scale: 0.55,
};

// Home (models/HomeDecor), in world units per home unit: the station's
// scale, so the props they share are the same size.
export const HOME_SCALE = 0.17;

// Desk on the home terrace (models/Home), the driver sitting at it, in the
// halt's ground frame (as STATION_BOARD's). yaw turns the driver and the
// desk from facing +z (negative: toward the track, so the camera sees the
// driver three-quarter on).
export const HOME_DESK = {
  x: 0.95,
  z: -0.2,
  yaw: -0.64,
  scale: 0.55,
};
