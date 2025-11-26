import { reactive } from '@fracipolla/clarity/runtime';
import { div, p, button } from '@fracipolla/clarity';

export const layout = false; // skip layout to demonstrate layout opt-out

reactive likes = 0;

export default div({},
  p("About Page"),
  p("layout not inherited"),
  p(`Likes: ${likes}`),
  button({ onclick: () => likes++ }, "Like")
);
