import { defineModule } from '../module';
import { installNet } from './net';
import { Commands } from './commands';
import { setLocalCommands } from '../social/social';
import { Hero } from '../hero';
import { setItemLinkBag } from './chatItemLinks';

export default defineModule({
  id: 'chat',
  core: true,
  install() {
    setLocalCommands(Commands);
    setItemLinkBag(() => Hero.items);
    installNet();
  },
});
