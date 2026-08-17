import { useParams } from '@tanstack/react-router';
import { PageHeader, Placeholder } from '../../components/PageHeader';

export function PlaceProfilePage() {
  const { geoId } = useParams({ from: '/places/$geoId' });

  return (
    <PageHeader title="Place profile" question={`Everything LëtzScan knows about ${geoId}.`}>
      <Placeholder>
        Placeholder for the first vertical slice: population by commune, with source, licence and
        observation date attached to every value.
      </Placeholder>
    </PageHeader>
  );
}
