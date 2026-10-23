import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'reforge_market',
  install: installNet,
});
