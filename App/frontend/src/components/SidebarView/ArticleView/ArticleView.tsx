import React, { useState, useEffect, useContext } from "react";
import { Stack, Text } from "@fluentui/react";
import { AppStateContext } from "../../../state/AppProvider";
import { News24Regular,Dismiss24Regular, DeleteRegular } from "@fluentui/react-icons";
import { Card } from "@fluentui/react-components";
import { Citation } from "../../../api/models";
import { Button } from "@fluentui/react-components";
import styles from "./ArticleView.css";

export const ArticleView = () => {
  const appState = useContext(AppStateContext);
  const favoritedCitations = appState?.state.favoritedCitations || [];
  const [articlesCitations, setArticlesCitations] = useState<Citation[]>([]);
  

  useEffect(() => {
    const filteredArticlesCitations = favoritedCitations.filter(citation => citation.type && citation.type.includes('Articles'));
    setArticlesCitations(filteredArticlesCitations);
  }, [favoritedCitations]);

  const handleToggleFavorite = (citationToRemove: Citation) => {
    appState?.dispatch({ type: 'TOGGLE_FAVORITE_CITATION', payload: { citation: citationToRemove } });

    const updatedArticlesCitations = articlesCitations.filter(c => c.id !== citationToRemove.id);
    setArticlesCitations(updatedArticlesCitations);
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
     
      <Stack
        horizontalAlign="center"
        style={{ width: "100%", padding: "0 1rem", marginTop: "0" }}
      >
        {articlesCitations.length > 0 && (
          <Card
            style={{
              maxWidth: "calc(100% - 1rem)",
              padding: "20px",
              backgroundColor: "#f4f4f4",
              position: "relative", 
            }}
          >
            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "20px" }}> 
             
              {articlesCitations.map((citation: Citation, index: number) => (
                <div key={index} style={{ position: "relative" }}>
                  <Stack horizontal verticalAlign="center" style={{ alignItems: "flex-start" }}>
                    {/* <div
                      style={{
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <News24Regular />
                    </div> */}
                    <Text>
                      {citation.title ? citation.title.split(' ').slice(0, 5).join(' ') : ''}
                      {citation.title && citation.title.split(' ').length > 5 ? '...' : ''}
                    </Text>
                    
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
