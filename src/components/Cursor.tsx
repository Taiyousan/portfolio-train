"use client";

import { useEffect, useRef } from "react";

// What takes a click on the page. The train scene's objects set a pointer
// cursor on the body while they're hovered instead (see
// three/state/pointerCursor).
const CLICKABLE =
  'a[href], button:not(:disabled), [role="button"], label, select, summary, input:is([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="button"], [type="submit"], [type="reset"])';
// Where the text cursor stays (see .custom-cursor in globals.css).
const TEXT_FIELD =
  'input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="button"], [type="submit"], [type="reset"]), textarea, [contenteditable="true"]';

// The site's cursor, with a mouse or a trackpad: a red dot ringed in
// ivory, like the ink and card stock of the tickets. Over something
// clickable, a ring opens around it like a ticket punch, and closes in a
// little on the click; tinted the departures board's yellow over the
// scene's objects. Left to the system on touch screens, over text fields,
// and while the train scene loads (data-loading on the root, see
// three/ui/LoadingScreen): drawn by the page, it would stutter while the
// page is held up.
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = ref.current;
    if (
      !cursor ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    const root = document.documentElement;
    root.classList.add("custom-cursor");

    let target: Element | null = null;
    let mouse = false;
    const update = () => {
      cursor.toggleAttribute(
        "data-visible",
        mouse &&
          !root.hasAttribute("data-loading") &&
          !target?.closest(TEXT_FIELD),
      );
      // The scene's objects, unless marked as standing for the interface
      // (data-cursor="ui", the open departures board).
      const body = document.body;
      const pointer = body.style.cursor === "pointer";
      const ui =
        !!target?.closest(CLICKABLE) ||
        (pointer && body.dataset.cursor === "ui");
      const scene = !ui && pointer;
      cursor.toggleAttribute("data-hover", ui || scene);
      cursor.toggleAttribute("data-scene", scene);
    };
    const move = (event: PointerEvent) => {
      mouse = event.pointerType !== "touch";
      target = event.target instanceof Element ? event.target : null;
      cursor.style.translate = `${event.clientX}px ${event.clientY}px`;
      update();
    };
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      mouse = false;
      update();
    };
    const press = (event: PointerEvent) => {
      move(event);
      cursor.toggleAttribute("data-pressed", true);
    };
    const release = () => cursor.toggleAttribute("data-pressed", false);
    // The scene's objects stop being clickable under a still pointer too
    // (the train leaving), putting the body's cursor back.
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributeFilter: ["style", "data-cursor"],
    });
    observer.observe(root, { attributeFilter: ["data-loading"] });

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    document.addEventListener("pointerout", leave);
    return () => {
      root.classList.remove("custom-cursor");
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.removeEventListener("pointerout", leave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="group pointer-events-none fixed top-0 left-0 z-[2147483647] opacity-0 transition-opacity duration-150 data-visible:opacity-100"
    >
      <span className="absolute -top-5 -left-5 size-10 scale-40 rounded-full border-[1.5px] border-ticket opacity-0 ring-1 ring-ticket-ink/25 inset-ring-1 inset-ring-ticket-ink/25 transition-[scale,opacity,background-color] duration-200 ease-out group-data-hover:scale-100 group-data-hover:bg-ticket/15 group-data-hover:opacity-100 group-data-hover:group-data-scene:bg-board-ink/60 group-data-hover:group-data-pressed:scale-75" />
      <span className="absolute -top-1 -left-1 size-2 rounded-full bg-ticket-stamp ring-[1.5px] ring-ticket transition-[scale] duration-200 ease-out group-data-hover:scale-75 group-data-pressed:scale-75 group-data-hover:group-data-pressed:scale-50" />
    </div>
  );
}
