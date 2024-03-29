import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Layout.module.css'
import Icon from '../../assets/M365.svg'
import { useContext, useEffect, useState } from 'react'
import { AppStateContext } from '../../state/AppProvider'
import { Stack, Text } from '@fluentui/react'
import { SidebarOptions, SidebarView } from '../../components/SidebarView/SidebarView'
import { DraftDocumentsView } from '../../components/DraftDocumentsView/DraftDocumentsView'
import { makeStyles } from '@fluentui/react-components'
import { tokens } from '@fluentui/react-theme'
import Homepage from '../Homepage/Homepage'
import Chat from '../chat/Chat'

const useStyles = makeStyles({
  headerTitle: {
    fontSize: '18px',
    lineHeight: '24px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1
  }
})

const Layout = (): JSX.Element => {
  const classes = useStyles()
  const appStateContext = useContext(AppStateContext)

  const mainElement = (): JSX.Element => {
    switch (appStateContext?.state.sidebarSelection) {
      case SidebarOptions.DraftDocuments:
        return <DraftDocumentsView />
      case SidebarOptions.Grant:
        return <Chat chatType={appStateContext?.state.sidebarSelection}/>
      case SidebarOptions.Article:
        return <Chat chatType={appStateContext?.state.sidebarSelection}/>
      default:
        return <Homepage />
    }
  }

  return (
        <Stack style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: '#EDEBE9',
          padding: '1rem'
        }}>
            <Stack
                horizontal
                verticalAlign="center"
            >
                <img
                    src={Icon}
                    className={styles.headerIcon}
                    aria-hidden="true"
                />
                <Link to="/" className={styles.headerTitleContainer}
                    onClick={() => {
                      appStateContext?.dispatch({ type: 'UPDATE_SIDEBAR_SELECTION', payload: null })

                      if (appStateContext?.state.isSidebarExpanded) {
                        appStateContext?.dispatch({ type: 'TOGGLE_SIDEBAR' })
                      }
                    }}
                >
                    <Text as="h1" className={classes.headerTitle}>Grant Writer</Text>
                </Link>
            </Stack>

            <Stack className={styles.layout}>
                {mainElement()}
                <SidebarView />
            </Stack>
        </Stack>
  )
}

export default Layout
