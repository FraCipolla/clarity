export const noLayout = true;

export default function rootPage() {
  const el = document.createElement("h1");
  el.textContent = "root";
  return el;
}