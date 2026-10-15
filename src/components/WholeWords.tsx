import { Fragment } from "react";

// Text whose words never break across lines, so compound words keep their
// hyphen ("front-end", "Beaux-Arts"); lines still wrap between words.
export default function WholeWords({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="whitespace-nowrap">{word}</span>
    </Fragment>
  ));
}
