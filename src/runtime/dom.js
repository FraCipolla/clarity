function createElement(tagName, attrsOrChild = {}, ...children) {
    let attrs = {};
    let actualChildren = [];
    // Determine if first argument is attrs or a child
    if (attrsOrChild &&
        typeof attrsOrChild === "object" &&
        !("nodeType" in attrsOrChild) &&
        !Array.isArray(attrsOrChild)) {
        attrs = attrsOrChild;
        actualChildren = children;
    }
    else {
        actualChildren = [attrsOrChild, ...children];
    }
    const el = document.createElement(tagName);
    // Apply attributes
    for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith("on") && typeof value === "function") {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        }
        else {
            el.setAttribute(key, value);
        }
    }
    // Append children
    actualChildren.forEach(child => {
        if (typeof child === "string")
            el.textContent = child;
        else
            el.appendChild(child);
    });
    return el;
}
// Export your functional tags
export function div(attrsOrChild = {}, ...children) {
    return createElement("div", attrsOrChild, ...children);
}
export function span(attrsOrChild = {}, ...children) {
    return createElement("span", attrsOrChild, ...children);
}
export function button(attrsOrChild = {}, ...children) {
    return createElement("button", attrsOrChild, ...children);
}
export function body(attrsOrChild = {}, ...children) {
    return createElement("body", attrsOrChild, ...children);
}
export function h1(attrsOrChild = {}, ...children) {
    return createElement("h1", attrsOrChild, ...children);
}
export function h2(attrsOrChild = {}, ...children) {
    return createElement("h2", attrsOrChild, ...children);
}
export function h3(attrsOrChild = {}, ...children) {
    return createElement("h3", attrsOrChild, ...children);
}
export function h4(attrsOrChild = {}, ...children) {
    return createElement("h4", attrsOrChild, ...children);
}
export function h5(attrsOrChild = {}, ...children) {
    return createElement("h5", attrsOrChild, ...children);
}
