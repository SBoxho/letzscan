import { PageHeader, Placeholder } from '../../components/PageHeader';

export function CatalogPage() {
  return (
    <PageHeader title="Data" question="Where does this number come from, and can I reuse it?">
      <Placeholder>
        This surface will render the reviewed source catalogue in <code>catalog/</code>. Source
        metadata, licences and attribution are data, never strings pasted into a component — see{' '}
        <code>docs/adr/0002</code>.
      </Placeholder>
    </PageHeader>
  );
}
