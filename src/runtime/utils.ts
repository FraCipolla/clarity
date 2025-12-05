import { effect, isReactive } from './reactive';
import type { DeepReactive, Reactive } from './reactive.js';
import { unwrap } from './dom';

/**
 * Handles the write operation for a reactive variable, preserving the Proxy wrapper.
 * This is the target for the compiler rewrite.
 * * @param reactiveVar The Reflector Proxy object (the variable itself).
 * @param newValue The new value being assigned.
 */
export function __cl_set(reactiveVar: any, newValue: any): void {
    const isReactiveObject = isReactive(reactiveVar);

    if (!isReactiveObject) {
        console.warn(`[Clarity Runtime] Attempted to set a non-reactive variable via __cl_set. Falling back to standard assignment.`);
        reactiveVar = newValue; 
        return;
    }

    const reactiveProxy = reactiveVar as Reactive<any>;

    if (reactiveProxy._isComputed) {
        const varName = reactiveProxy.name ?? 'Unknown';
        console.error(`[Clarity Runtime] Cannot assign to a computed property: ${varName}.`);
        return;
    }

    reactiveVar.value = newValue;
}


/**
 * Reactive conditional primitive. Renders either the truthy or falsy template based 
 * on a reactive condition.
 * * @param conditionFn A function that returns the current boolean state (e.g., () => showList.value).
 * @param trueFn A function that returns the DOM element to render when true.
 * @param falseFn A function that returns the DOM element to render when false (optional).
 * @returns An anchor node (Comment) that the parent element can append.
 */
export function __if(
    condition: Reactive<boolean> | Boolean,
    trueFn: () => Node,
    falseFn?: () => Node
): Node { // FIX: Must return a DOM Node (the anchor)
    const container = document.createElement("span");
    let currentNode: Node | null = null;

    const run = () => {
        if (currentNode && currentNode.parentNode === container) {
          container.removeChild(currentNode);
          currentNode = null;
        }
    
        const cond = isReactive(condition) ? (condition as Reactive<boolean>).value : (condition as boolean);
        if (cond) currentNode = trueFn();
        else if(falseFn) currentNode = falseFn();
        
        if (currentNode) container.appendChild(currentNode);
      };
    
      if (isReactive(condition)) {
        effect(run);
      } else {
        run();
      }
    
      return container;
}


/**
 * Reactive iteration primitive. Iterates over a reactive list and updates the DOM 
 * efficiently when the list changes.
 * * @param listFn A function that returns the current array state (e.g., () => todos.value).
 * @param templateFn A function that creates the DOM element for a single item.
 * @returns An anchor node (Comment) that the parent element can append.
 */
export function __each<T>(
  list: T[] | Reactive<DeepReactive<T>[]>,
  render: (item: T) => ChildNode,
  keyFn?: (item: T) => any
) {
    const container = document.createElement("div");
    const nodes = new Map<any, ChildNode>(); // key: array element, value: DOM node
  
    function mountItem(raw: any, beforeNode?: Node | null) {
      const item = unwrap(raw) as T;
  
      // Wrap render in an effect to track reactive variables inside
      let dom: ChildNode;
      effect(() => {
        const rendered = render(item);
  
        if (!nodes.has(raw)) {
          dom = rendered;
          nodes.set(raw, dom);
          if (beforeNode && beforeNode.parentNode === container) {
            container.insertBefore(dom, beforeNode);
          } else {
            container.appendChild(dom);
          }
        } else {
          dom = nodes.get(raw)!;
          // Replace existing DOM if the render returns a different node
          if (rendered !== dom) {
            if (dom.parentNode) dom.parentNode.replaceChild(rendered, dom);
            nodes.set(raw, rendered);
            dom = rendered;
          }
        }
      });
    }
  
    const updateArray = () => {
      const arr = isReactive(list) ? list.value : list;
      const orderedKeys: any[] = [];
  
      for (const raw of arr) orderedKeys.push(raw);
  
      // Remove deleted nodes
      for (const [key, node] of Array.from(nodes.entries())) {
        if (!orderedKeys.includes(key)) {
          node.parentNode?.removeChild(node);
          nodes.delete(key);
        }
      }
  
      // Mount or reorder nodes
      let nextSibling: Node | null = null;
      for (let i = orderedKeys.length - 1; i >= 0; i--) {
        const key = orderedKeys[i];
        const existing = nodes.get(key);
        if (!existing) {
          mountItem(key, nextSibling);
        } else {
          if (existing.nextSibling !== nextSibling) {
            container.insertBefore(existing, nextSibling);
          }
        }
        nextSibling = nodes.get(key) || null;
      }
    };
  
    if (isReactive(list)) {
      effect(updateArray);
    } else {
      for (const item of list) {
        mountItem(item);
      }
    }
  
    return container;
  }