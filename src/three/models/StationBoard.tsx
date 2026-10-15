import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { claimPointer, releasePointer } from "../state/pointerCursor";
import useFlapText from "../hooks/useFlapText";
import useHintReveal from "../hooks/useHintReveal";
import { departureTime, ROW_FLAP_DELAY_MS } from "../config/departures";
import type { StationProject } from "../ui/types";
import { snowy } from "../shaders/snow";
import { SCENE_FONT } from "../config/scene";
import { RoundedBox, STATION_COLORS } from "./StationPrimitives";
import useReducedMotion from "../hooks/useReducedMotion";

// The face, in the --board* tokens' palette (globals.css), like its HTML
// twin. The woodwork around it takes the station's colours.
const COLORS = {
  board: "#16140f",
  flap: "#26231c",
  flapHover: "#3a3526",
  hinge: "#050504",
  ink: "#f5c542",
  inkDim: "#b39540",
  glow: "#ffb56b",
};

// Its claims on the pointer cursor (see pointerCursor).
const BOARD = "board";
const CLOSE_BUTTON = "board-close";

// Frame glow inviting a click while the board isn't open: a beat between
// these intensities, quick to flare and slow to fade (steady with reduced
// motion), brighter on hover, bright enough for the bloom.
const GLOW_MIN = 0.25;
const GLOW_MAX = 2.4;
const GLOW_HOVER = 3;
const GLOW_SPEED = 3.2;
// Meanwhile a glowing arrow floats over the roof, pointing down at the
// board, bobbing in time with the glow (still with reduced motion). One of
// the glowing hints (see useHintReveal). In board units, radians and per
// second.
const ARROW = {
  lift: 0.42,
  bob: 0.07,
  sway: 0.45,
  swaySpeed: 1.1,
  glowMin: 0.6,
  glowMax: 2.2,
};
const CLOSE_WIDTH = 0.44;
const CLOSE_HEIGHT = 0.17;

// Layout, in board units (scaled in Station). It faces +z in its own frame.
const WIDTH = 2.8;
const PADDING = 0.1;
const HEADER_HEIGHT = 0.3;
const ROW_HEIGHT = 0.2;
const ROW_GAP = 0.025;
// The woodwork: a rounded wooden frame, round posts and a little pitched
// roof.
const FRAME = 0.09;
const DEPTH = 0.12;
const RIM_DEPTH = 0.04;
const RIM_BEVEL = 0.02;
const POST_RADIUS = 0.045;
const ROOF = { pitch: 0.45, half: 0.26, thickness: 0.05, overhang: 0.12 };
const TIME_WIDTH = 0.34;
const TITLE_SIZE = 0.075;
const SMALL_SIZE = 0.04;
const INSET = 0.04;
// Depth offsets between the stacked flat layers, so they never z-fight,
// even from the ride camera far away. Rows are offset from the face, their
// text and hinge from the row.
const LAYER = { frame: 0.01, flap: 0.012, text: 0.008, hinge: 0.014 };
// Height, within a row, of the time + destination line; the flap's hinge
// runs through it.
const MAIN_Y = 0.025;
// Once the board is open, titles start settling as the camera arrives.
const FLAP_START_MS = 350;
// Then each row's technos light up once its title has roughly settled,
// with a neon-tube flicker: [ms from start, opacity] steps, the last one
// held. Off at once when the board closes.
const LIGHT_DELAY_MS = 450;
const LIGHT_FLICKER: [number, number][] = [
  [0, 1],
  [60, 0.15],
  [120, 1],
  [170, 0.4],
  [230, 1],
];
const HINT_SIZE = 0.055;
// The click hint pulses with the frame glow, between this opacity and full
// (full on hover).
const HINT_MIN_OPACITY = 0.1;

const FLAP_WIDTH = WIDTH - 2 * PADDING;
const LEFT = -FLAP_WIDTH / 2 + INSET;
const RIGHT = FLAP_WIDTH / 2 - INSET;
const TITLE_X = LEFT + TIME_WIDTH;
const TITLE_MAX_WIDTH = RIGHT - TITLE_X;

// The rim's outer front corners, in board units, for the driver to lean
// against (see Station).
export const STATION_BOARD_SIDE = {
  x: WIDTH / 2 + FRAME + RIM_BEVEL,
  front: RIM_DEPTH + RIM_BEVEL,
};

export function stationBoardHeight(rows: number) {
  return 2 * PADDING + HEADER_HEIGHT + rows * ROW_HEIGHT + (rows - 1) * ROW_GAP;
}

// A rounded rectangle centred on the origin, traced into `path`.
function roundedRect<T extends THREE.Path>(
  path: T,
  width: number,
  height: number,
  radius: number,
) {
  const x = -width / 2;
  const y = -height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
}

// The frame's rim: a rounded ring around the board face, extruded toward the
// viewer with a soft bevel.
function useRimGeometry(height: number) {
  return useMemo(() => {
    const shape = roundedRect(
      new THREE.Shape(),
      WIDTH + 2 * FRAME,
      height + 2 * FRAME,
      FRAME,
    );
    shape.holes.push(roundedRect(new THREE.Path(), WIDTH, height, 0.02));
    return new THREE.ExtrudeGeometry(shape, {
      depth: RIM_DEPTH,
      bevelEnabled: true,
      bevelThickness: RIM_BEVEL,
      bevelSize: RIM_BEVEL,
      bevelSegments: 3,
      curveSegments: 6,
    });
  }, [height]);
}

// A chunky arrow pointing down, centred on the origin, extruded and
// bevelled so it reads as a rounded toy, like the station's props.
function useArrowGeometry() {
  return useMemo(() => {
    const shaft = 0.075;
    const head = 0.2;
    const shape = new THREE.Shape()
      .moveTo(-shaft, 0.2)
      .lineTo(shaft, 0.2)
      .lineTo(shaft, 0)
      .lineTo(head, 0)
      .lineTo(0, -0.2)
      .lineTo(-head, 0)
      .lineTo(-shaft, 0)
      .closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 4,
    });
    geometry.center();
    return geometry;
  }, []);
}

// The troika mesh behind drei's <Text>; its fillOpacity applies on the next
// render, without re-laying out the text.
type FadeText = THREE.Mesh & { fillOpacity: number };

type RowProps = {
  project: StationProject;
  index: number;
  y: number;
  active: boolean;
  onSelect: () => void;
};

// One departure, the flap's hinge line through it as on a real split-flap
// board. Its title keeps flipping until the board is open, then settles.
function Row({ project, index, y, active, onSelect }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const title = useFlapText(
    project.title.toUpperCase(),
    FLAP_START_MS + index * ROW_FLAP_DELAY_MS,
    active,
  );
  // Hover only shows while the rows can be picked (board open); till then
  // the board's own hover takes over.
  const lit = hovered && active;
  useEffect(() => {
    if (!lit) return;
    const owner = `row-${index}`;
    claimPointer(owner, "ui");
    return () => releasePointer(owner);
  }, [lit, index]);

  // Technos, lit only while the board is open.
  const lightRefs = useRef<(FadeText | null)[]>([]);
  const lightStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  useFrame(({ clock }) => {
    const now = clock.elapsedTime * 1000;
    if (!active) lightStart.current = null;
    else if (lightStart.current === null) {
      lightStart.current =
        now + FLAP_START_MS + index * ROW_FLAP_DELAY_MS + LIGHT_DELAY_MS;
    }
    const t = lightStart.current === null ? -1 : now - lightStart.current;
    let opacity = 0;
    if (t >= 0) {
      opacity = 1;
      if (!reducedMotion) {
        for (const [at, value] of LIGHT_FLICKER) if (t >= at) opacity = value;
      }
    }
    for (const text of lightRefs.current) {
      if (!text) continue;
      text.fillOpacity = opacity;
      text.visible = opacity > 0;
    }
  });

  return (
    <group position={[0, y, LAYER.flap]}>
      <mesh
        onClick={(e) => {
          // Board not open yet: let the click through, it opens the board.
          if (!active) return;
          e.stopPropagation();
          onSelect();
        }}
        // No stopPropagation: the board's own hover (glow) needs it too.
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[FLAP_WIDTH, ROW_HEIGHT]} />
        <meshStandardMaterial
          color={lit ? COLORS.flapHover : COLORS.flap}
          roughness={0.6}
        />
      </mesh>

      <Text
        font={SCENE_FONT}
        position={[LEFT, MAIN_Y, LAYER.text]}
        fontSize={TITLE_SIZE}
        anchorX="left"
        anchorY="middle"
        color={COLORS.ink}
      >
        {departureTime(index)}
      </Text>
      <Text
        font={SCENE_FONT}
        position={[TITLE_X, MAIN_Y, LAYER.text]}
        fontSize={TITLE_SIZE}
        anchorX="left"
        anchorY="middle"
        whiteSpace="nowrap"
        clipRect={[0, -ROW_HEIGHT, TITLE_MAX_WIDTH, ROW_HEIGHT]}
        color={COLORS.ink}
      >
        {title}
      </Text>
      <Text
        font={SCENE_FONT}
        position={[TITLE_X, -0.055, LAYER.text]}
        fontSize={SMALL_SIZE}
        anchorX="left"
        anchorY="middle"
        whiteSpace="nowrap"
        clipRect={[0, -ROW_HEIGHT, TITLE_MAX_WIDTH, ROW_HEIGHT]}
        color={COLORS.inkDim}
        ref={(text: FadeText | null) => {
          lightRefs.current[0] = text;
        }}
        visible={false}
      >
        {project.technos.join(" · ").toUpperCase()}
      </Text>

      <mesh position={[0, MAIN_Y, LAYER.hinge]}>
        <planeGeometry args={[FLAP_WIDTH, 0.006]} />
        <meshBasicMaterial color={COLORS.hinge} />
      </mesh>
    </group>
  );
}

// "× Fermer" on the open board's header: back to the station's wide shot.
function CloseButton({
  position,
  onClose,
}: {
  position: [number, number, number];
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    claimPointer(CLOSE_BUTTON, "ui");
    return () => releasePointer(CLOSE_BUTTON);
  }, [hovered]);
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[CLOSE_WIDTH, CLOSE_HEIGHT]} />
        <meshStandardMaterial
          color={hovered ? COLORS.flapHover : COLORS.flap}
          roughness={0.6}
        />
      </mesh>
      <Text
        font={SCENE_FONT}
        position={[0, 0, LAYER.text]}
        fontSize={0.06}
        anchorX="center"
        anchorY="middle"
        color={COLORS.ink}
      >
        × FERMER
      </Text>
    </group>
  );
}

type Props = ThreeElements["group"] & {
  projects: StationProject[];
  // Height of the two legs below the board, in board units.
  legHeight: number;
};

// Split-flap departures board on the platform, one row per project. At the
// station its frame glows to invite a click, which zooms the camera onto
// it; there, rows open their project's dialog, and "× Fermer" or Escape
// zoom back out. Its HTML twin (ui/DeparturesBoard) lists the same rows for
// the keyboard and screen readers.
export default function StationBoard({ projects, legHeight, ...props }: Props) {
  const {
    mode,
    stop,
    selectedSlug,
    setSelectedSlug,
    boardFocused,
    setBoardFocused,
  } = useTrainContext();
  const atStation = mode === "stopped" && stop === "station";
  const open = atStation && boardFocused;
  const inviting = atStation && !open;
  const height = stationBoardHeight(projects.length);
  const top = height / 2;
  const headerY = top - PADDING - HEADER_HEIGHT / 2;
  const rim = useRimGeometry(height);
  const roofWidth = WIDTH + 2 * FRAME + 2 * ROOF.overhang;
  const ridgeY = top + FRAME + ROOF.half * Math.sin(ROOF.pitch) + 0.02;

  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const hintRef = useRef<FadeText>(null);
  const arrow = useArrowGeometry();
  const arrowRef = useRef<THREE.Mesh>(null);
  const arrowMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const arrowSize = useHintReveal(arrowRef);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    // Squared: a quick flare, then a longer fade.
    const pulse = reducedMotion
      ? 0.5
      : (0.5 + 0.5 * Math.sin(time * GLOW_SPEED)) ** 2;
    const material = frameMaterialRef.current;
    if (material) {
      material.emissiveIntensity = !inviting
        ? 0
        : hovered
          ? GLOW_HOVER
          : GLOW_MIN + (GLOW_MAX - GLOW_MIN) * pulse;
    }
    const hint = hintRef.current;
    if (hint) {
      hint.fillOpacity =
        !inviting || hovered || reducedMotion
          ? 1
          : HINT_MIN_OPACITY + (1 - HINT_MIN_OPACITY) * pulse;
    }
    const arrowMesh = arrowRef.current;
    const arrowMaterial = arrowMaterialRef.current;
    if (arrowMesh && arrowMaterial) {
      const shown = arrowSize.get();
      // Gone, it's also hidden, so it can't catch the pointer.
      arrowMesh.visible = shown > 0.01;
      arrowMesh.scale.setScalar(Math.max(shown, 0));
      // Lowest as the glow flares, as if tapping on the roof.
      arrowMesh.position.y =
        ridgeY + ARROW.lift + (reducedMotion ? 0 : ARROW.bob * (1 - pulse));
      arrowMesh.rotation.y = reducedMotion
        ? 0
        : ARROW.sway * Math.sin(time * ARROW.swaySpeed);
      arrowMaterial.emissiveIntensity = hovered
        ? ARROW.glowMax
        : ARROW.glowMin + (ARROW.glowMax - ARROW.glowMin) * pulse;
    }
  });

  // Escape zooms back out, unless it's closing a project dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedSlug === null) setBoardFocused(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, selectedSlug, setBoardFocused]);

  // A pointer cursor over all of it while it invites a click.
  const pointing = inviting && hovered;
  useEffect(() => {
    if (!pointing) return;
    claimPointer(BOARD);
    return () => releasePointer(BOARD);
  }, [pointing]);

  return (
    <group
      {...props}
      onClick={(e) => {
        if (!inviting) return;
        e.stopPropagation();
        setBoardFocused(true);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Wooden back, the face, and the rim around it, which glows. */}
      <RoundedBox
        args={[WIDTH + 2 * FRAME, height + 2 * FRAME, DEPTH]}
        radius={0.04}

        position={[0, 0, -DEPTH / 2 - LAYER.frame]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          {...snowy}
          color={STATION_COLORS.darkWood}
          roughness={0.8}
        />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[WIDTH, height]} />
        <meshStandardMaterial color={COLORS.board} roughness={0.8} />
      </mesh>
      <mesh geometry={rim} castShadow receiveShadow>
        <meshStandardMaterial
          {...snowy}
          ref={frameMaterialRef}
          color={STATION_COLORS.wood}
          emissive={COLORS.glow}
          emissiveIntensity={0}
          roughness={0.7}
        />
      </mesh>

      {/* The arrow over the roof: part of the board, for clicks and hover. */}
      <mesh
        ref={arrowRef}
        geometry={arrow}
        position={[0, ridgeY + ARROW.lift, -DEPTH / 2]}
        visible={false}
      >
        <meshStandardMaterial
          ref={arrowMaterialRef}
          color={COLORS.ink}
          emissive={COLORS.ink}
          emissiveIntensity={ARROW.glowMin}
          roughness={0.4}
        />
      </mesh>

      {/* Little pitched roof. */}
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[
            0,
            ridgeY - (ROOF.half / 2) * Math.sin(ROOF.pitch),
            -DEPTH / 2 + side * (ROOF.half / 2) * Math.cos(ROOF.pitch),
          ]}
          rotation-x={side * ROOF.pitch}
        >
          <RoundedBox
            args={[roofWidth, ROOF.thickness, ROOF.half + 0.04]}
            radius={0.02}

            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              {...snowy}
              color={STATION_COLORS.roof}
              roughness={0.75}
            />
          </RoundedBox>
        </group>
      ))}
      <mesh
        position={[0, ridgeY + 0.01, -DEPTH / 2]}
        rotation-z={Math.PI / 2}
        castShadow
      >
        <cylinderGeometry args={[0.03, 0.03, roofWidth + 0.02, 12]} />
        <meshStandardMaterial
          {...snowy}
          color={STATION_COLORS.darkWood}
          roughness={0.7}
        />
      </mesh>
      {/* Fills the gap between the frame's top and the roof. */}
      <RoundedBox
        args={[WIDTH + 2 * FRAME, ridgeY - top - FRAME, DEPTH]}
        radius={0.02}

        position={[
          0,
          (ridgeY + top + FRAME) / 2 - 0.01,
          -DEPTH / 2 - LAYER.frame,
        ]}
        castShadow
      >
        <meshStandardMaterial
          {...snowy}
          color={STATION_COLORS.darkWood}
          roughness={0.8}
        />
      </RoundedBox>

      {/* Round wooden posts, on flared feet */}
      {[-1, 1].map((side) => {
        const x = side * (WIDTH / 2 - 0.3);
        return (
          <group key={side} position={[x, -top, -DEPTH / 2]}>
            <mesh position={[0, -legHeight / 2, 0]} castShadow>
              <cylinderGeometry
                args={[POST_RADIUS, POST_RADIUS, legHeight, 12]}
              />
              <meshStandardMaterial
                {...snowy}
                color={STATION_COLORS.darkWood}
                roughness={0.7}
              />
            </mesh>
            <mesh position={[0, -legHeight + 0.03, 0]} castShadow>
              <cylinderGeometry
                args={[POST_RADIUS * 1.4, POST_RADIUS * 2, 0.06, 12]}
              />
              <meshStandardMaterial
                {...snowy}
                color={STATION_COLORS.darkWood}
                roughness={0.7}
              />
            </mesh>
          </group>
        );
      })}

      <Text
        font={SCENE_FONT}
        position={[LEFT - INSET + 0.01, headerY, LAYER.flap + LAYER.text]}
        fontSize={0.12}
        letterSpacing={0.15}
        anchorX="left"
        anchorY="middle"
        color={COLORS.ink}
      >
        MES PROJETS
      </Text>
      {open ? (
        <CloseButton
          position={[
            RIGHT + INSET - 0.01 - CLOSE_WIDTH / 2,
            headerY,
            LAYER.flap,
          ]}
          onClose={() => setBoardFocused(false)}
        />
      ) : (
        <Text
          font={SCENE_FONT}
          position={[RIGHT + INSET - 0.01, headerY, LAYER.flap + LAYER.text]}
          fontSize={HINT_SIZE}
          anchorX="right"
          anchorY="middle"
          color={COLORS.ink}
          ref={hintRef}
        >
          CLIQUEZ POUR EN VOIR DAVANTAGE
        </Text>
      )}

      {projects.map((project, i) => (
        <Row
          key={project.slug}
          project={project}
          index={i}
          y={
            top -
            PADDING -
            HEADER_HEIGHT -
            ROW_HEIGHT / 2 -
            i * (ROW_HEIGHT + ROW_GAP)
          }
          active={open}
          onSelect={() => setSelectedSlug(project.slug)}
        />
      ))}
    </group>
  );
}
