import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'guild_bank',
  requires: ['guild'],
  install: installNet,
});
