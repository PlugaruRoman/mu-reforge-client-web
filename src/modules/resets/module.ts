import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'resets',
  install: installNet,
});
