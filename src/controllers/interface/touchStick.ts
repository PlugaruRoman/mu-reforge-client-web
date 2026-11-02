/**
 * The phone's on-screen joystick (the mobile HUD writes it, the walk in `playerControllerSystem`
 * reads it once a frame): x right, y down on the screen, 0..1 long. `held` is false while no thumb
 * is on it. Our Android client's `Controls::JoystickDirection` (UI/Touch/TouchControls.h).
 */
export const TouchStick = { x: 0, y: 0, held: false };

/** Below this fraction of the radius the stick reads as centred (`JoystickDeadZone`). */
export const TOUCH_STICK_DEAD_ZONE = 0.2;

/** The thumb's offset from the stick's centre, in pixels, against its radius. */
export function setTouchStick(dx: number, dy: number, radius: number): void {
  const length = Math.hypot(dx, dy) / radius;
  const scale = length < TOUCH_STICK_DEAD_ZONE ? 0 : Math.min(1, length) / (length || 1);
  TouchStick.x = (dx / radius) * scale;
  TouchStick.y = (dy / radius) * scale;
  TouchStick.held = true;
}

export function releaseTouchStick(): void {
  TouchStick.x = 0;
  TouchStick.y = 0;
  TouchStick.held = false;
}
