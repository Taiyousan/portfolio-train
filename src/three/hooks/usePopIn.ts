import { useSpring } from "@react-spring/three";

// Springs a scale from 0 to 1 once mounted, with a slight overshoot.
export default function usePopIn() {
  const { scale } = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  });
  return scale;
}
