// netlify/functions/ad-terms.ts
// Public read: the current ad publication terms.
//
// Served from the backend rather than duplicated in the frontend so there is
// ONE source of truth. `ad-checkout` rejects a submission whose accepted
// version does not match this exact text, which would be impossible to
// guarantee if the UI carried its own copy.
import type { HandlerEvent } from '@netlify/functions';
import { buildAdPublicationTerms } from './lib/adModeration';

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      // Terms change rarely; a short cache keeps the form snappy without
      // risking a stale version surviving a deploy for long.
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify(buildAdPublicationTerms()),
  };
};
