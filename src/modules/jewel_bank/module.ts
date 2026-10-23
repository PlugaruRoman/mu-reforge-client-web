import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'jewel_bank',
  install: installNet,
});
