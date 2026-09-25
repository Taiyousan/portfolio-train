import { useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import useFlapText from "../hooks/useFlapText";
import {
  departureTime,
  ROW_FLAP_DELAY_MS,
  trainLine,
} from "../config/departures";
import type { StationProject } from "../ui/types";

// Troika (drei <Text>) reads woff/ttf/otf, not woff2. Same face as the HTML
// board's font-mono.
const FONT = "/fonts/geist-mono-600.woff";

// Same palette as the --board* tokens in globals.css, so the 3D board and
// its HTML twin look alike.
const COLORS = {
  frame: "#0b0a08",
  board: "#16140f",
  flap: "#26231c",
  flapHover: "#3a3526",
  hinge: "#050504",
  ink: "#f5c542",
  inkDim: "#b39540",
  glow: "#ffb56b",
};

// Frame glow inviting a click while the board isn't open: a slow pulse
// between these intensities (steady halfway with reduced motion), brighter
// on hover.
const GLOW_MIN = 0.15;
const GLOW_MAX = 0.6;
const GLOW_HOVER = 1.4;
const GLOW_SPEED = 2.2;
const CLOSE_WIDTH = 0.44;
const CLOSE_HEIGHT = 0.17;

// Board layout, in board units (the whole board is scaled in Station). The
// board faces +z in its own frame; Station turns it toward the track.
const WIDTH = 2.8;
const PADDING = 0.1;
const HEADER_HEIGHT = 0.3;
const ROW_HEIGHT = 0.2;
const ROW_GAP = 0.025;
const FRAME = 0.05;
const DEPTH = 0.08;
const TIME_WIDTH = 0.34;
const LINE_WIDTH = 0.52;
const TITLE_SIZE = 0.075;
const SMALL_SIZE = 0.04;
const INSET = 0.04;
// Depth offsets between the stacked flat layers, in board units: each one
// sits clearly in front of the one below so they never z-fight, even from
// the ride camera far away. Rows are offset from the face, their text and
// hinge from the row.
const LAYER = { frame: 0.01, flap: 0.012, text: 0.008, hinge: 0.014 };
// Height, within a row, of the time + destination line; the flap's hinge
// runs through it.
const MAIN_Y = 0.025;
// Once the board is open, titles start settling as the camera arrives.
const FLAP_START_MS = 350;
// Then each row's technos and train line light up, once its title has
// roughly settled, with a short neon-tube flicker: [ms from start, opacity]
// steps, the last one held. Off at once when the board closes.
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
const TITLE_MAX_WIDTH = RIGHT - LINE_WIDTH - TITLE_X - INSET;

export function stationBoardHeight(rows: number) {
  return 2 * PADDING + HEADER_HEIGHT + rows * ROW_HEIGHT + (rows - 1) * ROW_GAP;
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

// One departure. The flap's dark hinge line runs through the time and
// destination, as on a real split-flap board. Its title keeps flipping
// until the board is open, then settles.
function Row({ project, index, y, active, onSelect }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const title = useFlapText(
    project.title.toUpperCase(),
    FLAP_START_MS + index * ROW_FLAP_DELAY_MS,
    active,
  );
  // Hover only shows while the rows are pickable (board open); the stray
  // pointer cursor is reset on mode change by Train.
  const lit = hovered && active;

  // Technos and train line, lit only while the board is open.
  const lightRefs = useRef<(FadeText | null)[]>([]);
  const lightStart = useRef<number | null>(null);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
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

  const setHover = (value: boolean) => {
    setHovered(value);
    document.body.style.cursor = value && active ? "pointer" : "";
  };

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
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[FLAP_WIDTH, ROW_HEIGHT]} />
        <meshStandardMaterial
          color={lit ? COLORS.flapHover : COLORS.flap}
          roughness={0.6}
        />
      </mesh>

      <Text
        font={FONT}
        position={[LEFT, MAIN_Y, LAYER.text]}
        fontSize={TITLE_SIZE}
        anchorX="left"
        anchorY="middle"
        color={COLORS.ink}
      >
        {departureTime(index)}
      </Text>
      <Text
        font={FONT}
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
        font={FONT}
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
      <Text
        font={FONT}
        position={[RIGHT, 0.055, LAYER.text]}
        fontSize={SMALL_SIZE}
        anchorX="right"
        anchorY="middle"
        color={COLORS.inkDim}
        ref={(text: FadeText | null) => {
          lightRefs.current[1] = text;
        }}
        visible={false}
      >
        {trainLine(project.type).toUpperCase()}
      </Text>
      <Text
        font={FONT}
        position={[RIGHT, -0.035, LAYER.text]}
        fontSize={SMALL_SIZE}
        anchorX="right"
        anchorY="middle"
        color={COLORS.inkDim}
      >
        {`VOIE ${index + 1}`}
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
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[CLOSE_WIDTH, CLOSE_HEIGHT]} />
        <meshStandardMaterial
          color={hovered ? COLORS.flapHover : COLORS.flap}
          roughness={0.6}
        />
      </mesh>
      <Text
        font={FONT}
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

// Split-flap departures board on the station platform, one row per
// project. At the station its frame glows to invite a click, which zooms
// the camera onto it (BOARD_CAMERA, see TrainScene); there, rows open their
// project's detail (the HTML dialog), and "× Fermer" or Escape zoom back
// out. The HTML board in ui/DeparturesBoard lists the same rows for
// keyboard, screen readers and phones.
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

  const [hovered, setHovered] = useState(false);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const hintRef = useRef<FadeText>(null);
  useFrame(({ clock }) => {
    const pulse = reducedMotion
      ? 0.5
      : 0.5 + 0.5 * Math.sin(clock.elapsedTime * GLOW_SPEED);
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

  return (
    <group
      {...props}
      onClick={(e) => {
        if (!inviting) return;
        e.stopPropagation();
        setBoardFocused(true);
        document.body.style.cursor = "";
      }}
      onPointerOver={() => {
        setHovered(true);
        if (inviting) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (inviting) document.body.style.cursor = "";
      }}
    >
      {/* Frame, then the board face just in front of it. */}
      <mesh
        position={[0, 0, -DEPTH / 2 - LAYER.frame]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[WIDTH + 2 * FRAME, height + 2 * FRAME, DEPTH]} />
        <meshStandardMaterial
          ref={frameMaterialRef}
          color={COLORS.frame}
          emissive={COLORS.glow}
          emissiveIntensity={0}
          roughness={0.7}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[WIDTH, height]} />
        <meshStandardMaterial color={COLORS.board} roughness={0.8} />
      </mesh>

      {/* Legs */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * (WIDTH / 2 - 0.3),
            -top - legHeight / 2,
            -DEPTH / 2,
          ]}
          castShadow
        >
          <boxGeometry args={[0.07, legHeight, 0.07]} />
          <meshStandardMaterial color={COLORS.frame} roughness={0.7} />
        </mesh>
      ))}

      <Text
        font={FONT}
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
          font={FONT}
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
