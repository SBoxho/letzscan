import { useSearch } from '@tanstack/react-router';
import { PageHeader, Placeholder } from '../../components/PageHeader';

export function ComparePage() {
  const { places, indicator } = useSearch({ from: '/compare' });

  return (
    <PageHeader title="Compare" question="How do two to four places compare?">
      <Placeholder>
        Comparison set is URL state, so a comparison is shareable. Currently{' '}
        {places.length === 0 ? 'no places selected' : places.join(', ')}
        {indicator ? ` for indicator ${indicator}` : ''}.
      </Placeholder>
    </PageHeader>
  );
}
