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
// 2. STATION_VIEW_CAMERA, STATION_SETTLE_MS after the stop: facing the
//    platform, where the board can be clicked.
// 3. BOARD_CAMERA once the board is clicked, back to 2 on "× Fermer".
// All tuned live via the Leva "Camera (lecture seule)" monitor.
export const STATION_CAMERA: CameraShot = {
  position: [-2.4, 1.2, -1.2],
  target: [1.6, 0.0, 1.0],
};

export const STATION_SETTLE_MS = 300;

export const STATION_VIEW_CAMERA: CameraShot = {
  position: [0.247, 0.491, 0.067],
  target: [1.938, 0.415, 0.061],
};

// Square to the board, near enough for its rows to read, with the driver
// sitting beside it. Update with STATION_BOARD / STATION_DRIVER.
export const BOARD_CAMERA: CameraShot = {
  position: [0.996, 0.268, 1.23],
  target: [3.298, 0.216, 1.23],
};

// Close on the cab where Driver stands (Train.tsx), tuned live in the
// browser via the Leva "Camera (lecture seule)" monitor.
export const ABOUT_CAMERA: CameraShot = {
  position: [1.641, 0.636, 0.048],
  target: [0.016, 0.05, -0.426],
};

// Navigation planks (models/NavSigns), floating on the right of the frame
// (+z is screen-right from the ride camera) so the train stays clear.
// Stacked top-down from NAV_SIGNS_ORIGIN, NAV_SIGNS_GAP apart. All tunable
// live in the Leva "Panneaux" group.
export const NAV_SIGNS: { id: string; label: string }[] = [
  { id: "projets", label: "Projets" },
  { id: "about", label: "À propos" },
];
export const NAV_SIGNS_ORIGIN: Vec3 = [-4.35, 1, 0.5];
export const NAV_SIGNS_GAP = 0.25;
export const NAV_SIGNS_SCALE = 0.4;

// Station approach (see hooks/useStationApproach). The train stays at z = 0
// and the world scrolls, so the station is placed by its own z: it appears
// STATION_DISTANCE ahead, the train brakes so the platform centre stops at
// z = 0 after ARRIVE_DURATION seconds. On departure the train just eases back
// to its cruise speed; the station is hidden once past STATION_EXIT_Z.
export const STATION_DISTANCE = 14;
export const ARRIVE_DURATION = 1.6;
export const STATION_EXIT_Z = -40;

// The station is on the side of the track opposite the camera. Forest keeps
// every prop off that side out to STATION_CLEAR_X so nothing grows in or
// around the station, whatever the scroll position.
export const STATION_SIDE = -Math.sign(CAMERA_POSITION[0]);
export const STATION_CLEAR_X = 5.5;

// Departures board (models/StationBoard), standing on the platform under
// the canopy, a real board's size, parallel to the platform. In the
// station's ground frame (origin at the platform centre, at track level):
// x across the track (+ away from it), z along it, lift = gap between the
// ground and the board's bottom edge (the platform is 0.35 high). Rotations
// in radians, about the board's feet: yaw = turn from facing the track
// squarely, then tilt (+ tips the top forward) and roll in the board's own
// frame. Tunable in the Leva "Tableau" group (degrees there).
export const STATION_BOARD = {
  x: -0.41,
  z: 0.85,
  lift: 0.47,
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
