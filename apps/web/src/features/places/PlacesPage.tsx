import { PageHeader, Placeholder } from '../../components/PageHeader';

export function PlacesPage() {
  return (
    <PageHeader title="Places" question="What is it like in a given commune, canton or quarter?">
      <Placeholder>
        The gazetteer has not been built yet. Once a geography set is published, this surface lists
        places and links to <code>/places/:geoId</code>.
      </Placeholder>
    </PageHeader>
  );
}
