import { isReactive, effect } from "./reactive.js";
import type { DeepReactive, Reactive } from "./reactive.js";

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

export function unwrap<T>(value: T): any {
  if (isReactive(value)) return unwrap(value.value);
  if (Array.isArray(value)) return value.map(unwrap);
  if (typeof value === "object" && value !== null) {
    const obj: any = {};
    for (const key in value) obj[key] = unwrap((value as any)[key]);
    return obj;
  }
  return value;
}

function unwrapDeep(val: any): any {
  if (isReactive(val)) return unwrapDeep(val.value);
  if (Array.isArray(val)) return val.map(unwrapDeep);
  if (val && typeof val === "object") {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      result[k] = unwrapDeep(v);
    }
    return result;
  }
  return val;
}

function hasReactive(value: any): boolean {
  if (isReactive(value)) return true;
  if (Array.isArray(value)) return value.some(hasReactive);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasReactive);
  }
  return false;
}

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

  let el = document.createElement(tagName);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    const isStyleFunction = key === "style" && typeof value === "function";
    const isReactiveAttr = isReactive(value) || (typeof value === "function" && (value as any)._isComputed) || isStyleFunction;

    const apply = () => {
      const val = typeof value === "function" && (value as any)._isComputed ? value() : isReactive(value) ? value.value : value;

      if (key === "style") {
        effect(() => {
          const styleObj = typeof val === "function" ? (val as Function)() : val;
          for (const [prop, raw] of Object.entries(styleObj || {})) {
            const cssProp = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
            const rawVal = isReactive(raw) ? raw.value : raw;
            el.style.setProperty(cssProp, String(rawVal));
          }
        });
      } else if ((key === "value") && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
        if (isReactive(value)) {
          el.oninput = (e: Event) => value.value = (e.target as HTMLInputElement).value;
          el.value = unwrap(value.value);
        } else {
          el.value = String(value ?? "");
        }
      } else if ((key === "disabled") && (el instanceof HTMLButtonElement)) {
        effect(() => {
          const isDisabled = typeof val === "function" ? (val as Function)() : val;
          el.disabled = isReactive(isDisabled) ? isDisabled.value : isDisabled;
        })
      } else {
        el.setAttribute(key, String(unwrap(val)));
      }
    };

    if (isReactiveAttr || key === "style" && typeof value === "function") {
      effect(apply);
    } else {
      apply();
    }
  }


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
      const textNode = document.createTextNode("");
      effect(() => {
        const val = unwrap(child);
        textNode.nodeValue = (typeof val === "object" && val !== null)
          ? Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(", ")
          : String(val);
      });
      el.appendChild(textNode);
      return;
    }
    // Object
    if (typeof child === "object") {
      const text = Object.entries(unwrapDeep(child))
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      el.appendChild(document.createTextNode(text));
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

const tags = [
  "If", "For", "IfElse",
  "a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","blockquote","body","br","button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","head","header","hr","html","i","iframe","img","input","ins","kbd","label","legend","li","link","main","map","mark","meta","meter","nav","noscript","object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","title","tr","track","u","ul","varTag","video","wbr",
]

export const isHtmlTag = ((s: string) => {
  return tags.includes(s);
})

export function If(condition: Reactive<boolean>, render: () => Node) {
  const placeholder = document.createTextNode("");
  let currentNode: Node | null = null;

  effect(() => {
    // Remove previous node
    if (currentNode) {
      (currentNode as ChildNode).remove();
      currentNode = null;
    }

    if (condition.value) {
      currentNode = render();
      placeholder.parentNode?.insertBefore(currentNode, placeholder.nextSibling);
    }
  });

  return placeholder;
}

export function each<T>(list: T[] | Reactive<T[]>, ) {

}

export function For<T>(
  list: T[] | Reactive<DeepReactive<T>[]>,
  render: (item: T) => ChildNode,
  keyFn?: (item: T) => any
) {
  const container = document.createElement("div");
  const nodes = new Map<any, ChildNode>(); // key: array element, value: DOM node

  function mountItem(raw: any, beforeNode?: Node | null) {
    const item = unwrap(raw) as T;

    // Wrap render in an effect to track reactive variables inside
    let dom: ChildNode;
    effect(() => {
      const rendered = render(item);

      if (!nodes.has(raw)) {
        dom = rendered;
        nodes.set(raw, dom);
        if (beforeNode && beforeNode.parentNode === container) {
          container.insertBefore(dom, beforeNode);
        } else {
          container.appendChild(dom);
        }
      } else {
        dom = nodes.get(raw)!;
        // Replace existing DOM if the render returns a different node
        if (rendered !== dom) {
          if (dom.parentNode) dom.parentNode.replaceChild(rendered, dom);
          nodes.set(raw, rendered);
          dom = rendered;
        }
      }
    });
  }

  const updateArray = () => {
    const arr = isReactive(list) ? list.value : list;
    const orderedKeys: any[] = [];

    for (const raw of arr) orderedKeys.push(raw);

    // Remove deleted nodes
    for (const [key, node] of Array.from(nodes.entries())) {
      if (!orderedKeys.includes(key)) {
        node.parentNode?.removeChild(node);
        nodes.delete(key);
      }
    }

    // Mount or reorder nodes
    let nextSibling: Node | null = null;
    for (let i = orderedKeys.length - 1; i >= 0; i--) {
      const key = orderedKeys[i];
      const existing = nodes.get(key);
      if (!existing) {
        mountItem(key, nextSibling);
      } else {
        if (existing.nextSibling !== nextSibling) {
          container.insertBefore(existing, nextSibling);
        }
      }
      nextSibling = nodes.get(key) || null;
    }
  };

  if (isReactive(list)) {
    effect(updateArray);
  } else {
    for (const item of list) {
      mountItem(item);
    }
  }

  return container;
}



export function IfElse(
  condition: Reactive<boolean> | boolean,
  renderThen: () => Node,
  renderElse: () => Node
) {
  const container = document.createElement("span");
  let currentNode: Node | null = null;

  const run = () => {
    if (currentNode && currentNode.parentNode === container) {
      container.removeChild(currentNode);
      currentNode = null;
    }

    const cond = isReactive(condition) ? (condition as Reactive<boolean>).value : (condition as boolean);
    if (cond) {
      currentNode = renderThen();
    } else {
      currentNode = renderElse();
    }

    if (currentNode) container.appendChild(currentNode);
  };

  if (isReactive(condition)) {
    effect(run);
  } else {
    run();
  }

  return container;
}

export type DynamicSource =
  | Node
  | string
  | number
  | null
  | undefined
  | boolean
  | (() => DynamicSource)
  | Reactive<any>;

export function dynamic(source: DynamicSource): Node {
  let currentNode: Node;
  
  const anchor = document.createComment("dynamic-anchor");

  const toNode = (value: DynamicSource): Node => {
    if (value instanceof Node) return value;

    if (value == null || value === false) {
      return document.createComment("dynamic-empty");
    }

    if (isReactive(value)) {
      return document.createTextNode(String(value.value));
    }

    if (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") {
      return document.createTextNode(String(value));
    }
    return document.createTextNode("");
  };

  const compute = () => {
    const value =
      typeof source === "function"
        ? (source as () => DynamicSource)()
        : isReactive(source)
        ? source.value
        : source;

    const newNode = toNode(value);

    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.replaceChild(newNode, currentNode);
    }

    currentNode = newNode;
  };

  currentNode = anchor;
  compute();

  if (typeof source === "function" || isReactive(source)) {
    effect(compute);
  }

  return currentNode;
}

