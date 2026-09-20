import '@testing-library/jest-dom'; 

// JSDOM has no Web Animations API; finish Svelte transitions deterministically.
if (!Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      cancel() {}, finish() {}, play() {}, pause() {}, reverse() {},
      currentTime: 0,
      effect: { getComputedTiming: () => ({ progress: 1 }) },
      set onfinish(callback) { if (callback) queueMicrotask(callback); },
    };
  };
}
