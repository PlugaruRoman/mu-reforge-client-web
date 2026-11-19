/** English text of the `buff_bar` HUD element. See src/i18n/readme.md. */

const en = {
  'buff.debuff': 'Debuff',
  'buff.remainingSec': '{seconds} sec',
  'buff.remainingMin': '{minutes} min {seconds} sec',
  'buff.remainingHour': '{hours} h {minutes} min',
  'buff.remainingDay': '{days} d {hours} h',
  // What an effect adds (C1 ED 02), keyed by the server's MagicEffectValuesPacket.ValueKind.
  'buff.value.1': 'Attack power',
  'buff.value.2': 'Defense',
  'buff.value.3': 'Attack speed',
  'buff.value.4': 'Max HP',
  'buff.value.5': 'Max mana',
  'buff.value.6': 'Critical damage chance',
  'buff.value.7': 'Excellent damage chance',
  'buff.value.8': 'Critical damage',
  'buff.value.9': 'Ignore defense chance',
  'buff.value.10': 'Double damage chance',
  'buff.value.11': 'Damage reflection',
  'buff.value.12': 'Damage absorption',
  'buff.value.13': 'Wizardry damage',
  'buff.value.14': 'Min wizardry damage',
  'buff.value.15': 'Max wizardry damage',
  'buff.value.16': 'Min attack power',
  'buff.value.17': 'Max attack power',
  'buff.value.18': 'Damage',
  'buff.value.19': 'Defense rate',
  'buff.value.20': 'PvP defense rate',
  'buff.value.21': 'Attack rate',
  'buff.value.22': 'Experience',
  'buff.value.23': 'Master experience',
  'buff.value.24': 'Item drop rate',
  'buff.value.25': 'Movement speed',
  'buff.value.26': 'PvP attack rate',
  'buff.value.27': 'AG recovery',
  'buff.value.28': 'Ice resistance',
  'buff.value.29': 'Lightning resistance',
  'buff.value.30': 'Curse damage',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/buff_bar': typeof en;
  }
}
