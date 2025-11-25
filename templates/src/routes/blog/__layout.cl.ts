export default function BlogLayout(child: HTMLElement) {
  const container = document.createElement("div");
  container.style.border = "2px solid green";
  container.style.margin = "5px";
  container.appendChild(child);
  return container;
}