import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*
 * This file defines the backend data model for AWS Amplify Gen 2.
 * The 'content' field stores the JSON stringified array of ChecklistItems.
 */

const schema = a.schema({
  Checklist: a.model({
    title: a.string().required(),
    content: a.string().required(), // Stores JSON.stringify(ChecklistItem[])
    category: a.string(), // Tab group name
    order: a.integer(),   // For manual sorting
  })
  .authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});