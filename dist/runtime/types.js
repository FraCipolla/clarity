import { div } from "./dom.js";
import { effect } from "./reactive.js";
export function Grid(columns, gap = "10px", items, renderItem = (item) => div({}, item)) {
    const container = div({ style: { display: "grid" } });
    function updateGrid() {
        container.innerHTML = "";
        const currentItems = "value" in items ? items.value : items;
        currentItems.forEach(item => container.appendChild(renderItem(item)));
        const col = typeof columns === "number" ? columns : columns.value;
        const g = typeof gap === "string" ? gap : gap.value;
        container.style.gridTemplateColumns = `repeat(${col}, 1fr)`;
        container.style.gap = g;
    }
    if (columns && typeof columns !== "number" && "value" in columns)
        effect(updateGrid);
    if (gap && typeof gap !== "string" && "value" in gap)
        effect(updateGrid);
    if ("value" in items)
        effect(updateGrid);
    updateGrid();
    return container;
}
//# sourceMappingURL=types.js.map