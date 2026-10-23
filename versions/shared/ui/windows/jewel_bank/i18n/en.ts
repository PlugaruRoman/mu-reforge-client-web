/** English text of the `jewel_bank` window (our client's Reforge.en.resx `Jewel bank *`). See src/i18n/readme.md. */

const en = {
  'jewelBank.title': 'Jewel Bank',
  'jewelBank.jewel': 'Jewel',
  'jewelBank.stored': 'Stored',
  'jewelBank.take': 'Take',
  'jewelBank.hint': 'Right-click jewels in the bag to store',
  'jewelBank.vip': 'VIP',
  'jewelBank.jewel.0': 'Bless',
  'jewelBank.jewel.1': 'Soul',
  'jewelBank.jewel.2': 'Life',
  'jewelBank.jewel.3': 'Creation',
  'jewelBank.jewel.4': 'Guardian',
  'jewelBank.jewel.5': 'Gemstone',
  'jewelBank.jewel.6': 'Harmony',
  'jewelBank.jewel.7': 'Chaos',
  'jewelBank.jewel.8': 'Low Refine',
  'jewelBank.jewel.9': 'High Refine',
  'jewelBank.jewel.10': 'Skill',
  'jewelBank.jewel.11': 'Luck',
  'jewelBank.jewel.12': 'Sea',
  'jewelBank.jewel.13': 'Chaos Asm',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/jewel_bank': typeof en;
  }
}
