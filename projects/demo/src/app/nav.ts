export interface NavItem {
  path: string;
  label: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { path: '', label: 'Playground' },
      { path: 'getting-started', label: 'Getting started' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { path: 'views', label: 'Views' },
      { path: 'theming', label: 'Theming' },
      { path: 'interactions', label: 'Interactions' },
      { path: 'recurrence', label: 'Recurrence' },
    ],
  },
  {
    title: 'Reference',
    items: [{ path: 'reference', label: 'Integration & API' }],
  },
];
