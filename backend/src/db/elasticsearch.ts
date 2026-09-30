import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const EMAIL_INDEX = 'emails';

export async function initElasticsearch(): Promise<void> {
  try {
    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: EMAIL_INDEX });

    if (!indexExists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            from_email: { type: 'keyword' },
            to_emails: { type: 'keyword' },
            subject: { type: 'text', analyzer: 'standard' },
            body: { type: 'text', analyzer: 'standard' },
            status: { type: 'keyword' },
            scheduled_at: { type: 'date' },
            sent_at: { type: 'date' },
            created_at: { type: 'date' },
          },
        },
      });
      console.log('✅ Elasticsearch index created');
    } else {
      console.log('✅ Elasticsearch index already exists');
    }
  } catch (error) {
    console.warn('⚠️ Elasticsearch not available, search will be limited:', error);
  }
}

export async function indexEmail(email: {
  id: string;
  user_id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  body: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}): Promise<void> {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: email.id,
      document: email,
    });
  } catch (error) {
    console.warn('⚠️ Failed to index email in Elasticsearch:', error);
  }
}

export async function searchEmails(userId: string, query: string, from = 0, size = 20): Promise<{
  hits: Array<{ _id: string; _source: Record<string, unknown> }>;
  total: number;
}> {
  try {
    const result = await esClient.search({
      index: EMAIL_INDEX,
      from,
      size,
      query: {
        bool: {
          must: [
            { term: { user_id: userId } },
            {
              multi_match: {
                query,
                fields: ['subject^2', 'body', 'from_email', 'to_emails'],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      sort: [{ created_at: { order: 'desc' } }],
    });

    return {
      hits: result.hits.hits as Array<{ _id: string; _source: Record<string, unknown> }>,
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
    };
  } catch (error) {
    console.warn('⚠️ Elasticsearch search failed:', error);
    return { hits: [], total: 0 };
  }
}

export async function updateEmailStatus(id: string, status: string, sentAt?: string): Promise<void> {
  try {
    await esClient.update({
      index: EMAIL_INDEX,
      id,
      doc: { status, ...(sentAt ? { sent_at: sentAt } : {}) },
    });
  } catch (error) {
    console.warn('⚠️ Failed to update email status in Elasticsearch:', error);
  }
}
