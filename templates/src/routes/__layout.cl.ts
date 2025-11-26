import { div, a } from '@fracipolla/clarity';

export default (child: HTMLElement) =>
  div({ style: { fontFamily: 'sans-serif', margin: '0 auto', maxWidth: '600px' } },
    div({ style: { padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem' } },
      a({ href: "/" }, "Home"),
      a({ href: "/about" }, "About"),
      a({ href: "/blog" }, "Blog")
    ),
    child
  );
