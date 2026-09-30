import { useEffect, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/three";
import { useTrainContext } from "../state/TrainContext";
import { useLivery } from "../state/LiveryContext";
import usePopIn from "../hooks/usePopIn";
import Driver, { type DriverHandle } from "./Driver";
import Locomotive, { CAB_FLOOR, RAIL_TOP } from "./Locomotive";

// Driver standing in the cab, in world units, and size in world units per
// driver unit (see Station for the matching size on the platform).
const DRIVER_POSITION: [number, number, number] = [0, CAB_FLOOR, -0.58];
const DRIVER_SCALE = 0.53;
const DRIVER_SWAP_DELAY_MS = 250;
// In the workshop, the driver turns from the track toward the camera (on
// +x, see CUSTOM_CAMERAS) by this much, radians, to show off the outfit.
const WORKSHOP_DRIVER_TURN = 1.1;
// Repainted, the locomotive squashes down on its wheels by this much and
// springs back.
const REPAINT_SQUASH = 0.08;

export default function Train() {
  const { mode, setMode } = useTrainContext();
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
  // Bulging out as much as it squashes, like a soft toy.
  const bulge = squash.to((y) => 1 + (1 - y) / 2);
  const shownLiveryRef = useRef(livery);
  useEffect(() => {
    if (shownLiveryRef.current === livery) return;
    shownLiveryRef.current = livery;
    if (reducedMotion) return;
    squashApi.start({
      from: { squash: 1 - REPAINT_SQUASH },
      to: { squash: 1 },
      config: { mass: 1, tension: 380, friction: 9 },
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
    config: { mass: 1, tension: 260, friction: 12, precision: 0.001 },
  });
  const { driverTurn } = useSpring({
    driverTurn: mode === "custom" ? WORKSHOP_DRIVER_TURN : 0,
    immediate: reducedMotion,
    config: { mass: 1, tension: 120, friction: 16 },
  });

  // The driver is only clickable while riding: don't leave a pointer cursor
  // behind once the click has switched modes.
  useEffect(() => {
    if (mode !== "ride") document.body.style.cursor = "";
  }, [mode]);

  return (
    <animated.group scale={scale}>
      {/* Squashed about the rails, so the wheels stay on them. */}
      <animated.group
        position-y={RAIL_TOP}
        scale-x={bulge}
        scale-y={squash}
        scale-z={bulge}
      >
        <group position-y={-RAIL_TOP}>
          <Locomotive>
            {/* Clicking the driver while riding opens the workshop
                ("custom" mode, see ui/Workshop). */}
            <animated.group
              position={DRIVER_POSITION}
              scale={driverScale}
              rotation-y={driverTurn}
            >
              <Driver
                ref={driverRef}
                outfit={outfit}
                onClick={(e) => {
                  if (mode !== "ride") return;
                  e.stopPropagation();
                  setMode("custom");
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  if (mode === "ride") document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "";
                }}
              />
            </animated.group>
          </Locomotive>
        </group>
      </animated.group>
    </animated.group>
  );
}
