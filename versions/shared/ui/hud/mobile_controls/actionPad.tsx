import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Bag } from '@/modules/inventory';
import { Hero } from '@/modules/hero';
import { moduleOn } from '@/modules/module';
import { MuHelper } from '@/modules/mu_helper';
import { toggleMuHelperWindow } from '@/modules/mu_helper/state';
import { skills, HeroSkills } from '@/modules/skills';
import { onCooldownTick } from '@/modules/skills/cooldowns';
import { isHotbarSkill } from '@/modules/skills/skillCasting';
import { countHotkeyItems, findHotkeyItem } from '@/modules/inventory/itemHotkeys';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { gameVersion } from '@/version';
import { SkillIcon } from '../../components/skill_icon';
import { MobileButton } from './mobileButton';
import { TouchIcon } from './icons';
import { attack, attackHeld, castSkill } from './touchActions';
import { touchSkillButtons } from './touchSkills';
import { MobileSkillSlots } from '@/modules/options/mobileSkillSlots';

const POTION_KEYS = ['Q', 'W', 'E', 'R'];

/** A skill's 20 x 28 art scaled to `height` px, with the delay sweep of a bar slot over the plate. */
const SkillArt = observer(({ number, height }: { number: number; height: number }) => {
  const sweep = useRef<HTMLDivElement>(null);
  // RenderSkillDelay: written straight to the element on the cooldown tick, never through React.
  useEffect(() => {
    const tick = () => {
      const el = sweep.current;
      if (!el) return;
      const delay = skills.cooldown(number);
      const css = delay ? `${Math.round(delay.fraction * 100)}%` : '0%';
      if (el.style.height !== css) el.style.height = css;
    };
    tick();
    return onCooldownTick(tick);
  }, [number]);
  return (
    <>
      <div className="touch-skill-art" style={{ transform: `translate(-50%, -50%) scale(${height / 28})` }}>
        <SkillIcon number={number} disabled={!skills.requirementsMet(number)} />
      </div>
      <div ref={sweep} className="touch-cooldown" />
    </>
  );
});

const SkillButton = observer(({ index, number, unit, onPick }: { index: number; number: number; unit: number; onPick: () => void }) => (
  <MobileButton
    className={`touch-btn touch-skill touch-skill-${index}${number >= 0 && number === HeroSkills.currentSkill ? ' selected' : ''}`}
    title={number >= 0 ? (skillDefinition(number)?.name ?? '') : t('skills.title')}
    onTap={() => (number >= 0 ? castSkill(number) : onPick())}
    onLongPress={onPick}
  >
    {() => (number >= 0 ? <SkillArt number={number} height={unit * 10.6} /> : null)}
  </MobileButton>
));

/**
 * The large button (`#attack`): the skill the player put on it, cast again while held; without one the
 * plain attack on the held or nearest monster, moving on to the next while held.
 */
const AttackButton = observer(({ unit }: { unit: number }) => {
  const main = MobileSkillSlots.slots[0] ?? -1;
  const skill = main >= 0 && HeroSkills.skills.some(s => s.number === main) ? main : -1;
  const repeat = useRef(0);
  useEffect(() => () => cancelAnimationFrame(repeat.current), []);
  const start = () => {
    cancelAnimationFrame(repeat.current);
    const loop = () => {
      if (skill >= 0) castSkill(skill);
      else attackHeld();
      repeat.current = requestAnimationFrame(loop);
    };
    repeat.current = requestAnimationFrame(loop);
  };
  return (
    <MobileButton
      className={`touch-btn touch-attack${skill >= 0 ? ' has-skill' : ''}`}
      title={skill >= 0 ? (skillDefinition(skill)?.name ?? '') : t('command.attack')}
      onPress={() => {
        if (skill >= 0) castSkill(skill);
        else attack();
        start();
      }}
      onRelease={() => cancelAnimationFrame(repeat.current)}
    >
      {() => (skill >= 0 ? <SkillArt number={skill} height={unit * 17} /> : <TouchIcon name="attack" />)}
    </MobileButton>
  );
});

/** A Q/W/E/R slot as a small round plate; a slot with nothing to drink is not drawn (`touch-empty`). */
const PotionButton = observer(({ index }: { index: number }) => {
  const items = Hero.items;
  const hotkey = Bag.itemHotkeys[index];
  const slot = findHotkeyItem(items, index, hotkey);
  const item = slot >= 0 ? items[slot] : null;
  if (!item) return null;
  const count = countHotkeyItems(items, index, hotkey);
  return (
    <MobileButton
      className={`touch-btn touch-potion touch-potion-${index}`}
      title={t('bottomBar.itemSlot', { name: itemBaseName(item.group, item.num) ?? '', key: POTION_KEYS[index] })}
      onTap={() => Bag.useItemHotkey(index)}
    >
      {() => (
        <>
          <div className="touch-potion-art">
            <ItemIcon item={item} />
          </div>
          {count > 0 && <div className="touch-potion-count">{count}</div>}
        </>
      )}
    </MobileButton>
  );
});

/**
 * The bottom right cluster of our Android client's touch HUD (reforge_touch_hud.rcss, its last
 * layout): the large button in the corner, the four skills in a staircase round it, the picker's gear
 * above them, the MU Helper and its settings left of them, the potions in a row above those.
 */
export const ActionPad = observer(({ unit, onPick }: { unit: number; onPick: (slot: number) => void }) => {
  const learned = HeroSkills.skills.map(s => s.number).filter(isHotbarSkill);
  const buttons = touchSkillButtons(HeroSkills.skillHotkeys, learned);
  const helper = moduleOn('mu_helper');
  return (
    <>
      <AttackButton unit={unit} />
      {buttons.map((number, i) => (
        <SkillButton key={i} index={i} number={number} unit={unit} onPick={() => onPick(i)} />
      ))}
      <MobileButton className="touch-btn touch-skill-edit" title={t('skills.title')} onTap={() => onPick(0)}>
        {() => <TouchIcon name="skillSettings" />}
      </MobileButton>
      {helper && (
        <>
          <MobileButton
            className={`touch-btn touch-helper${MuHelper.active ? ' active' : ''}`}
            title={t(MuHelper.active ? 'muHelperButtons.stop' : 'muHelperButtons.start')}
            onTap={() => MuHelper.toggleMuHelper()}
          >
            {() => <TouchIcon name="helper" />}
          </MobileButton>
          <MobileButton className="touch-btn touch-helper-settings" title={t('muHelperButtons.settings')} onTap={() => toggleMuHelperWindow()}>
            {() => <TouchIcon name="helperSettings" />}
          </MobileButton>
        </>
      )}
      {POTION_KEYS.slice(0, gameVersion.features.itemHotkeys.slots).map((key, i) => (
        <PotionButton key={key} index={i} />
      ))}
    </>
  );
});
