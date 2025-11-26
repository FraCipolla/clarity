import { reactive } from '@fracipolla/clarity/runtime';
import { div, p, button } from '@fracipolla/clarity';

export const layout = false; // skip layout to demonstrate layout opt-out

const likes = reactive(0);

export default div({},
  p("About Page"),
  p(`Likes: ${likes}`),
  button({ onclick: () => likes.value++ }, "Like")
);
