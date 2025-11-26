import { reactive } from '@fracipolla/clarity/runtime';
import { div, p, button } from '@fracipolla/clarity';

export default (params: { id: string }) => {
  const likes = reactive(0);

  return div({},
    p(`Blog post ${params.id}`),
    p(`Likes: ${likes}`),
    button({ onclick: () => likes.value++ }, "Like this post")
  );
};
