import type {ComponentProps} from 'react';

// Full document navigation avoids the hosted runtime's broken RSC navigation.
export default function Link(props: ComponentProps<'a'>) {
  return <a {...props}/>;
}
