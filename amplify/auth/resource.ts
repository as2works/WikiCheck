import { defineAuth } from '@aws-amplify/backend';

// Cognitoリソースを定義し、未認証（ゲスト）アクセスを有効化
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  allowUnauthenticatedIdentities: true, // ゲストアクセスを許可
});