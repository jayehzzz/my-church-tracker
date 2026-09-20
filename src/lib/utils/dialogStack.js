// Shared lifecycle for expanded charts and their nested detail dialogs.
const stack = [];
let previousOverflow = '';
const handledEvents = new WeakSet();
const inertStates = new Map();
function syncBackground() {
  for (const [element, inert] of inertStates) element.inert = inert;
  inertStates.clear();
  let branch = stack.at(-1)?.node;
  while (branch && branch !== document.body) {
    for (const sibling of branch.parentElement?.children || []) {
      if (sibling !== branch) { inertStates.set(sibling, sibling.inert); sibling.inert = true; }
    }
    branch = branch.parentElement;
  }
}

export function registerDialog(node, close, previousFocus = document.activeElement) {
  const parentDialog = stack.at(-1)?.node;
  if (parentDialog && !parentDialog.contains(previousFocus)) previousFocus = parentDialog;
  const originalZIndex = node.style.zIndex;
  const previousZIndex = Number(stack.at(-1)?.node.style.zIndex) || 50;
  node.style.zIndex = String(Math.max(Number(getComputedStyle(node).zIndex) || 50, previousZIndex + 10));
  const entry = { node };
  if (!stack.length) previousOverflow = document.body.style.overflow;
  stack.push(entry);
  syncBackground();
  document.body.style.overflow = 'hidden';
  const focusable = () => [...node.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.disabled && !element.closest('[hidden]') && element.getClientRects().length);
  const focusTimer = setTimeout(() => (focusable()[0] || node).focus(), 0);
  function keydown(event) {
    if (stack.at(-1) !== entry || handledEvents.has(event)) return;
    if (event.key === 'Escape') {
      handledEvents.add(event);
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const elements = focusable();
      const first = elements[0] || node;
      const last = elements.at(-1) || node;
      if (!node.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }
  document.addEventListener('keydown', keydown);
  return () => {
    clearTimeout(focusTimer);
    document.removeEventListener('keydown', keydown);
    const wasTop = stack.at(-1) === entry;
    stack.splice(stack.indexOf(entry), 1);
    syncBackground();
    node.style.zIndex = originalZIndex;
    document.body.style.overflow = stack.length ? 'hidden' : previousOverflow;
    if (wasTop && previousFocus?.isConnected) previousFocus.focus();
  };
}
