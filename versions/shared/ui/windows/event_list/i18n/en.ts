/** English text of the `event_list` window. See src/i18n/readme.md. */

const en = {
  'eventList.title': 'Event List',
  'eventList.loading': 'Loading events...',
  'eventList.empty': 'No events available.',
  'eventList.noLimit': 'no limit',
  'eventList.left': '{n} left',
  'eventList.resetHint': 'Entries reset at 00:00 UTC',
  'eventList.open': 'OPEN',
  'eventList.running': 'RUNNING',
  'eventList.ended': 'ENDED',
  'eventList.entry.bloodCastle': 'Messenger of Arch. in Devias',
  'eventList.entry.devilSquare': 'Charon in Noria (Invitation)',
  'eventList.entry.chaosCastle': 'Use the Armor of Guardsman',
  'eventList.entry.illusionTemple': 'Mirage in Devias / Elbeland',
  'eventList.timer': 'Event Timer',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/event_list': typeof en;
  }
}
