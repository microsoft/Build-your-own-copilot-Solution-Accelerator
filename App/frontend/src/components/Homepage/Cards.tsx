import * as React from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
} from "@fluentui/react-components";
import { Card, CardProps } from "@fluentui/react-components";
import { TextField } from '@fluentui/react/lib/TextField';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeClasses } from "@fluentui/react-components";
import { AppStateContext } from "../../state/AppProvider";
import { useNavigate } from 'react-router-dom';
import { SidebarOptions } from "../SidebarView/SidebarView";

import {
  Title3,
} from "@fluentui/react-components";


const useStyles = makeStyles({
  main: {
    ...shorthands.gap("36px"),
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
  },

  title: {
    ...shorthands.margin(0, 0, "12px"),
  },

  description: {
    ...shorthands.margin(0, 0, "12px"),
  },

  card: {
    "user-select": "none", /* Standard syntax */
    "-webkit-user-select": "none", /* Safari 3.1+ */
    "-moz-user-select": "none", /* Firefox 2+ */
    "-ms-user-select": "none", /* IE 10+ */
    boxShadow: "0px 4px 8px 0px #00000024",
    backgroundColor: "#FAF9F8",
  },

  caption: {
    color: tokens.colorNeutralForeground3,
  },

  logo: {
    ...shorthands.borderRadius("4px"),
    width: "48px",
    height: "48px",
  },

  text: {
    ...shorthands.margin(0),
  },
});

interface Props {
  title: string;
  description: string;
  icon: JSX.Element;
  featureSelection: SidebarOptions;
}

export const FeatureCard = (props: Props) => {
  const styles = useStyles();
  const appStateContext = React.useContext(AppStateContext);
  const { title, description, icon, featureSelection } = props;

  const onClick = () => {
    appStateContext?.dispatch({ type: 'UPDATE_SIDEBAR_SELECTION', payload: featureSelection });  
  };

  return (
    <Card
      className={mergeClasses(styles.card)}
      onClick={onClick}

      style={{
        flex: 1,
        alignSelf: "stretch",
      }}
    >
      {icon}
      <Text weight="semibold">{title}</Text>

      <p className={styles.text}>
        {description}
      </p>
    </Card>
  );
};

export const TextFieldCard = ({ className, ...props }: CardProps) => {
  const appStateContext = React.useContext(AppStateContext);

  return (
    <Card
      {...props}

      style={{ 
        width: "100%", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        alignItems: "center",
        textAlign: "start",
        backgroundColor: "#FAF9F8",
        borderRadius: "1px",
        border: "1px solid #EDEBE9",
        boxShadow: "0px 4px 8px 0px #00000024",
      }}
    >
      <Stack
        style={{
          width: "100%",
          textAlign: "start",
        }}
      >
        <Title3 
          style={{
            fontSize: "1.2rem",
            marginBottom: "2px",
          }}
        >
          Topic
        </Title3>

        <Text>
          Enter an initial prompt that will exist across all three modes, Articles, Grants, and Drafts. 
        </Text>
      </Stack>  

      <Stack style={{
        width: "100%",
      }}>
        <TextField
          onChange={(event, data) => {
            appStateContext?.dispatch({ type: 'UPDATE_RESEARCH_TOPIC', payload: data as string});
          }}

          value={appStateContext?.state.researchTopic}

          style={{
            flex: 1,
            width: "100%",
          }}
        />
      </Stack>
      
    </Card>
  );
};
