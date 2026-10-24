/** zh-Hant text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': '任務大師',
  'questBoard.accept': '接受',
  'questBoard.claim': '領取',
  'questBoard.noQuests': '沒有可接的任務。',
  'questBoard.allCompleted': '所有任務已完成!',
  'questBoard.questOf': '任務 {n} / {total}',
  'questBoard.progress': '進度: {done} / {need}',
  'questBoard.reward': '獎勵',
  'questBoard.active': '進行中的任務',
} satisfies Partial<Record<keyof typeof en, string>>;
