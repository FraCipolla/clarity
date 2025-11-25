import {reactive} from '@fracipolla/clarity/runtime'
import {div, p, button} from '@fracipolla/clarity'

reactive count = 0;

return div({},
  p(`Count: ${count}`),
  button({ onclick: () => count++ }, "Increment")
)