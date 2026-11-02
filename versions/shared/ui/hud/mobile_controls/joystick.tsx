import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { releaseTouchStick, setTouchStick } from '@/controllers/interface/touchStick';
import { capture } from './mobileButton';

/**
 * The virtual joystick (our Android client's `#joystick_zone` / `#joystick_base` / `#joystick_live`):
 * a thumb anywhere in the lower left zone puts the stick under it, the knob follows the thumb up to
 * the stick's radius, and the walk (`TouchStick`, read by `playerControllerSystem`) follows the knob.
 * At rest the stick waits faded in the corner.
 */
export const Joystick = observer(() => {
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const held = useRef<{ id: number; x: number; y: number; radius: number } | null>(null);

  // A thumb still down when the HUD goes (a window opens, the map changes) must not walk on.
  useEffect(() => () => releaseTouchStick(), []);

  const end = () => {
    held.current = null;
    releaseTouchStick();
    setLive(null);
  };

  return (
    <>
      <div
        className="touch-joystick-zone"
        onPointerDown={e => {
          if (held.current) return;
          e.stopPropagation();
          capture(e);
          // The knob's travel: half the stick's drawn width.
          const radius = (base.current?.offsetWidth ?? 120) / 2;
          held.current = { id: e.pointerId, x: e.clientX, y: e.clientY, radius };
          setTouchStick(0, 0, radius);
          setLive({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={e => {
          const at = held.current;
          if (!at || e.pointerId !== at.id) return;
          const dx = e.clientX - at.x;
          const dy = e.clientY - at.y;
          setTouchStick(dx, dy, at.radius);
          // Straight to the element: the knob moves every pointer event, React need not.
          const length = Math.hypot(dx, dy);
          const k = length > at.radius ? at.radius / length : 1;
          if (knob.current) knob.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
        }}
        onPointerUp={e => held.current?.id === e.pointerId && end()}
        onPointerCancel={e => held.current?.id === e.pointerId && end()}
        onContextMenu={e => e.preventDefault()}
      />
      <div ref={base} className={`touch-joystick at-rest${live ? ' off' : ''}`}>
        <div className="touch-joystick-knob" />
      </div>
      {live && (
        <div className="touch-joystick live" style={{ left: live.x, top: live.y }}>
          <div ref={knob} className="touch-joystick-knob" />
        </div>
      )}
    </>
  );
});
