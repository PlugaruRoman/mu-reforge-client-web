import './style.less';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import {
  QUEST_BOARD_WINDOW,
  QuestBoard,
  acceptQuest,
  canAccept,
  canClaim,
  claimQuest,
  closeQuestBoard,
  currentQuest,
  goalReached,
  progress,
} from '@/modules/quest_board';
import { ReforgeShell, RfButton } from '../_shared/reforgeShell';

/**
 * Captain Slough's quest board (our C++ client's UI/QuestBoard/QuestBoardWindow.cpp,
 * reforge_quest_board.rml): the current quest of the map's chain, its kills, its reward and
 * Accept / Claim, then the active quests of every chain (the T window's rows, ActiveBoardQuests.cpp).
 */

/**
 * `CQuestBoardWindow` (reforge_quest_board.rml), 230 x 214: the quest box (112 high: step, name, the kill
 * bar and its text, the reward), then Accept | Claim | Close. The other chains' active quests (our
 * client's T window rows) are the box's tooltip here.
 */
const Window = observer(() => {
  const board = QuestBoard.board;
  const at = currentQuest(board);
  const quest = at >= 0 ? board[at] : null;
  const others = QuestBoard.active.filter(q => !quest || q.name !== quest.name);
  const tip = others.length
    ? [t('questBoard.active'), ...others.map(q => `${q.name}  ${t('questBoard.progress', { done: q.currentKills, need: q.requiredKills })}`)].join('\n')
    : undefined;
  return (
    <ReforgeShell id={QUEST_BOARD_WINDOW} title={t('questBoard.title')} height={214} closeButton={false} className="quest-board" onClose={closeQuestBoard}>
      {quest ? (
        <div className="qb-quest" title={tip}>
          <div className="qb-step">{t('questBoard.questOf', { n: at + 1, total: board.length })}</div>
          <div className="qb-name">{quest.name}</div>
          <div className={`qb-progress${goalReached(quest) ? ' done' : ''}`}>
            <div className="qb-bar">
              <div style={{ width: `${Math.round(progress(quest) * 100)}%` }} />
            </div>
            <div className="qb-progress-text">{t('questBoard.progress', { done: quest.currentKills, need: quest.requiredKills })}</div>
          </div>
          <div className="qb-reward-label">{t('questBoard.reward')}</div>
          <div className="qb-reward">{quest.reward}</div>
        </div>
      ) : (
        <div className={`qb-empty${board.length ? ' done' : ''}`} title={tip}>
          {t(board.length ? 'questBoard.allCompleted' : 'questBoard.noQuests')}
        </div>
      )}
      <div className="qb-actions">
        <RfButton small label={t('questBoard.accept')} disabled={!quest || !canAccept(quest)} onClick={acceptQuest} />
        <RfButton small label={t('questBoard.claim')} disabled={!quest || !canClaim(quest)} onClick={claimQuest} />
        <RfButton small label={t('common.close')} onClick={closeQuestBoard} />
      </div>
    </ReforgeShell>
  );
});

/** Registered by `window.ts`. */
export const QuestBoardWindow = observer(() => {
  if (!MuWindows.isOpen(QUEST_BOARD_WINDOW)) return null;
  return <Window />;
});

