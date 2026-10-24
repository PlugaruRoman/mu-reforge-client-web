/** ko text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': '퀘스트 마스터',
  'questBoard.accept': '수락',
  'questBoard.claim': '보상 받기',
  'questBoard.noQuests': '진행할 수 있는 퀘스트가 없습니다.',
  'questBoard.allCompleted': '모든 퀘스트 완료!',
  'questBoard.questOf': '퀘스트 {n} / {total}',
  'questBoard.progress': '진행: {done} / {need}',
  'questBoard.reward': '보상',
  'questBoard.active': '진행 중인 퀘스트',
} satisfies Partial<Record<keyof typeof en, string>>;
