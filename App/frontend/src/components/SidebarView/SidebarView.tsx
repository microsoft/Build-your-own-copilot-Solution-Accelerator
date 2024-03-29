import React, { useEffect, useState, useContext } from 'react'
import { Stack, Text } from '@fluentui/react'
import { NewsRegular, BookRegular, NotepadRegular } from '@fluentui/react-icons'
import { Button, Avatar } from '@fluentui/react-components'
import styles from './SidebarView.module.css'
import { DraftDocumentsView } from '../DraftDocumentsView/DraftDocumentsView'

import { ArticleView } from './ArticleView/ArticleView'
import { GrantView } from './GrantView/GrantView'
import { AppStateContext } from '../../state/AppProvider'
import { getUserInfo } from '../../api'

export enum SidebarOptions {
  Article = 'Articles',
  Grant = 'Grants',
  DraftDocuments = 'Draft'
}

// map sidebar options to react components
const sidebarOptionComponent = {
  [SidebarOptions.Article]: () => <ArticleView/>,
  [SidebarOptions.Grant]: () => <GrantView/>,
  [SidebarOptions.DraftDocuments]: () => <DraftDocumentsView/>
}

const sidebarOptionIcon = {
  [SidebarOptions.Article]: (color: string) => <NewsRegular style={{ color: color }} />,
  [SidebarOptions.Grant]: (color: string) => <BookRegular style={{ color: color }} />,
  [SidebarOptions.DraftDocuments]: (color: string) => <NotepadRegular style={{ color: color }} />
}

export const SidebarView = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const [sidebarLoaded, setSidebarLoaded] = useState<boolean>(true)
  const sidebarSelection: SidebarOptions | null = appStateContext?.state.sidebarSelection ?? null
  const selectedViewComponent: JSX.Element | null = sidebarSelection !== null ? sidebarOptionComponent[sidebarSelection as keyof typeof sidebarOptionComponent]() : null
  const isExpanded: boolean = appStateContext?.state.isSidebarExpanded ?? false
  const [name, setName] = useState<string>('')

  useEffect(() => {
    getUserInfo().then((res) => {
      const name: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? ''
      setName(name)
    }).catch((err) => {
      console.error('Error fetching user info: ', err)
    })
  }, [])

  return (
        <Stack className={styles.sidebarContainer}>
            <Stack horizontal style={{
              flex: '1 1 5%',
              borderBottom: '1px solid #D9D9D9',
              justifyContent: 'flex-start',
              alignItems: 'center'
            }}>
                {
                    isExpanded
                      ? (
                        <Stack horizontal style={{ flex: '1', textAlign: 'right', justifyContent: 'flex-end', paddingRight: '.5rem' }}>
                            <Text>
                                {name}
                            </Text>
                        </Stack>
                        )
                      : null
                }

                <Stack className={styles.avatarContainer}>
                    <Avatar color="colorful" name={name} />
                </Stack>
            </Stack>
            <Stack horizontal
              style={{ flex: '1 1 95%' }}
            >
                {
                    isExpanded
                      ? (
                        <Stack style={{
                          width: '20rem',
                          backgroundColor: '#FAFAFA',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          paddingTop: '3rem'
                        }}>
                            {
                              sidebarLoaded
                                ? (selectedViewComponent)
                                : (<div className={styles.spinner} />)
                            }
                        </Stack>
                        )
                      : null
                }
                <Stack style={{
                  width: '4rem',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  paddingTop: '1rem'
                }}>
                    {
                      Object.values(SidebarOptions).map((item, index) => (item === sidebarSelection
                        ? (<Stack
                          key={index}

                          style={{
                            height: '3.2rem',
                            width: '3.2rem',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px',
                            boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.25)',
                            backgroundColor: '#F3F2F1'
                          }}

                                    onClick={() => {
                                      if (item !== SidebarOptions.DraftDocuments) {
                                        appStateContext?.dispatch({ type: 'TOGGLE_SIDEBAR' })
                                      }
                                    }}

                                    className={`${styles.sidebarNavigationButton} ${index !== 0 ? styles.mt1 : ''}`}
                                >
                                    <Button
                                        appearance="transparent"
                                        size="large"
                                        icon={sidebarOptionIcon[item as keyof typeof sidebarOptionIcon]('#004C87')}

                                        style={{
                                          padding: '0'
                                        }}
                                    />
                                    <Text className={styles.noSelect}
                                        style={{
                                          color: '#004C87',
                                          fontSize: '12px'
                                        }}
                                    >{item}</Text>
                                </Stack>

                          )
                        : (
                                <Stack key={index}
                                    style={{
                                      height: '3.2rem',
                                      width: '3.2rem',

                                      justifyContent: 'center',
                                      alignItems: 'center'
                                    }}

                                    className={`${styles.sidebarNavigationButton} ${index !== 0 ? styles.mt1 : ''}`}

                                    onClick={() => {
                                      appStateContext?.dispatch({ type: 'UPDATE_SIDEBAR_SELECTION', payload: item })

                                      if (!isExpanded && item !== SidebarOptions.DraftDocuments) {
                                        appStateContext?.dispatch({ type: 'TOGGLE_SIDEBAR' })
                                      } else if (isExpanded && item === SidebarOptions.DraftDocuments) {
                                        appStateContext?.dispatch({ type: 'TOGGLE_SIDEBAR' })
                                      }
                                    }}
                                >
                                    <Button
                                        appearance="transparent"
                                        size="large"
                                        icon={sidebarOptionIcon[item as keyof typeof sidebarOptionIcon]('#0078D4')}
                                        style={{ padding: '0' }}
                                    />
                                    <Text className={styles.noSelect}
                                        style={{
                                          color: '#0078D4',
                                          fontSize: '12px'
                                        }}
                                    >
                                      {item}
                                    </Text>
                                </Stack>
                          )
                      ))
                    }
                </Stack>
            </Stack>
        </Stack>
  )
}
