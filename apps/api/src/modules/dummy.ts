import { z } from 'zod';
import { defineRoute, defineModule } from '../../core/module.js';

export default defineModule({
  id: 'auth_test_dummy',
  part: 1,
  register() {
    // Satisfy missing exports for testing
  }
});
