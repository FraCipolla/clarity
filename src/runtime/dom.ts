import { isReactive, effect } from "./reactive.js";

export type Child =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | Child[]
  | { value: any }; // unified reactive

export type Attrs = Record<string, any>;

export function createElement(
  tagName: string,
  attrsOrChild: Attrs | Child = {},
  ...children: Child[]
): HTMLElement {
  let attrs: Attrs = {};
  let actualChildren: Child[] = [];

  // Detect if first argument is attrs or a child
  if (
    attrsOrChild &&
    typeof attrsOrChild === "object" &&
    !Array.isArray(attrsOrChild) &&
    !("nodeType" in attrsOrChild)
  ) {
    attrs = attrsOrChild as Attrs;
    actualChildren = children;
  } else {
    actualChildren = [attrsOrChild as Child, ...children];
  }

  const el = document.createElement(tagName);

  // -----------------------------------------------
  // ATTRIBUTES
  // -----------------------------------------------
  for (const [key, value] of Object.entries(attrs)) {

    // Event handler
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }

    // Reactive attribute (primitive or object)
    if (isReactive(value)) {
      console.log("reactive")
      effect(() => {
        const unwrapped = value.value;

        // STYLE object
        if (key === "style" && typeof unwrapped === "object" && unwrapped !== null) {
          for (const [prop, val] of Object.entries(unwrapped)) {
            const cssProp = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
            el.style.setProperty(cssProp, String(val));
          }
          return;
        }

        // Primitive attribute
        el.setAttribute(key, String(unwrapped));
      });

      continue;
    }

    // Non-reactive STYLE object
    if (key === "style" && typeof value === "object" && value !== null) {
      for (const [prop, val] of Object.entries(value)) {
        const cssProp = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
        el.style.setProperty(cssProp, String(val));
      }
      continue;
    }

    // Normal attribute
    el.setAttribute(key, value);
  }

  // -----------------------------------------------
  // CHILDREN
  // -----------------------------------------------
  function append(child: Child) {
    if (child == null || child === false) return;

    // Strings/numbers
    if (typeof child === "string" || typeof child === "number") {
      el.appendChild(document.createTextNode(String(child)));
      return;
    }

    // DOM Node
    if (child instanceof Node) {
      el.appendChild(child);
      return;
    }

    // Arrays
    if (Array.isArray(child)) {
      child.forEach(append);
      return;
    }

    // REACTIVE CHILD
    if (isReactive(child)) {
      const textNode = document.createTextNode(String(child.value));

      effect(() => {
        textNode.nodeValue = String(child.value);
      });

      el.appendChild(textNode);
      return;
    }

    console.warn("Ignoring invalid child:", child);
  }

  actualChildren.forEach(append);

  return el;
}

// Tag helpers
export const a = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("a", attrsOrChild, ...children);
export const abbr = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("abbr", attrsOrChild, ...children);
export const address = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("address", attrsOrChild, ...children);
export const area = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("area", attrsOrChild, ...children);
export const article = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("article", attrsOrChild, ...children);
export const aside = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("aside", attrsOrChild, ...children);
export const audio = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("audio", attrsOrChild, ...children);
export const b = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("b", attrsOrChild, ...children);
export const base = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("base", attrsOrChild, ...children);
export const bdi = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("bdi", attrsOrChild, ...children);
export const bdo = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("bdo", attrsOrChild, ...children);
export const blockquote = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("blockquote", attrsOrChild, ...children);
export const body = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("body", attrsOrChild, ...children);
export const br = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("br", attrsOrChild, ...children);
export const button = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("button", attrsOrChild, ...children);
export const canvas = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("canvas", attrsOrChild, ...children);
export const caption = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("caption", attrsOrChild, ...children);
export const cite = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("cite", attrsOrChild, ...children);
export const code = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("code", attrsOrChild, ...children);
export const col = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("col", attrsOrChild, ...children);
export const colgroup = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("colgroup", attrsOrChild, ...children);
export const data = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("data", attrsOrChild, ...children);
export const datalist = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("datalist", attrsOrChild, ...children);
export const dd = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("dd", attrsOrChild, ...children);
export const del = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("del", attrsOrChild, ...children);
export const details = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("details", attrsOrChild, ...children);
export const dfn = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("dfn", attrsOrChild, ...children);
export const dialog = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("dialog", attrsOrChild, ...children);
export const div = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("div", attrsOrChild, ...children);
export const dl = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("dl", attrsOrChild, ...children);
export const dt = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("dt", attrsOrChild, ...children);
export const em = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("em", attrsOrChild, ...children);
export const embed = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("embed", attrsOrChild, ...children);
export const fieldset = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("fieldset", attrsOrChild, ...children);
export const figcaption = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("figcaption", attrsOrChild, ...children);
export const figure = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("figure", attrsOrChild, ...children);
export const footer = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("footer", attrsOrChild, ...children);
export const form = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("form", attrsOrChild, ...children);
export const h1 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h1", attrsOrChild, ...children);
export const h2 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h2", attrsOrChild, ...children);
export const h3 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h3", attrsOrChild, ...children);
export const h4 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h4", attrsOrChild, ...children);
export const h5 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h5", attrsOrChild, ...children);
export const h6 = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("h6", attrsOrChild, ...children);
export const head = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("head", attrsOrChild, ...children);
export const header = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("header", attrsOrChild, ...children);
export const hr = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("hr", attrsOrChild, ...children);
export const html = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("html", attrsOrChild, ...children);
export const i = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("i", attrsOrChild, ...children);
export const iframe = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("iframe", attrsOrChild, ...children);
export const img = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("img", attrsOrChild, ...children);
export const input = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("input", attrsOrChild, ...children);
export const ins = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("ins", attrsOrChild, ...children);
export const kbd = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("kbd", attrsOrChild, ...children);
export const label = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("label", attrsOrChild, ...children);
export const legend = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("legend", attrsOrChild, ...children);
export const li = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("li", attrsOrChild, ...children);
export const link = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("link", attrsOrChild, ...children);
export const main = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("main", attrsOrChild, ...children);
export const map = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("map", attrsOrChild, ...children);
export const mark = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("mark", attrsOrChild, ...children);
export const meta = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("meta", attrsOrChild, ...children);
export const meter = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("meter", attrsOrChild, ...children);
export const nav = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("nav", attrsOrChild, ...children);
export const noscript = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("noscript", attrsOrChild, ...children);
export const object = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("object", attrsOrChild, ...children);
export const ol = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("ol", attrsOrChild, ...children);
export const optgroup = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("optgroup", attrsOrChild, ...children);
export const option = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("option", attrsOrChild, ...children);
export const output = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("output", attrsOrChild, ...children);
export const p = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("p", attrsOrChild, ...children);
export const param = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("param", attrsOrChild, ...children);
export const picture = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("picture", attrsOrChild, ...children);
export const pre = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("pre", attrsOrChild, ...children);
export const progress = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("progress", attrsOrChild, ...children);
export const q = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("q", attrsOrChild, ...children);
export const rp = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("rp", attrsOrChild, ...children);
export const rt = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("rt", attrsOrChild, ...children);
export const ruby = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("ruby", attrsOrChild, ...children);
export const s = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("s", attrsOrChild, ...children);
export const samp = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("samp", attrsOrChild, ...children);
export const script = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("script", attrsOrChild, ...children);
export const section = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("section", attrsOrChild, ...children);
export const select = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("select", attrsOrChild, ...children);
export const small = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("small", attrsOrChild, ...children);
export const source = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("source", attrsOrChild, ...children);
export const span = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("span", attrsOrChild, ...children);
export const strong = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("strong", attrsOrChild, ...children);
export const style = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("style", attrsOrChild, ...children);
export const sub = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("sub", attrsOrChild, ...children);
export const summary = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("summary", attrsOrChild, ...children);
export const sup = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("sup", attrsOrChild, ...children);
export const table = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("table", attrsOrChild, ...children);
export const tbody = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("tbody", attrsOrChild, ...children);
export const td = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("td", attrsOrChild, ...children);
export const template = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("template", attrsOrChild, ...children);
export const textarea = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("textarea", attrsOrChild, ...children);
export const tfoot = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("tfoot", attrsOrChild, ...children);
export const th = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("th", attrsOrChild, ...children);
export const thead = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("thead", attrsOrChild, ...children);
export const time = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("time", attrsOrChild, ...children);
export const title = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("title", attrsOrChild, ...children);
export const tr = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("tr", attrsOrChild, ...children);
export const track = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("track", attrsOrChild, ...children);
export const u = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("u", attrsOrChild, ...children);
export const ul = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("ul", attrsOrChild, ...children);
export const varTag = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("var", attrsOrChild, ...children);
export const video = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("video", attrsOrChild, ...children);
export const wbr = (attrsOrChild?: Attrs | Child, ...children: Child[]) => createElement("wbr", attrsOrChild, ...children);
