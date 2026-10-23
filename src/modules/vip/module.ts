import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'vip',
  install: installNet,
});
