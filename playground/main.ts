import { reactive, effect } from "./runtime/reactive.js";
import { Grid } from "./runtime/types.js";

// Reactive state
reactive columns = 3;
reactive gap = "5px";
reactive items = ["A", "B", "C", "D", "E", "F"];

// Create grid
const page = Grid(columns, gap, items);

// Add to document

// Later, reactive updates
setTimeout(() => columns = 2, 2000); // automatically updates layout
setTimeout(() => items.push("G"), 3000); // automatically adds new item

export default page;
