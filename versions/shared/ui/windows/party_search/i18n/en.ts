/** English text of the `party_search` window (our client's Reforge.en.resx `PartySearch*`). See src/i18n/readme.md. */

const en = {
  'partySearch.title': 'Party Search',
  'partySearch.find': 'Find',
  'partySearch.create': 'Create',
  'partySearch.settings': 'Settings',
  'partySearch.password': 'Password',
  'partySearch.myParty': 'My party',
  'partySearch.listed': 'Listed',
  'partySearch.notListed': 'Not listed',
  'partySearch.found': '{count} found',
  'partySearch.column.name': 'Name',
  'partySearch.column.map': 'Map',
  'partySearch.column.members': 'Cnt',
  'partySearch.join': 'Join',
  'partySearch.locked': 'Password protected',
  'partySearch.empty': 'No parties are listed.',
  'partySearch.autoRefresh': 'The list refreshes by itself.',
  'partySearch.levelGapHint': 'Members may be at most {gap} levels apart (master levels do not count).',
  'partySearch.refresh': 'Refresh',
  'partySearch.advertisement': 'Advertisement',
  'partySearch.masterOnly': 'master only',
  'partySearch.listMyParty': 'List My Party',
  'partySearch.maxLevel': 'Max Level',
  'partySearch.anyLevel': 'Any',
  'partySearch.autoAccept': 'Auto Accept Party',
  'partySearch.restrictions': 'Restrictions',
  'partySearch.onlyGuild': 'Only Guild',
  'partySearch.onlyAlliance': 'Only Alliance',
  'partySearch.onePerClass': 'One Per Class',
  'partySearch.allowedClasses': 'Allowed Classes',
  'partySearch.anyClass': 'any class',
  'partySearch.selectedOf': '{count} of {total}',
  'partySearch.class.0': 'Wizard',
  'partySearch.class.1': 'Knight',
  'partySearch.class.2': 'Elf',
  'partySearch.class.3': 'Gladiator',
  'partySearch.class.4': 'Dark Lord',
  'partySearch.class.5': 'Summoner',
  'partySearch.class.6': 'Fighter',
  'partySearch.save': 'Save',
  'partySearch.fail.notFound': 'Party not available.',
  'partySearch.fail.wrongPassword': 'Wrong password.',
  'partySearch.fail.full': 'Party is full.',
  'partySearch.fail.levelTooHigh': 'Your level is too high.',
  'partySearch.fail.classNotAllowed': 'Class not accepted.',
  'partySearch.fail.guildOnly': 'Guild members only.',
  'partySearch.fail.allianceOnly': 'Alliance members only.',
  'partySearch.fail.duplicateClass': 'Class already in party.',
  'partySearch.fail.alreadyInParty': 'Already in a party.',
  'partySearch.fail.levelGap': 'Level gap over {gap} levels.',
  'partySearch.fail.error': 'Cannot join right now.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/party_search': typeof en;
  }
}
