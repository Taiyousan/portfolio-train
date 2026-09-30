import { useEffect } from "react";
import { animated, useSpring } from "@react-spring/three";
import { useTrainContext } from "../state/TrainContext";
import usePopIn from "../hooks/usePopIn";
import Driver from "./Driver";
import Locomotive, { CAB_FLOOR } from "./Locomotive";

// Driver standing in the cab, in world units, and size in world units per
// driver unit (see Station for the matching size on the platform).
const DRIVER_POSITION: [number, number, number] = [0, CAB_FLOOR, -0.58];
const DRIVER_SCALE = 0.53;
const DRIVER_SWAP_DELAY_MS = 250;

export default function Train() {
  const { mode, setMode } = useTrainContext();
  const scale = usePopIn();

  // While the train waits at a stop the driver steps off (onto the
  // platform, see Station, or to the desk, see Home): pop out of the cab,
  // then back in once the other one has gone.
  const stopped = mode === "stopped";
  const { driverScale } = useSpring({
    driverScale: stopped ? 0 : DRIVER_SCALE,
    delay: stopped ? 0 : DRIVER_SWAP_DELAY_MS,
    config: { mass: 1, tension: 260, friction: 12, precision: 0.001 },
  });

  // The driver is only clickable while riding: don't leave a pointer cursor
  // behind once the click has switched modes.
  useEffect(() => {
    if (mode !== "ride") document.body.style.cursor = "";
  }, [mode]);

  return (
    <animated.group scale={scale}>
      <Locomotive>
        {/* Clicking the driver while riding closes in on the cab
            ("custom" mode, a placeholder for a future activity). */}
        <animated.group position={DRIVER_POSITION} scale={driverScale}>
          <Driver
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
    </animated.group>
  );
}
