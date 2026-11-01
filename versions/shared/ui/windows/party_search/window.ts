import { defineWindow } from '@/controllers/interface/windows';
import { PartySearchWindow } from '.';

export default defineWindow({ id: 'party_search', module: 'party_search', slot: 'hud', order: 262, component: PartySearchWindow });
