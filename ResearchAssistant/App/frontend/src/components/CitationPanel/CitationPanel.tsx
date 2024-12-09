import { IconButton, Stack } from "@fluentui/react";
import { PrimaryButton } from "@fluentui/react/lib/Button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { type Citation } from "../../api";

import styles from "./CitationPanel.module.css";

type citationPanelProps = {
  activeCitation: Citation | undefined;
  setIsCitationPanelOpen: (flag: boolean) => void;
  onViewSource: (citation: Citation | undefined) => void;
  onClickAddFavorite: () => void;
};

const CitationPanel = (props: citationPanelProps): JSX.Element => {
  const {
    activeCitation,
    setIsCitationPanelOpen,
    onViewSource,
    onClickAddFavorite,
  } = props;

  const title = !activeCitation?.url?.includes("blob.core")
    ? activeCitation?.url ?? ""
    : activeCitation?.title ?? "";
  return (
    <Stack.Item
      className={styles.citationPanel}
      tabIndex={0}
      role="tabpanel"
      aria-label="Citations Panel"
    >
      <Stack
        aria-label="Citations Panel Header Container"
        horizontal
        className={styles.citationPanelHeaderContainer}
        horizontalAlign="space-between"
        verticalAlign="center"
      >
        <Stack horizontal verticalAlign="center">
          <span aria-label="Citations" className={styles.citationPanelHeader}>
            References
          </span>
        </Stack>
        <IconButton
          iconProps={{ iconName: "Cancel", style: { color: "#424242" } }}
          aria-label="Close citations panel"
          onClick={() => {
            setIsCitationPanelOpen(false);
          }}
        />
      </Stack>
      <h5
        className={styles.citationPanelTitle}
        tabIndex={0}
        title={title}
        onClick={() => onViewSource(activeCitation)}
      >
        {activeCitation?.title || ""}
      </h5>
      <PrimaryButton
        iconProps={{ iconName: "CirclePlus", style: { color: "white" } }} // Set icon color to white
        onClick={onClickAddFavorite}
        styles={{
          root: {
            borderRadius: "4px",
            marginTop: "10px",
            padding: "12px 24px",
          },
        }}
      >
        Favorite
      </PrimaryButton>
      <div tabIndex={0}>
        <ReactMarkdown
          linkTarget="_blank"
          className={styles.citationPanelContent}
          children={activeCitation?.content || ""}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        />
      </div>
    </Stack.Item>
  );
};

export default CitationPanel;
