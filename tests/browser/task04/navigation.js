// Browser harness navigation only; production uses SvelteKit navigation.
export const goto = url => window.location.assign(url);
