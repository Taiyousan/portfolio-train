import type { Stop } from "../state/TrainContext";

export type Vec3 = [number, number, number];

// Initial camera position, on the -x side of the track, looking at the train.
export const CAMERA_POSITION: Vec3 = [
  -5.552903814384558, 1.0595020092319951, -0.09906038769694253,
];

// Low sun behind the train, warm dusk mood. Also lights the smoke shader.
export const SUN_POSITION: Vec3 = [-30, 6, -20];

export type CameraShot = { position: Vec3; target: Vec3 };

// One shot per mode: where CameraControls.setLookAt() animates to. See
// docs/proto-train.md's state machine.
export const RIDE_CAMERA: CameraShot = {
  position: CAMERA_POSITION,
  target: [0, 0, 0],
};

// Station shots, in order (see TrainScene):
// 1. STATION_CAMERA, wide, while the train pulls in and just after it stops:
//    the locomotive, the platform and its departures board.
// 2. STATION_VIEW_CAMERA, STOP_SETTLE_MS after the stop: three-quarter
//    view over the train onto the station, where the board can be clicked.
// 3. BOARD_CAMERA once the board is clicked, back to 2 on "× Fermer".
// All tuned live via the Leva "Camera (lecture seule)" monitor.
export const STATION_CAMERA: CameraShot = {
  position: [-2.4, 1.2, -1.2],
  target: [1.6, 0.0, 1.0],
};

export const STOP_SETTLE_MS = 300;

export const STATION_VIEW_CAMERA: CameraShot = {
  position: [-2.73, 1.73, -2.981],
  target: [2.071, 0.307, -0.47],
};

// Square to the board, near enough for its rows to read, with the driver
// sitting beside it. Update with STATION_BOARD / STATION_DRIVER.
export const BOARD_CAMERA: CameraShot = {
  position: [0.996, 0.268, 1.23],
  target: [3.298, 0.216, 1.23],
};

// Home shots, same sequence as the station's 1 and 2: HOME_CAMERA wide while
// the train pulls in, then HOME_VIEW_CAMERA from above the train onto the
// terrace, the desk on the left of the frame (the about panel covers the
// right on larger screens). Update with HOME_DESK. Keep HOME_CAMERA close
// to STATION_CAMERA: Forest's cull zone (trees shrunk away in front of the
// lens while stopping) is sized from it.
export const HOME_CAMERA: CameraShot = {
  position: [-2.4, 1.3, -1.6],
  target: [2.6, 0.1, 0.4],
};

export const HOME_VIEW_CAMERA: CameraShot = {
  position: [1.6, 0.38, -0.55],
  target: [3.8, -0.06, 0.25],
};

// Wide (arrival) and settled shot of each stop.
type StopShots = { arrival: CameraShot; view: CameraShot };

export const STOP_CAMERAS: Record<Stop, StopShots> = {
  station: { arrival: STATION_CAMERA, view: STATION_VIEW_CAMERA },
  home: { arrival: HOME_CAMERA, view: HOME_VIEW_CAMERA },
};

// "custom" mode: close on the cab where Driver stands (Train.tsx), tuned
// live in the browser via the Leva "Camera (lecture seule)" monitor.
export const CUSTOM_CAMERA: CameraShot = {
  position: [1.641, 0.636, 0.048],
  target: [0.016, 0.05, -0.426],
};

// Approach to a stop (see hooks/useStopApproach), the same for both. The
// train stays at z = 0 and the world scrolls, so a stop is placed by its own
// z: it appears STOP_DISTANCE ahead, the train brakes so the platform
// centre stops at z = 0 after ARRIVE_DURATION seconds. On departure the train
// just eases back to its cruise speed; the stop is hidden once past
// STOP_EXIT_Z.
export const STOP_DISTANCE = 14;
export const ARRIVE_DURATION = 1.6;
export const STOP_EXIT_Z = -40;

// Both stops are on the side of the track opposite the camera, and reach out
// to STOP_CLEAR_X from it (the station's roof, at its back, is the
// furthest). Forest keeps every prop off that side out to there, their
// whole width (foliage, bush) included, so nothing grows into a stop,
// whatever the scroll position.
export const STOP_SIDE = -Math.sign(CAMERA_POSITION[0]);
export const STOP_CLEAR_X = 5.6;

// Station (models/StationDecor) in its ground frame (origin at the platform
// centre, at track level; x across the track, + away from it; z along it):
// scale in world units per station unit, edgeX = x of the platform's
// track-side edge, z = shift along the track. Tunable in the Leva "Gare"
// group.
export const STATION_PLACEMENT = {
  scale: 0.17,
  edgeX: -0.7,
  z: 0,
};

// Departures board (models/StationBoard), standing on the platform in front
// of the canopy, a real board's size, parallel to the platform. In the
// station's ground frame (same as STATION_PLACEMENT): x across the track
// (+ away from it), z along it, lift = gap between the ground and the
// board's bottom edge (the platform is about 0.27 high). Rotations
// in radians, about the board's feet: yaw = turn from facing the track
// squarely, then tilt (+ tips the top forward) and roll in the board's own
// frame. Tunable in the Leva "Tableau" group (degrees there).
export const STATION_BOARD = {
  x: -0.41,
  z: 0.85,
  lift: 0.4,
  yaw: 0,
  tilt: 0,
  roll: 0,
  scale: 0.45,
};

// Driver on the platform while the train waits (models/Station), in the
// platform's frame (x across it, + away from the track; z along it):
// standing left of the board in STATION_VIEW_CAMERA, sitting on the edge
// right of it once the board is open, so BOARD_CAMERA frames both. scale in
// world units per driver unit (same on-screen size as in the cab, where
// Train's Resize applies its own).
export const STATION_DRIVER = {
  standing: { x: -0.45, z: -0.9 },
  sitting: { z: 1.65 },
  scale: 0.55,
};

// Desk on the home terrace (models/Home), with the driver sitting at it, cap
// off, typing. In the halt's ground frame (origin at the platform centre, at
// track level): x across the track (+ away from it), z along it. yaw turns
// the driver and the desk from facing +z, in radians (negative: toward the
// track, so the camera sees the driver three-quarter on). scale in
// world units per driver unit, as STATION_DRIVER.scale. Tunable in the Leva
// "Maison" group (degrees there).
export const HOME_DESK = {
  x: 0.95,
  z: -0.2,
  yaw: -0.64,
  scale: 0.55,
};
