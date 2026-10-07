// The pointer cursor over what's clickable in the scene. Each thing under
// the pointer claims it, and lets go when the pointer leaves it or it stops
// being clickable; the latest claim still held shows. So a prop still
// hovered behind another (a planter behind a lamp) gets it back as soon as
// the one in front lets go, without the pointer having to leave it first.
//
// "ui" claims, from what stands for the interface in the scene (the open
// departures board), are marked on the body (data-cursor), for the site's
// cursor to show them as it does the page's buttons (components/Cursor).
export type PointerKind = "scene" | "ui";

const claims = new Map<unknown, PointerKind>();

function show() {
  const body = document.body;
  const kind = [...claims.values()].at(-1);
  if (kind === "ui") body.dataset.cursor = "ui";
  else delete body.dataset.cursor;
  body.style.cursor = kind ? "pointer" : "";
}

// `owner`: whatever stands for the claimant, the same when it lets go.
export function claimPointer(owner: unknown, kind: PointerKind = "scene") {
  claims.delete(owner);
  claims.set(owner, kind);
  show();
}

export function releasePointer(owner: unknown) {
  if (claims.delete(owner)) show();
}
