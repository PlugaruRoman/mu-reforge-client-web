import { EventBus } from '@/core/eventBus';
import { parseRegisterResult } from './catalog';
import { ItemCollections } from './state';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // C2 FA 01 (S RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs:36-112).
  EventBus.on('ItemCollectionList', packet => ItemCollections.catalogReceived(packet));

  // C1 FA 02 (ItemCollectionViewPlugIn.cs:114-139).
  EventBus.on('ItemCollectionRegisterResult', packet => {
    const answer = parseRegisterResult(packet);
    if (answer) ItemCollections.registerAnswered(answer.result);
  });

  EventBus.on('wsClosed', () => ItemCollections.forget());
}
