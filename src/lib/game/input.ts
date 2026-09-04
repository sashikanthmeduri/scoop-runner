export type Actions = {
  jump: boolean;
  slide: boolean;
  jumpPressed: boolean;
  slidePressed: boolean;
};

const JUMP_CODES = new Set(["Space", "ArrowUp", "KeyW", "KeyZ"]);
const SLIDE_CODES = new Set(["ArrowDown", "KeyS", "ControlLeft", "ControlRight"]);
const PAUSE_CODES = new Set(["Escape", "KeyP"]);

export class Input {
  private keys = new Set<string>();
  private prevJump = false;
  private prevSlide = false;
  jumpHeld = false;
  slideHeld = false;
  pausePressed = false;
  private pauseArmed = false;
  pointerJump = false;
  pointerSlide = false;
  private unbind: Array<() => void> = [];

  attach(target: HTMLElement) {
    const onDown = (e: KeyboardEvent) => {
      if (JUMP_CODES.has(e.code) || SLIDE_CODES.has(e.code) || PAUSE_CODES.has(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (PAUSE_CODES.has(e.code)) this.pauseArmed = true;
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });

    const onPointer = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y > rect.height * 0.72) return;
      if (x < rect.width * 0.42) this.pointerSlide = true;
      else this.pointerJump = true;
    };
    const onPointerUp = () => {
      this.pointerJump = false;
      this.pointerSlide = false;
    };
    target.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    this.unbind.push(
      () => window.removeEventListener("keydown", onDown),
      () => window.removeEventListener("keyup", onUp),
      () => window.removeEventListener("blur", clear),
      () => target.removeEventListener("pointerdown", onPointer),
      () => window.removeEventListener("pointerup", onPointerUp),
      () => window.removeEventListener("pointercancel", onPointerUp),
    );
  }

  setJump(v: boolean) {
    this.pointerJump = v;
  }

  setSlide(v: boolean) {
    this.pointerSlide = v;
  }

  sample(): Actions {
    let jump = this.pointerJump;
    let slide = this.pointerSlide;
    for (const code of this.keys) {
      if (JUMP_CODES.has(code)) jump = true;
      if (SLIDE_CODES.has(code)) slide = true;
    }
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
    if (pads) {
      for (const pad of pads) {
        if (!pad) continue;
        if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) jump = true;
        if (pad.buttons[1]?.pressed || pad.buttons[13]?.pressed) slide = true;
        if (pad.buttons[9]?.pressed) this.pauseArmed = true;
      }
    }
    const jumpPressed = jump && !this.prevJump;
    const slidePressed = slide && !this.prevSlide;
    this.prevJump = jump;
    this.prevSlide = slide;
    this.jumpHeld = jump;
    this.slideHeld = slide;
    this.pausePressed = this.pauseArmed;
    this.pauseArmed = false;
    return { jump, slide, jumpPressed, slidePressed };
  }

  destroy() {
    for (const fn of this.unbind) fn();
    this.unbind = [];
  }
}
