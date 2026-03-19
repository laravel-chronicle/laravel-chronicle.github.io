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
        'transactions',
        'checkpoints',
        'diff-engine',
        'entry-extensions',
        'validation',
        'context-resolvers',
        'storage-drivers',
        'exports',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'query-api',
        'reference-resolution',
        'config-reference',
        'export-format',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'integrity-verification',
        'export-verification',
        'signing-and-keys',
        'postgresql-json-indexes',
      ],
    },
  ],
};

export default sidebars;
