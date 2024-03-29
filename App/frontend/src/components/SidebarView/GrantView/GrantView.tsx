import React, { useState, useEffect, useContext } from "react";
import { Stack, Text } from "@fluentui/react";
import { AppStateContext } from "../../../state/AppProvider";
import { Card } from "@fluentui/react-components";
import { Dismiss24Regular, DeleteRegular } from "@fluentui/react-icons";
import { Citation } from "../../../api/models";
import { Button } from "@fluentui/react-components";
import styles from "./ArticleView.css";

export const GrantView = () => {
  const appState = useContext(AppStateContext);
  const favoritedCitations = appState?.state.favoritedCitations || [];
  const [grantsCitations, setGrantsCitations] = useState<Citation[]>([]);

  useEffect(() => {
    const filteredGrantsCitations = favoritedCitations.filter(citation => citation.type && citation.type.includes('Grants'));
    setGrantsCitations(filteredGrantsCitations);
  }, [favoritedCitations]);

  const handleToggleFavorite = (citationToRemove: Citation) => {
    appState?.dispatch({ type: 'TOGGLE_FAVORITE_CITATION', payload: { citation: citationToRemove } });

    // Remove citation from grantsCitations array
    const updatedGrantsCitations = grantsCitations.filter(c => c.id !== citationToRemove.id);
    setGrantsCitations(updatedGrantsCitations);
  };
  
  return (
    <Stack styles={{ root: { width: "100%" } }}>
      <Stack
        horizontal
        style={{
          padding: "0px 1rem",
          width: "100%",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginTop: "0",
        }}
      >
        {/* Favorites Header */}
        <Text variant="xLarge" style={{ alignSelf: "flex-start", marginTop: "0" }}>
          Favorites
        </Text>
        <Button
          style={{ border: "none", alignSelf: "flex-start", marginTop: "0" }}
          icon={<Dismiss24Regular />}
          onClick={() => {
            appState?.dispatch({ type: "TOGGLE_SIDEBAR" });
          }}
        />
      </Stack>
      {/* Fluent Card for Citations (conditionally rendered) */}
      <Stack
        horizontalAlign="center"
        style={{ width: "100%", padding: "0 1rem", marginTop: "0" }}
      >
        {grantsCitations.length > 0 && (
          <Card
            style={{
              maxWidth: "calc(100% - 1rem)",
              padding: "20px",
              backgroundColor: "#f4f4f4",
              position: "relative", // Ensure the card is a positioning context
            }}
          >
            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "20px" }}> {/* Set maximum height and enable overflow */}
              {/* Iterate over grantsCitations */}
              {grantsCitations.map((citation: Citation, index: number) => (
                <div key={index} style={{ position: "relative" }}>
                  <Stack horizontal verticalAlign="center" style={{ alignItems: "flex-start" }}>
                    {/* <div
                      style={{
                        width: "24px", // Set fixed width for the icon
                        height: "24px", // Set fixed height for the icon
                      }}
                    >
                      <News24Regular />
                    </div> */}
                    <Text>
                      {citation.title ? citation.title.split(' ').slice(0, 5).join(' ') : ''}
                      {citation.title && citation.title.split(' ').length > 5 ? '...' : ''}
                    </Text>
                    {/* "X" button to remove the citation */}
                    <Button
                      icon={<DeleteRegular />}
                      onClick={() => handleToggleFavorite(citation)}
                      style={{
                        border: "none",
                        position: "absolute",
                        right: "-10px",
                        padding: "2px",
                        backgroundColor: "#f4f4f4",
                        alignSelf: "flex-start",
                      }}
                    />
                  </Stack>
                  <a
                    href={citation.url ? citation.url : ""}
                    target="_blank"
                    style={{ display: "block", wordWrap: "break-word", maxWidth: "100%", marginTop: "4px" }}
                  >
                    {citation.url ? citation.url : ""}
                  </a>
                  <hr style={{ width: "100%", backgroundColor: "#d8d8d8", marginTop: "8px", borderWidth: 0, height: "1px" }} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </Stack>
    </Stack>
  );
};
