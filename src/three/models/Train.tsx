import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { animated, easings, to, useSpring } from "@react-spring/three";
import { useTrainContext } from "../state/TrainContext";
import { useLivery } from "../state/LiveryContext";
import useClickable from "../hooks/useClickable";
import usePopIn from "../hooks/usePopIn";
import Driver, {
  DRIVER_HEIGHT,
  DRIVER_LEANING_LEDGE,
  type DriverHandle,
} from "./Driver";
import Locomotive, { CAB_FLOOR, CAB_SILL, RAIL_TOP } from "./Locomotive";

// Driver standing in the cab, in world units (its height and place along
// it; across it, see driverX), and size in world units per driver unit
// (see Station for the matching size on the platform).
const DRIVER_Y = CAB_FLOOR;
const DRIVER_Z = -0.58;
const DRIVER_SCALE = 0.53;
const DRIVER_SWAP_DELAY_MS = 250;
// In the workshop, the driver turns from the track toward the camera (on
// +x, see CUSTOM_CAMERAS) by this much, radians, to show off the outfit.
const WORKSHOP_DRIVER_TURN = 1.1;
// While the locomotive is being repainted, the driver leans on the cab's
// sill on the camera's side, facing out (+x), dreamy (see Driver's
// LEANING): this far over, so that the sill is where the pose expects it.
// The pose is worked out for a sill DRIVER_LEANING_LEDGE.height above the
// cab floor, (CAB_SILL.top - CAB_FLOOR) / DRIVER_SCALE: keep the two in
// step.
const LEANING_DRIVER_X =
  CAB_SILL.x - DRIVER_LEANING_LEDGE.edge * DRIVER_SCALE;
const LEANING_DRIVER_TURN = Math.PI / 2;
// On the way, the pointer's target for the driver, wider than it: an
// unseen box round its head and shoulders over the sill, in driver units,
// so that the pointer doesn't keep slipping off the little figure (the
// cursor flickering) as it sways along. Left out in the workshop, where
// the driver is seen up close.
const DRIVER_HITBOX = {
  width: 0.8,
  depth: 0.7,
  bottom: DRIVER_LEANING_LEDGE.height,
  top: DRIVER_HEIGHT + 0.1,
};
// Repainted, the locomotive squashes down on its wheels by this much and
// springs back.
const REPAINT_SQUASH = 0.08;
const SPRINGY = { mass: 1, tension: 380, friction: 9 };
// Clicked, the locomotive hops like a soft toy (milliseconds, world units
// and vertical stretch, 1 at rest): crouches, springs up stretched, comes
// down stretched still, squashes flat on the rails and wobbles back into
// shape. Not with reduced motion.
const HOP = {
  crouch: 0.86,
  crouchMs: 110,
  height: 0.7,
  rise: 1.1,
  riseMs: 260,
  fall: 1.06,
  fallMs: 220,
  land: 0.8,
  landMs: 70,
};
// One timed step of the hop, to `hop` and `lift`.
const hopStep = (
  hop: number,
  lift: number,
  ms: number,
  easing: (t: number) => number,
) => ({ hop, lift, config: { duration: ms, easing } });

export default function Train() {
  const { mode, workshopView, trainHopRef } = useTrainContext();
  const { livery, outfit } = useLivery();
  const scale = usePopIn();
  const driverRef = useRef<DriverHandle>(null);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Picks in the workshop (see ui/Workshop), not the first render: a new
  // livery gives the locomotive a little bounce, a new outfit has the
  // driver turn to the camera to show it off.
  const [{ squash }, squashApi] = useSpring(() => ({ squash: 1 }));
  // The hop's own height and stretch, on top of that.
  const [{ lift, hop }, hopApi] = useSpring(() => ({ lift: 0, hop: 1 }));
  const stretch = to([squash, hop], (a, b) => a * b);
  // Bulging out as much as it squashes, like a soft toy.
  const bulge = stretch.to((y) => 1 + (1 - y) / 2);
  // Handed on to the smoke (see TrainHop).
  useFrame(() => {
    const pose = trainHopRef.current;
    pose.lift = lift.get();
    pose.stretch = stretch.get();
    pose.bulge = bulge.get();
  });
  const hoppingRef = useRef(false);
  const trainClick = useClickable(!reducedMotion, () => {
    if (hoppingRef.current) return;
    hoppingRef.current = true;
    const hopping = hopApi.start({
      to: [
        hopStep(HOP.crouch, 0, HOP.crouchMs, easings.easeOutQuad),
        hopStep(HOP.rise, HOP.height, HOP.riseMs, easings.easeOutCubic),
        hopStep(HOP.fall, 0, HOP.fallMs, easings.easeInQuad),
        hopStep(HOP.land, 0, HOP.landMs, easings.easeOutQuad),
        { hop: 1, lift: 0, config: SPRINGY },
      ],
    });
    Promise.all(hopping).then(() => {
      hoppingRef.current = false;
    });
  });
  const shownLiveryRef = useRef(livery);
  useEffect(() => {
    if (shownLiveryRef.current === livery) return;
    shownLiveryRef.current = livery;
    if (reducedMotion) return;
    squashApi.start({
      from: { squash: 1 - REPAINT_SQUASH },
      to: { squash: 1 },
      config: SPRINGY,
    });
  }, [livery, reducedMotion, squashApi]);
  const shownOutfitRef = useRef(outfit);
  useEffect(() => {
    if (shownOutfitRef.current === outfit) return;
    shownOutfitRef.current = outfit;
    driverRef.current?.glance();
  }, [outfit]);

  // While the train waits at a stop the driver steps off (onto the
  // platform, see Station, or to the desk, see Home): pop out of the cab,
  // then back in once the other one has gone.
  const stopped = mode === "stopped";
  const { driverScale } = useSpring({
    driverScale: stopped ? 0 : DRIVER_SCALE,
    delay: stopped ? 0 : DRIVER_SWAP_DELAY_MS,
    // Overshoots on the way in only: clamped, it doesn't dip below 0 and
    // bounce back on the way out.
    config: {
      mass: 1,
      tension: 260,
      friction: 12,
      precision: 0.001,
      clamp: stopped,
    },
  });
  // In the workshop: leaning on the sill while the locomotive is shown,
  // up and turned to the camera while the driver is.
  const workshop = mode === "custom";
  const leaning = workshop && workshopView === "train";
  const { driverTurn, driverX } = useSpring({
    driverTurn: leaning
      ? LEANING_DRIVER_TURN
      : workshop
        ? WORKSHOP_DRIVER_TURN
        : 0,
    driverX: leaning ? LEANING_DRIVER_X : 0,
    immediate: reducedMotion,
    config: { mass: 1, tension: 120, friction: 16 },
  });

  // Clicked while in the cab, the driver waves, up and turned to the camera
  // in the workshop, or looks at it, leaning on the sill there (its arms
  // folded on it) or at the controls on the way.
  const driverClick = useClickable(!stopped, () => {
    if (workshop && !leaning) driverRef.current?.wave();
    else driverRef.current?.glance();
  });

  return (
    <animated.group scale={scale} {...trainClick}>
      {/* Squashed about the rails, so the wheels stay on them, and lifted
          off them hopping. */}
      <animated.group
        position-y={lift.to((y) => RAIL_TOP + y)}
        scale-x={bulge}
        scale-y={stretch}
        scale-z={bulge}
      >
        <group position-y={-RAIL_TOP}>
          <Locomotive>
            <animated.group
              position-x={driverX}
              position-y={DRIVER_Y}
              position-z={DRIVER_Z}
              scale={driverScale}
              rotation-y={driverTurn}
            >
              <group {...driverClick}>
                <Driver ref={driverRef} outfit={outfit} leaning={leaning} />
                {!workshop && (
                  <mesh
                    visible={false}
                    position-y={(DRIVER_HITBOX.bottom + DRIVER_HITBOX.top) / 2}
                  >
                    <boxGeometry
                      args={[
                        DRIVER_HITBOX.width,
                        DRIVER_HITBOX.top - DRIVER_HITBOX.bottom,
                        DRIVER_HITBOX.depth,
                      ]}
                    />
                  </mesh>
                )}
              </group>
            </animated.group>
          </Locomotive>
        </group>
      </animated.group>
    </animated.group>
  );
}
