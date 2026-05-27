import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource'; // 💡追加
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
});