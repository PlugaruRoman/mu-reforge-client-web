/** English text of the guild browsers (our client's Reforge.en.resx `Guild wars *` / `Guild alliance *`). See src/i18n/readme.md. */

const en = {
  'guildBrowser.warsTitle': 'Guild Wars',
  'guildBrowser.allianceTitle': 'Guild Alliance',
  'guildBrowser.columnGuild': 'GUILD',
  'guildBrowser.columnOnline': 'ONLINE',
  'guildBrowser.columnScore': 'SCORE',
  'guildBrowser.search': 'Search guild...',
  'guildBrowser.refresh': 'Refresh',
  'guildBrowser.declare': 'Declare War',
  'guildBrowser.invite': 'Invite to the alliance',
  'guildBrowser.accept': 'Accept',
  'guildBrowser.refuse': 'Refuse',
  'guildBrowser.withdraw': 'Withdraw',
  'guildBrowser.surrender': 'Surrender',
  'guildBrowser.idle1': 'Pick a guild from the list',
  'guildBrowser.warIdle2': 'and declare war on it.',
  'guildBrowser.warMasterOnly': 'Only the guild master can declare a war.',
  'guildBrowser.warRequest': '{name} challenges you to a {type}!',
  'guildBrowser.warSent': 'Waiting for {name} to answer.',
  'guildBrowser.warSentHint': 'It waits for their guild master.',
  'guildBrowser.warAtWar': 'At war with {name} ({type})',
  'guildBrowser.typeWar': 'Guild War',
  'guildBrowser.typeSoccer': 'Battle Soccer',
  'guildBrowser.score': '{own} : {enemy}   (to {max})',
  'guildBrowser.challenge': 'Challenge {name}',
  'guildBrowser.versus': 'vs {name}',
  'guildBrowser.tipMembers': '{count} members online',
  'guildBrowser.tipAlly': 'In your alliance.',
  'guildBrowser.tipCanDeclare': 'Their guild master is online.',
  'guildBrowser.tipMasterOffline': 'Their guild master is offline.',
  'guildBrowser.tipInWarWith': 'Already at war with {name}.',
  'guildBrowser.count': '{count} guilds online',
  'guildBrowser.countFiltered': '{shown} of {total} guilds',
  'guildBrowser.empty': 'No other guild is online.',
  'guildBrowser.noMatch': 'No guild matches the filter.',
  'guildBrowser.allianceMasterOnly': 'Only the guild master can manage the alliance.',
  'guildBrowser.inviteName': 'Invite {name}',
  'guildBrowser.allianceOf': 'of {name}',
  'guildBrowser.allianceRequest': '{name} asks to join your alliance!',
  'guildBrowser.allianceMember': 'Alliance of {name}',
  'guildBrowser.allianceLead': 'You lead it - {count} guilds',
  'guildBrowser.allianceGuest': '{count} guilds in the alliance',
  'guildBrowser.allianceIdle2': 'and invite it into your alliance.',
  'guildBrowser.tipCanInvite': 'Can join your alliance.',
  'guildBrowser.tipInAlliance': 'Already in an alliance.',
  'guildBrowser.tipMemberOf': 'Already allied with {name}.',
  'guildBrowser.tipNotMaster': 'Only the alliance master invites.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/guild_browser': typeof en;
  }
}
