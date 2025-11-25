export const noLayout = true;

export default function AboutPage() {
  const el = document.createElement("h1");
  el.textContent = "About (no layout)";
  return el;
}