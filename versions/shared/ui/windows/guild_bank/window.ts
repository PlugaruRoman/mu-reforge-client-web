import { defineWindow } from '@/controllers/interface/windows';
import { GuildBankWindow, GuildBankPrompts, GuildSettingsWindow } from '.';

export default [
  defineWindow({ id: 'guild_bank', module: 'guild_bank', slot: 'hud', order: 101, component: GuildBankWindow }),
  defineWindow({ id: 'guild_settings', module: 'guild_bank', slot: 'hud', order: 271, component: GuildSettingsWindow }),
  defineWindow({ id: 'guild_bank_prompts', module: 'guild_bank', slot: 'hud', order: 351, component: GuildBankPrompts }),
];
