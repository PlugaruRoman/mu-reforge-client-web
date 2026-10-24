/** bn text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'কোয়েস্ট মাস্টার',
  'questBoard.accept': 'গ্রহণ করুন',
  'questBoard.claim': 'নিন',
  'questBoard.noQuests': 'কোনো কোয়েস্ট নেই।',
  'questBoard.allCompleted': 'সব কোয়েস্ট সম্পন্ন!',
  'questBoard.questOf': 'কোয়েস্ট {n} / {total}',
  'questBoard.progress': 'অগ্রগতি: {done} / {need}',
  'questBoard.reward': 'পুরস্কার',
  'questBoard.active': 'সক্রিয় কোয়েস্ট',
} satisfies Partial<Record<keyof typeof en, string>>;
