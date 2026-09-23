export type Vec3 = [number, number, number];

// Initial camera position, on the -x side of the track, looking at the train.
export const CAMERA_POSITION: Vec3 = [
  -5.552903814384558, 1.0595020092319951, -0.09906038769694253,
];

// Low sun behind the train, warm dusk mood. Also lights the smoke shader.
export const SUN_POSITION: Vec3 = [-30, 6, -20];
