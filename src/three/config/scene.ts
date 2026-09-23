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

// Framing while the train pulls into and waits at the station, tuned live
// via the Leva "Camera (lecture seule)" monitor.
export const STATION_CAMERA: CameraShot = {
  position: [-2.369, 0.646, -0.228],
  target: [-0.157, 0.067, 0.519],
};

// Close on the cab where Driver stands (Train.tsx), tuned live in the
// browser via the Leva "Camera (lecture seule)" monitor.
export const ABOUT_CAMERA: CameraShot = {
  position: [1.641, 0.636, 0.048],
  target: [0.016, 0.05, -0.426],
};

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
