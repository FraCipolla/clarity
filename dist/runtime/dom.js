import { isReactive, effect } from "./reactive.js";
export function createElement(tagName, attrsOrChild = {}, ...children) {
    let attrs = {};
    let actualChildren = [];
    // Detect if first argument is attrs or a child
    if (attrsOrChild &&
        typeof attrsOrChild === "object" &&
        !Array.isArray(attrsOrChild) &&
        !("nodeType" in attrsOrChild)) {
        attrs = attrsOrChild;
        actualChildren = children;
    }
    else {
        actualChildren = [attrsOrChild, ...children];
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
            console.log("reactive");
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
    function append(child) {
        if (child == null || child === false)
            return;
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
export const a = (attrsOrChild, ...children) => createElement("a", attrsOrChild, ...children);
export const abbr = (attrsOrChild, ...children) => createElement("abbr", attrsOrChild, ...children);
export const address = (attrsOrChild, ...children) => createElement("address", attrsOrChild, ...children);
export const area = (attrsOrChild, ...children) => createElement("area", attrsOrChild, ...children);
export const article = (attrsOrChild, ...children) => createElement("article", attrsOrChild, ...children);
export const aside = (attrsOrChild, ...children) => createElement("aside", attrsOrChild, ...children);
export const audio = (attrsOrChild, ...children) => createElement("audio", attrsOrChild, ...children);
export const b = (attrsOrChild, ...children) => createElement("b", attrsOrChild, ...children);
export const base = (attrsOrChild, ...children) => createElement("base", attrsOrChild, ...children);
export const bdi = (attrsOrChild, ...children) => createElement("bdi", attrsOrChild, ...children);
export const bdo = (attrsOrChild, ...children) => createElement("bdo", attrsOrChild, ...children);
export const blockquote = (attrsOrChild, ...children) => createElement("blockquote", attrsOrChild, ...children);
export const body = (attrsOrChild, ...children) => createElement("body", attrsOrChild, ...children);
export const br = (attrsOrChild, ...children) => createElement("br", attrsOrChild, ...children);
export const button = (attrsOrChild, ...children) => createElement("button", attrsOrChild, ...children);
export const canvas = (attrsOrChild, ...children) => createElement("canvas", attrsOrChild, ...children);
export const caption = (attrsOrChild, ...children) => createElement("caption", attrsOrChild, ...children);
export const cite = (attrsOrChild, ...children) => createElement("cite", attrsOrChild, ...children);
export const code = (attrsOrChild, ...children) => createElement("code", attrsOrChild, ...children);
export const col = (attrsOrChild, ...children) => createElement("col", attrsOrChild, ...children);
export const colgroup = (attrsOrChild, ...children) => createElement("colgroup", attrsOrChild, ...children);
export const data = (attrsOrChild, ...children) => createElement("data", attrsOrChild, ...children);
export const datalist = (attrsOrChild, ...children) => createElement("datalist", attrsOrChild, ...children);
export const dd = (attrsOrChild, ...children) => createElement("dd", attrsOrChild, ...children);
export const del = (attrsOrChild, ...children) => createElement("del", attrsOrChild, ...children);
export const details = (attrsOrChild, ...children) => createElement("details", attrsOrChild, ...children);
export const dfn = (attrsOrChild, ...children) => createElement("dfn", attrsOrChild, ...children);
export const dialog = (attrsOrChild, ...children) => createElement("dialog", attrsOrChild, ...children);
export const div = (attrsOrChild, ...children) => createElement("div", attrsOrChild, ...children);
export const dl = (attrsOrChild, ...children) => createElement("dl", attrsOrChild, ...children);
export const dt = (attrsOrChild, ...children) => createElement("dt", attrsOrChild, ...children);
export const em = (attrsOrChild, ...children) => createElement("em", attrsOrChild, ...children);
export const embed = (attrsOrChild, ...children) => createElement("embed", attrsOrChild, ...children);
export const fieldset = (attrsOrChild, ...children) => createElement("fieldset", attrsOrChild, ...children);
export const figcaption = (attrsOrChild, ...children) => createElement("figcaption", attrsOrChild, ...children);
export const figure = (attrsOrChild, ...children) => createElement("figure", attrsOrChild, ...children);
export const footer = (attrsOrChild, ...children) => createElement("footer", attrsOrChild, ...children);
export const form = (attrsOrChild, ...children) => createElement("form", attrsOrChild, ...children);
export const h1 = (attrsOrChild, ...children) => createElement("h1", attrsOrChild, ...children);
export const h2 = (attrsOrChild, ...children) => createElement("h2", attrsOrChild, ...children);
export const h3 = (attrsOrChild, ...children) => createElement("h3", attrsOrChild, ...children);
export const h4 = (attrsOrChild, ...children) => createElement("h4", attrsOrChild, ...children);
export const h5 = (attrsOrChild, ...children) => createElement("h5", attrsOrChild, ...children);
export const h6 = (attrsOrChild, ...children) => createElement("h6", attrsOrChild, ...children);
export const head = (attrsOrChild, ...children) => createElement("head", attrsOrChild, ...children);
export const header = (attrsOrChild, ...children) => createElement("header", attrsOrChild, ...children);
export const hr = (attrsOrChild, ...children) => createElement("hr", attrsOrChild, ...children);
export const html = (attrsOrChild, ...children) => createElement("html", attrsOrChild, ...children);
export const i = (attrsOrChild, ...children) => createElement("i", attrsOrChild, ...children);
export const iframe = (attrsOrChild, ...children) => createElement("iframe", attrsOrChild, ...children);
export const img = (attrsOrChild, ...children) => createElement("img", attrsOrChild, ...children);
export const input = (attrsOrChild, ...children) => createElement("input", attrsOrChild, ...children);
export const ins = (attrsOrChild, ...children) => createElement("ins", attrsOrChild, ...children);
export const kbd = (attrsOrChild, ...children) => createElement("kbd", attrsOrChild, ...children);
export const label = (attrsOrChild, ...children) => createElement("label", attrsOrChild, ...children);
export const legend = (attrsOrChild, ...children) => createElement("legend", attrsOrChild, ...children);
export const li = (attrsOrChild, ...children) => createElement("li", attrsOrChild, ...children);
export const link = (attrsOrChild, ...children) => createElement("link", attrsOrChild, ...children);
export const main = (attrsOrChild, ...children) => createElement("main", attrsOrChild, ...children);
export const map = (attrsOrChild, ...children) => createElement("map", attrsOrChild, ...children);
export const mark = (attrsOrChild, ...children) => createElement("mark", attrsOrChild, ...children);
export const meta = (attrsOrChild, ...children) => createElement("meta", attrsOrChild, ...children);
export const meter = (attrsOrChild, ...children) => createElement("meter", attrsOrChild, ...children);
export const nav = (attrsOrChild, ...children) => createElement("nav", attrsOrChild, ...children);
export const noscript = (attrsOrChild, ...children) => createElement("noscript", attrsOrChild, ...children);
export const object = (attrsOrChild, ...children) => createElement("object", attrsOrChild, ...children);
export const ol = (attrsOrChild, ...children) => createElement("ol", attrsOrChild, ...children);
export const optgroup = (attrsOrChild, ...children) => createElement("optgroup", attrsOrChild, ...children);
export const option = (attrsOrChild, ...children) => createElement("option", attrsOrChild, ...children);
export const output = (attrsOrChild, ...children) => createElement("output", attrsOrChild, ...children);
export const p = (attrsOrChild, ...children) => createElement("p", attrsOrChild, ...children);
export const param = (attrsOrChild, ...children) => createElement("param", attrsOrChild, ...children);
export const picture = (attrsOrChild, ...children) => createElement("picture", attrsOrChild, ...children);
export const pre = (attrsOrChild, ...children) => createElement("pre", attrsOrChild, ...children);
export const progress = (attrsOrChild, ...children) => createElement("progress", attrsOrChild, ...children);
export const q = (attrsOrChild, ...children) => createElement("q", attrsOrChild, ...children);
export const rp = (attrsOrChild, ...children) => createElement("rp", attrsOrChild, ...children);
export const rt = (attrsOrChild, ...children) => createElement("rt", attrsOrChild, ...children);
export const ruby = (attrsOrChild, ...children) => createElement("ruby", attrsOrChild, ...children);
export const s = (attrsOrChild, ...children) => createElement("s", attrsOrChild, ...children);
export const samp = (attrsOrChild, ...children) => createElement("samp", attrsOrChild, ...children);
export const script = (attrsOrChild, ...children) => createElement("script", attrsOrChild, ...children);
export const section = (attrsOrChild, ...children) => createElement("section", attrsOrChild, ...children);
export const select = (attrsOrChild, ...children) => createElement("select", attrsOrChild, ...children);
export const small = (attrsOrChild, ...children) => createElement("small", attrsOrChild, ...children);
export const source = (attrsOrChild, ...children) => createElement("source", attrsOrChild, ...children);
export const span = (attrsOrChild, ...children) => createElement("span", attrsOrChild, ...children);
export const strong = (attrsOrChild, ...children) => createElement("strong", attrsOrChild, ...children);
export const style = (attrsOrChild, ...children) => createElement("style", attrsOrChild, ...children);
export const sub = (attrsOrChild, ...children) => createElement("sub", attrsOrChild, ...children);
export const summary = (attrsOrChild, ...children) => createElement("summary", attrsOrChild, ...children);
export const sup = (attrsOrChild, ...children) => createElement("sup", attrsOrChild, ...children);
export const table = (attrsOrChild, ...children) => createElement("table", attrsOrChild, ...children);
export const tbody = (attrsOrChild, ...children) => createElement("tbody", attrsOrChild, ...children);
export const td = (attrsOrChild, ...children) => createElement("td", attrsOrChild, ...children);
export const template = (attrsOrChild, ...children) => createElement("template", attrsOrChild, ...children);
export const textarea = (attrsOrChild, ...children) => createElement("textarea", attrsOrChild, ...children);
export const tfoot = (attrsOrChild, ...children) => createElement("tfoot", attrsOrChild, ...children);
export const th = (attrsOrChild, ...children) => createElement("th", attrsOrChild, ...children);
export const thead = (attrsOrChild, ...children) => createElement("thead", attrsOrChild, ...children);
export const time = (attrsOrChild, ...children) => createElement("time", attrsOrChild, ...children);
export const title = (attrsOrChild, ...children) => createElement("title", attrsOrChild, ...children);
export const tr = (attrsOrChild, ...children) => createElement("tr", attrsOrChild, ...children);
export const track = (attrsOrChild, ...children) => createElement("track", attrsOrChild, ...children);
export const u = (attrsOrChild, ...children) => createElement("u", attrsOrChild, ...children);
export const ul = (attrsOrChild, ...children) => createElement("ul", attrsOrChild, ...children);
export const varTag = (attrsOrChild, ...children) => createElement("var", attrsOrChild, ...children);
export const video = (attrsOrChild, ...children) => createElement("video", attrsOrChild, ...children);
export const wbr = (attrsOrChild, ...children) => createElement("wbr", attrsOrChild, ...children);
//# sourceMappingURL=dom.js.map