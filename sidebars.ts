import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'installation',
    'quick-start',
    {
      type: 'category',
      label: 'Foundations',
      items: [
        'philosophy',
        'architecture',
        'data-model',
        'hashing',
        'security-model',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'recording-entries',
        'auditing-eloquent-models',
        'transactions',
        'checkpoints',
        'diff-engine',
        'entry-extensions',
        'validation',
        'context-resolvers',
        'policies',
        'storage-drivers',
        'exports',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'artisan-commands',
        'query-api',
        'reference-resolution',
        'config-reference',
        'export-format',
        'events',
        'testing-helpers',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'integrity-verification',
        'export-verification',
        'signing-and-keys',
        'performance-and-indexing',
        'pruning',
        'compliance-reports',
        'web-ui',
      ],
    },
  ],
};

export default sidebars;
