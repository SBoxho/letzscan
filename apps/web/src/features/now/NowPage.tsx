import { PageHeader, Placeholder } from '../../components/PageHeader';

export function NowPage() {
  return (
    <PageHeader title="Now" question="What is happening in Luxembourg right now?">
      <Placeholder>
        No live feed is connected. Current conditions will be served from artifacts written by the
        edge Worker on a cron schedule — never fetched from a provider by the browser, and never
        labelled &ldquo;live&rdquo; unless a scheduled job actually refreshed them.
      </Placeholder>
    </PageHeader>
  );
}
