import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { touchUnit, useIsMobile } from '@/controllers/interface/mobile';
import { MuWindows } from '@/controllers/interface/windowManager';
import { useUiViewport } from '@/controllers/interface/components/ui_stage';
import { Hero } from '@/modules/hero';
import { HeroSkills } from '@/modules/skills';
import { MobileSkillSlots } from '@/modules/options/mobileSkillSlots';
import { StatusPlate } from './statusPlate';
import { Joystick } from './joystick';
import { ActionPad } from './actionPad';
import { TopRow } from './topRow';
import { ChatButton } from './chatButton';
import { SkillPicker } from './skillPicker';
import { installTouchItemGestures } from '../../components/item_grid/touchItems';

/**
 * The touch HUD, laid out as our Android client's (themes/mobile, reforge_touch_hud.rcss): sized in
 * `touchUnit` (1vh, capped), so a thumb target is the same share of any phone. This one guard is what makes "mobile only" true for everything under it: on a
 * mouse none of this exists in the DOM at all.
 *
 * It renders into `.hud`, which is `pointer-events: none`, so each control opts itself back in.
 */
export const MobileControls = observer(() => {
  const mobile = useIsMobile();
  const { width, height } = useUiViewport();
  const [picking, setPicking] = useState(-1);
  const character = Hero.name;
  const learned = HeroSkills.skills;

  useEffect(() => {
    if (character) MobileSkillSlots.use(character);
  }, [character]);

  useEffect(() => {
    MobileSkillSlots.prune(learned.map(s => s.number));
  }, [learned]);

  const unit = touchUnit(width, height);
  // Items by finger: tap to pick up, hold for the tooltip, drag to move.
  useEffect(() => (mobile ? installTouchItemGestures() : undefined), [mobile]);

  // On the root: the chat and the windows place themselves in it too.
  useEffect(() => {
    if (mobile) document.documentElement.style.setProperty('--mu-u', `${unit}px`);
  }, [mobile, unit]);

  if (!mobile) return null;
  // Not over the loading screen: the observable page state gates the pad.
  if (AppState.uiState !== UIState.World) return null;

  // A window covers part of the world: the combat controls step aside (`body.window-open`), the
  // portrait, the top row and the radar stay.
  const windowOpen = MuWindows.order.some(id => MuWindows.isSized(id));

  return (
    <div className={`mobile-controls${windowOpen ? ' window-open' : ''}`}>
      <StatusPlate compact={windowOpen} />
      <TopRow />
      {!windowOpen && (
        <>
          <Joystick />
          <ActionPad unit={unit} onPick={setPicking} />
          <ChatButton />
        </>
      )}
      {picking >= 0 && <SkillPicker first={picking} unit={unit} onClose={() => setPicking(-1)} />}
    </div>
  );
});
