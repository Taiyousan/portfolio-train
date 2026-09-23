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

// Close on the cab where Driver stands (Train.tsx), tuned live in the
// browser via the Leva "Camera (lecture seule)" monitor.
export const ABOUT_CAMERA: CameraShot = {
  position: [1.641, 0.636, 0.048],
  target: [0.016, 0.05, -0.426],
};
