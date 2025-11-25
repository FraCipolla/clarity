export default function RootLayout(child: HTMLElement) {
  const container = document.createElement("div");
  container.style.border = "2px solid blue";
  container.style.padding = "10px";
  container.appendChild(child);
  return container;
}