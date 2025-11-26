import { div } from '@fracipolla/clarity';

export default (child: HTMLElement) =>
  div({ style: { padding: "1rem", border: "1px solid #ccc" } },
    div({ style: { fontWeight: "bold" } }, "Site Header"),
    child,
    div({ style: { marginTop: "1rem", fontSize: "0.8rem" } }, "Site Footer")
  );