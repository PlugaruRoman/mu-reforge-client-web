import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { HeroSkills, skills } from '@/modules/skills';
import { isHotbarSkill } from '@/modules/skills/skillCasting';
import { MobileSkillSlots } from '@/modules/options/mobileSkillSlots';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { SkillIcon } from '../../components/skill_icon';
import { MobileButton } from './mobileButton';
import { TouchIcon } from './icons';
import { TOUCH_SKILL_BUTTONS, touchSkillButtons } from './touchSkills';

/** The large button's slot in the picker, after the four skill buttons. */
const MAIN = TOUCH_SKILL_BUTTONS;

const Art = observer(({ number, size }: { number: number; size: number }) => (
  <div className="touch-skill-art" style={{ transform: `translate(-50%, -50%) scale(${size / 28})` }}>
    <SkillIcon number={number} disabled={!skills.requirementsMet(number)} />
  </div>
));

/**
 * Our Android client's skill picker (`#picker`): the five buttons on top, the one being chosen for
 * lit; the learned skills under them, the one on that button marked. A skill tapped goes on the lit
 * button and the next one lights. The skill buttons are the bar's hot keys 1-4 (the server keeps
 * them); the large button's skill is this browser's (`MobileSkillSlots`), without one it attacks.
 */
export const SkillPicker = observer(({ first, unit, onClose }: { first: number; unit: number; onClose: () => void }) => {
  const [selected, setSelected] = useState(first);
  const learned = HeroSkills.skills.map(s => s.number).filter(isHotbarSkill);
  const buttons = touchSkillButtons(HeroSkills.skillHotkeys, learned);
  const main = MobileSkillSlots.slots[0] ?? -1;
  const slots = [...buttons, main];
  const assign = (number: number) => {
    if (selected === MAIN) MobileSkillSlots.assign(0, number);
    else HeroSkills.assignSkillHotkey(selected + 1, number);
  };

  return (
    <div className="touch-picker-backdrop" onPointerDown={onClose}>
      <div className="touch-picker" onPointerDown={e => e.stopPropagation()}>
        <div className="touch-picker-title">{t('skills.title')}</div>
        <div className="touch-picker-slots">
          {slots.map((number, slot) => (
            <MobileButton
              key={slot}
              className={`touch-picker-slot${slot === MAIN ? ' main' : ''}${slot === selected ? ' selected' : ''}`}
              onTap={() => setSelected(slot)}
            >
              {() =>
                number >= 0 ? <Art number={number} size={unit * 10} /> : slot === MAIN ? <TouchIcon name="attack" /> : null
              }
            </MobileButton>
          ))}
        </div>
        <div className="touch-picker-skills">
          {learned.length === 0 && <div className="touch-picker-empty">{t('skills.empty')}</div>}
          {learned.map(number => (
            <MobileButton
              key={number}
              className={`touch-picker-skill${slots[selected] === number ? ' chosen' : ''}`}
              title={skillDefinition(number)?.name ?? ''}
              onTap={() => {
                assign(number);
                setSelected(s => (s + 1) % slots.length);
              }}
            >
              {() => <Art number={number} size={unit * 9} />}
            </MobileButton>
          ))}
        </div>
        <div className="touch-picker-buttons">
          <MobileButton className="touch-picker-button" onTap={() => assign(-1)}>
            {() => t('common.none')}
          </MobileButton>
          <MobileButton className="touch-picker-button primary" onTap={onClose}>
            {() => t('common.close')}
          </MobileButton>
        </div>
      </div>
    </div>
  );
});
