import { div } from '@fracipolla/clarity';

// This layout exists but is opted out by default
export const layout = false;

export default (child: HTMLElement) =>
  div({ style: { padding: '1rem', border: '1px dashed #666' } },
    div({ style: { fontWeight: 'bold' } }, "Blog Section"),
    child
  );
