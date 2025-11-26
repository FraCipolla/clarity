import { reactive } from '@fracipolla/clarity/runtime';
import { div, p, button } from '@fracipolla/clarity';

reactive count = 0;

export default div({},
  p("Welcome to Clarity!"),
  p(`Counter demo: ${count}`),
  button({ onclick: () => count++ }, "Increment")
);
