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

// Rough placeholder aimed at the cab where Driver sits (Train.tsx). Needs
// tuning live in the browser (`/proto/train#debug`, orbit with
// CameraControls then read its position/target) — Driver's actual world
// position depends on the Resize/Center/Float chain around it, which can't
// be derived analytically from its local offset alone.
export const ABOUT_CAMERA: CameraShot = {
  position: [-1.6, 1.4, -1.1],
  target: [0.03, 0.75, -1.46],
};
