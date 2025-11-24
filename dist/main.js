import { reactive } from "./runtime/reactive.js";
import { Grid } from "./runtime/types.js";
// Reactive state
let columns = reactive(3);
let gap = reactive("5px");
let items = reactive(["A", "B", "C", "D", "E", "F"]);
// Create grid
const page = Grid(columns, gap, items);
// Add to document
// Later, reactive updates
setTimeout(() => columns.value = 2, 2000); // automatically updates layout
setTimeout(() => items.value.push("G"), 3000); // automatically adds new item
export default page;
//# sourceMappingURL=main.js.map