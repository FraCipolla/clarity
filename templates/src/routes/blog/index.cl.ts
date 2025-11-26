import { reactive } from '@fracipolla/clarity/runtime';
import { div, p, a, button } from '@fracipolla/clarity';

reactive views = 0;

export default div({},
  p("Welcome to the Blog section!"),
  p(`Page views: ${views}`),
  button({ onclick: () => views++ }, "Add View"),
  div({ style: { marginTop: '1rem' } },
    a({ href: "/blog/1" }, "Read post 1"),
    a({ href: "/blog/2", style: { marginLeft: '1rem' } }, "Read post 2")
  )
);
