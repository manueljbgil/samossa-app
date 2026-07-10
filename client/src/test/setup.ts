import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: {
    value: () => false,
  },
  scrollIntoView: {
    value: () => undefined,
  },
  setPointerCapture: {
    value: () => undefined,
  },
  releasePointerCapture: {
    value: () => undefined,
  },
});

afterEach(() => {
  cleanup();
});
