import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'intro',
        'installation',
        'quick-start',
        'recording-entries',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
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
      label: 'Recording & Auditing',
      items: [
        'auditing-eloquent-models',
        'transactions',
        'diff-engine',
      ],
    },
    {
      type: 'category',
      label: 'Validation, Policies & Context',
      items: [
        'validation',
        'policies',
        'context-resolvers',
      ],
    },
    {
      type: 'category',
      label: 'Storage & Performance',
      items: [
        'storage-drivers',
        'performance-and-indexing',
        'pruning',
      ],
    },
    {
      type: 'category',
      label: 'Verification & Integrity',
      items: [
        'integrity-verification',
        'checkpoints',
        'signing-and-keys',
      ],
    },
    {
      type: 'category',
      label: 'Exports & Compliance',
      items: [
        'exports',
        'export-format',
        'export-verification',
        'compliance-reports',
      ],
    },
    {
      type: 'category',
      label: 'Web UI',
      items: [
        'web-ui',
      ],
    },
    {
      type: 'category',
      label: 'Guides / How-To',
      items: [
        'guide-audit-eloquent-models',
        'guide-audit-api-request',
        'guide-dedicated-audit-database',
        'guide-queue-driver',
        'guide-schedule-checkpoints-exports',
        'guide-rotate-signing-keys',
        'guide-testing',
        'guide-compliance-report',
      ],
    },
    {
      type: 'category',
      label: 'Extending Chronicle',
      items: [
        'extending-chronicle',
        'entry-extensions',
        'custom-validators',
        'custom-policies',
        'custom-context-resolvers',
        'custom-storage-drivers',
        'custom-signing-providers',
        'custom-reference-resolvers',
        'listening-to-events',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'artisan-commands',
        'query-api',
        'config-reference',
        'reference-resolution',
        'events',
        'testing-helpers',
      ],
    },
    {
      type: 'category',
      label: 'Project',
      items: [
        'upgrade-guide',
        {
          type: 'link',
          label: 'Changelog',
          href: 'https://github.com/laravel-chronicle/core/blob/main/CHANGELOG.md',
        },
        {
          type: 'link',
          label: 'Contributing',
          href: 'https://github.com/laravel-chronicle/core/blob/main/CONTRIBUTING.md',
        },
        {
          type: 'link',
          label: 'Security Policy',
          href: 'https://github.com/laravel-chronicle/core/blob/main/SECURITY.md',
        },
      ],
    },
  ],
};

export default sidebars;
