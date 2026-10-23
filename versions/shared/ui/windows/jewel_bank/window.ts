import { defineWindow } from '@/controllers/interface/windows';
import { JewelBankWindow } from '.';

export default defineWindow({ id: 'jewel_bank', module: 'jewel_bank', slot: 'hud', order: 102, component: JewelBankWindow });
