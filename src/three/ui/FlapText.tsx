import useFlapText from "../hooks/useFlapText";

// Split-flap text for the HTML board. Screen readers get the real text,
// never the flipping glyphs.
export default function FlapText({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) {
  const shown = useFlapText(text, delay);

  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}
