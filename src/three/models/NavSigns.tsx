import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { animated, useSpring } from "@react-spring/three";
import { useControls } from "leva";
import * as THREE from "three";
import { useTrainContext, type TrainMode } from "../state/TrainContext";
import {
  NAV_SIGNS,
  NAV_SIGNS_GAP,
  NAV_SIGNS_ORIGIN,
  NAV_SIGNS_SCALE,
  RIDE_CAMERA,
} from "../config/scene";

const BOARD_LENGTH = 1.1;
const BOARD_HEIGHT = 0.36;
const BOARD_DEPTH = 0.05;
const TEXTURE_SIZE = [512, 168] as const;

// Wooden plank with the label burnt in, drawn once per sign. The text lives
// on the model (it turns with the board, unlike an HTML overlay). The HTML
// buttons in the overlay remain the accessible way to navigate.
function makeSignTexture(label: string) {
  const [w, h] = TEXTURE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#a9794c";
  ctx.fillRect(0, 0, w, h);
  // Grain: long, slightly wavy darker and lighter streaks along the plank.
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * h;
    const amp = 1 + Math.random() * 3;
    ctx.strokeStyle =
      Math.random() < 0.6
        ? `rgba(70, 40, 20, ${0.1 + Math.random() * 0.2})`
        : `rgba(220, 170, 120, ${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) {
      ctx.lineTo(x, y + Math.sin(x / 70 + i) * amp);
    }
    ctx.stroke();
  }
  // Frame, then the burnt-in label.
  ctx.strokeStyle = "rgba(50, 28, 14, 0.55)";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = "#2c1a0e";
  ctx.font = "700 62px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), w / 2, h / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

type SignProps = {
  label: string;
  position: [number, number, number];
  size: number;
  phase: number;
  visible: boolean;
  delay: number;
  onSelect: () => void;
};

// Idle float (bob in world units, sway in radians) and hover feedback (step
// toward the camera in world units, relative scale gain).
const FLOAT_BOB = 0.04;
const FLOAT_SWAY = 0.09;
const HOVER_ADVANCE = 0.05;
const HOVER_SCALE = 0.08;

// A plank floating beside the track. Pops in/out with the same elastic
// spring as the station, floats gently, and springs forward when hovered.
function Sign({
  label,
  position,
  size,
  phase,
  visible,
  delay,
  onSelect,
}: SignProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => makeSignTexture(label), [label]);
  useEffect(() => () => texture.dispose(), [texture]);

  const [{ scale }, api] = useSpring(() => ({
    scale: 0,
    config: { mass: 1, tension: 220, friction: 9, precision: 0.001 },
  }));
  useEffect(() => {
    api.start({ scale: visible ? 1 : 0, delay: visible ? delay : 0 });
  }, [visible, delay, api]);

  // Hover: an elastic scale-up plus a step toward the camera (-x).
  const [{ hover }, hoverApi] = useSpring(() => ({
    hover: 0,
    config: { mass: 1, tension: 260, friction: 10, precision: 0.001 },
  }));

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime + phase;
    // Yaw that turns the label face (-x) toward the ride camera.
    const faceYaw = Math.atan2(
      RIDE_CAMERA.position[2] - position[2],
      position[0] - RIDE_CAMERA.position[0],
    );
    group.position.y = Math.sin(t * 1.1) * FLOAT_BOB;
    group.rotation.y = faceYaw + Math.sin(t * 1.4) * FLOAT_SWAY;
    group.rotation.z = Math.sin(t * 1.9) * FLOAT_SWAY * 0.4;
  });

  const setHover = (value: boolean) => {
    setHovered(value);
    hoverApi.start({ hover: value ? 1 : 0 });
    document.body.style.cursor = value && visible ? "pointer" : "";
  };
  // Never leave a pointer cursor or a hovered look behind if the sign goes
  // away while hovered.
  useEffect(() => {
    if (!visible) {
      hoverApi.start({ hover: 0 });
      document.body.style.cursor = "";
    }
  }, [visible, hoverApi]);

  return (
    <animated.group position={position} scale={scale}>
      <animated.group
        position-x={hover.to((h) => -HOVER_ADVANCE * h)}
        scale={hover.to((h) => size * (1 + HOVER_SCALE * h))}
      >
        <group ref={groupRef}>
          <mesh
            castShadow
            onClick={(e) => {
              if (!visible) return;
              e.stopPropagation();
              onSelect();
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(true);
            }}
            onPointerOut={() => setHover(false)}
          >
            <boxGeometry args={[BOARD_DEPTH, BOARD_HEIGHT, BOARD_LENGTH]} />
            <meshStandardMaterial
              color="#8a5f3a"
              roughness={0.85}
              emissive="#ffb56b"
              emissiveIntensity={hovered && visible ? 0.35 : 0}
            />
          </mesh>
          {/* Label face, toward the camera (-x). */}
          <mesh
            position={[-BOARD_DEPTH / 2 - 0.002, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <planeGeometry args={[BOARD_LENGTH, BOARD_HEIGHT]} />
            <meshStandardMaterial
              map={texture}
              roughness={0.85}
              emissive="#ffb56b"
              emissiveMap={texture}
              emissiveIntensity={hovered && visible ? 0.35 : 0}
            />
          </mesh>
        </group>
      </animated.group>
    </animated.group>
  );
}

const SIGN_MODES: Record<string, TrainMode> = {
  projets: "arriving",
  about: "about",
};

// Navigation planks, shown only while riding. They drive the same `mode` as
// the HTML overlay buttons, which stay as the accessible fallback.
export default function NavSigns() {
  const { mode, setMode } = useTrainContext();
  const { x, y, z, gap, size } = useControls("Panneaux", {
    x: { value: NAV_SIGNS_ORIGIN[0], min: -5, max: 0, step: 0.05 },
    y: { value: NAV_SIGNS_ORIGIN[1], min: -0.5, max: 2.5, step: 0.05 },
    z: { value: NAV_SIGNS_ORIGIN[2], min: -3, max: 3, step: 0.05 },
    gap: { value: NAV_SIGNS_GAP, min: 0, max: 1.5, step: 0.05 },
    size: { value: NAV_SIGNS_SCALE, min: 0.3, max: 2.5, step: 0.05 },
  });

  return (
    <>
      {NAV_SIGNS.map((sign, i) => (
        <Sign
          key={sign.id}
          label={sign.label}
          position={[x, y - i * gap, z]}
          size={size}
          phase={i * 1.7}
          visible={mode === "ride"}
          delay={i * 120}
          onSelect={() => setMode(SIGN_MODES[sign.id])}
        />
      ))}
    </>
  );
}
