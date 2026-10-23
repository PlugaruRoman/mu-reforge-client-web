import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'vault_pages',
  requires: ['vault'],
  install: installNet,
});
