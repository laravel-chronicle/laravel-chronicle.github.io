import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.heroShell}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Tamper-evident audit logging for Laravel</p>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <p className={styles.heroLead}>
              Chronicle records immutable audit entries, chains them together with
              deterministic hashes, and gives you verification, checkpoints, and
              export tooling built for real operational review.
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/quick-start">
                Read the Quick Start
              </Link>
              <Link className={styles.secondaryAction} to="/docs/installation">
                Installation
              </Link>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelDot} />
              <span className={styles.panelDot} />
              <span className={styles.panelDot} />
            </div>
            <pre className={styles.codeBlock}>
              <code>{`use Chronicle\\Facades\\Chronicle;

Chronicle::record()
    ->actor($user)
    ->action('order.created')
    ->subject($order)
    ->metadata([
        'total' => 14900,
        'currency' => 'EUR',
    ])
    ->tags(['orders', 'checkout'])
    ->commit();`}</code>
            </pre>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageSections() {
  return (
    <main className={styles.main}>
      <section className={styles.metricStrip}>
        <div className="container">
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>Append-only</span>
              <p>Entries are immutable after insert and cannot be updated or deleted.</p>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>Hash-chained</span>
              <p>Every entry is linked to the previous chain head for tamper detection.</p>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricValue}>Verifiable</span>
              <p>Run integrity checks, create checkpoints, and verify signed exports.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>Why teams use it</p>
            <Heading as="h2">Built for ledgers that need to stand up to scrutiny</Heading>
          </div>

          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <Heading as="h3">Deterministic recording pipeline</Heading>
              <p>
                Entries move through canonicalization, payload hashing, chain hashing,
                and persistence in a fixed order so integrity checks are repeatable.
              </p>
            </article>
            <article className={styles.featureCard}>
              <Heading as="h3">Readable query surface</Heading>
              <p>
                Query by actor, subject, action, tag, correlation, or time range with
                model scopes or the built-in ledger reader.
              </p>
            </article>
            <article className={styles.featureCard}>
              <Heading as="h3">Operational tooling included</Heading>
              <p>
                Verify the ledger, create checkpoints, export datasets, and verify
                those exports independently from the source system.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.workflow}>
            <div>
              <p className={styles.sectionLabel}>Core workflow</p>
              <Heading as="h2">From event recording to external verification</Heading>
            </div>
            <div className={styles.workflowSteps}>
              <div className={styles.workflowStep}>
                <strong>1. Record</strong>
                <p>Create entries with `Chronicle::record()` and add metadata, context, tags, and diffs.</p>
              </div>
              <div className={styles.workflowStep}>
                <strong>2. Anchor</strong>
                <p>Use checkpoints to sign the current chain head and establish a trusted ledger state.</p>
              </div>
              <div className={styles.workflowStep}>
                <strong>3. Verify</strong>
                <p>Run verification commands or export the dataset for external review and signature checks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div>
              <p className={styles.sectionLabel}>Get started</p>
              <Heading as="h2">Install Chronicle and record your first immutable audit entry</Heading>
            </div>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/installation">
                Installation
              </Link>
              <Link className={styles.secondaryAction} to="/docs/config-reference">
                Config reference
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Laravel Chronicle is a verifiable audit ledger for Laravel applications with immutable entries, hash chaining, checkpoints, and signed exports.">
      <HomepageHeader />
      <HomepageSections />
    </Layout>
  );
}
