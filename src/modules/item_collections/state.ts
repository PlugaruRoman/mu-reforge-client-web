import { makeAutoObservable } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { playUiSound } from '@/controllers/sound';
import { addNotification } from '../chat';
import { Session } from '../session';
import { RegisterResult, listRequest, parseCatalog, registerRequest, type Collection } from './catalog';

/** The refusal a register answer says (ItemCollectionText.cpp `RefusalText`); none for success or "not now". */
const REFUSALS: Readonly<Record<number, TextKey>> = {
  [RegisterResult.UnknownCollection]: 'itemCollections.result.unknown',
  [RegisterResult.AlreadyFilled]: 'itemCollections.result.alreadyFilled',
  [RegisterResult.ItemMismatch]: 'itemCollections.result.noItem',
  [RegisterResult.LevelTooLow]: 'itemCollections.result.levelTooLow',
  [RegisterResult.ExcellentRequired]: 'itemCollections.result.excellentRequired',
  [RegisterResult.ItemNotAllowed]: 'itemCollections.result.notAllowed',
  [RegisterResult.AncientRequired]: 'itemCollections.result.ancientRequired',
  [RegisterResult.OptionsMissing]: 'itemCollections.result.optionsMissing',
};

/**
 * The account's collections as the server last sent them (FA 01), and the requests the window
 * makes. Mirrors our client's GameLogic/Reforge/ReforgeItemCollections (SetCollections, HasCatalog).
 */
export const ItemCollections = new (class {
  collections: Collection[] = [];
  /** A catalog has arrived since login. */
  hasCatalog = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** FA 01 received. */
  catalogReceived(view: DataView): void {
    this.collections = parseCatalog(view);
    this.hasCatalog = true;
  }

  /** FA 02 received (ItemCollectionUpdates.cpp `RegisterAnswerReceived`). */
  registerAnswered(result: number): void {
    if (result === RegisterResult.Registered || result === RegisterResult.Completed) {
      // The server sends the catalog again by itself.
      playUiSound('getItem');
      return;
    }
    // "Not now" (trade, mix, guest): the server has said why in the chat already.
    const refusal = REFUSALS[result];
    if (refusal) addNotification(t(refusal), 'error');
    this.requestList();
  }

  /** FA 01 out: the window opened. */
  requestList(): void {
    if (Session.isOffline) return;
    Session.sendToGS(listRequest());
  }

  /** FA 02 out: the weakest fitting inventory item into `slot` of collection `number`. */
  register(number: number, slot: number): void {
    if (Session.isOffline) return;
    Session.sendToGS(registerRequest(number, slot));
  }

  /** The session ended: the next login asks again. */
  forget(): void {
    this.collections = [];
    this.hasCatalog = false;
  }
})();
