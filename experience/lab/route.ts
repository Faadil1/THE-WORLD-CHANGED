/** Lab hash routes. Pure. */
export type Route =
  | { view: "hero" }
  | { view: "worlds" }
  | { view: "experiment"; arg: string }
  | { view: "same"; arg: string }
  | { view: "challenge"; arg?: string }
  | { view: "replay"; arg: string }
  | { view: "live" };

export function route(hash: string): Route {
  const [head, arg, sub] = hash.replace(/^#\/?/, "").split("/");
  if (!head) return { view: "hero" };
  if (head === "lab") return arg ? (sub === "same" ? { view: "same", arg } : { view: "experiment", arg }) : { view: "worlds" };
  if (head === "challenge") return arg ? { view: "challenge", arg } : { view: "challenge" };
  if (head === "replay") return { view: "replay", arg: arg || "last" };
  if (head === "live") return { view: "live" };
  return { view: "hero" };
}
