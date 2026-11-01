import { defineWindow } from '@/controllers/interface/windows';
import { GuildAllianceWindow, GuildWarsWindow } from '.';

// Toggled by the Guild Wars / Guild Alliance plates of the guild window (its master only), just above it.
export default [
  defineWindow({ id: 'guild_wars', module: 'guild_browser', slot: 'hud', order: 272, component: GuildWarsWindow }),
  defineWindow({ id: 'guild_alliance', module: 'guild_browser', slot: 'hud', order: 273, component: GuildAllianceWindow }),
];
