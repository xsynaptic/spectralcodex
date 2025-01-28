import {
  TRANSITION_BEFORE_PREPARATION,
  TRANSITION_BEFORE_SWAP,
} from "astro:transitions/client";

const animationDuration = 300;

// Extracted from the ProgressBar component to allow the use of TypeScript
// Code adapted from astro-loading-indicator: https://github.com/florian-lefebvre/astro-loading-indicator
function loadingBar(selector: string) {
  let element = document.querySelector<HTMLDivElement>(selector);

  if (!element) return;

  let progress = 0.2;

  function setProgress(progressValue: number) {
    if (!element) return;
    progress = progressValue;
    element.style.setProperty("--progress-bar", String(progress));
  }

  function setOpacity(opacityValue: number) {
    if (!element) return;
    element.style.setProperty("opacity", String(opacityValue));
    element.ariaHidden = opacityValue === 0 ? "true" : "false";
  }

  function setFinished() {
    setProgress(1);

    globalThis.window.setTimeout(() => {
      setOpacity(0);
    }, animationDuration / 2);

    globalThis.window.setTimeout(() => {
      setProgress(0.2);
    }, animationDuration * 2);
  }

  // Initialize opacity value
  setOpacity(0);

  const threshold = 200;

  let trickleInterval: number | undefined;
  let thresholdTimeout: number;

  document.addEventListener(TRANSITION_BEFORE_PREPARATION, () => {
    setProgress(0);
    thresholdTimeout = globalThis.window.setTimeout(() => {
      setOpacity(1);
      trickleInterval = globalThis.window.setInterval(() => {
        setProgress(progress + Math.random() * 0.03);
      }, animationDuration);
    }, threshold);
  });

  document.addEventListener(TRANSITION_BEFORE_SWAP, (event) => {
    if (!thresholdTimeout) return;

    globalThis.window.clearTimeout(thresholdTimeout);

    element = event.newDocument.querySelector<HTMLDivElement>(selector);

    globalThis.window.clearInterval(trickleInterval);

    trickleInterval = undefined;

    setFinished();
  });
}

export function initialize(elementId: string) {
  document.addEventListener("DOMContentLoaded", () => {
    loadingBar(elementId);
  });
}
