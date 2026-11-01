/** English text of the `reforge_menu` window. See src/i18n/readme.md. */

const en = {
  'reforgeMenu.title': 'Mu Reforge',
  'reforgeMenu.settings': 'Settings',
  'reforgeMenu.requests': 'Allow requests',
  'reforgeMenu.tabWindows': 'Windows',
  'reforgeMenu.tabSettings': 'View & HUD',
  'reforgeMenu.footerIdle': 'Click an entry, or press its key',
  'reforgeMenu.notAvailable': 'Not available right now',
  'reforgeMenu.stateOn': 'On',
  'reforgeMenu.stateOff': 'Off',
  'reforgeMenu.stateOpen': 'Open',
  'reforgeMenu.radar': 'Radar',
  'reforgeMenu.camera3d': 'Camera 3D',
  'reforgeMenu.resetView': 'Reset View',
  'reforgeMenu.autoParty': 'Auto Party',
  'reforgeMenu.weather': 'Weather effects',
  'reforgeMenu.huntLogPosition': 'Reset Log position',
  'reforgeMenu.muteBackground': 'Mute in background',
  'reforgeMenu.launcher': 'Menu (N)',
  'reforgeMenu.launcherHint': 'Every MU Reforge window and setting',
  'reforgeMenu.desc.reset': 'Reset your character for bonus points',
  'reforgeMenu.desc.addStats': 'Spend level-up points, or split them automatically',
  'reforgeMenu.desc.jewelBank': 'Store and withdraw jewels',
  'reforgeMenu.desc.eventTimer': 'When every timed event starts',
  'reforgeMenu.desc.vip': 'Buy or extend a VIP subscription',
  'reforgeMenu.desc.soul': 'Spend Soul Points on permanent bonuses',
  'reforgeMenu.desc.partySearch': 'Advertise your party, or join one',
  'reforgeMenu.desc.deathRecords': 'Who killed you, and who you killed',
  'reforgeMenu.desc.guestAccess': 'Lend your account a limited login',
  'reforgeMenu.desc.eventList': 'The events running now and how full they are',
  'reforgeMenu.desc.huntLog': 'Experience, kills and drops of this hunt',
  'reforgeMenu.desc.market': 'Search every open player store',
  'reforgeMenu.desc.itemCollections': 'Register items into collections for permanent account bonuses',
  'reforgeMenu.desc.options': 'Display, graphics, sound, gameplay and interface settings',
  'reforgeMenu.desc.radar': 'The corner minimap of the map you are on',
  'reforgeMenu.desc.camera3d': 'The original camera: zoom and turn the view',
  'reforgeMenu.desc.resetView': 'Put the camera back where it was',
  'reforgeMenu.desc.autoParty': 'Accept party invitations on their own',
  'reforgeMenu.desc.requests': 'Allow trade, party, duel and friend requests',
  'reforgeMenu.desc.weather': 'Rain and weather effects on the maps',
  'reforgeMenu.desc.huntLogPosition': 'Put the Hunting Log back in its corner (drag its title to move it)',
  'reforgeMenu.desc.muteBackground': 'Silence the music and sounds while the game is in the background',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/reforge_menu': typeof en;
  }
}
