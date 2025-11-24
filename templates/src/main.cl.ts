import { reactive, effect, div, p, button } from "@fracipolla/clarity";

// ----- Reactive variables -----
reactive count = 0;
reactive colorIndex = 0;

const colors = ["red", "green", "blue"];

// ----- Styling -----
reactive centerBox = {
  margin: "auto",
  padding: "20px",
  border: `3px solid ` + colors[colorIndex],
  textAlign: "center",
  width: "250px",
  borderRadius: "8px",
};

// ----- Page structure -----
const page = div(
  { style: { fontFamily: "Arial, sans-serif", marginTop: "40px" } },
  
  // Welcome message
  p({ style: { fontWeight: "bold", fontSize: "20px", marginBottom: "10px" } },
    "Welcome to Clarity!"
  ),
  
  // Explanation text
  p(
    "Clarity is a tiny reactive UI framework. Below is a live counter demonstrating reactivity:"
  ),

  // Reactive box with counter
  div({ style: centerBox },
    p(`Count: ${count}`),
    button({ onclick: () => count++ }, "Increment"),
    button({
      onclick: () => {
        colorIndex = (colorIndex + 1) % colors.length;
        centerBox.border = `3px solid ` + colors[colorIndex];
      },
      style: { marginLeft: "10px" }
    }, "Change Border Color")
  )
);

// Append the page to the document
document.body.appendChild(page);

// ----- Effects for logging -----
effect(() => console.log("Count updated:", count));
effect(() => console.log("Border color updated:", colors[colorIndex]));
