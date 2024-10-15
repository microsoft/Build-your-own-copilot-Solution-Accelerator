import { Stack, IconButton } from '@fluentui/react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { XSSAllowTags } from '../../../constants/xssAllowTags';
import styles from '../Chat.module.css';

import {Citation} from '../../../api/models'

interface CitationPanelProps {
  activeCitation: Citation;
  IsCitationPanelOpen: (isOpen: boolean) => void;
  onViewSource: (citation: Citation) => void;
}

export const CitationPanel: React.FC<CitationPanelProps> = ({ activeCitation, IsCitationPanelOpen, onViewSource }) => {
  return (
    <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
      <Stack
        aria-label="Citations Panel Header Container"
        horizontal
        className={styles.citationPanelHeaderContainer}
        horizontalAlign="space-between"
        verticalAlign="center">
        <span aria-label="Citations" className={styles.citationPanelHeader}>
          Citations
        </span>
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          aria-label="Close citations panel"
          onClick={() => IsCitationPanelOpen(false)}
        />
      </Stack>
      <h5
        className={styles.citationPanelTitle}
        tabIndex={0}
        title={activeCitation.url && !activeCitation.url.includes('blob.core') ? activeCitation.url : activeCitation.title ?? ''}
        onClick={() => onViewSource(activeCitation)}>
        {activeCitation.title}
      </h5>
      <div tabIndex={0}>
        <ReactMarkdown
          linkTarget="_blank"
          className={styles.citationPanelContent}
          //children={DOMPurify.sanitize(activeCitation.content, { ALLOWED_TAGS: XSSAllowTags })}
          children={activeCitation.content}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        />
      </div>
    </Stack.Item>
  );
};
