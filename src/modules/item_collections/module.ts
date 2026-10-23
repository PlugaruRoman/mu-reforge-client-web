import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'item_collections',
  install: installNet,
});
